import { NextRequest, NextResponse } from "next/server";
import { rateLimiters } from "@/lib/rate-limit";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limit auth routes (stricter)
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

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    response.headers.set("X-RateLimit-Reset", String(resetIn));
    return response;
  }

  // Rate limit all API routes
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

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    response.headers.set("X-RateLimit-Reset", String(resetIn));
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/login", "/register"],
};
