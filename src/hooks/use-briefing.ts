/**
 * useBriefing — Consumer hook for BriefingContext.
 *
 * Provides access to the current DeliverableConfig and derived briefing state.
 * Must be used within a BriefingProvider.
 */
'use client'

import { useContext } from 'react'
import { BriefingContext, type BriefingContextValue } from '@/providers/briefing-provider'

/**
 * Access the current deliverable config and briefing state.
 * Throws if used outside of a BriefingProvider.
 */
export function useBriefing(): BriefingContextValue {
  const context = useContext(BriefingContext)
  if (!context) {
    throw new Error('useBriefing must be used within a BriefingProvider')
  }
  return context
}

/**
 * Optional variant — returns null if no provider is present.
 * Useful for components that may render outside the briefing flow.
 */
export function useBriefingOptional(): BriefingContextValue | null {
  return useContext(BriefingContext)
}
