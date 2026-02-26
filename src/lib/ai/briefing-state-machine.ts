/**
 * Briefing State Machine
 *
 * Core logic for state management and transitions in the creative briefing flow.
 * BriefingState COMPOSES LiveBrief — it holds a `brief: LiveBrief` field.
 * All functions are pure — no side effects, no API calls, no DOM access.
 */

import type {
  LiveBrief,
  InferredField,
  VisualDirection,
  Dimension,
  InferenceResult,
} from '@/components/chat/brief-panel/types'
import { createEmptyBrief } from '@/components/chat/brief-panel/types'

// =============================================================================
// CORE ENUMS & TYPES
// =============================================================================

export type BriefingStage =
  | 'EXTRACT'
  | 'TASK_TYPE'
  | 'INTENT'
  | 'INSPIRATION'
  | 'STRUCTURE'
  | 'ELABORATE'
  | 'STRATEGIC_REVIEW'
  | 'MOODBOARD'
  | 'REVIEW'
  | 'DEEPEN'
  | 'SUBMIT'

export type DeliverableCategory = 'video' | 'website' | 'content' | 'design' | 'brand' | 'unknown'

// =============================================================================
// STRUCTURE TYPES (Branched by Deliverable)
// =============================================================================

export type StructureData =
  | { type: 'storyboard'; scenes: StoryboardScene[] }
  | { type: 'layout'; sections: LayoutSection[] }
  | { type: 'calendar'; outline: ContentCalendarOutline }
  | { type: 'single_design'; specification: DesignSpec }

export interface StoryboardScene {
  sceneNumber: number
  title: string
  description: string
  duration: string
  visualNote: string
  hookData?: VideoHookData
  referenceVideoId?: string
  voiceover?: string
  transition?: string
  cameraNote?: string
  styleReferences?: string[]
  imageSearchTerms?: string[] // AI-generated visual search keywords for Pexels
  filmTitleSuggestions?: string[] // AI-generated film titles for Film-Grab cinematic stills
  visualTechniques?: string[] // Camera/editing techniques for Eyecannndy (e.g. dutch-angle, tracking)
  // Elaboration fields (populated during ELABORATE stage)
  fullScript?: string
  directorNotes?: string
  referenceImageIds?: string[]
  referenceDescription?: string
  // Resolved image data (populated after image search, persists with scene)
  resolvedImageUrl?: string
  resolvedImageSource?: string
  resolvedImageAttribution?: {
    sourceName: string
    sourceUrl: string
    filmTitle?: string
    photographer?: string
  }
}

export interface VideoHookData {
  targetPersona: string
  painMetric: string
  quantifiableImpact: string
}

export interface LayoutSection {
  sectionName: string
  purpose: string
  contentGuidance: string
  order: number
  fidelity?: 'low' | 'mid' | 'high'
  // Elaboration fields (populated during ELABORATE stage)
  draftContent?: string
  headline?: string
  subheadline?: string
  ctaText?: string
  referenceDescription?: string
  referenceStyleIds?: string[]
  userNotes?: string
}

export interface ContentCalendarOutline {
  totalDuration: string
  postingCadence: string
  platforms: string[]
  distributionLogic: string
  contentPillars: ContentPillar[]
  weeks: ContentWeek[]
  ctaEscalation: CTAEscalationPlan
}

export interface ContentPillar {
  name: string
  description: string
  percentage: number
  // Elaboration fields (populated during ELABORATE stage)
  visualIdentity?: string
  colorAccent?: string
  toneNote?: string
}

export interface ContentWeek {
  weekNumber: number
  narrativeArc: string
  theme: string
  posts: ContentPost[]
}

export interface ContentPost {
  dayOfWeek: string
  pillarType: 'pillar' | 'support'
  topic: string
  format: string
  cta: string
  engagementTrigger: string
  // Elaboration fields (populated during ELABORATE stage)
  sampleCopy?: string
  visualDescription?: string
  hashtagStrategy?: string
  captionHook?: string
}

export interface CTAEscalationPlan {
  awarenessPhase: { weeks: number[]; ctaStyle: string }
  engagementPhase: { weeks: number[]; ctaStyle: string }
  conversionPhase: { weeks: number[]; ctaStyle: string }
}

export interface DesignSpec {
  format: string
  dimensions: Dimension[]
  keyElements: string[]
  copyGuidance: string
  // Elaboration fields (populated during ELABORATE stage)
  exactCopy?: string[]
  layoutNotes?: string
  referenceDesignIds?: string[]
  referenceDescription?: string
}

