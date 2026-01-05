import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Subdomain configuration
const SUBDOMAINS = {
  app: {
    allowedPaths: ["/dashboard", "/onboarding", "/login", "/register"],
    defaultPath: "/dashboard",
    requiredRole: "CLIENT",
  },
  artist: {
    allowedPaths: ["/portal", "/login", "/register", "/onboarding"],
    defaultPath: "/portal",
    requiredRole: "FREELANCER",
  },
  superadmin: {
    allowedPaths: ["/admin", "/login", "/register"],
    defaultPath: "/admin",
    requiredRole: "ADMIN",
  },
} as const;

type Subdomain = keyof typeof SUBDOMAINS;

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/register", "/api/auth"];

// Get the subdomain from the host
function getSubdomain(host: string): Subdomain | null {
  // Remove port if present
  const hostname = host.split(":")[0];

  // Local development: app.localhost, artist.localhost, superadmin.localhost
  if (hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    const subdomain = hostname.split(".")[0] as Subdomain;
    if (subdomain in SUBDOMAINS) {
      return subdomain;
    }
  }

  // Production: app.craftedstudio.ai, artist.craftedstudio.ai, superadmin.craftedstudio.ai
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "craftedstudio.ai";
  if (hostname.endsWith(`.${baseDomain}`)) {
    const subdomain = hostname.replace(`.${baseDomain}`, "") as Subdomain;
    if (subdomain in SUBDOMAINS) {
      return subdomain;
    }
  }

  return null;
}

// Check if route is public
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

// Check if route is an API route
function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

// Check if route is a static asset
function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js)$/.test(pathname)
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";

  // Skip static assets
  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  // Get subdomain
  const subdomain = getSubdomain(host);

  // If no valid subdomain (localhost without subdomain, or www), allow through
  // This handles development on plain localhost:3000
  if (!subdomain) {
    const hostname = host.split(":")[0];

    // Plain localhost - allow all routes (development mode)
    if (hostname === "localhost") {
      const sessionCookie =
        request.cookies.get("pine.session_token") ||
        request.cookies.get("better-auth.session_token");

      // Protected routes without session
      const protectedRoutes = ["/dashboard", "/portal", "/admin", "/onboarding"];
      const isProtectedRoute = protectedRoutes.some((route) =>
        pathname.startsWith(route)
      );

      if (isProtectedRoute && !sessionCookie?.value) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }

      // Auth routes with session - redirect to dashboard
      const authRoutes = ["/login", "/register"];
      const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
      if (isAuthRoute && sessionCookie?.value) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }

      return NextResponse.next();
    }

    // www subdomain or base domain - pass through (Framer handles this)
    return NextResponse.next();
  }

  const subdomainConfig = SUBDOMAINS[subdomain];

  // Allow API routes (they handle their own auth)
  if (isApiRoute(pathname)) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie =
    request.cookies.get("pine.session_token") ||
    request.cookies.get("better-auth.session_token");

  // Handle public routes
  if (isPublicRoute(pathname)) {
    // If user is logged in and on login/register, redirect to default path
    if (sessionCookie?.value && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL(subdomainConfig.defaultPath, request.url));
    }
    return NextResponse.next();
  }

  // Protected routes - require authentication
  if (!sessionCookie?.value) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check if the current path is allowed for this subdomain
  const isAllowedPath = subdomainConfig.allowedPaths.some((allowed) =>
    pathname.startsWith(allowed)
  );

  // If accessing root, redirect to subdomain's default path
  if (pathname === "/") {
    return NextResponse.redirect(new URL(subdomainConfig.defaultPath, request.url));
  }

  // If path is not allowed for this subdomain, redirect to default path
  if (!isAllowedPath) {
    return NextResponse.redirect(new URL(subdomainConfig.defaultPath, request.url));
  }

  // Add subdomain info to headers for use in server components
  const response = NextResponse.next();
  response.headers.set("x-subdomain", subdomain);
  response.headers.set("x-required-role", subdomainConfig.requiredRole);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
