import { NextResponse } from "next/server";

/**
 * Cache duration presets in seconds
 */
export const CacheDurations = {
  /** No caching */
  NONE: 0,
  /** Short cache for frequently updated data (1 minute) */
  SHORT: 60,
  /** Medium cache for moderately static data (5 minutes) */
  MEDIUM: 300,
  /** Long cache for rarely changing data (1 hour) */
  LONG: 3600,
  /** Extended cache for static data (24 hours) */
  EXTENDED: 86400,
} as const;

/**
 * Add cache headers to a NextResponse
 * @param response - The NextResponse to add headers to
 * @param maxAge - Cache duration in seconds (use CacheDurations presets)
 * @param staleWhileRevalidate - Additional time to serve stale content while revalidating
 * @param isPrivate - Whether the cache should be private (user-specific data)
 */
export function withCacheHeaders<T>(
  response: NextResponse<T>,
  maxAge: number,
  staleWhileRevalidate?: number,
  isPrivate = false
): NextResponse<T> {
  if (maxAge <= 0) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return response;
  }

  const directives = [
    isPrivate ? "private" : "public",
    `max-age=${maxAge}`,
  ];

  if (staleWhileRevalidate) {
    directives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
  }

  response.headers.set("Cache-Control", directives.join(", "));
  return response;
}

/**
 * Create a cached JSON response
 * @param data - The data to return
 * @param maxAge - Cache duration in seconds
 * @param options - Additional options
 */
export function cachedJsonResponse<T>(
  data: T,
  maxAge: number = CacheDurations.SHORT,
  options?: {
    status?: number;
    staleWhileRevalidate?: number;
    isPrivate?: boolean;
  }
): NextResponse<T> {
  const response = NextResponse.json(data, { status: options?.status ?? 200 });
  return withCacheHeaders(
    response,
    maxAge,
    options?.staleWhileRevalidate,
    options?.isPrivate
  );
}

/**
 * Create a cached success response using the standard format
 */
export function cachedSuccessResponse<T>(
  data: T,
  maxAge: number = CacheDurations.SHORT,
  options?: {
    staleWhileRevalidate?: number;
    isPrivate?: boolean;
  }
): NextResponse<{ success: true; data: T }> {
  const response = NextResponse.json(
    { success: true, data },
    { status: 200 }
  );
  return withCacheHeaders(
    response,
    maxAge,
    options?.staleWhileRevalidate,
    options?.isPrivate
  );
}
