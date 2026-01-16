import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";

const isProduction = process.env.NODE_ENV === "production";

// Base domain used for OAuth callbacks and trusted origins
const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "craftedstudio.ai";

// The canonical auth URL - ALL OAuth callbacks go through this domain
// This MUST match what's registered in Google OAuth console
const getAuthBaseURL = () => {
  // Use BETTER_AUTH_URL if provided (Better Auth standard)
  if (process.env.BETTER_AUTH_URL) {
    const url = process.env.BETTER_AUTH_URL.trim();
    // In production, ensure HTTPS (convert HTTP to HTTPS if needed)
    if (isProduction && url.startsWith("http://")) {
      return url.replace("http://", "https://");
    }
    return url;
  }

  // Fallback: construct URL based on environment
  if (isProduction) {
    // In production, always use app subdomain for OAuth callbacks
    // This is the URL registered with Google OAuth
    return `https://app.${baseDomain}`;
  }
  return "http://localhost:3000";
};

// Trusted origins - all subdomains that can make auth requests
const trustedOrigins = isProduction
  ? [
      `https://app.${baseDomain}`,
      `https://artist.${baseDomain}`,
      `https://superadmin.${baseDomain}`,
      `https://www.${baseDomain}`,
      `https://${baseDomain}`,
    ]
  : [
      "http://localhost:3000",
      "http://app.localhost:3000",
      "http://artist.localhost:3000",
      "http://superadmin.localhost:3000",
    ];

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  baseURL: getAuthBaseURL(),
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    // Email verification required in production for security
    requireEmailVerification: isProduction,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Password reset configuration
    sendResetPassword: async ({ user, url }) => {
      // Import dynamically to avoid circular dependencies
      const { sendEmail, emailTemplates } = await import("@/lib/notifications");
      const resetEmail = emailTemplates.passwordReset(user.name, url);
      await sendEmail({
        to: user.email,
        subject: resetEmail.subject,
        html: resetEmail.html,
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "CLIENT",
        input: false,
      },
      phone: {
        type: "string",
        required: false,
      },
      credits: {
        type: "number",
        defaultValue: 0,
        input: false,
      },
      onboardingCompleted: {
        type: "boolean",
        defaultValue: false,
        input: false,
      },
      onboardingData: {
        type: "string",
        required: false,
        input: false,
      },
      notificationPreferences: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    // Disable cookie cache to ensure session data is always fresh from database
    // This is important when user data changes (e.g., onboardingCompleted)
    cookieCache: {
      enabled: false,
    },
  },
  advanced: {
    cookiePrefix: "crafted",
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: isProduction,
      httpOnly: true,
      path: "/",
      // Set domain for cookie sharing across subdomains in production
      // Required for OAuth callback to work correctly since the state cookie
      // needs to be readable after Google redirects back to the callback URL
      ...(isProduction && { domain: `.${baseDomain}` }),
    },
  },
  trustedOrigins,
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
  },
});

export type Session = typeof auth.$Infer.Session;
