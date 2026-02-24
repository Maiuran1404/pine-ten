'use client'

import { useState, useCallback } from 'react'
import { useWebsiteInspirations, useSimilarWebsites } from './use-website-inspirations'
import { useWebsiteSkeleton } from './use-website-skeleton'
import { useWebsiteApproval } from './use-website-approval'
import {
  useWebsiteProject,
  useCreateWebsiteProject,
  useUpdateWebsiteProject,
} from './use-website-draft'
import { useScreenshotApi } from './use-screenshot-api'

export type WebsiteFlowPhase = 'INSPIRATION' | 'SKELETON' | 'APPROVAL'

interface SelectedInspiration {
  id: string
  url: string
  screenshotUrl: string
  name: string
  notes?: string
  isUserSubmitted?: boolean
}

export function useWebsiteFlow(initialProjectId?: string | null) {
  const [projectId, setProjectId] = useState<string | null>(initialProjectId ?? null)
  const [phase, setPhase] = useState<WebsiteFlowPhase>('INSPIRATION')
  const [selectedInspirations, setSelectedInspirations] = useState<SelectedInspiration[]>([])
  const [userNotes, setUserNotes] = useState('')
  const [industryFilter, setIndustryFilter] = useState<string | undefined>()
  const [styleFilter, setStyleFilter] = useState<string | undefined>()

  // Data hooks
  const project = useWebsiteProject(projectId)
  const inspirations = useWebsiteInspirations({ industry: industryFilter, style: styleFilter })
  const similarWebsites = useSimilarWebsites()
  const skeleton = useWebsiteSkeleton()
  const approval = useWebsiteApproval()
  const screenshot = useScreenshotApi()
  const createProject = useCreateWebsiteProject()
  const updateProject = useUpdateWebsiteProject()

  // Sync phase from project data
  const currentPhase = project.data?.phase ?? phase

  const addInspiration = useCallback((inspiration: SelectedInspiration) => {
    setSelectedInspirations((prev) => {
      if (prev.some((i) => i.id === inspiration.id)) return prev
      if (prev.length >= 5) return prev
      return [...prev, inspiration]
    })
  }, [])

  const removeInspiration = useCallback((id: string) => {
    setSelectedInspirations((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const updateInspirationNotes = useCallback((id: string, notes: string) => {
    setSelectedInspirations((prev) => prev.map((i) => (i.id === id ? { ...i, notes } : i)))
  }, [])

  const findSimilar = useCallback(() => {
    const ids = selectedInspirations.map((i) => i.id).filter((id) => !id.startsWith('user-'))
    if (ids.length > 0) {
      similarWebsites.mutate(ids)
    }
  }, [selectedInspirations, similarWebsites])

  const advanceToSkeleton = useCallback(async () => {
    if (selectedInspirations.length === 0) return

    if (!projectId) {
      const newProject = await createProject.mutateAsync({
        selectedInspirations,
        userNotes: userNotes || undefined,
      })
      setProjectId(newProject.id)
      setPhase('SKELETON')
      // Update project to SKELETON phase
      await updateProject.mutateAsync({
        id: newProject.id,
        phase: 'SKELETON',
      })
    } else {
      await updateProject.mutateAsync({
        id: projectId,
        phase: 'SKELETON',
        selectedInspirations,
        userNotes: userNotes || undefined,
      })
      setPhase('SKELETON')
    }
  }, [selectedInspirations, userNotes, projectId, createProject, updateProject])

  const advanceToApproval = useCallback(async () => {
    if (!projectId) return
    await updateProject.mutateAsync({
      id: projectId,
      phase: 'APPROVAL',
    })
    setPhase('APPROVAL')
  }, [projectId, updateProject])

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

  return {
    // State
    projectId,
    phase: currentPhase,
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
    approveProject,

    // Skeleton actions
    sendSkeletonMessage,

    // Screenshot
    captureScreenshot: screenshot,

    // Query data
    project,
    inspirations,
    similarWebsites,
    skeletonChat: skeleton,
    approvalMutation: approval,
    createProjectMutation: createProject,
    updateProjectMutation: updateProject,
  }
}
