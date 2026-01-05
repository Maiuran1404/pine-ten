import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";

const isProduction = process.env.NODE_ENV === "production";

// Admin credentials from environment (hashed password comparison)
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
export const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

// Get the base domain for cookie sharing across subdomains
const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "craftedstudio.ai";

// Build trusted origins for all subdomains
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

// Get the base URL for Better Auth - needed for OAuth callbacks
const getBaseURL = () => {
  if (isProduction) {
    // In production, use the APP_URL environment variable
    return process.env.NEXT_PUBLIC_APP_URL || `https://app.${baseDomain}`;
  }
  return "http://localhost:3000";
};

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
  baseURL: getBaseURL(),
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: isProduction,
    minPasswordLength: 8,
    maxPasswordLength: 128,
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
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  advanced: {
    cookiePrefix: "pine",
    useSecureCookies: isProduction,
    defaultCookieAttributes: {
      sameSite: "lax", // Required for OAuth redirects
      httpOnly: true,
      path: "/",
    },
  },
  trustedOrigins,
  rateLimit: {
    enabled: true,
    window: 60, // 1 minute
    max: 100, // max requests per window
  },
  onAPIError: {
    errorURL: "/auth-error",
  },
});

export type Session = typeof auth.$Infer.Session;
