/**
 * Creative Intake System Types
 *
 * Defines service types, intake flows, smart defaults, and inference rules
 * for the optimized creative project intake experience.
 */

// =============================================================================
// SERVICE TYPES
// =============================================================================

export const SERVICE_TYPES = [
  'launch_video',
  'video_edit',
  'pitch_deck',
  'brand_package',
  'social_ads',
  'social_content',
] as const

export type ServiceType = (typeof SERVICE_TYPES)[number]

export interface ServiceDefinition {
  id: ServiceType
  label: string
  shortLabel: string
  description: string
  icon: string // Lucide icon name
  estimatedQuestions: number
  category: 'video' | 'design' | 'brand' | 'social'
}

export const SERVICE_DEFINITIONS: Record<ServiceType, ServiceDefinition> = {
  launch_video: {
    id: 'launch_video',
    label: 'Launch Video',
    shortLabel: 'Launch',
    description: 'Launching something new? Get a video that captures attention.',
    icon: 'Rocket',
    estimatedQuestions: 4,
    category: 'video',
  },
  video_edit: {
    id: 'video_edit',
    label: 'Video Edit',
    shortLabel: 'Edit',
    description: "Have footage? We'll turn it into something polished.",
    icon: 'Film',
    estimatedQuestions: 4,
    category: 'video',
  },
  pitch_deck: {
    id: 'pitch_deck',
    label: 'Pitch Deck',
    shortLabel: 'Deck',
    description: 'Make your pitch deck look professional and compelling.',
    icon: 'Presentation',
    estimatedQuestions: 2,
    category: 'design',
  },
  brand_package: {
    id: 'brand_package',
    label: 'Brand Package',
    shortLabel: 'Brand',
    description: 'Full brand identity: logo, colors, guidelines, and more.',
    icon: 'Palette',
    estimatedQuestions: 3,
    category: 'brand',
  },
  social_ads: {
    id: 'social_ads',
    label: 'Social Media Ads',
    shortLabel: 'Ads',
    description: 'Paid ads that convert across all platforms.',
    icon: 'Target',
    estimatedQuestions: 3,
    category: 'social',
  },
  social_content: {
    id: 'social_content',
    label: 'Social Content',
    shortLabel: 'Content',
    description: 'Organic content that builds your audience and authority.',
    icon: 'Share2',
    estimatedQuestions: 3,
    category: 'social',
  },
}

// =============================================================================
// PLATFORM & GOAL TYPES
// =============================================================================

export const VIDEO_PLATFORMS = ['tiktok', 'reels', 'linkedin', 'youtube', 'snapchat'] as const
export const SOCIAL_PLATFORMS = [
  'instagram',
  'linkedin',
  'facebook',
  'tiktok',
  'snapchat',
  'twitter',
] as const

export type VideoPlatform = (typeof VIDEO_PLATFORMS)[number]
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]

export const PLATFORM_LABELS: Record<string, string> = {
  tiktok: 'TikTok',
  reels: 'Instagram Reels',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  snapchat: 'Snapchat',
  facebook: 'Facebook',
  twitter: 'Twitter/X',
}

// Video-specific
export const VIDEO_TYPES = [
  'ugc',
  'talking_head',
  'screen_recording',
  'event',
  'podcast_clip',
] as const
export type VideoType = (typeof VIDEO_TYPES)[number]

export const VIDEO_TYPE_LABELS: Record<VideoType, string> = {
  ugc: 'UGC (User Generated Content)',
  talking_head: 'Talking Head',
  screen_recording: 'Screen Recording',
  event: 'Event Footage',
  podcast_clip: 'Podcast Clip',
}

export const VIDEO_GOALS = ['engagement', 'clarity', 'promotion', 'education'] as const
export type VideoGoal = (typeof VIDEO_GOALS)[number]

export const VIDEO_GOAL_LABELS: Record<VideoGoal, string> = {
  engagement: 'Engagement (likes, comments, shares)',
  clarity: 'Clarity (explain something clearly)',
  promotion: 'Promotion (drive action)',
  education: 'Education (teach something)',
}

// Ad-specific
export const AD_GOALS = ['sales', 'signups', 'awareness', 'leads'] as const
export type AdGoal = (typeof AD_GOALS)[number]

export const AD_GOAL_LABELS: Record<AdGoal, string> = {
  sales: 'Sales (drive purchases)',
  signups: 'Sign-ups (get registrations)',
  awareness: 'Awareness (reach new people)',
  leads: 'Leads (capture contact info)',
}

