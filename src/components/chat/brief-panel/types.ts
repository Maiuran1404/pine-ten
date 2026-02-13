/**
 * Types for the Live Brief Panel
 * This panel shows the designer-ready brief being built in real-time
 */

import type { DeliverableStyle } from '../types'

// =============================================================================
// CORE ENUMS & CONSTANTS
// =============================================================================

export const PLATFORMS = [
  'instagram',
  'linkedin',
  'facebook',
  'twitter',
  'youtube',
  'tiktok',
  'print',
  'web',
  'email',
  'presentation',
] as const

export type Platform = (typeof PLATFORMS)[number]

export const INTENTS = [
  'signups',
  'authority',
  'awareness',
  'sales',
  'engagement',
  'education',
  'announcement',
] as const

export type Intent = (typeof INTENTS)[number]

export const TASK_TYPES = ['single_asset', 'multi_asset_plan', 'campaign'] as const

export type TaskType = (typeof TASK_TYPES)[number]

export const CONTENT_TYPES = [
  'post',
  'story',
  'reel',
  'carousel',
  'banner',
  'ad',
  'thumbnail',
  'slide',
  'header',
  'flyer',
  'poster',
  'video',
] as const

export type ContentType = (typeof CONTENT_TYPES)[number]

// =============================================================================
// DIMENSION TYPES
// =============================================================================

export interface Dimension {
  width: number
  height: number
  label: string
  aspectRatio: string
  isDefault?: boolean // Used in client-side for default selection UI
}

// =============================================================================
// INFERENCE TYPES
// =============================================================================

export type FieldSource = 'pending' | 'inferred' | 'confirmed'

export interface InferredField<T> {
  value: T | null
  confidence: number // 0-1
  source: FieldSource
  inferredFrom?: string // What message/context triggered this inference
}

export interface InferenceResult {
  taskType: InferredField<TaskType>
  intent: InferredField<Intent>
  platform: InferredField<Platform>
  contentType: InferredField<ContentType>
  quantity: InferredField<number>
  duration: InferredField<string> // "30 days", "1 week", etc.
  topic: InferredField<string> // Main topic/subject
  audienceId: InferredField<string> // ID of matched audience from brand
}

// =============================================================================
// OUTLINE TYPES
// =============================================================================

export interface OutlineItem {
  id: string
  number: number
  title: string
  description: string
  platform: Platform | string
  contentType: ContentType | string
  dimensions: Dimension // Single dimension object, not array
  scheduledDate?: Date
  week: number // For grouping: Week 1, Week 2, etc.
  day: number // Day within the plan
  status: 'draft' | 'in_progress' | 'completed'
}

export interface WeekGroup {
  weekNumber: number
  label: string // "Week 1", "Week 2", etc.
  items: OutlineItem[]
  isExpanded: boolean
}

export interface ContentOutline {
  title: string
  subtitle: string
  totalItems: number
  weekGroups: WeekGroup[]
}

// =============================================================================
// VISUAL DIRECTION TYPES
// =============================================================================

export interface VisualDirection {
  selectedStyles: DeliverableStyle[]
  moodKeywords: string[]
  colorPalette: string[]
  typography: {
    primary: string
    secondary: string
  }
  avoidElements: string[]
}

// =============================================================================
// AUDIENCE BRIEF TYPES
// =============================================================================

// Source for audience values (different from FieldSource - no "pending")
export type AudienceSource = 'inferred' | 'selected' | 'custom'

export interface AudienceBrief {
  name: string
  demographics?: string
  psychographics?: string
  painPoints?: string[]
  goals?: string[]
  source?: AudienceSource
}

// =============================================================================
// LIVE BRIEF (Main State Object)
// =============================================================================

export interface LiveBrief {
  // Metadata
  id: string
  createdAt: Date
  updatedAt: Date

  // Header / Summary
  taskSummary: InferredField<string>

  // Core fields
  taskType: InferredField<TaskType>
  intent: InferredField<Intent>
  platform: InferredField<Platform>
  dimensions: Dimension[]

  // Audience
  audience: InferredField<AudienceBrief>

  // Content
  topic: InferredField<string>
  contentOutline: ContentOutline | null

  // Visual direction (populated from moodboard)
  visualDirection: VisualDirection | null

  // Completion tracking
  completionPercentage: number
  isReadyForDesigner: boolean

  // Conversation tracking
  lastMessageId?: string
  clarifyingQuestionsAsked: string[]
}

// =============================================================================
// DESIGNER BRIEF (Final Output)
// =============================================================================

export interface DesignerBrief {
  // Summary
  taskSummary: string

  // Intent & Goal
  intent: Intent
  intentDescription: string

  // Platform & Specs
  platform: Platform
  dimensions: Dimension[]