// =============================================================================
// VIDEO NARRATIVE (Story concept before storyboard)
// =============================================================================

export interface VideoNarrative {
  concept: string
  narrative: string
  hook: string
}

// =============================================================================
// STRATEGIC REVIEW TYPES
// =============================================================================

export interface StrategicReviewData {
  strengths: string[]
  risks: string[]
  optimizationSuggestion: string
  inspirationFitScore: 'aligned' | 'minor_mismatch' | 'significant_mismatch'
  inspirationFitNote: string | null
  userOverride: boolean
}

export type DeepenOption =
  | 'production_copy'
  | 'script_writing'
  | 'ab_variant'
  | 'conversion_optimization'
  | 'asset_specifications'

// =============================================================================
// TONE PROFILE TYPES
// =============================================================================

export interface ToneProfile {
  languageSharpness: 'direct' | 'conversational' | 'formal'
  technicalDepth: 'high' | 'medium' | 'low'
  emotionalIntensity: 'high' | 'medium' | 'low'
  directnessLevel: 'high' | 'medium' | 'low'
  vocabularyRegister: string[]
  toneDescription: string
}

// =============================================================================
// WEBSITE-SPECIFIC TYPES
// =============================================================================

export interface WebsiteInspiration {
  id: string
  url: string
  screenshotUrl: string
  name: string
  notes?: string
  isUserSubmitted?: boolean
}

export interface WebsiteGlobalStyles {
  primaryColor?: string
  secondaryColor?: string
  fontPrimary?: string
  fontSecondary?: string
  layoutDensity?: 'compact' | 'balanced' | 'spacious'
}

// =============================================================================
// BRIEFING STATE (Composes LiveBrief)
// =============================================================================

export interface BriefingState {
  stage: BriefingStage
  deliverableCategory: DeliverableCategory | null
  brief: LiveBrief

  // Fields that DON'T exist in LiveBrief
  industry: InferredField<string> | null
  styleKeywords: string[]
  inspirationRefs: string[]
  videoReferenceIds: string[]
  structure: StructureData | null
  strategicReview: StrategicReviewData | null
  sectionMoodboards: Record<string, Partial<VisualDirection>>
  competitiveDifferentiation: string | null
  deepenSelections: DeepenOption[] | null
  toneProfile: ToneProfile | null
  turnsInCurrentStage: number
  messageCount: number
  // Video narrative (story concept before storyboard, video only)
  videoNarrative: VideoNarrative | null
  narrativeApproved: boolean
  // Website-specific (only populated for website deliverables)
  websiteInspirations?: WebsiteInspiration[]
  websiteGlobalStyles?: WebsiteGlobalStyles
}

// =============================================================================
// STALL CONFIG
// =============================================================================

export interface StallConfig {
  maxTurnsBeforeNarrow: number | null
  maxTurnsBeforeRecommend: number | null
  softNudgeAfter: number | null
}

export const STALL_CONFIG: Record<BriefingStage, StallConfig> = {
  EXTRACT: { maxTurnsBeforeNarrow: 1, maxTurnsBeforeRecommend: 2, softNudgeAfter: null },
  TASK_TYPE: { maxTurnsBeforeNarrow: 1, maxTurnsBeforeRecommend: 2, softNudgeAfter: null },
  INTENT: { maxTurnsBeforeNarrow: 1, maxTurnsBeforeRecommend: 2, softNudgeAfter: null },
  INSPIRATION: {
    maxTurnsBeforeNarrow: null,
    maxTurnsBeforeRecommend: null,
    softNudgeAfter: null,
  },
  STRUCTURE: { maxTurnsBeforeNarrow: null, maxTurnsBeforeRecommend: null, softNudgeAfter: 4 },
  ELABORATE: { maxTurnsBeforeNarrow: null, maxTurnsBeforeRecommend: null, softNudgeAfter: 3 },
  STRATEGIC_REVIEW: {
    maxTurnsBeforeNarrow: null,
    maxTurnsBeforeRecommend: null,
    softNudgeAfter: null,
  },
  MOODBOARD: { maxTurnsBeforeNarrow: null, maxTurnsBeforeRecommend: null, softNudgeAfter: null },
  REVIEW: { maxTurnsBeforeNarrow: null, maxTurnsBeforeRecommend: null, softNudgeAfter: null },
  DEEPEN: { maxTurnsBeforeNarrow: null, maxTurnsBeforeRecommend: null, softNudgeAfter: null },
  SUBMIT: { maxTurnsBeforeNarrow: null, maxTurnsBeforeRecommend: null, softNudgeAfter: null },
}

