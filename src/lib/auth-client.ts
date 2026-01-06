import { createAuthClient } from "better-auth/react";

// Determine the auth API base URL
// In production, ALL auth API calls go through app.craftedstudio.ai
// This ensures OAuth callbacks work correctly (they're registered with Google for this domain)
// Cookies are shared across subdomains via domain: .craftedstudio.ai
const getAuthBaseURL = () => {
  if (typeof window === "undefined") {
    // Server-side: use environment variable
    return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  }

  // Client-side: determine based on hostname
  const hostname = window.location.hostname;

  // Development: use localhost
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return "http://localhost:3000";
  }

  // Production: always use app subdomain for auth API
  // This is critical for OAuth to work - Google callback is registered here
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "craftedstudio.ai";
  return `https://app.${baseDomain}`;
};

// Create auth client pointing to the canonical auth endpoint
export const authClient = createAuthClient({
  baseURL: getAuthBaseURL(),
  fetchOptions: {
    // Ensure credentials are included for cross-subdomain requests
    credentials: "include",
  },
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;

// Helper to clear local session state
export const clearLocalSession = () => {
  if (typeof window !== "undefined") {
    // Clear any cached session data
    window.location.href = "/api/auth/clear-session";
  }
};
