'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { queryKeys } from './use-queries'
import { useCsrfContext } from '@/providers/csrf-provider'

interface WebsiteInspiration {
  id: string
  name: string
  url: string
  screenshotUrl: string
  thumbnailUrl: string | null
  industry: string[]
  styleTags: string[]
  colorSamples: string[]
  sectionTypes: string[]
  typography: string | null
  layoutStyle: string | null
  description: string | null
}

interface SimilarResult {
  inspiration: WebsiteInspiration
  score: number
  breakdown: Record<string, number>
}

export function useWebsiteInspirations(filters?: { industry?: string; style?: string }) {
  return useQuery({
    queryKey: queryKeys.websiteFlow.inspirations(filters),
    queryFn: async (): Promise<{ inspirations: WebsiteInspiration[]; total: number }> => {
      const params = new URLSearchParams()
      if (filters?.industry) params.set('industry', filters.industry)
      if (filters?.style) params.set('style', filters.style)
      const response = await fetch(`/api/website-flow/inspirations?${params}`)
      if (!response.ok) throw new Error('Failed to load inspirations')
      const data = await response.json()
      return data.data
    },
  })
}

export function useSimilarWebsites() {
  const { csrfFetch } = useCsrfContext()

  return useMutation({
    mutationFn: async (inspirationIds: string[]): Promise<SimilarResult[]> => {
      const response = await csrfFetch('/api/website-flow/similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspirationIds }),
      })
      if (!response.ok) throw new Error('Failed to find similar websites')
      const data = await response.json()
      return data.data.similar
    },
  })
}
