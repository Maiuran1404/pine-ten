/**
 * DeliverableConfig Interface
 *
 * Central type for per-deliverable configuration. Each deliverable type
 * (video, website, content, design) implements this interface with its
 * own exit conditions, prompts, quick options, and UI components.
 *
 * All functions must be pure — no side effects, no API calls.
 */

import type { LucideIcon } from 'lucide-react'
import type { ChatStage, QuickOptions } from '@/components/chat/types'
import type {
  BriefingStage,
  BriefingState,
  DeliverableCategory,
  DeepenOption,
  StructureData,
  WebsitePhase,
} from '@/lib/ai/briefing-state-machine'

// =============================================================================
// STAGE CONTEXT (passed to description generators)
// =============================================================================

export interface StageContext {
  deliverableCategory: DeliverableCategory | null
  structure: StructureData | null
  videoNarrative?: { concept: string; narrative: string; hook: string } | null
  narrativeApproved?: boolean
  websiteInspirations?: Array<{ id: string; url: string }> | null
  websiteStyleConfirmed?: boolean
}

// =============================================================================
// ELABORATION PROGRESS
// =============================================================================

export interface ElaborationProgress {
  done: number
  total: number
}

// =============================================================================
// DELIVERABLE STRUCTURE PANEL PROPS (shared interface for all panel components)
// =============================================================================

/**
 * Minimal shared props that every deliverable's structure panel receives.
 * Type-specific props are consumed via per-deliverable hooks + useBriefing() context.
 */
export interface DeliverableStructurePanelProps {
  /** The current briefing stage */
  briefingStage?: BriefingStage
  /** Whether the chat is currently loading/streaming */
  isChatLoading?: boolean
}

// =============================================================================
// DELIVERABLE CONFIG
// =============================================================================

export interface DeliverableConfig {
  /** The deliverable category this config handles */
  type: DeliverableCategory

  /** The structure data type for this deliverable */
  structureType: StructureData['type']

  /** Human-readable label */
  label: string

  /** Lucide icon component */
  icon: LucideIcon

  // ─── Stage Pipeline ──────────────────────────────────────────

  /** Ordered chat stages for the progress bar */
  chatStages: ChatStage[]

  /** Labels for each stage in the progress bar */
  stageLabels: Record<string, string>

  /** Stage-to-ChatStage mapping override for mapBriefingStageToChat */
  mapBriefingStageToChat: (stage: BriefingStage) => ChatStage

  /** Contextual description for the current stage */
  stageDescriptions: (stage: BriefingStage, ctx: StageContext) => string

  /** Exit conditions per stage — returns true when the stage is complete */
  exitConditions: Partial<Record<BriefingStage, (s: BriefingState) => boolean>>

  // ─── Quick Options ──────────────────────────────────────────

  /** Stage-specific quick options (null = use default) */
  getQuickOptions: (state: BriefingState) => QuickOptions | null | undefined

  /** Deepen stage quick option labels */
  deepenQuickOptions: string[]

  // ─── Elaboration ──────────────────────────────────────────

  /** Check if elaboration is complete for this deliverable */
  checkElaborationComplete: (state: BriefingState) => boolean

  /** Get elaboration progress (done/total) */
  getElaborationProgress: (data: StructureData) => ElaborationProgress

  // ─── UI ──────────────────────────────────────────

  /** Loading messages shown during structure generation */
  loadingMessages: string[]

  /** Available deepen options for this deliverable */
  deepenOptions: DeepenOption[]

  /** Base credit estimate for this deliverable type */
  creditEstimate: number

  // ─── Readiness ──────────────────────────────────────────

  /** Whether the brief is ready for a designer (type-specific checks) */
  isReadyForDesigner: (state: BriefingState) => boolean

  /** Whether the structure panel should be visible */
  shouldShowStructurePanel: (state: BriefingState) => boolean

  /** Sub-stage progress bonus within the 'brief' chat stage */
  getSubStageBonus: (briefingStage: BriefingStage) => number

  // ─── Website-specific (optional) ──────────────────────────

  /** Derive website-specific phase from state (website only) */
  derivePhase?: (state: BriefingState) => WebsitePhase | null
}
