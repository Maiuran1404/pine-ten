/**
 * BriefingProvider — React Context for deliverable-aware briefing state.
 *
 * Replaces 5-level prop drilling by providing:
 * - The current DeliverableConfig for the active deliverable type
 * - Core briefing state (stage, category, structure, brief)
 * - Derived values (chat stages, stage labels, progress, readiness)
 *
 * Components consume via `useBriefing()` from `@/hooks/use-briefing`.
 */
'use client'

import { createContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import type {
  BriefingState,
  DeliverableCategory,
  WebsitePhase,
} from '@/lib/ai/briefing-state-machine'
import type { ChatStage } from '@/components/chat/types'
import type { LiveBrief } from '@/components/chat/brief-panel/types'
import type { DeliverableConfig } from '@/lib/deliverables/types'
import { getDeliverableConfig } from '@/lib/deliverables/registry'

// =============================================================================
// CONTEXT VALUE
// =============================================================================

export interface BriefingContextValue {
  /** The current deliverable config (video, website, content, design) */
  config: DeliverableConfig

  /** The current deliverable category */
  deliverableCategory: DeliverableCategory | null

  /** Current briefing stage */
  briefingStage: BriefingState['stage'] | null

  /** The live brief */
  brief: LiveBrief | null

  /** Ordered chat stages for the progress bar */
  chatStages: ChatStage[]

  /** Labels for the progress bar stages */
  stageLabels: Record<string, string>

  /** Whether the brief is ready for a designer */
  isReadyForDesigner: boolean

  /** Website-specific phase (null for non-website) */
  websitePhase: WebsitePhase | null

  /** Submit button label */
  submitLabel: string
}

// =============================================================================
// CONTEXT
// =============================================================================

export const BriefingContext = createContext<BriefingContextValue | null>(null)

// =============================================================================
// PROVIDER
// =============================================================================

interface BriefingProviderProps {
  children: ReactNode
  /** The current deliverable category (may be null during early stages) */
  deliverableCategory: DeliverableCategory | null
  /** The current briefing state (null if state machine is not yet initialized) */
  briefingState: BriefingState | null
  /** The live brief */
  brief: LiveBrief | null
}

export function BriefingProvider({
  children,
  deliverableCategory,
  briefingState,
  brief,
}: BriefingProviderProps) {
  const value = useMemo((): BriefingContextValue => {
    const config = getDeliverableConfig(deliverableCategory)
    const briefingStage = briefingState?.stage ?? null

    // Derive website phase (null-safe — briefingState may be null during init)
    const websitePhase = briefingState ? (config.derivePhase?.(briefingState) ?? null) : null

    // Check readiness
    const isReadyForDesigner = briefingState ? config.isReadyForDesigner(briefingState) : false

    // Submit label
    const submitLabel = deliverableCategory === 'website' ? 'Craft It' : 'Submit for design'

    return {
      config,
      deliverableCategory: deliverableCategory ?? null,
      briefingStage,
      brief,
      chatStages: config.chatStages,
      stageLabels: config.stageLabels,
      isReadyForDesigner,
      websitePhase,
      submitLabel,
    }
  }, [deliverableCategory, briefingState, brief])

  return <BriefingContext.Provider value={value}>{children}</BriefingContext.Provider>
}
