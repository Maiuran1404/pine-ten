'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from './use-queries'
import { useCsrfContext } from '@/providers/csrf-provider'

interface SkeletonUpdate {
  action: 'add' | 'remove' | 'reorder' | 'update'
  sectionId?: string
  data?: Record<string, unknown>
}

interface SkeletonChatResult {
  message: string
  skeletonUpdates: SkeletonUpdate[]
  styleUpdate: Record<string, string> | null
  readyForApproval: boolean
}

export function useWebsiteSkeleton() {
  const queryClient = useQueryClient()
  const { csrfFetch } = useCsrfContext()

  const sendMessage = useMutation({
    mutationFn: async ({
      projectId,
      message,
      currentSkeleton,
    }: {
      projectId: string
      message: string
      currentSkeleton?: Record<string, unknown>
    }): Promise<SkeletonChatResult> => {
      const response = await csrfFetch('/api/website-flow/skeleton', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, message, currentSkeleton }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to generate skeleton')
      }
      const data = await response.json()
      return data.data
    },
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.websiteFlow.project(projectId) })
    },
  })

  return { sendMessage }
}