  // Audience
  audience: {
    name: string
    demographics: string
    psychographics: string
    painPoints: string[]
    goals: string[]
  }

  // Content
  content: {
    type: 'single' | 'multi'
    outline: OutlineItem[]
    copyGuidelines?: string
    hashtags?: string[]
  }

  // Visual Direction
  visualDirection: {
    selectedStyles: Array<{
      id: string
      name: string
      imageUrl: string
      styleAxis: string
    }>
    moodKeywords: string[]
    colorPalette: string[]
    typography: {
      primary: string
      secondary: string
    }
    avoidElements?: string[]
  }

  // Brand Context (auto-included)
  brandContext: {
    name: string
    industry: string
    toneOfVoice: string
    brandDescription: string
  }

  // Metadata
  generatedAt: Date
  conversationId: string
}

// =============================================================================
// BRIEF PANEL STATE
// =============================================================================

export type BriefPanelTab = 'brief' | 'outline' | 'visual'

export interface BriefPanelState {
  activeTab: BriefPanelTab
  isExpanded: boolean
  brief: LiveBrief
}

// =============================================================================
// CLARIFYING QUESTIONS
// =============================================================================

export interface ClarifyingQuestion {
  id: string
  field: keyof LiveBrief
  question: string
  options: Array<{
    label: string
    value: string
    description?: string
  }>
  priority: number // Lower = ask first
  askedAt?: Date
  answeredAt?: Date
  answer?: string
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function createEmptyBrief(id: string): LiveBrief {
  return {
    id,
    createdAt: new Date(),
    updatedAt: new Date(),
    taskSummary: { value: null, confidence: 0, source: 'pending' },
    taskType: { value: null, confidence: 0, source: 'pending' },
    intent: { value: null, confidence: 0, source: 'pending' },
    platform: { value: null, confidence: 0, source: 'pending' },
    dimensions: [],
    audience: { value: null, confidence: 0, source: 'pending' },
    topic: { value: null, confidence: 0, source: 'pending' },
    contentOutline: null,
    visualDirection: null,
    completionPercentage: 0,
    isReadyForDesigner: false,
    clarifyingQuestionsAsked: [],
  }
}

export function calculateBriefCompletion(brief: LiveBrief): number {
  const fields = [
    brief.taskSummary,
    brief.taskType,
    brief.intent,
    brief.platform,
    brief.audience,
    brief.topic,
  ]

  const filledFields = fields.filter(
    (f) => f.value !== null && (f.source === 'confirmed' || f.source === 'inferred')
  ).length

  let completion = (filledFields / fields.length) * 70 // Core fields = 70%

  // Content outline = 15%
  if (brief.contentOutline && brief.contentOutline.weekGroups.length > 0) {
    completion += 15
  }

  // Visual direction = 15%
  if (brief.visualDirection && brief.visualDirection.selectedStyles.length > 0) {
    completion += 15
  }

  return Math.round(completion)
}

export function isBriefReadyForDesigner(brief: LiveBrief): boolean {
  // Required fields must be confirmed or high-confidence inferred
  const hasTaskSummary = brief.taskSummary.value && brief.taskSummary.confidence >= 0.7
  const hasIntent = brief.intent.value && brief.intent.confidence >= 0.7
  const hasPlatform = brief.platform.value && brief.platform.confidence >= 0.7
  const hasAudience = brief.audience.value && brief.audience.confidence >= 0.7
  const hasDimensions = brief.dimensions.length > 0

  // Content outline is required for multi-asset, optional for single
  const hasContent =
    brief.taskType.value === 'single_asset' ||
    (brief.contentOutline && brief.contentOutline.weekGroups.length > 0)

  // Visual direction is required
  const hasVisual = brief.visualDirection && brief.visualDirection.selectedStyles.length > 0

  return !!(
    hasTaskSummary &&
    hasIntent &&
    hasPlatform &&
    hasAudience &&
    hasDimensions &&
    hasContent &&
    hasVisual
  )
}

// =============================================================================
// INTENT DESCRIPTIONS
// =============================================================================

export const INTENT_DESCRIPTIONS: Record<Intent, string> = {
  signups: 'Drive user registrations and sign-ups',
  authority: 'Build thought leadership and industry expertise',
  awareness: 'Increase brand visibility and recognition',
  sales: 'Generate leads and drive purchases',
  engagement: 'Boost interaction and community building',
  education: 'Inform and teach the audience',
  announcement: 'Share news, updates, or launches',
}

// =============================================================================
// PLATFORM DISPLAY NAMES
// =============================================================================

export const PLATFORM_DISPLAY_NAMES: Record<Platform, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  twitter: 'Twitter/X',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  print: 'Print',
  web: 'Web',
  email: 'Email',
  presentation: 'Presentation',
}
