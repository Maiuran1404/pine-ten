/**
 * Shared types for the chat pipeline modules.
 */
import 'server-only'

import type { ChatContext } from '@/lib/ai/chat'
import type {
  SerializedBriefingState,
  StructureData,
  VideoNarrative,
  StrategicReviewData,
} from '@/lib/ai/briefing-state-machine'
import type { BrandContext } from '@/lib/ai/briefing-prompts'
import type { StyleContext } from '@/lib/ai/brand-style-scoring'
import type { InferredAudience } from '@/components/onboarding/types'
import type { SceneImageMatch } from '@/lib/ai/storyboard-image-search'
import type { VideoReference } from '@/lib/ai/video-references'

/** Parsed request body from the client */
export interface ChatRequestBody {
  messages: Array<{ role: string; content: string; attachments?: unknown[] }>
  selectedStyles?: string[]
  excludeStyleAxes?: string[]
  styleOffset?: number
  deliverableStyleMarker?: {
    type: string
    deliverableType: string
    styleAxis?: string
    searchTerms?: string[]
    searchQuery?: string
    baseStyleId?: string
    refinementQuery?: string
  }
  moodboardHasStyles?: boolean
  brief?: {
    platform?: { source?: string; value?: string }
    intent?: { source?: string; value?: string }
    topic?: { source?: string; value?: string }
    audience?: { value?: { name?: string } }
    contentType?: { source?: string; value?: string }
  }
  briefingState?: SerializedBriefingState
  latestStoryboard?: StructureData & { type: string; scenes?: unknown[] }
}

/** Context built during pre-processing, passed through the pipeline */
export interface PipelineContext {
  userId: string
  body: ChatRequestBody
  chatContext: ChatContext
  brandContext: BrandContext
  brandAudiences: InferredAudience[]
  styleContext: StyleContext
  /** Updated state after pre-AI inference (serialized) */
  updatedBriefingState?: SerializedBriefingState
  /** System prompt override from state machine */
  stateMachineOverride?: { systemPrompt: string; stage?: string }
  /** Style hint for image search (accumulated from state) */
  styleHint?: string
  /** Whether the current stage is eligible for style/video data */
  isStyleEligible: boolean
}

/** Result from post-AI processing */
export interface PostProcessResult {
  structureData?: StructureData
  strategicReviewData?: StrategicReviewData
  globalStyles?: unknown
  videoNarrativeData?: VideoNarrative
  updatedBriefingState?: SerializedBriefingState
  scenesToRegenerate?: number[]
  parseFailures?: string[]
}

/** Final assembled API response */
export interface ChatApiResponsePayload {
  content: string
  taskProposal?: unknown
  styleReferences?: unknown
  deliverableStyles?: unknown
  deliverableStyleMarker?: unknown
  selectedStyles?: string[]
  quickOptions?: { question: string; options: unknown[] }
  videoReferences?: VideoReference[]
  structureData?: StructureData
  strategicReviewData?: PostProcessResult['strategicReviewData']
  globalStyles?: unknown
  videoNarrativeData?: VideoNarrative
  sceneImageMatches?: SceneImageMatch[]
  assetRequest?: unknown
  scenesToRegenerate?: number[]
  briefingState?: SerializedBriefingState
  parseFailures?: string[]
}
