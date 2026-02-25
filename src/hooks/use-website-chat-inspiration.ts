/**
 * Hook for managing website inspiration state within the chat briefing flow.
 * Lighter weight than use-website-flow.ts - only manages inspiration selection,
 * screenshot capture, and gallery fetching.
 */
'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useScreenshotApi } from '@/hooks/use-screenshot-api'
import type { WebsiteInspiration } from '@/lib/ai/briefing-state-machine'

interface UseWebsiteChatInspirationOptions {
  enabled: boolean
}

export function useWebsiteChatInspiration({ enabled }: UseWebsiteChatInspirationOptions) {
  const [selectedInspirations, setSelectedInspirations] = useState<WebsiteInspiration[]>([])
  const [industryFilter, setIndustryFilter] = useState<string | null>(null)
  const [styleFilter, setStyleFilter] = useState<string | null>(null)

  const screenshotApi = useScreenshotApi()

  // Fetch curated gallery from API
  const galleryQuery = useQuery({
    queryKey: ['website-inspirations', industryFilter, styleFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (industryFilter) params.set('industry', industryFilter)
      if (styleFilter) params.set('style', styleFilter)
      params.set('limit', '12')

      const response = await fetch(`/api/website-flow/inspirations?${params}`)
      if (!response.ok) throw new Error('Failed to fetch inspirations')
      const data = await response.json()
      return data.data?.inspirations ?? []
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 min
  })

  const addInspiration = useCallback((inspiration: WebsiteInspiration) => {
    setSelectedInspirations((prev) => {
      if (prev.some((i) => i.id === inspiration.id)) return prev
      return [...prev, inspiration]
    })
  }, [])

  const removeInspiration = useCallback((id: string) => {
    setSelectedInspirations((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const captureScreenshot = useCallback(
    async (url: string) => {
      const result = await screenshotApi.mutateAsync(url)
      const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname
      const inspiration: WebsiteInspiration = {
        id: `user-${Date.now()}`,
        url,
        screenshotUrl: result.imageUrl,
        name: hostname.replace(/^www\./, ''),
        isUserSubmitted: true,
      }
      addInspiration(inspiration)
      return inspiration
    },
    [screenshotApi, addInspiration]
  )

  const selectedIds = useMemo(() => selectedInspirations.map((i) => i.id), [selectedInspirations])

  return {
    // Selected inspirations
    selectedInspirations,
    selectedIds,
    addInspiration,
    removeInspiration,

    // Screenshot capture
    captureScreenshot,
    isCapturingScreenshot: screenshotApi.isPending,

    // Gallery data
    inspirationGallery: galleryQuery.data ?? [],
    isGalleryLoading: galleryQuery.isLoading,

    // Filters
    industryFilter,
    setIndustryFilter,
    styleFilter,
    setStyleFilter,
  }
}