// Stage ordering for navigation
const STAGE_ORDER: BriefingStage[] = [
  'EXTRACT',
  'TASK_TYPE',
  'INTENT',
  'STRUCTURE',
  'INSPIRATION',
  'ELABORATE',
  'STRATEGIC_REVIEW',
  'MOODBOARD',
  'REVIEW',
  'DEEPEN',
  'SUBMIT',
]

// =============================================================================
// STAGE PIPELINE — the single source of truth for stage progression
// =============================================================================

interface StageGate {
  stage: BriefingStage
  /** Return true when this stage's work is done and we can move on */
  exitWhen: (state: BriefingState) => boolean
}

export const STAGE_PIPELINE: StageGate[] = [
  {
    stage: 'EXTRACT',
    exitWhen: (s) => s.brief.topic.confidence >= 0.4 && s.brief.topic.value !== null,
  },
  {
    stage: 'TASK_TYPE',
    exitWhen: (s) => s.brief.taskType.confidence >= 0.4 && s.brief.taskType.value !== null,
  },
  {
    stage: 'INTENT',
    exitWhen: (s) => s.brief.intent.confidence >= 0.4 && s.brief.intent.value !== null,
  },
  {
    stage: 'STRUCTURE',
    exitWhen: (s) => {
      if (!s.structure) return false
      // Video requires narrative approval before advancing
      if (s.deliverableCategory === 'video' && !s.narrativeApproved) return false
      return true
    },
  },
  {
    stage: 'INSPIRATION',
    exitWhen: (s) => (s.brief.visualDirection?.selectedStyles?.length ?? 0) > 0,
  },
  {
    stage: 'ELABORATE',
    exitWhen: (s) => checkElaborationComplete(s),
  },
  // STRATEGIC_REVIEW currently disabled — omit from pipeline to skip
  {
    stage: 'MOODBOARD',
    exitWhen: (s) => s.brief.visualDirection !== null,
  },
  {
    stage: 'REVIEW',
    exitWhen: () => false, // terminal — only CONFIRM_SUBMIT advances past
  },
]

/**
 * Derive the current stage purely from accumulated state data.
 * Scans the gate pipeline and returns the first stage whose exit condition isn't met.
 *
 * Properties:
 * - Pure: same state → same stage, always
 * - Monotonic: stages only advance as data accumulates
 * - Timing-independent: reads final state, not intermediate pipeline values
 */
export function deriveStage(state: BriefingState): BriefingStage {
  for (const gate of STAGE_PIPELINE) {
    if (!gate.exitWhen(state)) return gate.stage
  }
  return 'SUBMIT'
}

// =============================================================================
// LEGAL TRANSITIONS
// =============================================================================

/**
 * Returns the set of stages that are legal next states from the given stage.
 * Used to validate AI-declared stage transitions via [BRIEF_META].
 */
export function getLegalTransitions(stage: BriefingStage): BriefingStage[] {
  const LEGAL: Record<BriefingStage, BriefingStage[]> = {
    EXTRACT: ['EXTRACT', 'TASK_TYPE', 'INTENT', 'STRUCTURE'],
    TASK_TYPE: ['TASK_TYPE', 'INTENT', 'STRUCTURE'],
    INTENT: ['INTENT', 'STRUCTURE'],
    STRUCTURE: ['STRUCTURE', 'INSPIRATION'],
    INSPIRATION: ['INSPIRATION', 'ELABORATE'],
    ELABORATE: ['ELABORATE', 'MOODBOARD'],
    STRATEGIC_REVIEW: ['STRATEGIC_REVIEW', 'MOODBOARD'],
    MOODBOARD: ['MOODBOARD', 'REVIEW'],
    REVIEW: ['REVIEW', 'DEEPEN', 'SUBMIT'],
    DEEPEN: ['DEEPEN', 'REVIEW', 'SUBMIT'],
    SUBMIT: ['SUBMIT'],
  }
  return LEGAL[stage] ?? [stage]
}

// =============================================================================
// FACTORY
// =============================================================================

