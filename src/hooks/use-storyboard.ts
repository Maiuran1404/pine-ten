/**
 * Hook for managing storyboard/structure panel state and interactions.
 * Handles scene editing, section reordering, regeneration,
 * scene references for feedback, and scene image URLs.
 */
'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import {
  type SceneReference,
  type StructureData,
  type ChatMessage as Message,
} from '@/components/chat/types'
import type { LayoutSection, BriefingState } from '@/lib/ai/briefing-state-machine'

interface UseStoryboardOptions {
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  handleSendOption: (text: string) => void
  briefingState?: BriefingState | null
}

export function useStoryboard({ inputRef, handleSendOption, briefingState }: UseStoryboardOptions) {
  const [storyboardScenes, setStoryboardScenes] = useState<StructureData | null>(null)
  const [sceneReferences, setSceneReferences] = useState<SceneReference[]>([])
  const [_sceneImageUrls, setSceneImageUrls] = useState<Map<number, string>>(new Map())
  const latestStoryboardRef = useRef<StructureData | null>(null)

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

  // Structure panel visible only when we have actual structure data
  const structurePanelVisible = storyboardScenes !== null

  // Helper: process Pexels scene image matches from API response
  const processSceneImageMatches = useCallback(
    (
      sceneImageMatches?: Array<{
        sceneNumber: number
        photos: Array<{ url: string }>
      }>
    ) => {
      if (!sceneImageMatches || sceneImageMatches.length === 0) return
      const urlMap = new Map<number, string>()
      for (const match of sceneImageMatches) {
        if (match.photos.length > 0) {
          urlMap.set(match.sceneNumber, match.photos[0].url)
        }
      }
      if (urlMap.size > 0) {
        setSceneImageUrls(urlMap)
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
    sceneImageUrls: _sceneImageUrls,
    latestStoryboardRef,
    structureType,
    structurePanelVisible,
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
