"use client";

import { useState, useEffect, useCallback } from "react";

const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Hook to manage CSRF token for API requests
 * Fetches a token on mount and provides it for use in requests
 */
export function useCsrf() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/csrf");
      if (!response.ok) {
        throw new Error("Failed to fetch CSRF token");
      }
      const data = await response.json();
      setCsrfToken(data.csrfToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch CSRF token");
      console.error("CSRF token fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  /**
   * Get headers object with CSRF token included
   */
  const getCsrfHeaders = useCallback((): Record<string, string> => {
    if (!csrfToken) return {};
    return { [CSRF_HEADER_NAME]: csrfToken };
  }, [csrfToken]);

  /**
   * Wrapper for fetch that automatically includes CSRF token
   */
  const csrfFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(options.headers);
      if (csrfToken) {
        headers.set(CSRF_HEADER_NAME, csrfToken);
      }
      return fetch(url, { ...options, headers });
    },
    [csrfToken]
  );

  return {
    csrfToken,
    isLoading,
    error,
    getCsrfHeaders,
    csrfFetch,
    refreshToken: fetchToken,
  };
}

/**
 * Utility function to add CSRF token to fetch headers
 * Use this in places where the hook can't be used
 */
export function addCsrfHeader(
  headers: HeadersInit | undefined,
  csrfToken: string
): Headers {
  const newHeaders = new Headers(headers);
  newHeaders.set(CSRF_HEADER_NAME, csrfToken);
  return newHeaders;
}
