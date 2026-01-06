import { createAuthClient } from "better-auth/react";

// Get the base URL for auth API calls
// Since all subdomains are the same Next.js app, we can use the current origin
// Cookies are shared across subdomains via domain: .craftedstudio.ai
const getAuthBaseURL = () => {
  if (typeof window === "undefined") {
    // Server-side: use environment variable
    return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  }
  // Client-side: use current origin
  return window.location.origin;
};

// Create auth client
export const authClient = createAuthClient({
  baseURL: getAuthBaseURL(),
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;
