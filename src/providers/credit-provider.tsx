'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useSession } from '@/lib/auth-client'

interface CreditContextType {
  credits: number
  isLoading: boolean
  refreshCredits: () => Promise<void>
  updateCredits: (newCredits: number) => void
  deductCredits: (amount: number) => void
}

export const CreditContext = createContext<CreditContextType | null>(null)

export function CreditProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const [credits, setCredits] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch credits from API
  const refreshCredits = useCallback(async () => {
    try {
      const response = await fetch('/api/user/billing')
      if (response.ok) {
        const data = await response.json()
        setCredits(data.credits ?? 0)
      }
    } catch (error) {
      console.error('Failed to fetch credits:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initialize credits from session first, then fetch from API
  useEffect(() => {
    if (session?.user) {
      // Set initial value from session
      const sessionCredits = (session.user as { credits?: number }).credits
      if (sessionCredits !== undefined) {
        setCredits(sessionCredits)
        setIsLoading(false)
      }
      // Then fetch fresh value from API
      refreshCredits()
    }
  }, [session, refreshCredits])

  // Listen for credit update events
  useEffect(() => {
    const handleCreditsUpdated = (event: CustomEvent<{ credits: number }>) => {
      if (event.detail?.credits !== undefined) {
        setCredits(event.detail.credits)
      } else {
        // If no credits in event, refresh from server
        refreshCredits()
      }
    }

    window.addEventListener('credits-updated', handleCreditsUpdated as EventListener)
    return () => {
      window.removeEventListener('credits-updated', handleCreditsUpdated as EventListener)
    }
  }, [refreshCredits])

  // Update credits to a specific value
  const updateCredits = useCallback((newCredits: number) => {
    setCredits(newCredits)
  }, [])

  // Deduct credits (optimistic update)
  const deductCredits = useCallback((amount: number) => {
    setCredits((prev) => Math.max(0, prev - amount))
  }, [])

  return (
    <CreditContext.Provider
      value={{
        credits,
        isLoading,
        refreshCredits,
        updateCredits,
        deductCredits,
      }}
    >
      {children}
    </CreditContext.Provider>
  )
}

export function useCredits() {
  const context = useContext(CreditContext)
  if (!context) {
    throw new Error('useCredits must be used within a CreditProvider')
  }
  return context
}

// Helper function to dispatch credit update event
export function dispatchCreditsUpdated(credits?: number) {
  window.dispatchEvent(
    new CustomEvent('credits-updated', {
      detail: credits !== undefined ? { credits } : undefined,
    })
  )
}
