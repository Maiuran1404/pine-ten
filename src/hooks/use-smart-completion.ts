/**
 * Hook for managing smart autocomplete suggestions in the chat input.
 * Debounces input changes and generates context-aware completions
 * using briefing stage, AI question context, brand data, and more.
 */
'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { generateSmartCompletion } from '@/components/chat/chat-interface.utils'
import type { SmartCompletionContext } from '@/components/chat/chat-interface.utils'

interface UseSmartCompletionOptions {
  input: string
  isLoading: boolean
  briefingStage: string | null
  deliverableCategory: string | null
  lastAssistantMessage: string | null
  brandName: string | null
  platform: string | null
  intent: string | null
}

export function useSmartCompletion({
  input,
  isLoading,
  briefingStage,
  deliverableCategory,
  lastAssistantMessage,
  brandName,
  platform,
  intent,
}: UseSmartCompletionOptions) {
  const [smartCompletion, setSmartCompletion] = useState<string | null>(null)
  const smartCompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Stable context ref — updated in an effect to satisfy react-hooks/refs rule.
  // The debounce timer reads this ref so the effect deps stay minimal (input + isLoading).
  const contextRef = useRef<SmartCompletionContext>({})
  useEffect(() => {
    contextRef.current = {
      briefingStage,
      deliverableCategory,
      lastAssistantMessage,
      brandName,
      platform,
      intent,
    }
  }, [briefingStage, deliverableCategory, lastAssistantMessage, brandName, platform, intent])

  // Update smart completion when input changes (debounced)
  useEffect(() => {
    if (smartCompleteTimeoutRef.current) {
      clearTimeout(smartCompleteTimeoutRef.current)
    }

    if (isLoading || input.length < 3) {
      setSmartCompletion(null) // eslint-disable-line react-hooks/set-state-in-effect -- clearing state on guard condition
      return
    }

    smartCompleteTimeoutRef.current = setTimeout(() => {
      const completion = generateSmartCompletion(input, contextRef.current)
      setSmartCompletion(completion)
    }, 150)

    return () => {
      if (smartCompleteTimeoutRef.current) {
        clearTimeout(smartCompleteTimeoutRef.current)
      }
    }
  }, [input, isLoading])

  // Ghost text derived directly from smartCompletion
  const ghostText = useMemo(() => {
    if (isLoading || !smartCompletion || input.trim().length < 3) return ''
    return ' ' + smartCompletion
  }, [smartCompletion, input, isLoading])

  return {
    smartCompletion,
    setSmartCompletion,
    ghostText,
  }
}
