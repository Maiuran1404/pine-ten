'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from './use-queries'
import { useCsrfContext } from '@/providers/csrf-provider'
import type { DeliveryStatus } from '@/lib/validations/website-delivery-schemas'

interface WebsiteProject {
  id: string
  userId: string
  phase: 'INSPIRATION' | 'SKELETON' | 'APPROVAL'
  status: string
  selectedInspirations: Array<{
    id: string
    url: string
    screenshotUrl: string
    name: string
    notes?: string
    isUserSubmitted?: boolean
  }>
  userNotes: string | null
  skeleton: Record<string, unknown> | null
  chatHistory: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: string
  }>
  skeletonStage: string | null
  timeline: Record<string, unknown> | null
  deliveryStatus: DeliveryStatus
  framerProjectUrl: string | null
  framerPreviewUrl: string | null
  framerDeployedUrl: string | null
  creditsUsed: number
  createdAt: string
  updatedAt: string
}

export function useWebsiteProject(projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.websiteFlow.project(projectId ?? ''),
    queryFn: async (): Promise<WebsiteProject> => {
      const response = await fetch(`/api/website-flow/projects/${projectId}`)
      if (!response.ok) throw new Error('Failed to load project')
      const data = await response.json()
      return data.data
    },
    enabled: !!projectId,
  })
}

export function useCreateWebsiteProject() {
  const queryClient = useQueryClient()
  const { csrfFetch } = useCsrfContext()

  return useMutation({
    mutationFn: async (input: {
      selectedInspirations: Array<{
        id: string
        url: string
        screenshotUrl: string
        name: string
        notes?: string
        isUserSubmitted?: boolean
      }>
      userNotes?: string
      phase?: 'INSPIRATION' | 'SKELETON'
    }): Promise<WebsiteProject> => {
      const response = await csrfFetch('/api/website-flow/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to create project')
      }
      const data = await response.json()
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.websiteFlow.projects() })
    },
  })
}

export function useUpdateWebsiteProject() {
  const queryClient = useQueryClient()
  const { csrfFetch } = useCsrfContext()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string
      phase?: 'INSPIRATION' | 'SKELETON' | 'APPROVAL'
      selectedInspirations?: Array<{
        id: string
        url: string
        screenshotUrl: string
        name: string
        notes?: string
        isUserSubmitted?: boolean
      }>
      userNotes?: string
      skeleton?: Record<string, unknown>
    }): Promise<WebsiteProject> => {
      const response = await csrfFetch(`/api/website-flow/projects?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to update project')
      }
      const data = await response.json()
      return data.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.websiteFlow.project(data.id) })
    },
  })
}
