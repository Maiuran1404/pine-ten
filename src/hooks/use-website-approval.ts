'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from './use-queries'
import { useCsrfContext } from '@/providers/csrf-provider'

interface ApprovalResult {
  project: Record<string, unknown>
  task: Record<string, unknown>
  timeline: {
    milestones: Array<{
      id: string
      title: string
      description: string
      daysFromStart: number
      status: string
    }>
    estimatedDays: number
    creditsCost: number
  }
}

export function useWebsiteApproval() {
  const queryClient = useQueryClient()
  const { csrfFetch } = useCsrfContext()

  return useMutation({
    mutationFn: async (projectId: string): Promise<ApprovalResult> => {
      const response = await csrfFetch('/api/website-flow/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, timelineAccepted: true }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to approve project')
      }
      const data = await response.json()
      return data.data
    },
    onSuccess: (_data, projectId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.websiteFlow.project(projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.user.credits() })
    },
  })
}
