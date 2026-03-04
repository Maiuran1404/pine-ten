/**
 * Parse-with-retry: Shared retry budget for AI response parsing.
 *
 * Replaces 6 independent retry blocks in route.ts with a single utility.
 * Max 1 retry total per request (configurable via budget).
 *
 * Priority: User-initiated actions get priority since the user explicitly expects output.
 *   SCENE_FEEDBACK (1) > REGENERATION (2) > VIDEO_NARRATIVE (3) > STRUCTURE (4) > STRATEGIC_REVIEW (5)
 */
import 'server-only'

import { logger } from '@/lib/logger'
import { chat, type ChatContext, type ChatMessage } from '@/lib/ai/chat'
import { buildSystemPrompt, type BrandContext } from '@/lib/ai/briefing-prompts'
import {
  parseStructuredOutput,
  parseStrategicReview,
  parseVideoNarrative,
  getFormatReinforcement,
  getStrategicReviewReinforcement,
  getVideoNarrativeReinforcement,
  type StructureType,
} from '@/lib/ai/briefing-response-parser'
import type {
  BriefingState,
  StructureData,
  StrategicReviewData,
  VideoNarrative,
} from '@/lib/ai/briefing-state-machine'

// =============================================================================
// TYPES
// =============================================================================

export interface RetryCandidate {
  /** Marker type for logging and diagnostics */
  markerType:
    | 'SCENE_FEEDBACK'
    | 'REGENERATION'
    | 'VIDEO_NARRATIVE'
    | 'STRUCTURE'
    | 'ELABORATE'
    | 'STRATEGIC_REVIEW'
  /** Whether this candidate should be retried */
  shouldRetry: boolean
  /** Lower = tried first when budget is limited */
  priority: number
  /** Builds the reinforcement prompt for the retry */
  buildReinforcement: () => string
  /** Parses the retry response and returns what was captured */
  parseRetryResponse: (content: string) => RetryCapturedData
}

interface RetryCapturedData {
  structureData?: StructureData
  strategicReviewData?: StrategicReviewData
  videoNarrativeData?: VideoNarrative
}

export interface ParseWithRetryInput {
  /** Current briefing state (mutated in place, matching existing route.ts pattern) */
  briefingState: BriefingState
  /** Brand context for system prompt rebuilding */
  brandContext: BrandContext | undefined
  /** Full message history (original request) */
  messages: ChatMessage[]
  /** Original AI response content */
  responseContent: string
  /** Session user ID for chat() calls */
  userId: string
  /** Chat context for chat() calls */
  chatContext: ChatContext
  /** Stage before Phase A parsing began */
  stageBeforePhaseA: string
  /** Current parse results (may already have data from first pass) */
  structureData: StructureData | undefined
  strategicReviewData: StrategicReviewData | undefined
  videoNarrativeData: VideoNarrative | undefined
  /** Structure type determined from deliverable category */
  structureType: StructureType | undefined
  /** Whether user message was scene feedback */
  isSceneFeedback: boolean
  /** Whether user requested storyboard regeneration */
  isRegenerationRequest: boolean
  /** Whether narrative was already approved */
  narrativeApproved: boolean
  /** Client's latest storyboard (for scene feedback context) */
  clientLatestStoryboard: StructureData | null
}

