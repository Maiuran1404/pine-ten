// Reference Libraries Constants

// Bucket options for Brand References
// Each bucket maps to a slider axis in onboarding with 3 values (low, middle, high)
export const TONE_BUCKETS = ["playful", "balanced", "serious"] as const;
export const ENERGY_BUCKETS = ["calm", "balanced", "energetic"] as const;
export const DENSITY_BUCKETS = ["minimal", "balanced", "rich"] as const;
export const COLOR_BUCKETS = ["cool", "neutral", "warm"] as const;
export const PREMIUM_BUCKETS = ["accessible", "balanced", "premium"] as const;

export type ToneBucket = (typeof TONE_BUCKETS)[number];
export type EnergyBucket = (typeof ENERGY_BUCKETS)[number];
export type DensityBucket = (typeof DENSITY_BUCKETS)[number];
export type ColorBucket = (typeof COLOR_BUCKETS)[number];
export type PremiumBucket = (typeof PREMIUM_BUCKETS)[number];

// Deliverable types for chat
export const DELIVERABLE_TYPES = [
  { value: "instagram_post", label: "Instagram Post" },
  { value: "instagram_story", label: "Instagram Story" },
  { value: "instagram_reel", label: "Instagram Reel" },
  { value: "linkedin_post", label: "LinkedIn Post" },
  { value: "linkedin_banner", label: "LinkedIn Banner" },
  { value: "facebook_ad", label: "Facebook Ad" },
  { value: "twitter_post", label: "Twitter/X Post" },
  { value: "youtube_thumbnail", label: "YouTube Thumbnail" },
  { value: "email_header", label: "Email Header" },
  { value: "presentation_slide", label: "Presentation Slide" },
  { value: "web_banner", label: "Web Banner" },
  { value: "static_ad", label: "Static Ad" },
  { value: "video_ad", label: "Video Ad" },
] as const;

export type DeliverableType = (typeof DELIVERABLE_TYPES)[number]["value"];

// Style axes for deliverable styles
export const STYLE_AXES = [
  { value: "minimal", label: "Minimal", description: "Clean, simple, whitespace-focused" },
  { value: "bold", label: "Bold", description: "Strong contrasts, impactful visuals" },
  { value: "editorial", label: "Editorial", description: "Magazine-style, content-rich" },
  { value: "corporate", label: "Corporate", description: "Professional, business-focused" },
  { value: "playful", label: "Playful", description: "Fun, colorful, energetic" },
  { value: "premium", label: "Premium", description: "Luxury, high-end, refined" },
  { value: "organic", label: "Organic", description: "Natural, flowing, earthy" },
  { value: "tech", label: "Tech", description: "Modern, digital, futuristic" },
] as const;

export type StyleAxis = (typeof STYLE_AXES)[number]["value"];

// Helper to get bucket from personality slider value (0-100)
// Low values (0-35) = first bucket option, High values (65-100) = last bucket option
export function getToneBucket(sliderValue: number): ToneBucket {
  if (sliderValue < 35) return "playful";
  if (sliderValue > 65) return "serious";
  return "balanced";
}

export function getEnergyBucket(sliderValue: number): EnergyBucket {
  if (sliderValue < 35) return "calm";
  if (sliderValue > 65) return "energetic";
  return "balanced";
}

export function getDensityBucket(sliderValue: number): DensityBucket {
  if (sliderValue < 35) return "minimal";
  if (sliderValue > 65) return "rich";
  return "balanced";
}

export function getColorBucket(sliderValue: number): ColorBucket {
  if (sliderValue < 35) return "cool";
  if (sliderValue > 65) return "warm";
  return "neutral";
}

export function getPremiumBucket(sliderValue: number): PremiumBucket {
  if (sliderValue < 35) return "accessible";
  if (sliderValue > 65) return "premium";
  return "balanced";
}

// Helper to analyze color warmth from hex (for extracting from brand colors)
export function analyzeColorBucketFromHex(hexColor: string): ColorBucket {
  if (!hexColor) return "neutral";
  const hex = hexColor.replace("#", "");

  // Handle 3-char hex
  const fullHex = hex.length === 3
    ? hex.split("").map(c => c + c).join("")
    : hex;

  const r = parseInt(fullHex.slice(0, 2), 16);
  const b = parseInt(fullHex.slice(4, 6), 16);
  const warmth = (r - b) / 255;

  if (warmth > 0.2) return "warm";
  if (warmth < -0.2) return "cool";
  return "neutral";
}

// Labels for display
export const TONE_BUCKET_LABELS: Record<ToneBucket, string> = {
  playful: "Playful",
  balanced: "Balanced",
  serious: "Serious",
};

export const ENERGY_BUCKET_LABELS: Record<EnergyBucket, string> = {
  calm: "Calm",
  balanced: "Balanced",
  energetic: "Energetic",
};

export const DENSITY_BUCKET_LABELS: Record<DensityBucket, string> = {
  minimal: "Minimal",
  balanced: "Balanced",
  rich: "Rich",
};

export const COLOR_BUCKET_LABELS: Record<ColorBucket, string> = {
  cool: "Cool",
  neutral: "Neutral",
  warm: "Warm",
};

export const PREMIUM_BUCKET_LABELS: Record<PremiumBucket, string> = {
  accessible: "Accessible",
  balanced: "Balanced",
  premium: "Premium",
};
