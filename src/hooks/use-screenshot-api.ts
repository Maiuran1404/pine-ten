'use client'

import { useMutation } from '@tanstack/react-query'
import { useCsrfContext } from '@/providers/csrf-provider'

interface ScreenshotResult {
  imageUrl: string
  thumbnailUrl: string | null
  capturedAt: string
}

export function useScreenshotApi() {
  const { csrfFetch } = useCsrfContext()

  return useMutation({
    mutationFn: async (url: string): Promise<ScreenshotResult> => {
      const response = await csrfFetch('/api/website-flow/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to capture screenshot')
      }
      const data = await response.json()
      return data.data
    },
  })
}
