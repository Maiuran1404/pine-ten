'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from './use-queries'
import { useCsrfContext } from '@/providers/csrf-provider'

interface PushResult {
  success: boolean
  projectUrl: string
  previewUrl?: string
  error?: string
}

interface PreviewResult {
  previewUrl: string
}

interface DeployResult {
  success: boolean
  deployedUrl: string
  error?: string
}

export function useWebsiteDelivery() {
  const queryClient = useQueryClient()
  const { csrfFetch } = useCsrfContext()

  const pushToFramer = useMutation({
    mutationFn: async ({
      projectId,
      templateId,
    }: {
      projectId: string
      templateId?: string
    }): Promise<PushResult> => {
      const response = await csrfFetch('/api/website-flow/delivery/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, templateId }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to push to Framer')
      }
      const data = await response.json()
      return data.data
    },
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.websiteFlow.project(projectId) })
    },
  })

  const publishPreview = useMutation({
    mutationFn: async ({ projectId }: { projectId: string }): Promise<PreviewResult> => {
      const response = await csrfFetch('/api/website-flow/delivery/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to publish preview')
      }
      const data = await response.json()
      return data.data
    },
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.websiteFlow.project(projectId) })
    },
  })

  const deployToProduction = useMutation({
    mutationFn: async ({ projectId }: { projectId: string }): Promise<DeployResult> => {
      const response = await csrfFetch('/api/website-flow/delivery/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to deploy')
      }
      const data = await response.json()
      return data.data
    },
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.websiteFlow.project(projectId) })
    },
  })

  return { pushToFramer, publishPreview, deployToProduction }
}
