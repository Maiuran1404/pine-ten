import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { rateLimiters } from "@/lib/rate-limit";

const isProduction = process.env.NODE_ENV === "production";
const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "getcrafted.ai";

// Cookie prefix must match auth.ts config
const COOKIE_PREFIX = "crafted";

/**
 * Subdomain configuration
 *
 * NOTE: Role enforcement is handled at the layout/API level, not middleware.
 * Middleware runs in Edge Runtime and cannot access the database to get user roles.
 *
 * Security model:
 * 1. Cookies are isolated per subdomain (no cross-subdomain session sharing)
 * 2. Middleware checks for valid session cookie existence
 * 3. Layout components (e.g., /app/(admin)/layout.tsx) enforce role-based access
 * 4. API routes check roles before processing requests
 */
const subdomainConfig = {
  app: {
    allowedRoles: ["CLIENT"],
    defaultRedirect: "/dashboard",
    requireOnboarding: true,
  },
  artist: {
    allowedRoles: ["FREELANCER"],
    defaultRedirect: "/portal",
    requireOnboarding: true,
  },
  superadmin: {
    allowedRoles: ["ADMIN"],
    defaultRedirect: "/admin",
    requireOnboarding: false,
  },
} as const;

type SubdomainType = keyof typeof subdomainConfig;

/**
 * Get subdomain from request
 */
function getSubdomain(request: NextRequest): SubdomainType | null {
  const hostname = request.headers.get("host") || "";

  if (!isProduction) {
    // Local development - check for subdomain prefix
    if (hostname.startsWith("app.")) return "app";
    if (hostname.startsWith("artist.")) return "artist";
    if (hostname.startsWith("superadmin.")) return "superadmin";
    // Default to app for localhost without subdomain
    if (hostname.includes("localhost")) return "app";
    return null;
  }

  // Production - extract subdomain
  const parts = hostname.replace(`.${baseDomain}`, "").split(".");
  const subdomain = parts[0];

  if (subdomain === "app" || subdomain === "www" || subdomain === baseDomain) {
    return "app";
  }
  if (subdomain === "artist") return "artist";
  if (subdomain === "superadmin") return "superadmin";

  return "app"; // Default
}

/**
 * Public paths that don't require authentication
 */
const publicPaths = [
  "/login",
  "/register",
  "/onboarding",
  "/auth-error",
  "/api/auth",
  "/api/webhooks",
  "/api/health",
  "/api/openapi",
  "/api-docs",
  "/_next",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
];

/**
 * Check if path is public
 */
function isPublicPath(pathname: string): boolean {
  return publicPaths.some(
    (path) =>
      pathname === path ||
      pathname.startsWith(path + "/") ||
      pathname.startsWith(path)
  );
}

/**
 * Main proxy function (renamed from middleware for Next.js 16+)
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and public paths
  if (
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    isPublicPath(pathname)
  ) {
    return NextResponse.next();
  }

  // Rate limit auth routes (stricter — 20 req/min per IP)
  if (
    pathname.startsWith("/api/auth") ||
    pathname === "/login" ||
    pathname === "/register"
  ) {
    const { limited, remaining, resetIn } = rateLimiters.auth(request);
    if (limited) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: {
            code: "SRV_004",
            message: "Too many requests. Please try again later.",
          },
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(resetIn),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(resetIn),
          },
        }
      );
    }
  }

  // Rate limit all API routes (100 req/min per IP)
  if (pathname.startsWith("/api/")) {
    const { limited, remaining, resetIn } = rateLimiters.api(request);
    if (limited) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: {
            code: "SRV_004",
            message: "Too many requests. Please try again later.",
          },
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(resetIn),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(resetIn),
          },
        }
      );
    }

    // API routes pass rate limit — let route handler check auth
    const apiResponse = NextResponse.next();
    apiResponse.headers.set("X-RateLimit-Remaining", String(remaining));
    apiResponse.headers.set("X-RateLimit-Reset", String(resetIn));
    return apiResponse;
  }

  // Get subdomain context
  const subdomain = getSubdomain(request);

  // Check for session cookie using BetterAuth's utility
  // Must pass cookiePrefix explicitly as Edge Runtime can't import auth config
  const sessionCookie = getSessionCookie(request, {
    cookiePrefix: COOKIE_PREFIX,
  });

  // If no session and trying to access protected route, redirect to login
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Clone the response to add headers
  const response = NextResponse.next();

  // Add security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // Add CSP header in production
  if (isProduction) {
    response.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https: http:",
        "connect-src 'self' https://api.stripe.com wss: https:",
        "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com",
      ].join("; ")
    );
  }

  // Add subdomain context to headers for downstream use
  if (subdomain) {
    response.headers.set("x-subdomain", subdomain);
  }

  return response;
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
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
