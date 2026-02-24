'use client'

import { useMutation } from '@tanstack/react-query'
import { useCsrfContext } from '@/providers/csrf-provider'

interface SimilarResult {
  inspiration: {
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
  score: number
  breakdown: Record<string, number>
}

type SimilarityMethod = 'auto' | 'embedding' | 'jaccard'

interface FindSimilarOptions {
  inspirationIds: string[]
  limit?: number
  method?: SimilarityMethod
}

export function useVisualSimilarity() {
  const { csrfFetch } = useCsrfContext()

  const findSimilar = useMutation({
    mutationFn: async ({
      inspirationIds,
      limit,
      method = 'auto',
    }: FindSimilarOptions): Promise<SimilarResult[]> => {
      const response = await csrfFetch('/api/website-flow/similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspirationIds, limit, method }),
      })
      if (!response.ok) throw new Error('Failed to find similar websites')
      const data = await response.json()
      return data.data.similar
    },
  })

  return {
    findSimilar,
    data: findSimilar.data,
    isPending: findSimilar.isPending,
    isError: findSimilar.isError,
    error: findSimilar.error,
  }
}