export interface ParseWithRetryResult {
  structureData: StructureData | undefined
  strategicReviewData: StrategicReviewData | undefined
  videoNarrativeData: VideoNarrative | undefined
  /** Whether any retry was attempted */
  retried: boolean
  /** Marker types that were retried */
  retriedMarkers: string[]
  /** Marker types that failed even after retry */
  failures: string[]
  /** Whether the budget was exhausted */
  budgetExhausted: boolean
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

export async function parseWithRetry(
  input: ParseWithRetryInput,
  budget: { maxRetries: number } = { maxRetries: 1 }
): Promise<ParseWithRetryResult> {
  const candidates = buildRetryCandidates(input)
  const eligible = candidates.filter((c) => c.shouldRetry).sort((a, b) => a.priority - b.priority)

  let retriesUsed = 0
  const retriedMarkers: string[] = []
  const failures: string[] = []

  // Start with current parse results
  let { structureData, strategicReviewData, videoNarrativeData } = input

  for (const candidate of eligible) {
    if (retriesUsed >= budget.maxRetries) break

    logger.debug(
      { markerType: candidate.markerType, priority: candidate.priority },
      'Attempting retry for marker'
    )

    try {
      const reinforcement = candidate.buildReinforcement()
      const retryOverride = {
        systemPrompt: buildSystemPrompt(input.briefingState, input.brandContext),
        stage: input.briefingState.stage,
      }

      const retryResponse = await chat(
        [
          ...input.messages,
          { role: 'assistant', content: input.responseContent },
          { role: 'user', content: reinforcement },
        ],
        input.userId,
        input.chatContext,
        retryOverride
      )

      retriesUsed++
      retriedMarkers.push(candidate.markerType)

      // Parse the retry response for the specific marker type
      const captured = candidate.parseRetryResponse(retryResponse.content)

      // Also attempt to capture bonus markers from the retry response
      // without spending additional budget
      const bonus = parseBonusMarkers(retryResponse.content, input)

      // Merge results — retry-specific data takes priority, then bonus
      if (captured.structureData) {
        structureData = captured.structureData
        input.briefingState.structure = captured.structureData
        logger.debug({ markerType: candidate.markerType }, 'Retry captured structure data')
      } else if (bonus.structureData && !structureData) {
        structureData = bonus.structureData
        input.briefingState.structure = bonus.structureData
        logger.debug(
          { markerType: candidate.markerType },
          'Bonus structure data captured from retry'
        )
      }

      if (captured.strategicReviewData) {
        strategicReviewData = captured.strategicReviewData
        input.briefingState.strategicReview = captured.strategicReviewData
        logger.debug({ markerType: candidate.markerType }, 'Retry captured strategic review data')
      } else if (bonus.strategicReviewData && !strategicReviewData) {
        strategicReviewData = bonus.strategicReviewData
        input.briefingState.strategicReview = bonus.strategicReviewData
        logger.debug(
          { markerType: candidate.markerType },
          'Bonus strategic review data captured from retry'
        )
      }

      if (captured.videoNarrativeData) {
        videoNarrativeData = captured.videoNarrativeData
        input.briefingState.videoNarrative = captured.videoNarrativeData
        logger.debug({ markerType: candidate.markerType }, 'Retry captured video narrative data')
      } else if (bonus.videoNarrativeData && !videoNarrativeData) {
        videoNarrativeData = bonus.videoNarrativeData
        input.briefingState.videoNarrative = bonus.videoNarrativeData
        logger.debug(
          { markerType: candidate.markerType },
          'Bonus video narrative data captured from retry'
        )
      }

      // Check if the retry actually succeeded for its primary target
      const primarySucceeded = hasPrimaryCaptured(candidate.markerType, captured)
      if (!primarySucceeded) {
        failures.push(candidate.markerType)
        logger.warn(
          { markerType: candidate.markerType },
          'Retry completed but primary marker still not captured'
        )
      }
    } catch (retryErr) {
      retriesUsed++
      retriedMarkers.push(candidate.markerType)
      failures.push(candidate.markerType)
      logger.warn({ err: retryErr, markerType: candidate.markerType }, 'Retry failed with error')
    }
  }

  // Track candidates that were eligible but not retried due to budget
  for (const candidate of eligible) {
    if (!retriedMarkers.includes(candidate.markerType)) {
      failures.push(candidate.markerType)
    }
  }

  return {
    structureData,
    strategicReviewData,
    videoNarrativeData,
    retried: retriedMarkers.length > 0,
    retriedMarkers,
    failures,
    budgetExhausted: retriesUsed >= budget.maxRetries && eligible.length > retriesUsed,
  }
}

// =============================================================================
// CANDIDATE BUILDERS
// =============================================================================

function buildRetryCandidates(input: ParseWithRetryInput): RetryCandidate[] {
  const {
    stageBeforePhaseA,
    structureData,
    strategicReviewData,
    videoNarrativeData,
    structureType,
    isSceneFeedback,
    isRegenerationRequest,
    narrativeApproved,
    responseContent,
    clientLatestStoryboard,
    briefingState,
  } = input

  const candidates: RetryCandidate[] = []

  // 1. Scene feedback retry (priority 1) — user explicitly gave feedback
  candidates.push({
    markerType: 'SCENE_FEEDBACK',
    shouldRetry: isSceneFeedback && !structureData && !!structureType,
    priority: 1,
    buildReinforcement: () => {
      const storyboardForRetry =
        (clientLatestStoryboard?.type === 'storyboard' && clientLatestStoryboard) ||
        (briefingState.structure?.type === 'storyboard' && briefingState.structure) ||
        null
      return storyboardForRetry
        ? `The user gave feedback on specific scenes but you didn't include the updated storyboard in your response. ` +
            `Apply the changes from your previous response to the current storyboard and output the FULL updated storyboard wrapped in [STORYBOARD]...[/STORYBOARD] markers with valid JSON.\n\n` +
            `Current storyboard to update:\n[STORYBOARD]${JSON.stringify(storyboardForRetry)}[/STORYBOARD]`
        : getFormatReinforcement(structureType!)
    },
    parseRetryResponse: (content: string) => {
      const parsed = parseStructuredOutput(content, structureType!)
      return parsed.success && parsed.data ? { structureData: parsed.data } : {}
    },
  })

  // 2. Regeneration retry (priority 2) — user explicitly requested regeneration
  candidates.push({
    markerType: 'REGENERATION',
    shouldRetry: isRegenerationRequest && !structureData && !!structureType,
    priority: 2,
    buildReinforcement: () => getFormatReinforcement(structureType!),
    parseRetryResponse: (content: string) => {
      const parsed = parseStructuredOutput(content, structureType!)
      return parsed.success && parsed.data ? { structureData: parsed.data } : {}
    },
  })

  // 3. Video narrative retry (priority 3) — narrative not parsed and no storyboard
  candidates.push({
    markerType: 'VIDEO_NARRATIVE',
    shouldRetry:
      briefingState.deliverableCategory === 'video' &&
      !videoNarrativeData &&
      !structureData &&
      !narrativeApproved,
    priority: 3,
    buildReinforcement: () => getVideoNarrativeReinforcement(),
    parseRetryResponse: (content: string) => {
      const parsed = parseVideoNarrative(content)
      return parsed.success && parsed.data ? { videoNarrativeData: parsed.data } : {}
    },
  })

  // 4. Structure retry at STRUCTURE stage (priority 4)
  candidates.push({
    markerType: 'STRUCTURE',
    shouldRetry:
      stageBeforePhaseA === 'STRUCTURE' &&
      !structureData &&
      !!structureType &&
      !(briefingState.deliverableCategory === 'video' && narrativeApproved),
    priority: 4,
    buildReinforcement: () => getFormatReinforcement(structureType!),
    parseRetryResponse: (content: string) => {
      const parsed = parseStructuredOutput(content, structureType!)
      return parsed.success && parsed.data ? { structureData: parsed.data } : {}
    },
  })

  // 4b. Structure retry at ELABORATE stage (priority 4, same as STRUCTURE)
  // Mirrors SCENE_FEEDBACK: embeds actual storyboard JSON so the AI has context to work from.
  candidates.push({
    markerType: 'ELABORATE',
    shouldRetry: stageBeforePhaseA === 'ELABORATE' && !structureData && !!structureType,
    priority: 4,
    buildReinforcement: () => {
      const storyboardForRetry =
        (clientLatestStoryboard?.type === 'storyboard' && clientLatestStoryboard) ||
        (briefingState.structure?.type === 'storyboard' && briefingState.structure) ||
        null
      if (storyboardForRetry) {
        return (
          `You did not include the updated storyboard in your response. ` +
          `Apply the changes from your previous response to the current storyboard and output the FULL updated storyboard wrapped in [STORYBOARD]...[/STORYBOARD] markers with valid JSON.\n\n` +
          `Current storyboard to update:\n[STORYBOARD]${JSON.stringify(storyboardForRetry)}[/STORYBOARD]`
        )
      }
      return getFormatReinforcement(structureType!)
    },
    parseRetryResponse: (content: string) => {
      const parsed = parseStructuredOutput(content, structureType!)
      return parsed.success && parsed.data ? { structureData: parsed.data } : {}
    },
  })

  // 5. Strategic review retry (priority 5) — lowest priority
  candidates.push({
    markerType: 'STRATEGIC_REVIEW',
    shouldRetry:
      stageBeforePhaseA === 'STRATEGIC_REVIEW' &&
      !strategicReviewData &&
      hasReviewText(responseContent),
    priority: 5,
    buildReinforcement: () => getStrategicReviewReinforcement(),
    parseRetryResponse: (content: string) => {
      const parsed = parseStrategicReview(content)
      return parsed.success && parsed.data ? { strategicReviewData: parsed.data } : {}
    },
  })

  return candidates
}

// =============================================================================
// HELPERS
// =============================================================================

/** Check if AI wrote strategic review text without the proper marker */
function hasReviewText(content: string): boolean {
  return (
    content.includes('strategic') ||
    content.includes('assessment') ||
    content.includes('strengths') ||
    content.includes('risks')
  )
}

/** Parse bonus markers from a retry response (captures extra data without spending budget) */
function parseBonusMarkers(content: string, input: ParseWithRetryInput): RetryCapturedData {
  const result: RetryCapturedData = {}

  // Try to capture structure data if not already present
  if (!input.structureData && input.structureType) {
    const parsed = parseStructuredOutput(content, input.structureType)
    if (parsed.success && parsed.data) {
      result.structureData = parsed.data
    }
  }

  // Try to capture strategic review data if not already present
  if (!input.strategicReviewData) {
    const parsed = parseStrategicReview(content)
    if (parsed.success && parsed.data) {
      result.strategicReviewData = parsed.data
    }
  }

  // Try to capture video narrative data if not already present
  if (!input.videoNarrativeData && input.briefingState.deliverableCategory === 'video') {
    const parsed = parseVideoNarrative(content)
    if (parsed.success && parsed.data) {
      result.videoNarrativeData = parsed.data
    }
  }

  return result
}

/** Check if the retry captured its primary target */
function hasPrimaryCaptured(markerType: string, captured: RetryCapturedData): boolean {
  switch (markerType) {
    case 'SCENE_FEEDBACK':
    case 'REGENERATION':
    case 'STRUCTURE':
    case 'ELABORATE':
      return !!captured.structureData
    case 'VIDEO_NARRATIVE':
      return !!captured.videoNarrativeData
    case 'STRATEGIC_REVIEW':
      return !!captured.strategicReviewData
    default:
      return false
  }
}
