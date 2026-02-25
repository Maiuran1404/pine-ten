/**
 * Hook for managing storyboard/structure panel state and interactions.
 * Handles scene editing, section reordering, regeneration,
 * scene references for feedback, and scene image data (multi-source).
 */
'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import {
  type SceneReference,
  type StructureData,
  type ChatMessage as Message,
} from '@/components/chat/types'
import type {
  LayoutSection,
  BriefingState,
  WebsiteGlobalStyles,
} from '@/lib/ai/briefing-state-machine'
import type { ImageSource, ImageMediaType } from '@/lib/ai/storyboard-image-types'
import { getFidelityForStage } from '@/lib/adapters/layout-skeleton-adapter'

export interface SceneImageData {
  primaryUrl: string
  primarySource: ImageSource
  primaryMediaType: ImageMediaType
  attribution: {
    sourceName: string
    sourceUrl: string
    filmTitle?: string
    photographer?: string
    techniqueName?: string
  }
  techniqueRef?: { name: string; url: string } // Eyecannndy technique link (if present)
}

interface UseStoryboardOptions {
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  handleSendOption: (text: string) => void
  briefingState?: BriefingState | null
}

export function useStoryboard({ inputRef, handleSendOption, briefingState }: UseStoryboardOptions) {
  const [storyboardScenes, setStoryboardScenes] = useState<StructureData | null>(null)
  const [sceneReferences, setSceneReferences] = useState<SceneReference[]>([])
  const [_sceneImageData, setSceneImageData] = useState<Map<number, SceneImageData>>(new Map())
  const latestStoryboardRef = useRef<StructureData | null>(null)

  // Website global styles (populated from AI [GLOBAL_STYLES] marker)
  const [globalStyles, setGlobalStyles] = useState<WebsiteGlobalStyles | null>(null)

  // Visual diff tracking (U1): track which scenes changed after a revision
  const [changedScenes, setChangedScenes] = useState<Set<number>>(new Set())
  const previousScenesRef = useRef<StructureData | null>(null)

  // Compute structure type from deliverable category
  const structureType = useMemo((): StructureData['type'] | null => {
    const cat = briefingState?.deliverableCategory
    if (!cat) return null
    const map: Record<string, StructureData['type']> = {
      video: 'storyboard',
      website: 'layout',
      content: 'calendar',
      design: 'single_design',
      brand: 'single_design',
    }
    return map[cat] ?? null
  }, [briefingState?.deliverableCategory])

  // Structure panel visible when we have structure data OR for website projects
  // (websites show the InspirationPanel before structure data exists)
  const structurePanelVisible =
    storyboardScenes !== null ||
    (briefingState?.deliverableCategory === 'website' && structureType === 'layout')

  // Fidelity level derived from current briefing stage (website only)
  const currentStage = briefingState?.stage
  const websiteFidelity = useMemo(() => {
    if (!currentStage) return 'low' as const
    return getFidelityForStage(currentStage)
  }, [currentStage])

  // Helper: process multi-source scene image matches from API response
  const processSceneImageMatches = useCallback(
    (
      sceneImageMatches?: Array<{
        sceneNumber: number
        images: Array<{
          url: string
          source: ImageSource
          mediaType: ImageMediaType
          attribution: {
            sourceName: string
            sourceUrl: string
            filmTitle?: string
            photographer?: string
            techniqueName?: string
          }
        }>
        primaryIndex: number
      }>
    ) => {
      if (!sceneImageMatches || sceneImageMatches.length === 0) return
      const dataMap = new Map<number, SceneImageData>()
      for (const match of sceneImageMatches) {
        if (match.images.length === 0) continue

        const primaryIdx = Math.min(match.primaryIndex, match.images.length - 1)
        const primary = match.images[primaryIdx >= 0 ? primaryIdx : 0]

        // Find the first Eyecannndy technique reference if any
        const techniqueImg = match.images.find(
          (img) => img.source === 'eyecannndy' && img.attribution.techniqueName
        )

        dataMap.set(match.sceneNumber, {
          primaryUrl: primary.url,
          primarySource: primary.source,
          primaryMediaType: primary.mediaType,
          attribution: primary.attribution,
          techniqueRef: techniqueImg
            ? {
                name: techniqueImg.attribution.techniqueName!,
                url: techniqueImg.attribution.sourceUrl,
              }
            : undefined,
        })
      }
      if (dataMap.size > 0) {
        setSceneImageData(dataMap)
      }
    },
    []
  )

  // Handle clicking a storyboard scene to reference it in chat
  const handleSceneClick = useCallback(
    (scene: { sceneNumber: number; title: string; description: string; visualNote: string }) => {
      setSceneReferences([
        {
          sceneNumber: scene.sceneNumber,
          title: scene.title,
          description: scene.description,
          visualNote: scene.visualNote,
        },
      ])
      inputRef.current?.focus()
    },
    [inputRef]
  )

  // Handle multi-scene feedback from storyboard
  const handleMultiSceneFeedback = useCallback(
    (scenes: { sceneNumber: number; title: string }[]) => {
      setSceneReferences(
        scenes.map((s) => ({
          sceneNumber: s.sceneNumber,
          title: s.title,
          description: '',
          visualNote: '',
        }))
      )
      inputRef.current?.focus()
    },
    [inputRef]
  )

  // Handle scene selection changes from storyboard panel (click-to-select)
  const handleSceneSelectionChange = useCallback(
    (scenes: { sceneNumber: number; title: string; description: string; visualNote: string }[]) => {
      setSceneReferences(
        scenes.map((s) => ({
          sceneNumber: s.sceneNumber,
          title: s.title,
          description: s.description,
          visualNote: s.visualNote,
        }))
      )
      if (scenes.length > 0) inputRef.current?.focus()
    },
    [inputRef]
  )

  // Handle strategic review action (accept / override)
  const handleStrategicReviewAction = useCallback(
    (
      response: 'accept' | 'override',
      setMessages: React.Dispatch<React.SetStateAction<Message[]>>
    ) => {
      // Mark the review as acted upon so buttons hide
      setMessages((prev) => {
        const updated = [...prev]
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].strategicReviewData && !updated[i].strategicReviewData!.userOverride) {
            updated[i] = {
              ...updated[i],
              strategicReviewData: { ...updated[i].strategicReviewData!, userOverride: true },
            }
            break
          }
        }
        return updated
      })

      // Send a user message to advance the state machine past STRATEGIC_REVIEW
      const messageText =
        response === 'accept'
          ? 'Looks good, let\u2019s continue with these improvements in mind.'
          : 'I want to keep my current approach as-is. Let\u2019s move on.'

      handleSendOption(messageText)
    },
    [handleSendOption]
  )

  // Reorder layout sections via drag-and-drop
  const handleSectionReorder = useCallback((sections: LayoutSection[]) => {
    setStoryboardScenes((prev) => {
      if (!prev || prev.type !== 'layout') return prev
      const updated = { ...prev, sections }
      latestStoryboardRef.current = updated
      return updated
    })
  }, [])

  // Edit a layout section field directly (user typed a change)
  const handleSectionEdit = useCallback((sectionIndex: number, field: string, value: string) => {
    setStoryboardScenes((prev) => {
      if (!prev || prev.type !== 'layout') return prev
      const updated = {
        ...prev,
        sections: prev.sections.map((s, i) => (i === sectionIndex ? { ...s, [field]: value } : s)),
      }
      latestStoryboardRef.current = updated
      return updated
    })
  }, [])

  // Edit a scene field directly (user typed a change)
  const handleSceneEdit = useCallback((sceneNumber: number, field: string, value: string) => {
    setStoryboardScenes((prev) => {
      if (!prev || prev.type !== 'storyboard') return prev
      const updated = {
        ...prev,
        scenes: prev.scenes.map((s) =>
          s.sceneNumber === sceneNumber ? { ...s, [field]: value } : s
        ),
      }
      latestStoryboardRef.current = updated
      return updated
    })
  }, [])

  // Trigger AI regeneration of whole storyboard
  const handleRegenerateStoryboard = useCallback(() => {
    handleSendOption('Regenerate the entire storyboard based on everything we have discussed')
  }, [handleSendOption])

  // Trigger AI regeneration of a specific scene
  const handleRegenerateScene = useCallback(
    (scene: { sceneNumber: number; title: string }) => {
      handleSendOption(
        `Regenerate Scene ${scene.sceneNumber}: "${scene.title}" — keep the overall story arc`
      )
    },
    [handleSendOption]
  )

  // Trigger AI regeneration of a specific field on a scene
  const handleRegenerateField = useCallback(
    (scene: { sceneNumber: number; title: string }, field: string) => {
      handleSendOption(`Rewrite the ${field} for Scene ${scene.sceneNumber}: "${scene.title}"`)
    },
    [handleSendOption]
  )

  // Update structure data from API response
  const updateStructureData = useCallback((data: StructureData) => {
    // Visual diff detection (U1): compare old vs new scenes
    if (data.type === 'storyboard' && previousScenesRef.current?.type === 'storyboard') {
      const oldScenes = previousScenesRef.current.scenes
      const changed = new Set<number>()
      for (const newScene of data.scenes) {
        const oldScene = oldScenes.find((s) => s.sceneNumber === newScene.sceneNumber)
        if (!oldScene) {
          // New scene added
          changed.add(newScene.sceneNumber)
        } else if (
          oldScene.title !== newScene.title ||
          oldScene.description !== newScene.description ||
          oldScene.duration !== newScene.duration ||
          oldScene.voiceover !== newScene.voiceover ||
          oldScene.visualNote !== newScene.visualNote
        ) {
          changed.add(newScene.sceneNumber)
        }
      }
      if (changed.size > 0) {
        setChangedScenes(changed)
        // Clear after 5 seconds
        setTimeout(() => setChangedScenes(new Set()), 5000)
      }
    }

    previousScenesRef.current = data
    setStoryboardScenes(data)
    if (data.type === 'storyboard') {
      latestStoryboardRef.current = data
    }
  }, [])

  return {
    storyboardScenes,
    setStoryboardScenes,
    sceneReferences,
    setSceneReferences,
    sceneImageData: _sceneImageData,
    latestStoryboardRef,
    structureType,
    structurePanelVisible,
    changedScenes,
    globalStyles,
    setGlobalStyles,
    websiteFidelity,
    processSceneImageMatches,
    handleSceneClick,
    handleMultiSceneFeedback,
    handleSceneSelectionChange,
    handleStrategicReviewAction,
    handleSectionReorder,
    handleSectionEdit,
    handleSceneEdit,
    handleRegenerateStoryboard,
    handleRegenerateScene,
    handleRegenerateField,
    updateStructureData,
  }
}
