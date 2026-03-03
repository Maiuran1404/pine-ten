/**
 * Hook for managing storyboard/structure panel state and interactions.
 * Handles scene editing, section reordering, regeneration,
 * scene references for feedback, and scene image data (multi-source).
 */
'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import { useCsrfContext } from '@/providers/csrf-provider'
import {
  type SceneReference,
  type StructureData,
  type ChatMessage as Message,
} from '@/components/chat/types'
import type {
  LayoutSection,
  BriefingState,
  SerializedBriefingState,
  WebsiteGlobalStyles,
  VideoNarrative,
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

export type SceneGenerationStatus = 'pending' | 'generating' | 'done' | 'error'

interface UseStoryboardOptions {
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  handleSendOption: (text: string, stateOverrides?: Partial<SerializedBriefingState>) => void
  briefingState?: BriefingState | null
}

export function useStoryboard({ inputRef, handleSendOption, briefingState }: UseStoryboardOptions) {
  const { csrfFetch } = useCsrfContext()
  const [storyboardScenes, setStoryboardScenes] = useState<StructureData | null>(null)
  const [sceneReferences, setSceneReferences] = useState<SceneReference[]>([])
  const latestStoryboardRef = useRef<StructureData | null>(null)

  // Derive scene image data from storyboard scenes — eliminates dual-state sync bugs
  const sceneImageData = useMemo(() => {
    if (!storyboardScenes || storyboardScenes.type !== 'storyboard')
      return new Map<number, SceneImageData>()
    const dataMap = new Map<number, SceneImageData>()
    for (const scene of storyboardScenes.scenes) {
      if (scene.resolvedImageUrl) {
        dataMap.set(scene.sceneNumber, {
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
    return dataMap
  }, [storyboardScenes])

  // Scene image generation state
  const [isGeneratingImages, setIsGeneratingImages] = useState(false)
  const [imageGenerationProgress, setImageGenerationProgress] = useState<
    Map<number, SceneGenerationStatus>
  >(new Map())

  // Website global styles (populated from AI [GLOBAL_STYLES] marker)
  const [globalStyles, setGlobalStyles] = useState<WebsiteGlobalStyles | null>(null)

  // Video narrative state (story concept before storyboard, video only)
  const [videoNarrative, setVideoNarrative] = useState<VideoNarrative | null>(null)
  const [narrativeApproved, setNarrativeApproved] = useState(false)

  // Visual diff tracking (U1): track which scenes changed after a revision
  // Extended (#21): Map<sceneNumber, FieldChange[]> for field-level diffs
  const [changedScenes, setChangedScenes] = useState<
    Map<number, { field: string; oldValue: string; newValue: string }[]>
  >(new Map())
  const previousScenesRef = useRef<StructureData | null>(null)

  // Undo/Redo history (#20) — max 20 entries
  // Combined into a single state object for atomic updates (prevents stale closure bugs)
  const [history, setHistory] = useState<{ stack: StructureData[]; index: number }>({
    stack: [],
    index: -1,
  })
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

  // Structure panel visible when we have structure data, video narrative,
  // at INSPIRATION stage (for style selection panel), OR for website projects
  // (websites show the InspirationPanel before structure data exists)
  const structurePanelVisible =
    briefingState?.stage === 'INSPIRATION' ||
    briefingState?.stage === 'ELABORATE' ||
    storyboardScenes !== null ||
    videoNarrative !== null ||
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
        // Embed image URLs on the scene objects — sceneImageData derives from these
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
  const pushHistory = useCallback((state: StructureData | null) => {
    if (!state || isUndoRedoRef.current) return
    setHistory((prev) => {
      // Discard any future states if we're mid-history
      const truncated = prev.stack.slice(0, prev.index + 1)
      const next = [...truncated, state].slice(-20) // max 20 entries
      return { stack: next, index: Math.min(prev.index + 1, 19) }
    })
  }, [])

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.index <= 0) return prev
      const prevIndex = prev.index - 1
      const prevState = prev.stack[prevIndex]
      if (!prevState) return prev
      isUndoRedoRef.current = true
      setStoryboardScenes(prevState)
      latestStoryboardRef.current = prevState
      isUndoRedoRef.current = false
      return { ...prev, index: prevIndex }
    })
  }, [])

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.index >= prev.stack.length - 1) return prev
      const nextIndex = prev.index + 1
      const nextState = prev.stack[nextIndex]
      if (!nextState) return prev
      isUndoRedoRef.current = true
      setStoryboardScenes(nextState)
      latestStoryboardRef.current = nextState
      isUndoRedoRef.current = false
      return { ...prev, index: nextIndex }
    })
  }, [])

  const canUndo = history.index > 0
  const canRedo = history.index < history.stack.length - 1

  // Reorder scenes via drag-and-drop (reassigns sceneNumber values)
  // Scene image data remaps automatically since it derives from storyboardScenes
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
  // sceneImageData derives automatically from the updated scene objects
  const handleSceneImageReplace = useCallback(
    (sceneNumber: number, newUrl: string, source: ImageSource = 'pexels') => {
      setStoryboardScenes((prev) => {
        if (!prev || prev.type !== 'storyboard') return prev
        const updated = {
          ...prev,
          scenes: prev.scenes.map((s) =>
            s.sceneNumber === sceneNumber
              ? {
                  ...s,
                  resolvedImageUrl: newUrl,
                  resolvedImageSource: source,
                  resolvedImageAttribution: {
                    sourceName: source.charAt(0).toUpperCase() + source.slice(1),
                    sourceUrl: '',
                  },
                }
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
      const diffFields = [
        'title',
        'description',
        'duration',
        'voiceover',
        'visualNote',
        'imageGenerationPrompt',
      ] as const
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
      // sceneImageData is now derived via useMemo from storyboardScenes — no hydration needed
    }
  }, [])

  // Update video narrative from API response
  const updateVideoNarrative = useCallback((data: VideoNarrative) => {
    setVideoNarrative(data)
  }, [])

  // Approve narrative and trigger storyboard generation
  const handleApproveNarrative = useCallback(() => {
    setNarrativeApproved(true)
    handleSendOption(
      'The story narrative looks great. Let\u2019s build the storyboard based on this.',
      { narrativeApproved: true }
    )
  }, [handleSendOption])

  // Edit a narrative field inline
  const handleNarrativeFieldEdit = useCallback(
    (field: 'concept' | 'narrative' | 'hook', value: string) => {
      setVideoNarrative((prev) => {
        if (!prev) return prev
        return { ...prev, [field]: value }
      })
    },
    []
  )

  // Regenerate narrative via AI
  const handleRegenerateNarrative = useCallback(() => {
    handleSendOption('Regenerate the story narrative with a fresh approach')
  }, [handleSendOption])

  // ─── Scene Image Generation ──────────────────────────────────

  /**
   * Generate images for all scenes in batch via hero-first-then-parallel strategy.
   * Called after INSPIRATION stage completes for video projects.
   */
  const generateSceneImages = useCallback(
    async (
      scenes: import('@/lib/ai/briefing-state-machine').StoryboardScene[],
      styleContext: string,
      briefId: string,
      styleIds?: string[],
      brandContext?: {
        colors?: { primary?: string; secondary?: string; accent?: string }
        industry?: string
        toneOfVoice?: string
        brandDescription?: string
      }
    ) => {
      if (!csrfFetch) return
      // Guard: skip if scenes already have images
      const scenesNeedingImages = scenes.filter((s) => !s.resolvedImageUrl)
      if (scenesNeedingImages.length === 0) return

      setIsGeneratingImages(true)
      // Initialize progress for all scenes as generating
      const initialProgress = new Map<number, SceneGenerationStatus>()
      for (const scene of scenesNeedingImages) {
        initialProgress.set(scene.sceneNumber, 'generating')
      }
      setImageGenerationProgress(initialProgress)

      try {
        const response = await csrfFetch('/api/storyboard-images/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenes: scenesNeedingImages.map((s) => ({
              sceneNumber: s.sceneNumber,
              title: s.title,
              description: s.description,
              visualNote: s.visualNote,
              cameraNote: s.cameraNote,
              voiceover: s.voiceover,
              transition: s.transition,
              imageGenerationPrompt: s.imageGenerationPrompt,
            })),
            styleContext,
            briefId,
            styleIds,
            brandContext,
          }),
        })

        if (!response.ok) throw new Error('Batch generation failed')

        const data = await response.json()
        const results: Array<{ sceneNumber: number; imageUrl: string | null; status: string }> =
          data.data?.results ?? []

        // Build result maps
        const dataMap = new Map<number, SceneImageData>()
        const orderedResults: Array<{ sceneNumber: number; status: SceneGenerationStatus }> = []

        for (const result of results) {
          if (result.status === 'success' && result.imageUrl) {
            orderedResults.push({ sceneNumber: result.sceneNumber, status: 'done' })
            dataMap.set(result.sceneNumber, {
              primaryUrl: result.imageUrl,
              primarySource: 'ai-generated',
              primaryMediaType: 'still',
              attribution: {
                sourceName: 'AI Generated',
                sourceUrl: '',
              },
            })
          } else {
            orderedResults.push({ sceneNumber: result.sceneNumber, status: 'error' })
          }
        }

        // Stagger progress updates so the bar fills progressively (400ms between each)
        for (let i = 0; i < orderedResults.length; i++) {
          const { sceneNumber, status } = orderedResults[i]
          if (i > 0) {
            await new Promise((resolve) => setTimeout(resolve, 400))
          }
          setImageGenerationProgress((prev) => {
            const updated = new Map(prev)
            updated.set(sceneNumber, status)
            return updated
          })
        }

        if (dataMap.size > 0) {
          // Persist image URLs on scene objects — sceneImageData is derived via useMemo
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
                  resolvedImageSource: 'ai-generated' as const,
                  resolvedImageAttribution: img.attribution,
                }
              }),
            }
            latestStoryboardRef.current = updated
            return updated
          })
        }
      } catch {
        // Mark all generating as error
        setImageGenerationProgress((prev) => {
          const updated = new Map(prev)
          for (const [key, value] of updated) {
            if (value === 'pending' || value === 'generating') {
              updated.set(key, 'error')
            }
          }
          return updated
        })
      } finally {
        setIsGeneratingImages(false)
      }
    },
    [csrfFetch]
  )

  /**
   * Regenerate a single scene's image with consistency anchoring.
   */
  const regenerateSceneImage = useCallback(
    async (
      scene: import('@/lib/ai/briefing-state-machine').StoryboardScene,
      styleContext: string,
      briefId: string,
      customPrompt?: string,
      styleIds?: string[],
      heroImageUrl?: string,
      brandContext?: {
        colors?: { primary?: string; secondary?: string; accent?: string }
        industry?: string
        toneOfVoice?: string
        brandDescription?: string
      }
    ) => {
      if (!csrfFetch) return

      setImageGenerationProgress((prev) => {
        const updated = new Map(prev)
        updated.set(scene.sceneNumber, 'generating')
        return updated
      })

      try {
        const response = await csrfFetch('/api/storyboard-images/regenerate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scene: {
              sceneNumber: scene.sceneNumber,
              title: scene.title,
              description: scene.description,
              visualNote: scene.visualNote,
              cameraNote: scene.cameraNote,
              voiceover: scene.voiceover,
              transition: scene.transition,
              imageGenerationPrompt: scene.imageGenerationPrompt,
            },
            styleContext,
            briefId,
            customPrompt,
            styleIds,
            heroImageUrl,
            brandContext,
          }),
        })

        if (!response.ok) throw new Error('Regeneration failed')

        const data = await response.json()
        const imageUrl: string = data.data?.imageUrl

        if (imageUrl) {
          setImageGenerationProgress((prev) => {
            const updated = new Map(prev)
            updated.set(scene.sceneNumber, 'done')
            return updated
          })

          // Update scene image data
          handleSceneImageReplace(scene.sceneNumber, imageUrl, 'ai-generated')
        }
      } catch {
        setImageGenerationProgress((prev) => {
          const updated = new Map(prev)
          updated.set(scene.sceneNumber, 'error')
          return updated
        })
      }
    },
    [csrfFetch, handleSceneImageReplace]
  )

  return {
    storyboardScenes,
    setStoryboardScenes,
    sceneReferences,
    setSceneReferences,
    sceneImageData,
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
    // Scene image generation
    isGeneratingImages,
    imageGenerationProgress,
    generateSceneImages,
    regenerateSceneImage,
    // Video narrative
    videoNarrative,
    setVideoNarrative,
    narrativeApproved,
    setNarrativeApproved,
    updateVideoNarrative,
    handleApproveNarrative,
    handleNarrativeFieldEdit,
    handleRegenerateNarrative,
  }
}
