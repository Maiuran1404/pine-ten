// App configuration - easy to update
export const config = {
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || "Crafted",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  },
  credits: {
    pricePerCredit: 49, // USD
    currency: "USD",
    lowBalanceThreshold: 2, // Warn when below this
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
      from: process.env.EMAIL_FROM || "Nameless <noreply@example.com>",
    },
    whatsapp: {
      number: process.env.TWILIO_WHATSAPP_NUMBER || "",
    },
  },
} as const;

// Task category configuration (can be overridden by DB)
export const defaultTaskCategories = [
  {
    name: "Static Ads",
    slug: "static-ads",
    description:
      "Static image advertisements for social media, display, and print",
    baseCredits: 1,
  },
  {
    name: "Video/Motion Graphics",
    slug: "video-motion",
    description: "Animated content, video ads, and motion graphics",
    baseCredits: 3,
  },
  {
    name: "Social Media Content",
    slug: "social-media",
    description: "Social media posts, stories, and carousel content",
    baseCredits: 1,
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
