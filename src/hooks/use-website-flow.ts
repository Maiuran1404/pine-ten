'use client'

import { useState, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { toast } from 'sonner'
import { useWebsiteInspirations } from './use-website-inspirations'
import { useVisualSimilarity } from './use-visual-similarity'
import { useWebsiteSkeleton } from './use-website-skeleton'
import { useWebsiteApproval } from './use-website-approval'
import {
  useWebsiteProject,
  useCreateWebsiteProject,
  useUpdateWebsiteProject,
} from './use-website-draft'
import { useScreenshotApi } from './use-screenshot-api'

export type WebsiteFlowPhase = 'INSPIRATION' | 'SKELETON' | 'APPROVAL'

export interface SelectedInspiration {
  id: string
  url: string
  screenshotUrl: string
  name: string
  notes?: string
  isUserSubmitted?: boolean
}

const MAX_INSPIRATIONS = 5

export function useWebsiteFlow() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialProjectId = searchParams.get('projectId')

  const [projectId, setProjectId] = useState<string | null>(initialProjectId)
  const [localPhase, setLocalPhase] = useState<WebsiteFlowPhase>('INSPIRATION')
  // Local inspirations override: null means "use server data", array means "user has edited"
  const [localInspirations, setLocalInspirations] = useState<SelectedInspiration[] | null>(null)
  const [localNotes, setLocalNotes] = useState<string | null>(null)
  const [industryFilter, setIndustryFilter] = useState<string | undefined>()
  const [styleFilter, setStyleFilter] = useState<string | undefined>()

  // Data hooks
  const project = useWebsiteProject(projectId)
  const inspirations = useWebsiteInspirations({ industry: industryFilter, style: styleFilter })
  const visualSimilarity = useVisualSimilarity()
  const skeleton = useWebsiteSkeleton()
  const approval = useWebsiteApproval()
  const screenshot = useScreenshotApi()
  const createProject = useCreateWebsiteProject()
  const updateProject = useUpdateWebsiteProject()

  // Derive phase: prefer server, fall back to local
  const phase: WebsiteFlowPhase = project.data?.phase ?? localPhase

  // Derive inspirations: prefer local edits, fall back to server data, then empty
  const selectedInspirations = useMemo(() => {
    if (localInspirations !== null) return localInspirations
    if (project.data?.selectedInspirations?.length) return project.data.selectedInspirations
    return []
  }, [localInspirations, project.data?.selectedInspirations])

  // Derive notes: prefer local edits, fall back to server data
  const userNotes = localNotes ?? project.data?.userNotes ?? ''

  // Sync projectId to URL so refreshes preserve state
  const updateUrl = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('projectId', id)
      router.replace(`?${params.toString()}`, { scroll: false })
    },
    [searchParams, router]
  )

  const setUserNotes = useCallback((notes: string) => {
    setLocalNotes(notes)
  }, [])

  const addInspiration = useCallback((inspiration: SelectedInspiration) => {
    setLocalInspirations((prev) => {
      const current = prev ?? []
      if (current.some((i) => i.id === inspiration.id)) return current
      if (current.length >= MAX_INSPIRATIONS) {
        toast.error(`Maximum ${MAX_INSPIRATIONS} inspirations allowed`)
        return current
      }
      return [...current, inspiration]
    })
  }, [])

  const removeInspiration = useCallback((id: string) => {
    setLocalInspirations((prev) => {
      const current = prev ?? []
      return current.filter((i) => i.id !== id)
    })
  }, [])

  const updateInspirationNotes = useCallback((id: string, notes: string) => {
    setLocalInspirations((prev) => {
      const current = prev ?? []
      return current.map((i) => (i.id === id ? { ...i, notes } : i))
    })
  }, [])

  const findSimilar = useCallback(() => {
    const ids = selectedInspirations.map((i) => i.id).filter((id) => !id.startsWith('user-'))
    if (ids.length > 0) {
      visualSimilarity.findSimilar.mutate({ inspirationIds: ids })
    }
  }, [selectedInspirations, visualSimilarity])

  const advanceToSkeleton = useCallback(async () => {
    if (selectedInspirations.length === 0) return
    Sentry.addBreadcrumb({
      category: 'website-flow',
      message: 'Advancing to SKELETON phase',
      data: { inspirationCount: selectedInspirations.length, projectId },
      level: 'info',
    })

    if (!projectId) {
      // Create project directly in SKELETON phase (single API call)
      const newProject = await createProject.mutateAsync({
        selectedInspirations,
        userNotes: userNotes || undefined,
        phase: 'SKELETON',
      })
      setProjectId(newProject.id)
      setLocalPhase('SKELETON')
      updateUrl(newProject.id)
    } else {
      await updateProject.mutateAsync({
        id: projectId,
        phase: 'SKELETON',
        selectedInspirations,
        userNotes: userNotes || undefined,
      })
      setLocalPhase('SKELETON')
    }
  }, [selectedInspirations, userNotes, projectId, createProject, updateProject, updateUrl])

  const advanceToApproval = useCallback(async () => {
    if (!projectId) return
    Sentry.addBreadcrumb({
      category: 'website-flow',
      message: 'Advancing to APPROVAL phase',
      data: { projectId },
      level: 'info',
    })
    await updateProject.mutateAsync({
      id: projectId,
      phase: 'APPROVAL',
    })
    setLocalPhase('APPROVAL')
  }, [projectId, updateProject])

  const goBack = useCallback(async () => {
    if (phase === 'SKELETON' && projectId) {
      await updateProject.mutateAsync({
        id: projectId,
        phase: 'INSPIRATION',
      })
      setLocalPhase('INSPIRATION')
    } else if (phase === 'APPROVAL' && projectId) {
      await updateProject.mutateAsync({
        id: projectId,
        phase: 'SKELETON',
      })
      setLocalPhase('SKELETON')
    }
  }, [phase, projectId, updateProject])

  const approveProject = useCallback(async () => {
    if (!projectId) return
    return approval.mutateAsync(projectId)
  }, [projectId, approval])

  const sendSkeletonMessage = useCallback(
    async (message: string) => {
      if (!projectId) return
      return skeleton.sendMessage.mutateAsync({
        projectId,
        message,
        currentSkeleton: project.data?.skeleton ?? undefined,
      })
    },
    [projectId, skeleton.sendMessage, project.data?.skeleton]
  )

  const generateSkeletonFromTemplate = useCallback(
    async (industry: string) => {
      if (!projectId) return
      return skeleton.generateFromTemplate.mutateAsync({
        projectId,
        industry,
      })
    },
    [projectId, skeleton.generateFromTemplate]
  )

  return {
    // State
    projectId,
    phase,
    selectedInspirations,
    userNotes,
    industryFilter,
    styleFilter,

    // Setters
    setUserNotes,
    setIndustryFilter,
    setStyleFilter,

    // Inspiration actions
    addInspiration,
    removeInspiration,
    updateInspirationNotes,
    findSimilar,

    // Phase transitions
    advanceToSkeleton,
    advanceToApproval,
    goBack,
    approveProject,

    // Skeleton actions
    sendSkeletonMessage,
    generateSkeletonFromTemplate,

    // Screenshot
    captureScreenshot: screenshot,

    // Query data
    project,
    inspirations,
    similarWebsites: visualSimilarity.findSimilar,
    skeletonChat: skeleton,
    approvalMutation: approval,
    createProjectMutation: createProject,
    updateProjectMutation: updateProject,
  }
}
