'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type { QuickOptions } from '@/components/chat/types'
import type { InferenceResult } from '@/components/chat/brief-panel/types'
import type { InferredAudience } from '@/components/onboarding/types'
import {
  type BriefingState,
  type BriefingStage,
  type DeliverableCategory,
  type DeepenOption,
  type SerializedBriefingState,
  createInitialBriefingState,
  evaluateTransitions,
  goBackTo,
  pivotCategory,
  serialize,
  deserialize,
} from '@/lib/ai/briefing-state-machine'
import { calibrateTone } from '@/lib/ai/briefing-tone'
import { buildSystemPrompt, type BrandContext } from '@/lib/ai/briefing-prompts'
import { generateQuickOptions } from '@/lib/ai/briefing-quick-options'
import {
  extractStyleKeywords,
  extractInspirationReferences,
  extractAudienceSignals,
  extractIndustrySignals,
  resolveDeliverableCategory,
} from '@/lib/ai/briefing-extractors'
import { applyInferenceToBrief } from '@/lib/ai/inference-engine'
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
  brandAudiences?: InferredAudience[]
  brandContext?: BrandContext
}

export interface UseBriefingStateMachineReturn {
  briefingState: BriefingState
  serializedState: SerializedBriefingState
  quickOptions: QuickOptions | null
  systemPromptContext: string
  processMessage: (message: string, inference: InferenceResult) => BriefingState
  dispatch: (action: BriefingAction) => void
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
  // processMessage — the main entry point for handling user messages
  // ==========================================================================

  const processMessage = useCallback(
    (message: string, inference: InferenceResult): BriefingState => {
      const brandAudiences = optionsRef.current?.brandAudiences ?? []

      const newState: BriefingState = { ...state }

      // 1. Apply inference to LiveBrief
      newState.brief = applyInferenceToBrief(newState.brief, inference, brandAudiences, message)

      // 2. Extract additional signals from the message
      const styleKeywords = extractStyleKeywords(message)
      if (styleKeywords.length > 0) {
        newState.styleKeywords = [...new Set([...newState.styleKeywords, ...styleKeywords])]
      }

      const inspirationRefs = extractInspirationReferences(message)
      if (inspirationRefs.length > 0) {
        newState.inspirationRefs = [...new Set([...newState.inspirationRefs, ...inspirationRefs])]
      }

      // 3. Resolve deliverable category if not yet set
      if (!newState.deliverableCategory || newState.deliverableCategory === 'unknown') {
        const category = resolveDeliverableCategory(inference)
        if (category !== 'unknown') {
          newState.deliverableCategory = category
        }
      }

      // 4. Extract audience/industry signals for tone calibration
      const audienceSignals = extractAudienceSignals(message)
      const industrySignals = extractIndustrySignals(message)

      if (industrySignals.length > 0 && !newState.industry) {
        newState.industry = {
          value: industrySignals[0],
          confidence: 0.8,
          source: 'inferred',
        }
      }

      // 5. Calibrate tone if we have enough context and don't have one yet,
      //    or if audience/industry just changed
      const shouldRecalibrateTone =
        !newState.toneProfile || audienceSignals.length > 0 || industrySignals.length > 0

      if (shouldRecalibrateTone) {
        const audience =
          audienceSignals.length > 0
            ? audienceSignals[0].label
            : (newState.brief.audience.value?.name ?? null)
        const industry = newState.industry?.value ?? null
        const platform = newState.brief.platform.value ?? null
        const intent = newState.brief.intent.value ?? null

        if (audience || industry) {
          newState.toneProfile = calibrateTone(audience, industry, platform, intent)
        }
      }

      // 6. Evaluate stage transitions
      newState.messageCount += 1

      if (newState.stage === 'EXTRACT') {
        // First message — determine landing stage
        const nextStage = evaluateTransitions(newState, inference)
        if (nextStage !== newState.stage) {
          newState.stage = nextStage
          newState.turnsInCurrentStage = 0
        } else {
          newState.turnsInCurrentStage += 1
        }
      } else {
        // Subsequent messages — check if we can advance
        const nextStage = evaluateTransitions(newState, inference)
        if (nextStage !== newState.stage) {
          newState.stage = nextStage
          newState.turnsInCurrentStage = 0
        } else {
          newState.turnsInCurrentStage += 1
        }
      }

      updateState(newState)
      return newState
    },
    [state, updateState]
  )

  // ==========================================================================
  // dispatch — handle non-message state changes
  // ==========================================================================

  const dispatch = useCallback(
    (action: BriefingAction) => {
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
    processMessage,
    dispatch,
  }
}
