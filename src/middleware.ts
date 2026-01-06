import { NextRequest, NextResponse } from "next/server";

const isProduction = process.env.NODE_ENV === "production";
const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "craftedstudio.ai";

/**
 * Subdomain configuration
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
  "/auth-error",
  "/api/auth",
  "/api/webhooks",
  "/api/health",
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
    (path) => pathname === path || pathname.startsWith(path + "/") || pathname.startsWith(path)
  );
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and public paths
  if (
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    isPublicPath(pathname)
  ) {
    return NextResponse.next();
  }

  // Get subdomain context
  const subdomain = getSubdomain(request);

  // Check for session cookie
  const sessionToken = request.cookies.get("crafted.session_token")?.value;

  // If no session and trying to access protected route, redirect to login
  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // For API routes, let the route handler check auth (they have full session access)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
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
        "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
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
