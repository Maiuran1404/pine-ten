/**
 * Hook for managing smart autocomplete suggestions in the chat input.
 * Debounces input changes and generates context-aware completions.
 */
'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { generateSmartCompletion } from '@/components/chat/chat-interface.utils'

interface UseSmartCompletionOptions {
  input: string
  isLoading: boolean
}

export function useSmartCompletion({ input, isLoading }: UseSmartCompletionOptions) {
  const [smartCompletion, setSmartCompletion] = useState<string | null>(null)
  const smartCompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
      const completion = generateSmartCompletion(input)
      setSmartCompletion(completion)
    }, 150)

    return () => {
      if (smartCompleteTimeoutRef.current) {
        clearTimeout(smartCompleteTimeoutRef.current)
      }
    }
  }, [input, isLoading])

  // Determine which suggestion to show
  const currentSuggestion = useMemo(() => {
    if (isLoading) return null

    if (smartCompletion && input.trim().length >= 3) {
      return input.trim() + ' ' + smartCompletion
    }

    return null
  }, [smartCompletion, input, isLoading])

  // Get the ghost text to display
  const ghostText = useMemo(() => {
    if (!currentSuggestion || isLoading) return ''

    if (smartCompletion && input.trim().length >= 3) {
      return ' ' + smartCompletion
    }

    return ''
  }, [currentSuggestion, smartCompletion, input, isLoading])

  return {
    smartCompletion,
    setSmartCompletion,
    currentSuggestion,
    ghostText,
  }
}
