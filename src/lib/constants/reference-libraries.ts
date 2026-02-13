// Reference Libraries Constants

// Bucket options for Brand References
// Each bucket maps to a slider axis in onboarding with 3 values (low, middle, high)
// 4 Categories: Tone, Energy, Density, Color (Warmth)
export const TONE_BUCKETS = ['playful', 'balanced', 'serious'] as const
export const ENERGY_BUCKETS = ['calm', 'balanced', 'energetic'] as const
export const DENSITY_BUCKETS = ['minimal', 'balanced', 'rich'] as const
export const COLOR_BUCKETS = ['cool', 'neutral', 'warm'] as const

export type ToneBucket = (typeof TONE_BUCKETS)[number]
export type EnergyBucket = (typeof ENERGY_BUCKETS)[number]
export type DensityBucket = (typeof DENSITY_BUCKETS)[number]
export type ColorBucket = (typeof COLOR_BUCKETS)[number]

// Deliverable types for chat
export const DELIVERABLE_TYPES = [
  { value: 'instagram_post', label: 'Instagram Post' },
  { value: 'instagram_story', label: 'Instagram Story' },
  { value: 'instagram_reel', label: 'Instagram Reel' },
  { value: 'linkedin_post', label: 'LinkedIn Post' },
  { value: 'linkedin_banner', label: 'LinkedIn Banner' },
  { value: 'facebook_ad', label: 'Facebook Ad' },
  { value: 'twitter_post', label: 'Twitter/X Post' },
  { value: 'youtube_thumbnail', label: 'YouTube Thumbnail' },
  { value: 'email_header', label: 'Email Header' },
  { value: 'presentation_slide', label: 'Presentation Slide' },
  { value: 'web_banner', label: 'Web Banner' },
  { value: 'static_ad', label: 'Static Ad' },
  { value: 'video_ad', label: 'Video Ad' },
  { value: 'launch_video', label: 'Launch Video' },
  { value: 'logo', label: 'Logo' },
  { value: 'brand_identity', label: 'Brand Identity' },
] as const

// Video deliverable types (these use video references)
export const VIDEO_DELIVERABLE_TYPES = ['instagram_reel', 'video_ad', 'launch_video'] as const

export type VideoDeliverableType = (typeof VIDEO_DELIVERABLE_TYPES)[number]

// Common video style tags for categorization
export const VIDEO_STYLE_TAGS = [
  // Style categories
  'cinematic',
  'documentary',
  'animated',
  'motion-graphics',
  'live-action',
  'mixed-media',
  // Pace/Energy
  'fast-paced',
  'slow-motion',
  'dynamic',
  'calm',
  // Mood
  'inspirational',
  'dramatic',
  'playful',
  'professional',
  'emotional',
  'exciting',
  // Industry
  'tech',
  'saas',
  'ecommerce',
  'lifestyle',
  'corporate',
  'startup',
  // Format
  'product-showcase',
  'testimonial',
  'explainer',
  'teaser',
  'announcement',
  'brand-story',
] as const

export type VideoStyleTag = (typeof VIDEO_STYLE_TAGS)[number]

export type DeliverableType = (typeof DELIVERABLE_TYPES)[number]['value']

// Style axes for deliverable styles
export const STYLE_AXES = [
  { value: 'minimal', label: 'Minimal', description: 'Clean, simple, whitespace-focused' },
  { value: 'bold', label: 'Bold', description: 'Strong contrasts, impactful visuals' },
  { value: 'editorial', label: 'Editorial', description: 'Magazine-style, content-rich' },
  { value: 'corporate', label: 'Corporate', description: 'Professional, business-focused' },
  { value: 'playful', label: 'Playful', description: 'Fun, colorful, energetic' },
  { value: 'premium', label: 'Premium', description: 'Luxury, high-end, refined' },
  { value: 'organic', label: 'Organic', description: 'Natural, flowing, earthy' },
  { value: 'tech', label: 'Tech', description: 'Modern, digital, futuristic' },
] as const

export type StyleAxis = (typeof STYLE_AXES)[number]['value']

