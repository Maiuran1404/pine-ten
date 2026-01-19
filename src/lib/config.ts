/**
 * App configuration
 * All sensitive values must come from environment variables
 */

// Get env var with optional fallback
// Build-time validation is disabled to allow CI builds without all env vars
// Runtime validation should happen when the value is actually used
function requireEnv(key: string, fallback?: string): string {
  return process.env[key] || fallback || "";
}

export const config = {
  app: {
    name: requireEnv("NEXT_PUBLIC_APP_NAME", "Crafted"),
    url: requireEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
    baseDomain: process.env.NEXT_PUBLIC_BASE_DOMAIN || "getcrafted.ai",
  },
  credits: {
    pricePerCredit: 4.9, // USD (1 credit = $5)
    currency: "USD",
    lowBalanceThreshold: 20, // Warn when below this (was 2 before 10x inflation)
  },
  tasks: {
    defaultMaxRevisions: 2,
    priorityLevels: {
      LOW: 0,
      NORMAL: 1,
      HIGH: 2,
      URGENT: 3,
    },
  },
  notifications: {
    email: {
      // Must be set in production
      from: requireEnv("EMAIL_FROM", "Crafted <noreply@localhost>"),
      // Admin email must be set via env var in production
      adminEmail: requireEnv("ADMIN_NOTIFICATION_EMAIL"),
    },
    whatsapp: {
      number: process.env.TWILIO_WHATSAPP_NUMBER || "",
      // Admin WhatsApp number must be set via env var in production
      adminNumber: requireEnv("ADMIN_WHATSAPP_NUMBER"),
    },
  },
  // Upload limits
  uploads: {
    maxFileSizeMB: 50,
    maxFilesPerRequest: 10,
  },
  // Rate limits
  rateLimits: {
    api: { window: 60, max: 100 }, // 100 req/min
    auth: { window: 60, max: 20 }, // 20 req/min
    chat: { window: 60, max: 30 }, // 30 req/min (AI is expensive)
  },
} as const;

// Task category configuration (can be overridden by DB)
export const defaultTaskCategories = [
  {
    name: "Static Ads",
    slug: "static-ads",
    description:
      "Static image advertisements for social media, display, and print",
    baseCredits: 10,
  },
  {
    name: "Video/Motion Graphics",
    slug: "video-motion",
    description: "Animated content, video ads, and motion graphics",
    baseCredits: 30,
  },
  {
    name: "Social Media Content",
    slug: "social-media",
    description: "Social media posts, stories, and carousel content",
    baseCredits: 10,
  },
  {
    name: "UI/UX Design",
    slug: "ui-ux",
    description:
      "User interface and experience design for apps, websites, and digital products",
    baseCredits: 50,
  },
] as const;

// Complexity multipliers for credit calculation
export const complexityMultipliers = {
  SIMPLE: 1,
  MODERATE: 1.5,
  COMPLEX: 2,
  PREMIUM: 3,
} as const;

// Style reference categories for seeding
export const styleReferenceCategories = [
  "Minimalist",
  "Bold & Colorful",
  "Corporate & Professional",
  "Playful & Fun",
  "Elegant & Luxury",
  "Modern & Clean",
  "Retro & Vintage",
  "Tech & Futuristic",
] as const;
