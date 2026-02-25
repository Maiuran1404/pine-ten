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
  // Extended (#21): Map<sceneNumber, FieldChange[]> for field-level diffs
  const [changedScenes, setChangedScenes] = useState<
    Map<number, { field: string; oldValue: string; newValue: string }[]>
  >(new Map())
  const previousScenesRef = useRef<StructureData | null>(null)

  // Undo/Redo history (#20) — max 20 entries
  const [historyStack, setHistoryStack] = useState<StructureData[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const isUndoRedoRef = useRef(false)

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
        // Also embed image URLs on the scene objects so they persist with structureData
        setStoryboardScenes((prev) => {
          if (!prev || prev.type !== 'storyboard') return prev
          const updated = {
            ...prev,
            scenes: prev.scenes.map((scene) => {
              const img = dataMap.get(scene.sceneNumber)
              if (!img) return scene
              return {
                ...scene,
                resolvedImageUrl: img.primaryUrl,
                resolvedImageSource: img.primarySource,
                resolvedImageAttribution: img.attribution,
              }
            }),
          }
          latestStoryboardRef.current = updated
          return updated
        })
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

  // Push current state to history before making changes (#20)
  const pushHistory = useCallback(
    (state: StructureData | null) => {
      if (!state || isUndoRedoRef.current) return
      setHistoryStack((prev) => {
        // Discard any future states if we're mid-history
        const truncated = prev.slice(0, historyIndex + 1)
        const next = [...truncated, state].slice(-20) // max 20 entries
        return next
      })
      setHistoryIndex((prev) => Math.min(prev + 1, 19))
    },
    [historyIndex]
  )

  const undo = useCallback(() => {
    if (historyIndex <= 0) return
    const prevIndex = historyIndex - 1
    const prevState = historyStack[prevIndex]
    if (!prevState) return
    isUndoRedoRef.current = true
    setStoryboardScenes(prevState)
    latestStoryboardRef.current = prevState
    setHistoryIndex(prevIndex)
    isUndoRedoRef.current = false
  }, [historyIndex, historyStack])

  const redo = useCallback(() => {
    if (historyIndex >= historyStack.length - 1) return
    const nextIndex = historyIndex + 1
    const nextState = historyStack[nextIndex]
    if (!nextState) return
    isUndoRedoRef.current = true
    setStoryboardScenes(nextState)
    latestStoryboardRef.current = nextState
    setHistoryIndex(nextIndex)
    isUndoRedoRef.current = false
  }, [historyIndex, historyStack])

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < historyStack.length - 1

  // Reorder scenes via drag-and-drop (reassigns sceneNumber values)
  const handleSceneReorder = useCallback(
    (reorderedScenes: import('@/lib/ai/briefing-state-machine').StoryboardScene[]) => {
      pushHistory(storyboardScenes)
      setStoryboardScenes((prev) => {
        if (!prev || prev.type !== 'storyboard') return prev
        const updated = {
          ...prev,
          scenes: reorderedScenes.map((scene, i) => ({
            ...scene,
            sceneNumber: i + 1,
          })),
        }
        latestStoryboardRef.current = updated
        return updated
      })
    },
    [pushHistory, storyboardScenes]
  )

  // Edit a scene field directly (user typed a change)
  const handleSceneEdit = useCallback(
    (sceneNumber: number, field: string, value: string) => {
      pushHistory(storyboardScenes)
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
    },
    [pushHistory, storyboardScenes]
  )

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

  // Replace a scene's image with a new URL (#11)
  const handleSceneImageReplace = useCallback(
    (sceneNumber: number, newUrl: string, source: ImageSource = 'pexels') => {
      // Update the scene image data map
      setSceneImageData((prev) => {
        const updated = new Map(prev)
        updated.set(sceneNumber, {
          primaryUrl: newUrl,
          primarySource: source,
          primaryMediaType: 'still',
          attribution: {
            sourceName: source.charAt(0).toUpperCase() + source.slice(1),
            sourceUrl: '',
          },
        })
        return updated
      })
      // Also persist the URL on the scene object
      setStoryboardScenes((prev) => {
        if (!prev || prev.type !== 'storyboard') return prev
        const updated = {
          ...prev,
          scenes: prev.scenes.map((s) =>
            s.sceneNumber === sceneNumber
              ? { ...s, resolvedImageUrl: newUrl, resolvedImageSource: source }
              : s
          ),
        }
        latestStoryboardRef.current = updated
        return updated
      })
    },
    []
  )

  // Update structure data from API response
  const updateStructureData = useCallback((data: StructureData) => {
    // Visual diff detection (U1 + #21): compare old vs new scenes with field-level diffs
    if (data.type === 'storyboard' && previousScenesRef.current?.type === 'storyboard') {
      const oldScenes = previousScenesRef.current.scenes
      const changed = new Map<number, { field: string; oldValue: string; newValue: string }[]>()
      const diffFields = ['title', 'description', 'duration', 'voiceover', 'visualNote'] as const
      for (const newScene of data.scenes) {
        const oldScene = oldScenes.find((s) => s.sceneNumber === newScene.sceneNumber)
        if (!oldScene) {
          changed.set(newScene.sceneNumber, [
            { field: 'scene', oldValue: '', newValue: 'New scene added' },
          ])
        } else {
          const fieldChanges: { field: string; oldValue: string; newValue: string }[] = []
          for (const field of diffFields) {
            const oldVal = (oldScene[field] as string) || ''
            const newVal = (newScene[field] as string) || ''
            if (oldVal !== newVal) {
              fieldChanges.push({ field, oldValue: oldVal, newValue: newVal })
            }
          }
          if (fieldChanges.length > 0) {
            changed.set(newScene.sceneNumber, fieldChanges)
          }
        }
      }
      if (changed.size > 0) {
        setChangedScenes(changed)
        // Clear after 8 seconds (longer so users can hover to see diffs)
        setTimeout(() => setChangedScenes(new Map()), 8000)
      }
    }

    previousScenesRef.current = data
    setStoryboardScenes(data)
    if (data.type === 'storyboard') {
      latestStoryboardRef.current = data
      // Hydrate sceneImageData from persisted image URLs on scenes (survives draft restore)
      const hydrated = new Map<number, SceneImageData>()
      for (const scene of data.scenes) {
        if (scene.resolvedImageUrl) {
          hydrated.set(scene.sceneNumber, {
            primaryUrl: scene.resolvedImageUrl,
            primarySource: (scene.resolvedImageSource as ImageSource) || 'pexels',
            primaryMediaType: 'still',
            attribution: scene.resolvedImageAttribution || {
              sourceName: scene.resolvedImageSource || 'Pexels',
              sourceUrl: '',
            },
          })
        }
      }
      if (hydrated.size > 0) {
        setSceneImageData((prev) => (prev.size > 0 ? prev : hydrated))
      }
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
    handleSceneReorder,
    handleRegenerateStoryboard,
    handleRegenerateScene,
    handleRegenerateField,
    handleSceneImageReplace,
    updateStructureData,
    undo,
    redo,
    canUndo,
    canRedo,
  }
}