export const AD_FORMATS = ['static', 'video', 'carousel'] as const
export type AdFormat = (typeof AD_FORMATS)[number]

// Content-specific
export const CONTENT_GOALS = ['authority', 'trust', 'growth', 'storytelling'] as const
export type ContentGoal = (typeof CONTENT_GOALS)[number]

export const CONTENT_GOAL_LABELS: Record<ContentGoal, string> = {
  authority: 'Authority (establish expertise)',
  trust: 'Trust (build relationships)',
  growth: 'Growth (gain followers)',
  storytelling: 'Storytelling (share your journey)',
}

export const CONTENT_TYPES_SOCIAL = [
  'educational',
  'behind_the_scenes',
  'product',
  'memes',
  'storytelling',
] as const
export type ContentTypeSocial = (typeof CONTENT_TYPES_SOCIAL)[number]

export const CONTENT_TYPE_LABELS: Record<ContentTypeSocial, string> = {
  educational: 'Educational (tips, how-tos)',
  behind_the_scenes: 'Behind the Scenes',
  product: 'Product Focused',
  memes: 'Memes & Trends',
  storytelling: 'Storytelling',
}

export const POSTING_FREQUENCIES = ['3x_week', '5x_week', 'daily'] as const
export type PostingFrequency = (typeof POSTING_FREQUENCIES)[number]

export const POSTING_FREQUENCY_LABELS: Record<PostingFrequency, string> = {
  '3x_week': '3x per week',
  '5x_week': '5x per week',
  daily: 'Daily',
}

// Style references
export const VIDEO_STYLES = ['clean', 'energetic', 'cinematic', 'meme', 'corporate'] as const
export type VideoStyle = (typeof VIDEO_STYLES)[number]

export const VIDEO_STYLE_LABELS: Record<VideoStyle, string> = {
  clean: 'Clean & Minimal',
  energetic: 'Energetic & Fast-paced',
  cinematic: 'Cinematic & Polished',
  meme: 'Meme & Trendy',
  corporate: 'Corporate & Professional',
}

// =============================================================================
// ASSET TYPES
// =============================================================================

export const LAUNCH_ASSETS = [
  'logo',
  'product_photos',
  'ui_screenshots',
  'figma',
  'website',
] as const
export type LaunchAsset = (typeof LAUNCH_ASSETS)[number]

export const LAUNCH_ASSET_LABELS: Record<LaunchAsset, string> = {
  logo: 'Logo',
  product_photos: 'Product Photos',
  ui_screenshots: 'UI/Screenshots',
  figma: 'Figma Files',
  website: 'Website (we can pull from)',
}

export const BRAND_ASSETS = ['logo', 'fonts', 'colors', 'brand_guidelines'] as const
export type BrandAsset = (typeof BRAND_ASSETS)[number]

// =============================================================================
// INTAKE DATA TYPES (Per Service)
// =============================================================================

export interface LaunchVideoIntake {
  serviceType: 'launch_video'
  // Required
  productDescription: string
  keyMessage: string
  // Grouped question
  platforms: VideoPlatform[]
  assetsAvailable: LaunchAsset[]
  // Optional/defaulted
  storylinePreference: 'have_ideas' | 'create_for_me'
  storylineNotes?: string
  cta?: string
  // Smart defaults applied
  recommendedLength: string
  recommendedStyle: VideoStyle
}

export interface VideoEditIntake {
  serviceType: 'video_edit'
  // Required
  videoType: VideoType
  platforms: VideoPlatform[]
  goal: VideoGoal
  footageLink: string
  // Optional
  brandAssetsLink?: string
  stylePreference?: VideoStyle
  styleReferenceLink?: string
  // Smart defaults
  recommendedLength: string
  subtitles: boolean
  musicPreference: 'upbeat' | 'calm' | 'trendy' | 'none'
  textOverlays: boolean
  cta?: string
}

export interface PitchDeckIntake {
  serviceType: 'pitch_deck'
  // Required
  currentDeckLink: string
  // Optional context
  additionalNotes?: string
  // We pull brand context automatically
}

export interface BrandPackageIntake {
  serviceType: 'brand_package'
  // Required
  hasLogo: boolean
  logoLink?: string
  // What's included (we recommend)
  includesItems: (
    | 'logo'
    | 'social_templates'
    | 'brand_guidelines'
    | 'business_cards'
    | 'presentations'
  )[]
  // Context
  industryDescription?: string
  competitorExamples?: string[]
  stylePreferences?: string
}