export function createInitialBriefingState(briefId?: string): BriefingState {
  return {
    stage: 'EXTRACT',
    deliverableCategory: null,
    brief: createEmptyBrief(briefId ?? crypto.randomUUID()),
    industry: null,
    styleKeywords: [],
    inspirationRefs: [],
    videoReferenceIds: [],
    structure: null,
    strategicReview: null,
    sectionMoodboards: {},
    competitiveDifferentiation: null,
    deepenSelections: null,
    toneProfile: null,
    turnsInCurrentStage: 0,
    messageCount: 0,
    videoNarrative: null,
    narrativeApproved: false,
  }
}

// =============================================================================
// TRANSITION LOGIC
// =============================================================================

/**
 * Evaluate what stage the state machine should be in given current state and inference.
 * Pure function — same inputs always produce same output.
 *
 * Only evaluates FORWARD transitions from EXTRACT.
 * For ongoing transitions (staying/advancing from non-EXTRACT stages),
 * the stage is managed by the message processing pipeline.
 *
 * @deprecated Use `deriveStage()` instead — declarative pipeline replaces imperative transitions.
 */
export function evaluateTransitions(
  state: BriefingState,
  inference: InferenceResult
): BriefingStage {
  // EXTRACT is the entry point — determine landing stage from first message
  if (state.stage === 'EXTRACT') {
    return evaluateExtractLanding(state, inference)
  }

  // For non-EXTRACT stages, evaluate if we can advance
  return evaluateStageAdvancement(state)
}

/**
 * After EXTRACT, determine which stage to land on based on what was inferred.
 * Key principle: skip stages when data is available.
 */
function evaluateExtractLanding(state: BriefingState, inference: InferenceResult): BriefingStage {
  // Check both inference AND accumulated state — prevents re-stalling at EXTRACT
  // when accumulated state has good data but the latest message's inference is weak
  // Threshold lowered to 0.4: any weak signal from inference is enough to advance
  const hasTaskType =
    (inference.taskType.value !== null && inference.taskType.confidence >= 0.4) ||
    (state.brief.taskType.value !== null && state.brief.taskType.confidence >= 0.4)
  const hasIntent =
    (inference.intent.value !== null && inference.intent.confidence >= 0.4) ||
    (state.brief.intent.value !== null && state.brief.intent.confidence >= 0.4)

  // If we don't even know what they're making, go to TASK_TYPE
  if (!hasTaskType) {
    return 'TASK_TYPE'
  }

  // If we know what but not why, go to INTENT
  if (!hasIntent) {
    return 'INTENT'
  }

  // Both task type and intent are known — skip to STRUCTURE
  return 'STRUCTURE'
}

/**
 * Evaluate if the current stage can advance to the next one.
 * Returns current stage if requirements not met.
 */
function evaluateStageAdvancement(state: BriefingState): BriefingStage {
  switch (state.stage) {
    case 'TASK_TYPE': {
      const hasTaskType =
        state.brief.taskType.value !== null && state.brief.taskType.confidence >= 0.4
      // Force advance after maxTurnsBeforeRecommend turns — don't gate on value being non-null
      const forceAdvance =
        state.turnsInCurrentStage >= (STALL_CONFIG.TASK_TYPE.maxTurnsBeforeRecommend ?? Infinity)
      if (!hasTaskType && !forceAdvance) return 'TASK_TYPE'

      const hasIntent = state.brief.intent.value !== null && state.brief.intent.confidence >= 0.4
      return hasIntent ? 'STRUCTURE' : 'INTENT'
    }

    case 'INTENT': {
      const hasIntent = state.brief.intent.value !== null && state.brief.intent.confidence >= 0.4
      const forceAdvance =
        state.turnsInCurrentStage >= (STALL_CONFIG.INTENT.maxTurnsBeforeRecommend ?? Infinity)
      return hasIntent || forceAdvance ? 'STRUCTURE' : 'INTENT'
    }

    case 'STRUCTURE': {
      // Video projects: two-phase flow (narrative → storyboard)
      // Must have narrative approved AND structure data before advancing
      if (state.deliverableCategory === 'video') {
        const hasNarrativeAndStructure = state.narrativeApproved && state.structure !== null
        if (hasNarrativeAndStructure || state.turnsInCurrentStage >= 5) {
          return 'INSPIRATION'
        }
        return 'STRUCTURE'
      }
      // Non-video: INSPIRATION requires structure !== null, or force-advance after 2 turns
      // to prevent permanent stuck state when structure markers are missing
      if (state.structure !== null || state.turnsInCurrentStage >= 2) {
        return 'INSPIRATION'
      }
      return 'STRUCTURE'
    }

    case 'INSPIRATION': {
      // ELABORATE requires selectedStyles.length > 0, or force-advance after 3 turns
      const hasStyles =
        state.brief.visualDirection !== null &&
        state.brief.visualDirection.selectedStyles.length > 0
      const forceAdvance = state.turnsInCurrentStage >= 3
      return hasStyles || forceAdvance ? 'ELABORATE' : 'INSPIRATION'
    }

    case 'ELABORATE': {
      // Advance to MOODBOARD when elaboration is complete or after 3 turns
      // (STRATEGIC_REVIEW stage is temporarily disabled)
      if (checkElaborationComplete(state) || state.turnsInCurrentStage >= 3) {
        return 'MOODBOARD'
      }
      return 'ELABORATE'
    }

    case 'STRATEGIC_REVIEW': {
      // Advance to MOODBOARD if strategic review data exists, or after 2 turns
      if (state.strategicReview !== null || state.turnsInCurrentStage >= 2) {
        return 'MOODBOARD'
      }
      return 'STRATEGIC_REVIEW'
    }

    case 'MOODBOARD': {
      // REVIEW requires overallMoodboard !== null (visualDirection)
      return state.brief.visualDirection !== null ? 'REVIEW' : 'MOODBOARD'
    }

    case 'REVIEW': {
      // Advance to SUBMIT after 1+ turns (user has reviewed and responded)
      if (state.turnsInCurrentStage >= 1) {
        return 'SUBMIT'
      }
      return 'REVIEW'
    }

    case 'DEEPEN': {
      // Stays until user dispatches CONFIRM_SUBMIT
      return 'DEEPEN'
    }

    case 'SUBMIT':
      return 'SUBMIT'

    default:
      return state.stage
  }
}

