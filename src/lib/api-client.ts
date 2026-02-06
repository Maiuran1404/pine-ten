"use client";

import { logger } from "@/lib/logger";

/**
 * Centralized API client with automatic CSRF token handling
 * Use this for all API calls to ensure consistent security and error handling
 */

const CSRF_HEADER_NAME = "x-csrf-token";

// Store the CSRF token in memory
let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

/**
 * Fetch and cache the CSRF token
 */
async function fetchCsrfToken(): Promise<string> {
  const response = await fetch("/api/csrf");
  if (!response.ok) {
    throw new Error("Failed to fetch CSRF token");
  }
  const data = await response.json();
  const token: string = data.csrfToken;
  csrfToken = token;
  return token;
}

/**
 * Get the CSRF token, fetching if necessary
 */
async function getCsrfToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }

  // Prevent multiple simultaneous fetches
  if (!csrfTokenPromise) {
    csrfTokenPromise = fetchCsrfToken().finally(() => {
      csrfTokenPromise = null;
    });
  }

  return csrfTokenPromise;
}

/**
 * Refresh the CSRF token (call after 403 errors)
 */
export async function refreshCsrfToken(): Promise<void> {
  csrfToken = null;
  await getCsrfToken();
}

/**
 * API client configuration
 */
interface ApiClientOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  skipCsrf?: boolean;
}

/**
 * API response type
 */
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
}

/**
 * Make an API request with automatic CSRF token handling
 */
export async function apiClient<T = unknown>(
  url: string,
  options: ApiClientOptions = {}
): Promise<ApiResponse<T>> {
  const { body, skipCsrf = false, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers);

  // Set content type for JSON bodies
  if (body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Add CSRF token for state-changing requests
  const method = (fetchOptions.method || "GET").toUpperCase();
  const requiresCsrf = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  if (requiresCsrf && !skipCsrf) {
    try {
      const token = await getCsrfToken();
      headers.set(CSRF_HEADER_NAME, token);
    } catch (error) {
      logger.warn({ err: error }, "Failed to get CSRF token, proceeding without it");
    }
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Handle CSRF token errors - refresh token and retry once
  if (response.status === 403) {
    const errorData = await response.clone().json().catch(() => ({}));
    if (errorData.error?.code === "SEC_001" || errorData.error?.includes?.("CSRF")) {
      await refreshCsrfToken();
      const token = await getCsrfToken();
      headers.set(CSRF_HEADER_NAME, token);

      const retryResponse = await fetch(url, {
        ...fetchOptions,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      return retryResponse.json();
    }
  }

  return response.json();
}

/**
 * Convenience methods
 */
export const api = {
  get: <T = unknown>(url: string, options?: Omit<ApiClientOptions, "method">) =>
    apiClient<T>(url, { ...options, method: "GET" }),

  post: <T = unknown>(url: string, body?: unknown, options?: Omit<ApiClientOptions, "method" | "body">) =>
    apiClient<T>(url, { ...options, method: "POST", body }),

  put: <T = unknown>(url: string, body?: unknown, options?: Omit<ApiClientOptions, "method" | "body">) =>
    apiClient<T>(url, { ...options, method: "PUT", body }),

  patch: <T = unknown>(url: string, body?: unknown, options?: Omit<ApiClientOptions, "method" | "body">) =>
    apiClient<T>(url, { ...options, method: "PATCH", body }),

  delete: <T = unknown>(url: string, options?: Omit<ApiClientOptions, "method">) =>
    apiClient<T>(url, { ...options, method: "DELETE" }),
};

/**
 * Form data upload with CSRF token
 */
export async function uploadFile(
  url: string,
  formData: FormData,
  options: Omit<ApiClientOptions, "body"> = {}
): Promise<ApiResponse> {
  const headers = new Headers(options.headers);

  // Don't set Content-Type for FormData - browser will set it with boundary
  try {
    const token = await getCsrfToken();
    headers.set(CSRF_HEADER_NAME, token);
  } catch (error) {
    logger.warn({ err: error }, "Failed to get CSRF token for upload");
  }

  const response = await fetch(url, {
    ...options,
    method: "POST",
    headers,
    body: formData,
  });

  return response.json();
}