export interface SocialAdsIntake {
  serviceType: 'social_ads'
  // Required - grouped
  platforms: SocialPlatform[]
  goal: AdGoal
  // Required
  productOrOffer: string
  hasContent: boolean
  contentLink?: string
  // Optional
  keyMessage?: string
  styleReference?: string
  // Smart defaults
  recommendedFormat: AdFormat
  recommendedCta: string
}

export interface SocialContentIntake {
  serviceType: 'social_content'
  // Required - grouped
  platforms: SocialPlatform[]
  goal: ContentGoal
  // Required
  topics: string[]
  // Optional
  styleExamples?: string[]
  // Smart defaults
  recommendedFrequency: PostingFrequency
  recommendedContentTypes: ContentTypeSocial[]
}

export type IntakeData =
  | LaunchVideoIntake
  | VideoEditIntake
  | PitchDeckIntake
  | BrandPackageIntake
  | SocialAdsIntake
  | SocialContentIntake

// Generic intake data for working with partial data before service type is known
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GenericIntakeData = Record<string, any>

// =============================================================================
// INTAKE FLOW STATE
// =============================================================================

export type IntakeStage = 'service_select' | 'context' | 'details' | 'review' | 'complete'

// Partial summary format from AI parsing (before full conversion)
export interface ParsedSummary {
  type?: 'summary'
  title: string
  items: Array<{ label: string; value: string | string[]; source?: string }>
  recommendations: string[]
  nextStep?: string
}

export interface IntakeMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  // Special message types
  questionType?: 'open' | 'grouped' | 'confirmation' | 'quick'
  groupedQuestions?: GroupedQuestion[]
  quickOptions?: QuickOption[]
  summary?: IntakeSummary | ParsedSummary
}

export interface GroupedQuestion {
  id: string
  label: string
  type: 'single_select' | 'multi_select' | 'text' | 'link'
  options?: SelectOption[]
  placeholder?: string
  required?: boolean
  recommendation?: string
  value?: string | string[]
}

export interface SelectOption {
  value: string
  label: string
  description?: string
  recommended?: boolean
}

export interface QuickOption {
  label: string
  value: string
  variant?: 'default' | 'recommended'
}

export interface IntakeSummary {
  serviceType: ServiceType
  title: string
  items: SummaryItem[]
  recommendations: string[]
  readyToSubmit: boolean
}

export interface SummaryItem {
  label: string
  value: string | string[]
  source: 'user' | 'inferred' | 'default'
  editable: boolean
}

export interface IntakeState {
  id: string
  serviceType: ServiceType | null
  stage: IntakeStage
  messages: IntakeMessage[]
  data: GenericIntakeData
  completionPercentage: number
  startedAt: Date
  updatedAt: Date
}

// =============================================================================
// SMART DEFAULTS & RECOMMENDATIONS
// =============================================================================

export interface SmartDefaults {
  // Video length recommendations by platform
  videoLength: Record<VideoPlatform, string>
  // Ad format recommendations by goal
  adFormat: Record<AdGoal, AdFormat>
  // Posting frequency by goal
  postingFrequency: Record<ContentGoal, PostingFrequency>
  // Content types by goal
  contentTypes: Record<ContentGoal, ContentTypeSocial[]>
  // Style by video type
  videoStyle: Record<VideoType, VideoStyle>
}

export const SMART_DEFAULTS: SmartDefaults = {
  videoLength: {
    tiktok: '15-30s',
    reels: '15-30s',
    linkedin: '30-60s',
    youtube: '60-90s',
    snapchat: '10-15s',
  },
  adFormat: {
    sales: 'carousel',
    signups: 'video',
    awareness: 'video',
    leads: 'static',
  },
  postingFrequency: {
    authority: '3x_week',
    trust: '3x_week',
    growth: '5x_week',
    storytelling: '3x_week',
  },
  contentTypes: {
    authority: ['educational', 'storytelling'],
    trust: ['behind_the_scenes', 'storytelling'],
    growth: ['memes', 'educational', 'product'],
    storytelling: ['storytelling', 'behind_the_scenes'],
  },
  videoStyle: {
    ugc: 'energetic',
    talking_head: 'clean',
    screen_recording: 'clean',
    event: 'cinematic',
    podcast_clip: 'clean',
  },
}

// =============================================================================
// INFERENCE RULES
// =============================================================================

