/**
 * Hook for managing chat message state and API communication.
 * Handles sending messages, receiving AI responses, auto-continue,
 * and typing animation state.
 */
'use client'

import { useState, useRef, useCallback } from 'react'
import { flushSync } from 'react-dom'
import { toast } from 'sonner'
import { useCsrfContext } from '@/providers/csrf-provider'
import {
  type ChatMessage as Message,
  type TaskProposal,
  type StructureData,
} from '@/components/chat/types'
import type {
  SerializedBriefingState,
  WebsiteGlobalStyles,
  VideoNarrative,
} from '@/lib/ai/briefing-state-machine'
export interface ChatApiResponse {
  content: string
  briefingState?: SerializedBriefingState
  styleReferences?: Message['styleReferences']
  deliverableStyles?: Message['deliverableStyles']
  deliverableStyleMarker?: Message['deliverableStyleMarker']
  videoReferences?: Message['videoReferences']
  taskProposal?: TaskProposal
  structureData?: StructureData
  strategicReviewData?: Message['strategicReviewData']
  globalStyles?: WebsiteGlobalStyles
  videoNarrativeData?: VideoNarrative
  assetRequest?: Message['assetRequest']
  /** Scene numbers the AI explicitly requested image regeneration for */
  scenesToRegenerate?: number[]
  /** Marker types that failed parsing even after retry (e.g., 'STRUCTURE', 'VIDEO_NARRATIVE') */
  parseFailures?: string[]
}

interface UseChatMessagesOptions {
  selectedStyles: string[]
  moodboardHasStyles: boolean
  serializedBriefingState: SerializedBriefingState | undefined
  syncBriefingFromServer: (state: SerializedBriefingState) => void
  onTaskProposal: (proposal: TaskProposal) => void
  onDeliverableTypeChange: (type: string) => void
  onStructureData: (data: StructureData) => void
  onGlobalStyles?: (styles: WebsiteGlobalStyles) => void
  onVideoNarrative?: (data: VideoNarrative) => void
  onRegenerateSceneImages?: (sceneNumbers: number[]) => void
  latestStoryboardRef: React.MutableRefObject<StructureData | null>
}

