'use client'

import { useState, useEffect, useRef } from 'react'
import { useCsrfContext } from '@/providers/csrf-provider'
import { logger } from '@/lib/logger'
import type { LiveBrief } from '@/components/chat/brief-panel/types'

/**
 * Debounce helper
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

/**
 * Thin auto-save adapter: persists the brief to the server via /api/briefs.
 * No local state — reads brief from the briefing state machine (single source of truth).
 */
export function useBriefAutoSave(brief: LiveBrief, draftId: string) {
  const { csrfFetch } = useCsrfContext()
  const lastSavedRef = useRef<string>('')
  const isSavingRef = useRef(false)
  const debouncedBrief = useDebounce(brief, 500)

  useEffect(() => {
    const briefJson = JSON.stringify(debouncedBrief)
    if (briefJson === lastSavedRef.current) return
    if (isSavingRef.current) return // Prevent StrictMode double-fire

    const saveBrief = async () => {
      isSavingRef.current = true
      try {
        const response = await csrfFetch('/api/briefs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brief: debouncedBrief,
            draftId,
          }),
        })

        if (response.ok) {
          lastSavedRef.current = briefJson
        }
      } catch (error) {
        logger.error({ err: error }, 'Failed to auto-save brief')
      } finally {
        isSavingRef.current = false
      }
    }

    saveBrief()
  }, [debouncedBrief, draftId, csrfFetch])
}
