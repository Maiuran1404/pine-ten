import { z } from "zod";

/**
 * Environment variable validation schema
 * Validates all required environment variables at build/startup time
 */
const envSchema = z.object({
  // App
  NEXT_PUBLIC_APP_NAME: z.string().default("Crafted"),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_BASE_DOMAIN: z.string().optional(),

  // Database
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Auth
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_"),

  // Anthropic
  ANTHROPIC_API_KEY: z.string().startsWith("sk-ant-"),

  // Email
  RESEND_API_KEY: z.string().startsWith("re_"),
  EMAIL_FROM: z.string().email().or(z.string().includes("<")),

  // Twilio (optional)
  TWILIO_ACCOUNT_SID: z.string().startsWith("AC").optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().optional(),

  // Admin (use env vars, not hardcoded)
  ADMIN_NOTIFICATION_EMAIL: z.string().email().optional(),

  // Runtime
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables
 * Call this at app startup to fail fast on missing config
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([key, messages]) => `  ${key}: ${messages?.join(", ")}`)
      .join("\n");

    throw new Error(
      `Environment validation failed:\n${errorMessages}\n\nPlease check your .env.local file.`
    );
  }

  return result.data;
}

/**
 * Get validated environment (cached)
 * Use this to access env vars throughout the app
 */
let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = validateEnv();
  }
  return cachedEnv;
}

/**
 * Safe environment access (won't throw, returns undefined for missing)
 * Use when you need optional env vars
 */
export function getEnvSafe<K extends keyof Env>(key: K): Env[K] | undefined {
  try {
    return getEnv()[key];
  } catch {
    return undefined;
  }
}

/**
 * Check if all required env vars are set (for health checks)
 */
export function checkEnvHealth(): {
  healthy: boolean;
  missing: string[];
} {
  const required = [
    "DATABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "BETTER_AUTH_SECRET",
    "STRIPE_SECRET_KEY",
    "ANTHROPIC_API_KEY",
    "RESEND_API_KEY",
  ];

  const missing = required.filter((key) => !process.env[key]);

  return {
    healthy: missing.length === 0,
    missing,
  };
}