export function useChatMessages({
  selectedStyles,
  moodboardHasStyles,
  serializedBriefingState,
  syncBriefingFromServer,
  onTaskProposal,
  onDeliverableTypeChange,
  onStructureData,
  onGlobalStyles,
  onVideoNarrative,
  onRegenerateSceneImages,
  latestStoryboardRef,
}: UseChatMessagesOptions) {
  const { csrfFetch } = useCsrfContext()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastSendError, setLastSendError] = useState<string | null>(null)
  const [animatingMessageId, setAnimatingMessageId] = useState<string | null>(null)
  const [completedTypingIds, setCompletedTypingIds] = useState<Set<string>>(new Set())
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [messageFeedback, setMessageFeedback] = useState<Record<string, 'up' | 'down' | null>>({})
  const [needsAutoContinue, setNeedsAutoContinue] = useState(false)
  const requestStartTimeRef = useRef<number | null>(null)

  // Ref to access current messages without creating dependency cycles in callbacks
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  // Refs for values read inside handleSendOption to avoid stale closures —
  // quick-option clicks can fire before the render tree propagates the new
  // isLoading / selectedStyles values, so we read from refs instead.
  const isLoadingRef = useRef(false)
  const selectedStylesRef = useRef(selectedStyles)
  const moodboardHasStylesRef = useRef(moodboardHasStyles)
  const serializedBriefingStateRef = useRef(serializedBriefingState)
  selectedStylesRef.current = selectedStyles
  moodboardHasStylesRef.current = moodboardHasStyles
  serializedBriefingStateRef.current = serializedBriefingState

  // Process API response into assistant message
  const processApiResponse = useCallback(
    (data: ChatApiResponse, resolvedStructureDataOverride?: StructureData) => {
      const thinkingTime = requestStartTimeRef.current
        ? Math.round((Date.now() - requestStartTimeRef.current) / 1000)
        : undefined

      if (data.briefingState) {
        syncBriefingFromServer(data.briefingState)
      }

      // Track latest structure data and activate panel
      const resolvedStructureData: StructureData | undefined =
        resolvedStructureDataOverride ?? data.structureData ?? undefined
      if (resolvedStructureData) {
        if (resolvedStructureData.type === 'storyboard') {
          latestStoryboardRef.current = resolvedStructureData
        }
        onStructureData(resolvedStructureData)
      }

      // Scene image matches no longer come from API — DALL-E generation is triggered client-side

      // Process global styles (website flow)
      if (data.globalStyles && onGlobalStyles) {
        onGlobalStyles(data.globalStyles)
      }

      // Process video narrative (video flow)
      if (data.videoNarrativeData && onVideoNarrative) {
        onVideoNarrative(data.videoNarrativeData)
      }

      // Trigger explicit image regeneration from AI [REGENERATE_IMAGES] marker
      if (data.scenesToRegenerate?.length && onRegenerateSceneImages) {
        onRegenerateSceneImages(data.scenesToRegenerate)
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        thinkingTime,
        styleReferences: data.styleReferences,
        deliverableStyles: data.deliverableStyles,
        deliverableStyleMarker: data.deliverableStyleMarker,
        videoReferences: data.videoReferences,
        taskProposal: data.taskProposal,
        structureData: resolvedStructureData,
        strategicReviewData: data.strategicReviewData ?? undefined,
        assetRequest: data.assetRequest ?? undefined,
      }

      setMessages((prev) => [...prev, assistantMessage])
      setAnimatingMessageId(assistantMessage.id)

      if (data.taskProposal) onTaskProposal(data.taskProposal)
      if (data.deliverableStyleMarker)
        onDeliverableTypeChange(data.deliverableStyleMarker.deliverableType)

      // BUG-9: Surface parse failures to the user
      if (data.parseFailures && data.parseFailures.length > 0) {
        toast.warning('Some content couldn\u2019t be fully parsed', {
          description: `Failed markers: ${data.parseFailures.join(', ')}`,
          duration: 5000,
        })
      }

      return data
    },
    [
      syncBriefingFromServer,
      onStructureData,
      onGlobalStyles,
      onVideoNarrative,
      onRegenerateSceneImages,
      onTaskProposal,
      onDeliverableTypeChange,
      latestStoryboardRef,
    ]
  )

  // Send message handler
  const handleSend = useCallback(
    async (
      processedContent: string,
      currentFiles: Message['attachments'],
      isSceneFeedbackFlag?: boolean
    ) => {
      if (!processedContent && (!currentFiles || currentFiles.length === 0)) return

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: processedContent,
        timestamp: new Date(),
        attachments: currentFiles && currentFiles.length > 0 ? currentFiles : undefined,
        isSceneFeedback: isSceneFeedbackFlag || undefined,
      }

      setIsLoading(true)
      isLoadingRef.current = true
      setMessages((prev) => [...prev, userMessage])
      setInput('')
      setLastSendError(null)
      requestStartTimeRef.current = Date.now()

      try {
        const response = await csrfFetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messagesRef.current, userMessage]
              .filter((m) => m.content)
              .map((m) => ({
                role: m.role,
                content: m.content,
                attachments: m.attachments,
              })),
            attachments: currentFiles && currentFiles.length > 0 ? currentFiles : undefined,
            selectedStyles: selectedStylesRef.current,
            moodboardHasStyles: moodboardHasStylesRef.current,
            briefingState: serializedBriefingStateRef.current,
            latestStoryboard: latestStoryboardRef.current,
          }),
        })

        if (!response.ok) {
          const status = response.status
          if (status === 429) throw new Error('Rate limited — please wait a moment')
          if (status === 401) throw new Error('Session expired — please refresh')
          throw new Error(`Server error (${status})`)
        }

        const data: ChatApiResponse = await response.json()

        // Re-attach storyboard when AI responds without new storyboard data.
        // Covers scene feedback AND general ELABORATE stage messages (structural changes,
        // duration updates, tone changes, etc.) — prevents the panel from going blank.
        const isSceneFeedback =
          isSceneFeedbackFlag || processedContent.startsWith('[Feedback on Scene')
        const isElaborateStage = serializedBriefingStateRef.current?.stage === 'ELABORATE'
        let resolvedStructureOverride: StructureData | undefined
        if (
          (isSceneFeedback || isElaborateStage) &&
          !data.structureData &&
          latestStoryboardRef.current
        ) {
          resolvedStructureOverride = latestStoryboardRef.current
        }

        processApiResponse(data, resolvedStructureOverride)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to send message. Please try again.'
        setLastSendError(message)
        toast.error(message)
      } finally {
        setIsLoading(false)
        isLoadingRef.current = false
        requestStartTimeRef.current = null
      }
    },
    [processApiResponse, latestStoryboardRef, csrfFetch]
  )

  // Send a specific message (for clickable options)
  // Uses refs instead of closure values for isLoading / selectedStyles / etc.
  // to avoid stale closures when quick-option clicks fire before re-render.
  const handleSendOption = useCallback(
    async (optionText: string, stateOverrides?: Partial<SerializedBriefingState>) => {
      if (isLoadingRef.current || !optionText.trim()) return

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: optionText,
        timestamp: new Date(),
      }

      setIsLoading(true)
      isLoadingRef.current = true
      setMessages((prev) => [...prev, userMessage])
      setInput('')
      setLastSendError(null)

      try {
        const currentBriefingState = serializedBriefingStateRef.current
        const mergedBriefingState = stateOverrides
          ? { ...currentBriefingState, ...stateOverrides }
          : currentBriefingState

        const response = await csrfFetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messagesRef.current, userMessage]
              .filter((m) => m.content)
              .map((m) => ({
                role: m.role,
                content: m.content,
              })),
            selectedStyles: selectedStylesRef.current,
            moodboardHasStyles: moodboardHasStylesRef.current,
            briefingState: mergedBriefingState,
            latestStoryboard: latestStoryboardRef.current,
          }),
        })

        if (!response.ok) {
          const status = response.status
          if (status === 429) throw new Error('Rate limited — please wait a moment')
          if (status === 401) throw new Error('Session expired — please refresh')
          throw new Error(`Server error (${status})`)
        }

        const data: ChatApiResponse = await response.json()

        // Re-attach storyboard only during structure-related stages
        const currentStage = serializedBriefingStateRef.current?.stage
        const isStructureRelated = currentStage === 'STRUCTURE' || currentStage === 'ELABORATE'
        let resolvedStructureOverride: StructureData | undefined
        if (isStructureRelated && !data.structureData && latestStoryboardRef.current) {
          resolvedStructureOverride = latestStoryboardRef.current
        }

        processApiResponse(data, resolvedStructureOverride)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to send message. Please try again.'
        setLastSendError(message)
        toast.error(message)
      } finally {
        setIsLoading(false)
        isLoadingRef.current = false
      }
    },
    [processApiResponse, latestStoryboardRef, csrfFetch]
  )

  // Helper to send chat and receive assistant response (used by style/video selection handlers)
  const sendChatAndReceive = useCallback(
    async (userMessage: Message, extraBody: Record<string, unknown> = {}) => {
      flushSync(() => {
        setMessages((prev) => [...prev, userMessage])
      })

      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(resolve, 100)
          })
        })
      })

      setIsLoading(true)
      isLoadingRef.current = true
      setLastSendError(null)

      try {
        const response = await csrfFetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messagesRef.current, userMessage]
              .filter((m) => m.content)
              .map((m) => ({
                role: m.role,
                content: m.content,
              })),
            briefingState: serializedBriefingStateRef.current,
            latestStoryboard: latestStoryboardRef.current,
            ...extraBody,
          }),
        })

        if (!response.ok) {
          const status = response.status
          if (status === 429) throw new Error('Rate limited — please wait a moment')
          if (status === 401) throw new Error('Session expired — please refresh')
          throw new Error(`Server error (${status})`)
        }

        const data: ChatApiResponse = await response.json()
        processApiResponse(data)
        return data
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to send message. Please try again.'
        setLastSendError(message)
        toast.error(message)
        return null
      } finally {
        setIsLoading(false)
        isLoadingRef.current = false
      }
    },
    [processApiResponse, latestStoryboardRef, csrfFetch]
  )

  // Auto-continue conversation if last message was from user
  const runAutoContinue = useCallback(async () => {
    const currentMessages = messagesRef.current
    if (isLoadingRef.current || currentMessages.length === 0) return
    const lastMessage = currentMessages[currentMessages.length - 1]
    if (lastMessage.role !== 'user') return

    setIsLoading(true)
    isLoadingRef.current = true
    setLastSendError(null)
    requestStartTimeRef.current = Date.now()

    try {
      const response = await csrfFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages
            .filter((m) => m.content)
            .map((m) => ({ role: m.role, content: m.content })),
          selectedStyles: selectedStylesRef.current,
          moodboardHasStyles: moodboardHasStylesRef.current,
          briefingState: serializedBriefingStateRef.current,
          latestStoryboard: latestStoryboardRef.current,
        }),
      })

      if (!response.ok) {
        const status = response.status
        if (status === 429) throw new Error('Rate limited — please wait a moment')
        if (status === 401) throw new Error('Session expired — please refresh')
        throw new Error(`Server error (${status})`)
      }

      const data: ChatApiResponse = await response.json()
      processApiResponse(data)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to continue conversation. Please try again.'
      setLastSendError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
      requestStartTimeRef.current = null
    }
  }, [processApiResponse, latestStoryboardRef, csrfFetch])

  const handleCopyMessage = useCallback(async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch {
      toast.error('Failed to copy message')
    }
  }, [])

  const handleMessageFeedback = useCallback(
    (messageId: string, feedback: 'up' | 'down') => {
      setMessageFeedback((prev) => {
        const currentFeedback = prev[messageId]
        const newFeedback = currentFeedback === feedback ? null : feedback

        if (newFeedback) {
          csrfFetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageId, feedback: newFeedback, context: 'chat' }),
          }).catch((err) => console.debug('Feedback logging:', err))

          toast.success(
            newFeedback === 'up' ? 'Thanks for the feedback!' : "We'll work on improving this",
            { duration: 2000 }
          )
        }

        return { ...prev, [messageId]: newFeedback }
      })
    },
    [csrfFetch]
  )

  const handleRetry = useCallback(() => {
    setLastSendError(null)
    setNeedsAutoContinue(true)
  }, [])

  return {
    messages,
    setMessages,
    input,
    setInput,
    isLoading,
    setIsLoading,
    lastSendError,
    setLastSendError,
    animatingMessageId,
    setAnimatingMessageId,
    completedTypingIds,
    setCompletedTypingIds,
    copiedMessageId,
    messageFeedback,
    needsAutoContinue,
    setNeedsAutoContinue,
    requestStartTimeRef,
    handleSend,
    handleSendOption,
    sendChatAndReceive,
    runAutoContinue,
    handleCopyMessage,
    handleMessageFeedback,
    handleRetry,
  }
}
