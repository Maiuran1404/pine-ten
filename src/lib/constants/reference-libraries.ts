// Reference Libraries Constants

// Bucket options for Brand References
export const TONE_BUCKETS = ["playful", "balanced", "serious"] as const;
export const ENERGY_BUCKETS = ["bold", "balanced", "minimal"] as const;
export const COLOR_BUCKETS = ["warm", "cool", "neutral", "vibrant", "muted"] as const;

export type ToneBucket = (typeof TONE_BUCKETS)[number];
export type EnergyBucket = (typeof ENERGY_BUCKETS)[number];
export type ColorBucket = (typeof COLOR_BUCKETS)[number];

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
export function getToneBucket(feelPlayfulSerious: number): ToneBucket {
  if (feelPlayfulSerious < 35) return "playful";
  if (feelPlayfulSerious > 65) return "serious";
  return "balanced";
}

export function getEnergyBucket(feelBoldMinimal: number): EnergyBucket {
  if (feelBoldMinimal < 35) return "bold";
  if (feelBoldMinimal > 65) return "minimal";
  return "balanced";
}

// Helper to analyze color warmth from hex
export function analyzeColorBucket(hexColor: string): ColorBucket {
  if (!hexColor) return "neutral";
  const hex = hexColor.replace("#", "");

  // Handle 3-char hex
  const fullHex = hex.length === 3
    ? hex.split("").map(c => c + c).join("")
    : hex;

  const r = parseInt(fullHex.slice(0, 2), 16);
  const g = parseInt(fullHex.slice(2, 4), 16);
  const b = parseInt(fullHex.slice(4, 6), 16);

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const warmth = (r - b) / 255;

  if (saturation < 0.15) return "neutral";
  if (saturation > 0.65) return "vibrant";
  if (warmth > 0.25) return "warm";
  if (warmth < -0.25) return "cool";
  return "muted";
}

// Labels for display
export const TONE_BUCKET_LABELS: Record<ToneBucket, string> = {
  playful: "Playful",
  balanced: "Balanced",
  serious: "Serious",
};

export const ENERGY_BUCKET_LABELS: Record<EnergyBucket, string> = {
  bold: "Bold",
  balanced: "Balanced",
  minimal: "Minimal",
};

export const COLOR_BUCKET_LABELS: Record<ColorBucket, string> = {
  warm: "Warm",
  cool: "Cool",
  neutral: "Neutral",
  vibrant: "Vibrant",
  muted: "Muted",
};
