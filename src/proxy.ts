import { NextRequest, NextResponse } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'
import { rateLimiters } from '@/lib/rate-limit'

const isProduction = process.env.NODE_ENV === 'production'
const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'getcrafted.ai'

// Cookie prefix must match auth.ts config
const COOKIE_PREFIX = 'crafted'

/**
 * Subdomain configuration
 *
 * NOTE: Role enforcement is handled at the layout/API level, not middleware.
 * Middleware runs in Edge Runtime and cannot access the database to get user roles.
 *
 * Security model:
 * 1. Production: cookies shared across subdomains via crossSubDomainCookies (domain=.getcrafted.ai)
 *    Dev: cookies isolated per subdomain (no domain attr) so devs can test multiple roles
 * 2. Middleware checks for valid session cookie existence (defense-in-depth)
 * 3. Layout components (e.g., /app/(admin)/layout.tsx) enforce role-based access
 * 4. API routes check roles before processing requests via requireAuth()/requireRole()
 */
type SubdomainType = 'app' | 'artist' | 'superadmin'

/**
 * Get subdomain from request
 */
function getSubdomain(request: NextRequest): SubdomainType | null {
  const hostname = request.headers.get('host') || ''

  if (!isProduction) {
    // Local development - check for subdomain prefix
    if (hostname.startsWith('app.')) return 'app'
    if (hostname.startsWith('artist.')) return 'artist'
    if (hostname.startsWith('superadmin.')) return 'superadmin'
    // Default to app for localhost without subdomain
    if (hostname.includes('localhost')) return 'app'
    return null
  }

  // Production - extract subdomain
  const parts = hostname.replace(`.${baseDomain}`, '').split('.')
  const subdomain = parts[0]

  if (subdomain === 'app' || subdomain === 'www' || subdomain === baseDomain) {
    return 'app'
  }
  if (subdomain === 'artist') return 'artist'
  if (subdomain === 'superadmin') return 'superadmin'

  return 'app' // Default
}

/**
 * Public paths that don't require authentication.
 * Paths are matched with exact equality or as a prefix (path + '/').
 */
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/early-access',
  '/onboarding',
  '/auth-error',
  '/join',
  '/api/auth',
  '/api/artist-invites',
  '/api/webhooks',
  '/api/health',
  '/api/csrf',
  '/ingest',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
]

/**
 * Protected API path prefixes that require a session cookie.
 * These are checked in addition to page route protection for defense-in-depth.
 */
const PROTECTED_API_PREFIXES = ['/api/admin', '/api/freelancer']

/**
 * Protected page path prefixes that require a session cookie.
 */
const PROTECTED_PAGE_PREFIXES = ['/admin', '/dashboard', '/portal']

/**
 * Check if path is public (no auth required)
 */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'))
}

/**
 * Check if path is a protected API route
 */
export function isProtectedApiRoute(pathname: string): boolean {
  return PROTECTED_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  )
}

/**
 * Check if path is a protected page route
 */
export function isProtectedPageRoute(pathname: string): boolean {
  return PROTECTED_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  )
}

/**
 * Check for a valid session cookie on the request.
 * This is a lightweight check (cookie existence only) for defense-in-depth.
 * Full session validation happens in requireAuth()/requireRole() per-route.
 */
export function hasSessionCookie(request: NextRequest): boolean {
  const sessionCookie = getSessionCookie(request, {
    cookiePrefix: COOKIE_PREFIX,
  })
  return !!sessionCookie
}

/**
 * Return a 401 JSON response for unauthenticated API requests
 */
function unauthorizedApiResponse(): NextResponse {
  return new NextResponse(
    JSON.stringify({
      success: false,
      error: {
        code: 'AUTH_001',
        message: 'Authentication required',
      },
    }),
    {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

/**
 * Redirect unauthenticated page requests to /login with a redirect param
 */
function redirectToLogin(request: NextRequest, pathname: string): NextResponse {
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('redirect', pathname)
  return NextResponse.redirect(loginUrl)
}

/**
 * Main proxy function (Next.js 16 convention, renamed from middleware).
 *
 * Provides defense-in-depth auth gating at the network layer:
 * - Page routes (/admin, /dashboard, /portal) redirect to /login without a session cookie
 * - API routes (/api/admin, /api/freelancer) return 401 JSON without a session cookie
 * - Public paths (/api/auth, /api/health, /login, etc.) pass through unconditionally
 * - Rate limiting is applied to auth routes and all API routes
 */
export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Gate /register behind invite code — redirect to /early-access if no code param
  if (pathname === '/register' && !searchParams.get('code')) {
    return NextResponse.redirect(new URL('/early-access', request.url))
  }

  // Skip middleware for static files and public paths
  if (pathname.startsWith('/_next') || pathname.includes('.') || isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Rate limiting — skip entirely in development to avoid Edge Runtime import issues
  if (isProduction) {
    // Rate limit auth routes (stricter)
    if (pathname.startsWith('/api/auth') || pathname === '/login' || pathname === '/register') {
      const { limited, remaining: _remaining, resetIn } = await rateLimiters.auth(request)
      if (limited) {
        return new NextResponse(
          JSON.stringify({
            success: false,
            error: {
              code: 'SRV_004',
              message: 'Too many requests. Please try again later.',
            },
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(resetIn),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(resetIn),
            },
          }
        )
      }
    }

    // Rate limit all API routes
    if (pathname.startsWith('/api/')) {
      const { limited, remaining, resetIn } = await rateLimiters.api(request)
      if (limited) {
        return new NextResponse(
          JSON.stringify({
            success: false,
            error: {
              code: 'SRV_004',
              message: 'Too many requests. Please try again later.',
            },
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(resetIn),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(resetIn),
            },
          }
        )
      }

      // Defense-in-depth: check session cookie for protected API routes
      if (isProtectedApiRoute(pathname) && !hasSessionCookie(request)) {
        return unauthorizedApiResponse()
      }

      // API routes that passed rate limiting and auth checks
      const apiResponse = NextResponse.next()
      apiResponse.headers.set('X-RateLimit-Remaining', String(remaining))
      apiResponse.headers.set('X-RateLimit-Reset', String(resetIn))
      return apiResponse
    }
  }

  // In development, still check session cookie for protected API routes (no rate limiting)
  if (!isProduction && pathname.startsWith('/api/')) {
    if (isProtectedApiRoute(pathname) && !hasSessionCookie(request)) {
      return unauthorizedApiResponse()
    }
    return NextResponse.next()
  }

  // Get subdomain context
  const subdomain = getSubdomain(request)

  // Defense-in-depth: check session cookie for protected page routes
  if (isProtectedPageRoute(pathname) && !hasSessionCookie(request)) {
    return redirectToLogin(request, pathname)
  }

  // For any other non-public, non-API page route without a session, also redirect
  if (!hasSessionCookie(request)) {
    return redirectToLogin(request, pathname)
  }

  // Clone the response to add headers
  const response = NextResponse.next()

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Add CSP header in production
  if (isProduction) {
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://js.stripe.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        `connect-src 'self' https://api.stripe.com wss: https://*.${baseDomain} https://*.supabase.co https://us.i.posthog.com`,
        "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com",
        "worker-src 'self' blob:",
      ].join('; ')
    )
  }

  // Add subdomain context to headers for downstream use
  if (subdomain) {
    response.headers.set('x-subdomain', subdomain)
  }

  return response
}

/**
 * Configure which paths the middleware runs on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