export interface InferenceRule {
  field: string
  triggers: string[]
  value: string
  confidence: number
}

// These are simplified - actual inference happens in the AI
export const INFERENCE_PATTERNS: Record<ServiceType, InferenceRule[]> = {
  launch_video: [
    {
      field: 'platforms',
      triggers: ['students', 'gen z', 'young'],
      value: 'tiktok,reels',
      confidence: 0.8,
    },
    {
      field: 'platforms',
      triggers: ['b2b', 'professional', 'enterprise'],
      value: 'linkedin,youtube',
      confidence: 0.8,
    },
    { field: 'style', triggers: ['serious', 'professional'], value: 'corporate', confidence: 0.7 },
    { field: 'style', triggers: ['fun', 'playful', 'casual'], value: 'energetic', confidence: 0.7 },
  ],
  video_edit: [
    { field: 'subtitles', triggers: ['tiktok', 'reels', 'social'], value: 'true', confidence: 0.9 },
    { field: 'music', triggers: ['corporate', 'professional'], value: 'calm', confidence: 0.7 },
    {
      field: 'music',
      triggers: ['energetic', 'fun', 'trending'],
      value: 'trendy',
      confidence: 0.7,
    },
  ],
  pitch_deck: [],
  brand_package: [
    {
      field: 'includesItems',
      triggers: ['startup', 'new company'],
      value: 'logo,brand_guidelines',
      confidence: 0.8,
    },
  ],
  social_ads: [
    { field: 'format', triggers: ['e-commerce', 'product'], value: 'carousel', confidence: 0.7 },
    { field: 'format', triggers: ['app', 'saas', 'software'], value: 'video', confidence: 0.7 },
  ],
  social_content: [
    {
      field: 'frequency',
      triggers: ['aggressive', 'growth', 'fast'],
      value: '5x_week',
      confidence: 0.7,
    },
    {
      field: 'contentTypes',
      triggers: ['thought leader', 'expert'],
      value: 'educational,storytelling',
      confidence: 0.8,
    },
  ],
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function createEmptyIntakeState(id: string): IntakeState {
  return {
    id,
    serviceType: null,
    stage: 'service_select',
    messages: [],
    data: {},
    completionPercentage: 0,
    startedAt: new Date(),
    updatedAt: new Date(),
  }
}

export function getServiceDefinition(serviceType: ServiceType): ServiceDefinition {
  return SERVICE_DEFINITIONS[serviceType]
}

export function getRecommendedVideoLength(platforms: VideoPlatform[]): string {
  if (platforms.length === 0) return '30-60s'

  // Get the shortest recommended length for multi-platform
  const _lengths = platforms.map((p) => SMART_DEFAULTS.videoLength[p])
  // Simple logic: if any short-form platform, recommend short
  if (platforms.some((p) => ['tiktok', 'reels', 'snapchat'].includes(p))) {
    return '15-30s'
  }
  return '30-60s'
}

export function getRecommendedAdFormat(goal: AdGoal): AdFormat {
  return SMART_DEFAULTS.adFormat[goal]
}

export function getRecommendedContentTypes(goal: ContentGoal): ContentTypeSocial[] {
  return SMART_DEFAULTS.contentTypes[goal]
}

export function getRecommendedPostingFrequency(goal: ContentGoal): PostingFrequency {
  return SMART_DEFAULTS.postingFrequency[goal]
}

export function calculateIntakeCompletion(state: IntakeState): number {
  if (!state.serviceType) return 0

  const requiredFields = getRequiredFields(state.serviceType)
  const filledFields = requiredFields.filter((field) => {
    const value = state.data[field]
    if (value === undefined || value === null) return false
    if (typeof value === 'string' && value.trim() === '') return false
    if (Array.isArray(value) && value.length === 0) return false
    return true
  })

  return Math.round((filledFields.length / requiredFields.length) * 100)
}

function getRequiredFields(serviceType: ServiceType): string[] {
  switch (serviceType) {
    case 'launch_video':
      return ['productDescription', 'keyMessage', 'platforms', 'assetsAvailable']
    case 'video_edit':
      return ['videoType', 'platforms', 'goal', 'footageLink']
    case 'pitch_deck':
      return ['currentDeckLink']
    case 'brand_package':
      return ['hasLogo', 'includesItems']
    case 'social_ads':
      return ['platforms', 'goal', 'productOrOffer', 'hasContent']
    case 'social_content':
      return ['platforms', 'goal', 'topics']
    default:
      return []
  }
}
