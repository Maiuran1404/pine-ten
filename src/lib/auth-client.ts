import { createAuthClient } from "better-auth/react";

// Get auth base URL dynamically based on current environment
// This needs to work both during SSR and on the client
const getAuthBaseURL = () => {
  // On the client, use the current origin so OAuth works correctly
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  // During SSR, use the configured app URL
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
};

// Create auth client - baseURL will be determined at runtime
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
