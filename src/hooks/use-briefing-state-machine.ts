'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type { QuickOptions } from '@/components/chat/types'
import * as Sentry from '@sentry/nextjs'
import { usePostHog } from 'posthog-js/react'
import { PostHogEvents } from '@/lib/posthog-events'
import type { LiveBrief } from '@/components/chat/brief-panel/types'
import {
  type BriefingState,
  type BriefingStage,
  type DeliverableCategory,
  type DeepenOption,
  type SerializedBriefingState,
  createInitialBriefingState,
  goBackTo,
  pivotCategory,
  serialize,
  deserialize,
} from '@/lib/ai/briefing-state-machine'
import { buildSystemPrompt, type BrandContext } from '@/lib/ai/briefing-prompts'
import { generateQuickOptions } from '@/lib/ai/briefing-quick-options'
import { saveDraft, getDraft } from '@/lib/chat-drafts'

// =============================================================================
// ACTION TYPES
// =============================================================================

export type BriefingAction =
  | { type: 'GO_BACK'; stage: BriefingStage }
  | { type: 'PIVOT_CATEGORY'; category: DeliverableCategory }
  | { type: 'STAGE_RESPONSE'; response: 'accept' | 'override' }
  | { type: 'SELECT_DEEPEN'; option: DeepenOption }
  | { type: 'CONFIRM_SUBMIT' }

// =============================================================================
// HOOK OPTIONS & RETURN TYPE
// =============================================================================

interface UseBriefingStateMachineOptions {
  draftId: string
  brandContext?: BrandContext
}

export interface UseBriefingStateMachineReturn {
  briefingState: BriefingState
  serializedState: SerializedBriefingState
  quickOptions: QuickOptions | null
  systemPromptContext: string
  dispatch: (action: BriefingAction) => void
  syncFromServer: (serverState: SerializedBriefingState) => void
  /** Update the brief within the briefing state (single source of truth) */
  updateBrief: (updater: (brief: LiveBrief) => LiveBrief) => void
  /** Update the structure data within the briefing state (for edit persistence) */
  updateStructure: (
    structure: import('@/lib/ai/briefing-state-machine').StructureData | null
  ) => void
}

// =============================================================================
// HOOK
// =============================================================================

export function useBriefingStateMachine(
  initialState?: SerializedBriefingState,
  options?: UseBriefingStateMachineOptions
): UseBriefingStateMachineReturn {
  const [state, setState] = useState<BriefingState>(() => {
    if (initialState) {
      return deserialize(initialState)
    }
    return createInitialBriefingState(options?.draftId)
  })

  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })

  // Persist state on every change
  const persistState = useCallback((newState: BriefingState) => {
    const draftId = optionsRef.current?.draftId
    if (!draftId) return

    const draft = getDraft(draftId)
    if (draft) {
      draft.briefingState = serialize(newState)
      draft.updatedAt = new Date().toISOString()
      saveDraft(draft)
    }
  }, [])

  // Helper to update state and persist
  const updateState = useCallback(
    (newState: BriefingState) => {
      setState(newState)
      persistState(newState)
    },
    [persistState]
  )

  // ==========================================================================
  // dispatch — handle non-message state changes
  // ==========================================================================

  const dispatch = useCallback(
    (action: BriefingAction) => {
      setState((prev) => {
        Sentry.addBreadcrumb({
          category: 'briefing',
          message: `Briefing action: ${action.type}`,
          data: { from: prev.stage, action: action.type },
          level: 'info',
        })

        let newState: BriefingState

        switch (action.type) {
          case 'GO_BACK':
            newState = goBackTo(prev, action.stage)
            break

          case 'PIVOT_CATEGORY':
            newState = pivotCategory(prev, action.category)
            break

          case 'STAGE_RESPONSE': {
            newState = { ...prev }
            if (prev.stage === 'STRATEGIC_REVIEW') {
              if (action.response === 'override' && newState.strategicReview) {
                newState.strategicReview = {
                  ...newState.strategicReview,
                  userOverride: true,
                }
              }
              // Advance to MOODBOARD
              newState.stage = 'MOODBOARD'
              newState.turnsInCurrentStage = 0
            }
            break
          }

          case 'SELECT_DEEPEN':
            newState = {
              ...prev,
              deepenSelections: [...(prev.deepenSelections ?? []), action.option],
            }
            break

          case 'CONFIRM_SUBMIT':
            newState = {
              ...prev,
              stage: 'SUBMIT',
              turnsInCurrentStage: 0,
            }
            break

          default:
            return prev
        }

        persistState(newState)
        return newState
      })
    },
    [persistState]
  )

  // ==========================================================================
  // syncFromServer — update local state from server-returned serialized state
  // ==========================================================================

  const syncFromServer = useCallback(
    (serverState: SerializedBriefingState) => {
      const newState = deserialize(serverState)
      updateState(newState)
    },
    [updateState]
  )

  // ==========================================================================
  // updateBrief — modify the brief within BriefingState (single source of truth)
  // ==========================================================================

  const updateBrief = useCallback(
    (updater: (brief: LiveBrief) => LiveBrief) => {
      setState((prev) => {
        const newBrief = updater(prev.brief)
        if (newBrief === prev.brief) return prev
        const newState = { ...prev, brief: newBrief }
        persistState(newState)
        return newState
      })
    },
    [persistState]
  )

  // ==========================================================================
  // updateStructure — persist storyboard edits to briefing state for draft restore
  // ==========================================================================

  const updateStructure = useCallback(
    (structure: import('@/lib/ai/briefing-state-machine').StructureData | null) => {
      setState((prev) => {
        if (prev.structure === structure) return prev
        const newState = { ...prev, structure }
        persistState(newState)
        return newState
      })
    },
    [persistState]
  )

  // ==========================================================================
  // Derived values
  // ==========================================================================

  const serializedState = useMemo(() => serialize(state), [state])

  const quickOptions = useMemo(() => generateQuickOptions(state), [state])

  const systemPromptContext = useMemo(
    () => buildSystemPrompt(state, options?.brandContext),
    [state, options?.brandContext]
  )

  // Track stage transitions in PostHog
  const posthog = usePostHog()
  const prevStageRef = useRef<BriefingStage | null>(null)
  useEffect(() => {
    if (posthog && state.stage !== prevStageRef.current) {
      posthog.capture(PostHogEvents.BRIEFING_STAGE_ENTERED, {
        stage: state.stage,
        previous_stage: prevStageRef.current,
        $source: 'client',
      })
      prevStageRef.current = state.stage
    }
  }, [state.stage, posthog])

  return {
    briefingState: state,
    serializedState,
    quickOptions,
    systemPromptContext,
    dispatch,
    syncFromServer,
    updateBrief,
    updateStructure,
  }
}
