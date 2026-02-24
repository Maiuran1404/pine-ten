'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type { QuickOptions } from '@/components/chat/types'
import * as Sentry from '@sentry/nextjs'
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
      Sentry.addBreadcrumb({
        category: 'briefing',
        message: `Briefing action: ${action.type}`,
        data: { from: state.stage, action: action.type },
        level: 'info',
      })

      let newState: BriefingState

      switch (action.type) {
        case 'GO_BACK':
          newState = goBackTo(state, action.stage)
          break

        case 'PIVOT_CATEGORY':
          newState = pivotCategory(state, action.category)
          break

        case 'STAGE_RESPONSE': {
          newState = { ...state }
          if (state.stage === 'STRATEGIC_REVIEW') {
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
            ...state,
            deepenSelections: [...(state.deepenSelections ?? []), action.option],
          }
          break

        case 'CONFIRM_SUBMIT':
          newState = {
            ...state,
            stage: 'SUBMIT',
            turnsInCurrentStage: 0,
          }
          break

        default:
          return
      }

      updateState(newState)
    },
    [state, updateState]
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
  // Derived values
  // ==========================================================================

  const serializedState = useMemo(() => serialize(state), [state])

  const quickOptions = useMemo(() => generateQuickOptions(state), [state])

  const systemPromptContext = useMemo(
    () => buildSystemPrompt(state, options?.brandContext),
    [state, options?.brandContext]
  )

  return {
    briefingState: state,
    serializedState,
    quickOptions,
    systemPromptContext,
    dispatch,
    syncFromServer,
  }
}
