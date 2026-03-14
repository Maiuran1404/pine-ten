'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useCsrfContext } from '@/providers/csrf-provider'
import type {
  LayoutSection,
  WebsiteInspiration,
  WebsiteStyleVariant,
} from '@/lib/ai/briefing-state-machine'

interface UseWebsiteStyleVariantsOptions {
  sections: LayoutSection[]
  brandContext?: { companyName?: string; industry?: string; toneOfVoice?: string }
  websiteInspirations?: WebsiteInspiration[]
  onConfirmStyle: (variant: WebsiteStyleVariant) => void
  enabled?: boolean
}

interface UseWebsiteStyleVariantsReturn {
  variants: WebsiteStyleVariant[]
  isGenerating: boolean
  selectedVariant: WebsiteStyleVariant | null
  selectVariant: (variant: WebsiteStyleVariant) => void
  confirmStyle: () => void
}

export function useWebsiteStyleVariants({
  sections,
  brandContext,
  websiteInspirations,
  onConfirmStyle,
  enabled = true,
}: UseWebsiteStyleVariantsOptions): UseWebsiteStyleVariantsReturn {
  const { csrfFetch } = useCsrfContext()
  const [variants, setVariants] = useState<WebsiteStyleVariant[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<WebsiteStyleVariant | null>(null)
  const hasFetchedRef = useRef(false)

  // Fetch style variants on mount when enabled
  useEffect(() => {
    if (!enabled || hasFetchedRef.current || sections.length === 0) return

    hasFetchedRef.current = true
    setIsGenerating(true)

    const fetchVariants = async () => {
      try {
        const response = await csrfFetch('/api/website-flow/style-variants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sections: sections.map((s) => ({
              sectionName: s.sectionName,
              purpose: s.purpose,
              contentGuidance: s.contentGuidance,
              order: s.order,
            })),
            brandContext: brandContext ?? undefined,
            inspirations:
              websiteInspirations?.map((i) => ({
                url: i.url,
                name: i.name,
                notes: i.notes,
              })) ?? [],
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to generate style variants')
        }

        const data = await response.json()
        const generatedVariants: WebsiteStyleVariant[] = data.data?.variants ?? []
        setVariants(generatedVariants)
      } catch {
        // Reset so user can retry by toggling enabled
        hasFetchedRef.current = false
      } finally {
        setIsGenerating(false)
      }
    }

    fetchVariants()
  }, [enabled, sections, brandContext, websiteInspirations, csrfFetch])

  const selectVariant = useCallback((variant: WebsiteStyleVariant) => {
    setSelectedVariant(variant)
  }, [])

  const confirmStyle = useCallback(() => {
    if (selectedVariant) {
      onConfirmStyle(selectedVariant)
    }
  }, [selectedVariant, onConfirmStyle])

  return {
    variants,
    isGenerating,
    selectedVariant,
    selectVariant,
    confirmStyle,
  }
}
