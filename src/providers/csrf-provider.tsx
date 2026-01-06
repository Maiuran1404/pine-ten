"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

const CSRF_HEADER_NAME = "x-csrf-token";

interface CsrfContextType {
  csrfToken: string | null;
  isLoading: boolean;
  getCsrfHeaders: () => Record<string, string>;
  csrfFetch: (url: string, options?: RequestInit) => Promise<Response>;
  refreshToken: () => Promise<void>;
}

const CsrfContext = createContext<CsrfContextType | null>(null);

interface CsrfProviderProps {
  children: ReactNode;
}

export function CsrfProvider({ children }: CsrfProviderProps) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchToken = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/csrf");
      if (response.ok) {
        const data = await response.json();
        setCsrfToken(data.csrfToken);
      }
    } catch (err) {
      console.error("CSRF token fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  const getCsrfHeaders = useCallback((): Record<string, string> => {
    if (!csrfToken) return {};
    return { [CSRF_HEADER_NAME]: csrfToken };
  }, [csrfToken]);

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

  return (
    <CsrfContext.Provider
      value={{
        csrfToken,
        isLoading,
        getCsrfHeaders,
        csrfFetch,
        refreshToken: fetchToken,
      }}
    >
      {children}
    </CsrfContext.Provider>
  );
}

export function useCsrfContext() {
  const context = useContext(CsrfContext);
  if (!context) {
    throw new Error("useCsrfContext must be used within a CsrfProvider");
  }
  return context;
}
