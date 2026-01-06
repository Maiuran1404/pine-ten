import { createAuthClient } from "better-auth/react";

// For cross-subdomain auth, we need to use the canonical auth URL
// All auth requests should go through the same origin
const getAuthBaseURL = () => {
  if (typeof window === "undefined") {
    // Server-side: use environment variable
    return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  }

  // Client-side: use current origin (all subdomains share the same Next.js app)
  // Cookies are shared across subdomains via domain: .craftedstudio.ai
  return window.location.origin;
};

// Create auth client
export const authClient = createAuthClient({
  baseURL: getAuthBaseURL(),
  // Ensure credentials are included for cross-origin requests
  fetchOptions: {
    credentials: "include",
  },
});

// Export auth methods
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;

// Helper to check if user is authenticated (for use in components)
export async function isAuthenticated(): Promise<boolean> {
  try {
    const session = await getSession();
    return !!session?.data?.user;
  } catch {
    return false;
  }
}

// Helper to clear all auth state (for logout or error recovery)
export async function clearAuthState(): Promise<void> {
  try {
    await signOut();
  } catch {
    // Ignore errors - the session might already be invalid
  }
}
