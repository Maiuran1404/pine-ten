/**
 * Hook for managing style selection state and handlers.
 * Handles selecting/deselecting styles, submitting style choices,
 * showing more/different styles, and moodboard collection management.
 */
'use client'

import { useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { useCsrfContext } from '@/providers/csrf-provider'
import { type DeliverableStyle, type ChatMessage as Message } from '@/components/chat/types'
import type { VideoReferenceStyle } from '@/components/chat/video-reference-grid'
import type { ChatApiResponse } from './use-chat-messages'

interface UseStyleSelectionOptions {
  messages: Message[]
  isLoading: boolean
  moodboardStyleIds: string[]
  moodboardHasStyles: boolean
  hasMoodboardItem: (id: string) => boolean
  addFromStyle: (style: DeliverableStyle) => void
  addStyleToVisualDirection: (style: DeliverableStyle) => void
  removeMoodboardItem: (id: string) => void
  moodboardItems: Array<{ id: string; type: string; metadata?: { styleId?: string } }>
  sendChatAndReceive: (
    userMessage: Message,
    extraBody?: Record<string, unknown>
  ) => Promise<ChatApiResponse | null>
  setIsLoading: (loading: boolean) => void
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  setAnimatingMessageId: (id: string | null) => void
  selectedStyles: string[]
}

export function useStyleSelection({
  messages,
  isLoading,
  moodboardStyleIds,
  moodboardHasStyles,
  hasMoodboardItem,
  addFromStyle,
  addStyleToVisualDirection,
  removeMoodboardItem,
  moodboardItems,
  sendChatAndReceive,
  setIsLoading,
  setMessages,
  setAnimatingMessageId,
  selectedStyles: selectedStylesProp,
}: UseStyleSelectionOptions) {
  const { csrfFetch } = useCsrfContext()
  const [selectedStyles, setSelectedStyles] = useState<string[]>([])
  const [hoveredStyleName, setHoveredStyleName] = useState<string | null>(null)
  const [selectedDeliverableStyles, setSelectedDeliverableStyles] = useState<string[]>([])
  const [selectedStyleForModal, setSelectedStyleForModal] = useState<DeliverableStyle | null>(null)
  const [currentDeliverableType, setCurrentDeliverableType] = useState<string | null>(null)
  const [styleOffset, setStyleOffset] = useState<Record<string, number>>({})
  const [excludedStyleAxes, setExcludedStyleAxes] = useState<string[]>([])

  // Find last style message index
  const lastStyleMessageIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].deliverableStyles && messages[i].deliverableStyles!.length > 0) {
        const hasSubsequentUserMessage = messages.slice(i + 1).some((m) => m.role === 'user')
        if (hasSubsequentUserMessage) return -1
        return i
      }
    }
    return -1
  }, [messages])

  const handleStyleSelect = useCallback((styleName: string) => {
    setSelectedStyles((prev) =>
      prev.includes(styleName) ? prev.filter((s) => s !== styleName) : [...prev, styleName]
    )
  }, [])

  const handleStyleCardClick = useCallback((style: DeliverableStyle) => {
    setSelectedStyleForModal(style)
  }, [])

  const handleAddToCollection = useCallback(
    (style: DeliverableStyle) => {
      if (!hasMoodboardItem(style.id)) {
        addFromStyle(style)
        addStyleToVisualDirection(style)
        toast.success(`Added "${style.name}" to collection`)

        csrfFetch('/api/style-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            styleId: style.id,
            deliverableType: style.deliverableType,
            styleAxis: style.styleAxis,
            selectionContext: 'chat',
            wasConfirmed: false,
          }),
        }).catch((err) => console.error('Failed to record style selection:', err))
      }
    },
    [hasMoodboardItem, addFromStyle, addStyleToVisualDirection, csrfFetch]
  )

  const handleRemoveFromCollection = useCallback(
    (styleId: string) => {
      const item = moodboardItems.find((i) => i.metadata?.styleId === styleId)
      if (item) {
        removeMoodboardItem(item.id)
        toast.success('Removed from collection')
      }
    },
    [moodboardItems, removeMoodboardItem]
  )

  const handleClearStyleCollection = useCallback(() => {
    const styleItems = moodboardItems.filter((i) => i.type === 'style')
    styleItems.forEach((item) => removeMoodboardItem(item.id))
    toast.success('Collection cleared')
  }, [moodboardItems, removeMoodboardItem])

  // Handle style submissions
  const handleSubmitStyles = useCallback(async () => {
    if (selectedStyles.length === 0 || isLoading) return

    const allStyleReferences = messages
      .filter((m) => m.styleReferences && m.styleReferences.length > 0)
      .flatMap((m) => m.styleReferences || [])

    const matchedStyles = allStyleReferences.filter((s) => selectedStyles.includes(s.name))

    const selectedStyleForMessage: DeliverableStyle | undefined =
      matchedStyles.length === 1
        ? {
            id: `style-ref-${matchedStyles[0].name}`,
            name: matchedStyles[0].name,
            description: matchedStyles[0].description || null,
            imageUrl: matchedStyles[0].imageUrl,
            deliverableType: matchedStyles[0].category || 'unknown',
            styleAxis: 'reference',
            subStyle: null,
            semanticTags: [],
          }
        : undefined

    const styleMessage =
      selectedStyles.length === 1
        ? `Style selected: ${selectedStyles[0]}`
        : `Styles selected: ${selectedStyles.join(', ')}`

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: styleMessage,
      timestamp: new Date(),
      selectedStyle: selectedStyleForMessage,
    }

    await sendChatAndReceive(userMessage, { selectedStyles, moodboardHasStyles })
  }, [selectedStyles, isLoading, messages, moodboardHasStyles, sendChatAndReceive])

  const handleSubmitDeliverableStyles = useCallback(
    async (deliverableStyles: DeliverableStyle[]) => {
      if (moodboardStyleIds.length === 0 || isLoading) return

      const selectedStyleMatches = deliverableStyles.filter((s) => moodboardStyleIds.includes(s.id))
      const selectedStyleForMessage =
        selectedStyleMatches.length === 1 ? selectedStyleMatches[0] : undefined

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: 'Please implement this.',
        timestamp: new Date(),
        selectedStyle: selectedStyleForMessage,
      }

      await sendChatAndReceive(userMessage, {
        selectedDeliverableStyles: moodboardStyleIds,
        moodboardHasStyles,
      })
    },
    [moodboardStyleIds, isLoading, moodboardHasStyles, sendChatAndReceive]
  )

  const handleConfirmStyleSelection = useCallback(
    async (selectedStylesList: DeliverableStyle[]) => {
      if (selectedStylesList.length === 0 || isLoading) return

      const style = selectedStylesList[0]
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: `Style selected: ${style.name}`,
        timestamp: new Date(),
        selectedStyle: style,
      }

      const data = await sendChatAndReceive(userMessage, {
        selectedDeliverableStyles: selectedStylesList.map((s) => s.id),
        moodboardHasStyles: true,
      })

      if (data) {
        selectedStylesList.forEach((s) => {
          if (!hasMoodboardItem(s.id)) {
            addFromStyle(s)
            addStyleToVisualDirection(s)
          }
        })
      }
    },
    [isLoading, sendChatAndReceive, hasMoodboardItem, addFromStyle, addStyleToVisualDirection]
  )

  const handleSelectVideo = useCallback(
    async (video: VideoReferenceStyle) => {
      if (isLoading) return

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: `Video style selected: ${video.name}`,
        timestamp: new Date(),
        selectedStyle: {
          id: video.id,
          name: video.name,
          description: video.description,
          imageUrl: video.imageUrl,
          deliverableType: video.deliverableType,
          styleAxis: video.styleAxis,
          subStyle: video.subStyle || null,
          semanticTags: video.semanticTags || [],
        },
      }

      const data = await sendChatAndReceive(userMessage, {
        selectedDeliverableStyles: [video.id],
        moodboardHasStyles: true,
      })

      if (data && !hasMoodboardItem(video.id)) {
        addFromStyle({
          id: video.id,
          name: video.name,
          description: video.description,
          imageUrl: video.imageUrl,
          deliverableType: video.deliverableType,
          styleAxis: video.styleAxis,
          subStyle: video.subStyle || null,
          semanticTags: video.semanticTags || [],
        })
      }
    },
    [isLoading, sendChatAndReceive, hasMoodboardItem, addFromStyle]
  )

  const handleShowMoreStyles = useCallback(
    async (styleAxis: string) => {
      if (isLoading) return

      // Derive deliverable type
      let resolvedDeliverableType = currentDeliverableType
      if (!resolvedDeliverableType) {
        const lastStyleMsg = [...messages]
          .reverse()
          .find(
            (m) =>
              m.deliverableStyleMarker || m.videoReferences?.length || m.deliverableStyles?.length
          )
        resolvedDeliverableType =
          lastStyleMsg?.deliverableStyleMarker?.deliverableType ||
          lastStyleMsg?.videoReferences?.[0]?.deliverableType ||
          lastStyleMsg?.deliverableStyles?.[0]?.deliverableType ||
          null
        if (resolvedDeliverableType) {
          setCurrentDeliverableType(resolvedDeliverableType)
        }
      }
      if (!resolvedDeliverableType) return

      const currentOffset = styleOffset[styleAxis] || 0
      const newOffset = currentOffset + 4

      setIsLoading(true)

      try {
        const response = await csrfFetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            selectedStyles: selectedStylesProp,
            styleOffset: newOffset,
            deliverableStyleMarker: {
              type: 'more',
              deliverableType: resolvedDeliverableType,
              styleAxis,
              searchTerms: [...messages].reverse().find((m) => m.deliverableStyleMarker)
                ?.deliverableStyleMarker?.searchTerms,
            },
          }),
        })

        if (!response.ok) throw new Error('Failed to get more styles')

        const data = await response.json()

        if (data.videoReferences && data.videoReferences.length > 0) {
          // Update the latest style message in-place (no new chat bubble)
          setMessages((prev) => {
            const idx = [...prev]
              .reverse()
              .findIndex((m) => m.videoReferences?.length || m.deliverableStyles?.length)
            if (idx === -1) return prev
            const realIdx = prev.length - 1 - idx
            const updated = [...prev]
            updated[realIdx] = {
              ...updated[realIdx],
              videoReferences: data.videoReferences,
              deliverableStyleMarker: data.deliverableStyleMarker,
            }
            return updated
          })
        } else if (data.deliverableStyles && data.deliverableStyles.length > 0) {
          const isCycled = data.deliverableStyles.some(
            (s: { matchReason?: string }) =>
              s.matchReason?.includes('Top') ||
              s.matchReason?.includes('Similar') ||
              s.matchReason?.includes('Recommended')
          )

          setStyleOffset((prev) => ({
            ...prev,
            [styleAxis]: isCycled ? 0 : newOffset,
          }))

          // Update the latest style message in-place (no new chat bubble)
          setMessages((prev) => {
            const idx = [...prev]
              .reverse()
              .findIndex((m) => m.deliverableStyles?.length || m.videoReferences?.length)
            if (idx === -1) return prev
            const realIdx = prev.length - 1 - idx
            const updated = [...prev]
            updated[realIdx] = {
              ...updated[realIdx],
              deliverableStyles: data.deliverableStyles,
              deliverableStyleMarker: data.deliverableStyleMarker,
            }
            return updated
          })
        } else {
          toast.info('Showing top recommended styles')
        }
      } catch {
        toast.error('Failed to load more styles')
      } finally {
        setIsLoading(false)
      }
    },
    [
      currentDeliverableType,
      isLoading,
      styleOffset,
      messages,
      selectedStylesProp,
      setIsLoading,
      setMessages,
      csrfFetch,
    ]
  )

  const handleShowDifferentStyles = useCallback(async () => {
    if (isLoading) return

    // Derive deliverable type
    let resolvedDeliverableType = currentDeliverableType
    if (!resolvedDeliverableType) {
      const lastStyleMsg = [...messages]
        .reverse()
        .find(
          (m) =>
            m.deliverableStyleMarker || m.videoReferences?.length || m.deliverableStyles?.length
        )
      resolvedDeliverableType =
        lastStyleMsg?.deliverableStyleMarker?.deliverableType ||
        lastStyleMsg?.videoReferences?.[0]?.deliverableType ||
        lastStyleMsg?.deliverableStyles?.[0]?.deliverableType ||
        null
      if (resolvedDeliverableType) {
        setCurrentDeliverableType(resolvedDeliverableType)
      }
    }
    if (!resolvedDeliverableType) return

    const lastMessage = messages
      .filter((m) => m.deliverableStyles && m.deliverableStyles.length > 0)
      .pop()
    const currentAxes = lastMessage?.deliverableStyles?.map((s) => s.styleAxis) || []
    const newExcludedAxes = [...new Set([...excludedStyleAxes, ...currentAxes])]

    setIsLoading(true)

    try {
      const response = await csrfFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          selectedStyles: selectedStylesProp,
          excludeStyleAxes: newExcludedAxes,
          deliverableStyleMarker: {
            type: 'different',
            deliverableType: resolvedDeliverableType,
            searchTerms: [...messages].reverse().find((m) => m.deliverableStyleMarker)
              ?.deliverableStyleMarker?.searchTerms,
          },
        }),
      })

      if (!response.ok) throw new Error('Failed to get different styles')

      const data = await response.json()

      if (data.videoReferences && data.videoReferences.length > 0) {
        // Update the latest style message in-place (no new chat bubble)
        setMessages((prev) => {
          const idx = [...prev]
            .reverse()
            .findIndex((m) => m.videoReferences?.length || m.deliverableStyles?.length)
          if (idx === -1) return prev
          const realIdx = prev.length - 1 - idx
          const updated = [...prev]
          updated[realIdx] = {
            ...updated[realIdx],
            videoReferences: data.videoReferences,
            deliverableStyleMarker: data.deliverableStyleMarker,
          }
          return updated
        })
      } else if (data.deliverableStyles && data.deliverableStyles.length > 0) {
        setExcludedStyleAxes(newExcludedAxes)

        // Update the latest style message in-place (no new chat bubble)
        setMessages((prev) => {
          const idx = [...prev]
            .reverse()
            .findIndex((m) => m.deliverableStyles?.length || m.videoReferences?.length)
          if (idx === -1) return prev
          const realIdx = prev.length - 1 - idx
          const updated = [...prev]
          updated[realIdx] = {
            ...updated[realIdx],
            deliverableStyles: data.deliverableStyles,
            deliverableStyleMarker: data.deliverableStyleMarker,
          }
          return updated
        })
      } else {
        toast.info('No more style directions available')
        setExcludedStyleAxes([])
      }
    } catch {
      toast.error('Failed to load different styles')
    } finally {
      setIsLoading(false)
    }
  }, [
    currentDeliverableType,
    isLoading,
    excludedStyleAxes,
    messages,
    selectedStylesProp,
    setIsLoading,
    setMessages,
    csrfFetch,
  ])

  /**
   * Auto-fetch initial styles for the style panel (used at INSPIRATION stage entry).
   * Sends a style shortcut request to get deliverable styles without an AI call.
   */
  const fetchInitialStyles = useCallback(
    async (deliverableCategory: string) => {
      if (isLoading) return false

      // Map briefing category to a deliverable type the API understands
      const categoryToType: Record<string, string> = {
        video: 'launch_video',
        website: 'landing_page',
        content: 'instagram_post',
        design: 'brand_identity',
        brand: 'brand_identity',
      }
      const deliverableType = categoryToType[deliverableCategory] || deliverableCategory

      setIsLoading(true)

      try {
        const response = await csrfFetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            deliverableStyleMarker: {
              type: 'initial',
              deliverableType,
            },
          }),
        })

        if (!response.ok) return false

        const data = await response.json()

        if (data.deliverableStyles && data.deliverableStyles.length > 0) {
          const assistantMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            deliverableStyles: data.deliverableStyles,
            deliverableStyleMarker: data.deliverableStyleMarker,
          }

          setMessages((prev) => [...prev, assistantMessage])
          setCurrentDeliverableType(deliverableType)
          return true
        } else if (data.videoReferences && data.videoReferences.length > 0) {
          const assistantMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            videoReferences: data.videoReferences,
            deliverableStyleMarker: data.deliverableStyleMarker,
          }

          setMessages((prev) => [...prev, assistantMessage])
          setCurrentDeliverableType(deliverableType)
          return true
        }

        return false
      } catch {
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading, messages, setIsLoading, setMessages, csrfFetch]
  )

  const resetStyles = useCallback(() => {
    setSelectedStyles([])
    setSelectedDeliverableStyles([])
    setCurrentDeliverableType(null)
    setStyleOffset({})
    setExcludedStyleAxes([])
  }, [])

  return {
    selectedStyles,
    setSelectedStyles,
    hoveredStyleName,
    setHoveredStyleName,
    selectedDeliverableStyles,
    setSelectedDeliverableStyles,
    selectedStyleForModal,
    setSelectedStyleForModal,
    currentDeliverableType,
    setCurrentDeliverableType,
    lastStyleMessageIndex,
    handleStyleSelect,
    handleStyleCardClick,
    handleAddToCollection,
    handleRemoveFromCollection,
    handleClearStyleCollection,
    handleSubmitStyles,
    handleSubmitDeliverableStyles,
    handleConfirmStyleSelection,
    handleSelectVideo,
    handleShowMoreStyles,
    handleShowDifferentStyles,
    fetchInitialStyles,
    resetStyles,
  }
}