// =============================================================================
// ELABORATION CHECK
// =============================================================================

/**
 * Check if elaboration detail fields are populated on the current structure.
 * Returns true if the structure has at least some elaboration data filled in.
 */
export function checkElaborationComplete(state: BriefingState): boolean {
  if (!state.structure) return false

  switch (state.structure.type) {
    case 'storyboard': {
      // Check if any scene has fullScript or directorNotes
      return state.structure.scenes.some((s) => s.fullScript || s.directorNotes)
    }
    case 'layout': {
      // Check if any section has headline or draftContent
      return state.structure.sections.some((s) => s.headline || s.draftContent)
    }
    case 'calendar': {
      // Check if any post has sampleCopy or captionHook
      const hasPostDetail = state.structure.outline.weeks.some((w) =>
        w.posts.some((p) => p.sampleCopy || p.captionHook)
      )
      // Check if any pillar has visualIdentity
      const hasPillarDetail = state.structure.outline.contentPillars.some((p) => p.visualIdentity)
      return hasPostDetail || hasPillarDetail
    }
    case 'single_design': {
      // Check if exactCopy or layoutNotes are present
      const spec = state.structure.specification
      return (spec.exactCopy !== undefined && spec.exactCopy.length > 0) || !!spec.layoutNotes
    }
    default:
      return false
  }
}

// =============================================================================
// GO BACK
// =============================================================================

/**
 * Navigate back to a previous stage, clearing data produced at and after the target stage.
 * Returns a new state — does not mutate the input.
 */