// Helper to get bucket from personality slider value (0-100)
// Low values (0-35) = first bucket option, High values (65-100) = last bucket option
export function getToneBucket(sliderValue: number): ToneBucket {
  if (sliderValue < 35) return 'playful'
  if (sliderValue > 65) return 'serious'
  return 'balanced'
}

export function getEnergyBucket(sliderValue: number): EnergyBucket {
  if (sliderValue < 35) return 'calm'
  if (sliderValue > 65) return 'energetic'
  return 'balanced'
}

export function getDensityBucket(sliderValue: number): DensityBucket {
  if (sliderValue < 35) return 'minimal'
  if (sliderValue > 65) return 'rich'
  return 'balanced'
}

export function getColorBucket(sliderValue: number): ColorBucket {
  if (sliderValue < 35) return 'cool'
  if (sliderValue > 65) return 'warm'
  return 'neutral'
}

// Helper to analyze color warmth from hex (for extracting from brand colors)
export function analyzeColorBucketFromHex(hexColor: string): ColorBucket {
  if (!hexColor) return 'neutral'
  const hex = hexColor.replace('#', '')

  // Handle 3-char hex
  const fullHex =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex

  const r = parseInt(fullHex.slice(0, 2), 16)
  const b = parseInt(fullHex.slice(4, 6), 16)
  const warmth = (r - b) / 255

  if (warmth > 0.2) return 'warm'
  if (warmth < -0.2) return 'cool'
  return 'neutral'
}

// Labels for display
export const TONE_BUCKET_LABELS: Record<ToneBucket, string> = {
  playful: 'Playful',
  balanced: 'Balanced',
  serious: 'Serious',
}

export const ENERGY_BUCKET_LABELS: Record<EnergyBucket, string> = {
  calm: 'Calm',
  balanced: 'Balanced',
  energetic: 'Energetic',
}

export const DENSITY_BUCKET_LABELS: Record<DensityBucket, string> = {
  minimal: 'Minimal',
  balanced: 'Balanced',
  rich: 'Rich',
}

export const COLOR_BUCKET_LABELS: Record<ColorBucket, string> = {
  cool: 'Cool',
  neutral: 'Neutral',
  warm: 'Warm',
}

// Common aliases/variations that AI might generate
export const DELIVERABLE_TYPE_ALIASES: Record<string, DeliverableType> = {
  // Instagram variations
  instagram_carousel: 'instagram_post',
  carousel: 'instagram_post',
  instagram_feed: 'instagram_post',
  ig_post: 'instagram_post',
  ig_story: 'instagram_story',
  ig_reel: 'instagram_reel',
  reels: 'instagram_reel',

  // LinkedIn variations
  linkedin_ad: 'static_ad',
  linkedin_carousel: 'linkedin_post',

  // Video variations
  product_video: 'launch_video',
  promo_video: 'launch_video',
  promotional_video: 'launch_video',
  brand_video: 'launch_video',
  marketing_video: 'launch_video',
  commercial: 'launch_video',
  video: 'launch_video',
  walkthrough_video: 'launch_video',
  app_walkthrough: 'launch_video',
  demo_video: 'launch_video',
  tutorial_video: 'launch_video',
  onboarding_video: 'launch_video',
  showcase_video: 'launch_video',
  overview_video: 'launch_video',
  explainer_video: 'launch_video',
  intro_video: 'launch_video',
  guided_tour: 'launch_video',

  // Generic variations
  social_post: 'instagram_post',
  ad: 'static_ad',
  banner: 'web_banner',

  // Presentation variations
  pitch_deck: 'presentation_slide',
  presentation: 'presentation_slide',
  slide: 'presentation_slide',
  slides: 'presentation_slide',
  deck: 'presentation_slide',
}

export function normalizeDeliverableType(type: string): DeliverableType {
  const normalized = type.toLowerCase().trim()

  // Check if it's already a valid type
  const validType = DELIVERABLE_TYPES.find((t) => t.value === normalized)
  if (validType) return validType.value

  // Check aliases
  if (normalized in DELIVERABLE_TYPE_ALIASES) {
    return DELIVERABLE_TYPE_ALIASES[normalized]
  }

  // Fallback to instagram_post as default
  return 'instagram_post'
}