export function goBackTo(state: BriefingState, targetStage: BriefingStage): BriefingState {
  const targetIndex = STAGE_ORDER.indexOf(targetStage)
  const currentIndex = STAGE_ORDER.indexOf(state.stage)

  // Can't go forward or stay
  if (targetIndex >= currentIndex) {
    return state
  }

  const newState: BriefingState = {
    ...state,
    stage: targetStage,
    turnsInCurrentStage: 0,
  }

  // Clear fields based on target stage
  // Going back to INSPIRATION or earlier: clears visualDirection
  if (targetIndex <= STAGE_ORDER.indexOf('INSPIRATION')) {
    newState.brief = {
      ...newState.brief,
      visualDirection: null,
    }
  }

  // Going back to INTENT or earlier: clears intent + all downstream
  if (targetIndex <= STAGE_ORDER.indexOf('INTENT')) {
    newState.brief = {
      ...newState.brief,
      intent: { value: null, confidence: 0, source: 'pending' },
    }
  }

  // Going back to TASK_TYPE or earlier: clears taskType + all downstream
  if (targetIndex <= STAGE_ORDER.indexOf('TASK_TYPE')) {
    newState.brief = {
      ...newState.brief,
      taskType: { value: null, confidence: 0, source: 'pending' },
    }
    newState.deliverableCategory = null
  }

  // Clear structure and downstream for anything at STRUCTURE or earlier
  if (targetIndex <= STAGE_ORDER.indexOf('STRUCTURE')) {
    newState.structure = null
    newState.strategicReview = null
    newState.sectionMoodboards = {}
    newState.deepenSelections = null
    newState.videoNarrative = null
    newState.narrativeApproved = false
  }

  // Going back to ELABORATE: clear strategic review + downstream, keep structure
  if (
    targetIndex <= STAGE_ORDER.indexOf('ELABORATE') &&
    targetIndex > STAGE_ORDER.indexOf('STRUCTURE')
  ) {
    newState.strategicReview = null
    newState.sectionMoodboards = {}
    newState.deepenSelections = null
  }

  // Clear strategic review and downstream for anything at STRATEGIC_REVIEW or earlier
  if (
    targetIndex <= STAGE_ORDER.indexOf('STRATEGIC_REVIEW') &&
    targetIndex > STAGE_ORDER.indexOf('ELABORATE')
  ) {
    newState.strategicReview = null
    newState.sectionMoodboards = {}
    newState.deepenSelections = null
  }

  // Clear moodboard stuff for MOODBOARD or earlier
  if (
    targetIndex <= STAGE_ORDER.indexOf('MOODBOARD') &&
    targetIndex > STAGE_ORDER.indexOf('STRATEGIC_REVIEW')
  ) {
    newState.sectionMoodboards = {}
    newState.deepenSelections = null
  }

  // Clear deepen selections for REVIEW or earlier
  if (
    targetIndex <= STAGE_ORDER.indexOf('REVIEW') &&
    targetIndex > STAGE_ORDER.indexOf('MOODBOARD')
  ) {
    newState.deepenSelections = null
  }

  return newState
}

// =============================================================================
// PIVOT CATEGORY
// =============================================================================

/**
 * Change deliverable category, preserving intent/topic/audience/styleKeywords/inspirationRefs/moodboard.
 * Clears structure, strategicReview, sectionMoodboards, competitiveDifferentiation, deepenSelections.
 * Resets to STRUCTURE stage.
 */
export function pivotCategory(
  state: BriefingState,
  newCategory: DeliverableCategory
): BriefingState {
  return {
    ...state,
    stage: 'STRUCTURE',
    deliverableCategory: newCategory,
    // Preserve: intent, topic, audience, styleKeywords, inspirationRefs, overallMoodboard
    // Clear downstream
    structure: null,
    strategicReview: null,
    sectionMoodboards: {},
    competitiveDifferentiation: null,
    deepenSelections: null,
    videoNarrative: null,
    narrativeApproved: false,
    turnsInCurrentStage: 0,
  }
}

// =============================================================================
// SERIALIZATION
// =============================================================================

export interface SerializedBriefingState {
  stage: BriefingStage
  deliverableCategory: DeliverableCategory | null
  brief: SerializedLiveBrief
  industry: InferredField<string> | null
  styleKeywords: string[]
  inspirationRefs: string[]
  videoReferenceIds: string[]
  structure: StructureData | null
  strategicReview: StrategicReviewData | null
  sectionMoodboards: Record<string, Partial<VisualDirection>>
  competitiveDifferentiation: string | null
  deepenSelections: DeepenOption[] | null
  toneProfile: ToneProfile | null
  turnsInCurrentStage: number
  messageCount: number
  videoNarrative: VideoNarrative | null
  narrativeApproved: boolean
  websiteInspirations?: WebsiteInspiration[]
  websiteGlobalStyles?: WebsiteGlobalStyles
}

interface SerializedLiveBrief extends Omit<LiveBrief, 'createdAt' | 'updatedAt'> {
  createdAt: string
  updatedAt: string
}

export function serialize(state: BriefingState): SerializedBriefingState {
  return {
    ...state,
    brief: {
      ...state.brief,
      createdAt: state.brief.createdAt.toISOString(),
      updatedAt: state.brief.updatedAt.toISOString(),
    },
  }
}

export function deserialize(data: SerializedBriefingState): BriefingState {
  return {
    ...data,
    brief: {
      ...data.brief,
      createdAt: new Date(data.brief.createdAt),
      updatedAt: new Date(data.brief.updatedAt),
    },
  }
}
