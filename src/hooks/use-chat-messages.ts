/**
 * Hook for managing chat message state and API communication.
 * Handles sending messages, receiving AI responses, auto-continue,
 * and typing animation state.
 */
'use client'

import { useState, useRef, useCallback } from 'react'
import { flushSync } from 'react-dom'
import { toast } from 'sonner'
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
  quickOptions?: Message['quickOptions']
  structureData?: StructureData
  strategicReviewData?: Message['strategicReviewData']
  globalStyles?: WebsiteGlobalStyles
  videoNarrativeData?: VideoNarrative
  assetRequest?: Message['assetRequest']
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
  latestStoryboardRef: React.MutableRefObject<StructureData | null>
  csrfFetch: (url: string, options?: RequestInit) => Promise<Response>
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
  latestStoryboardRef,
  csrfFetch,
}: UseChatMessagesOptions) {
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
        quickOptions: data.quickOptions ?? undefined,
        structureData: resolvedStructureData,
        strategicReviewData: data.strategicReviewData ?? undefined,
        assetRequest: data.assetRequest ?? undefined,
      }

      setMessages((prev) => [...prev, assistantMessage])
      setAnimatingMessageId(assistantMessage.id)

      if (data.taskProposal) onTaskProposal(data.taskProposal)
      if (data.deliverableStyleMarker)
        onDeliverableTypeChange(data.deliverableStyleMarker.deliverableType)

      return data
    },
    [
      syncBriefingFromServer,
      onStructureData,
      onGlobalStyles,
      onVideoNarrative,
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
      setMessages((prev) => [...prev, userMessage])
      setInput('')
      setLastSendError(null)
      requestStartTimeRef.current = Date.now()

      try {
        const response = await csrfFetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messagesRef.current, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
              attachments: m.attachments,
            })),
            attachments: currentFiles && currentFiles.length > 0 ? currentFiles : undefined,
            selectedStyles,
            moodboardHasStyles,
            briefingState: serializedBriefingState,
            latestStoryboard: latestStoryboardRef.current,
          }),
        })

        if (!response.ok) throw new Error('Failed to get response')

        const data: ChatApiResponse = await response.json()

        // Re-attach storyboard when AI responds to scene feedback without new storyboard
        const isSceneFeedback =
          isSceneFeedbackFlag || processedContent.startsWith('[Feedback on Scene')
        let resolvedStructureOverride: StructureData | undefined
        if (isSceneFeedback && !data.structureData && latestStoryboardRef.current) {
          resolvedStructureOverride = latestStoryboardRef.current
        }

        processApiResponse(data, resolvedStructureOverride)
      } catch {
        setLastSendError('Failed to send message. Please try again.')
        toast.error('Failed to send message. Please try again.')
      } finally {
        setIsLoading(false)
        requestStartTimeRef.current = null
      }
    },
    [
      selectedStyles,
      moodboardHasStyles,
      serializedBriefingState,
      processApiResponse,
      latestStoryboardRef,
      csrfFetch,
    ]
  )

  // Send a specific message (for clickable options)
  const handleSendOption = useCallback(
    async (optionText: string, stateOverrides?: Partial<SerializedBriefingState>) => {
      if (isLoading || !optionText.trim()) return

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: optionText,
        timestamp: new Date(),
      }

      setIsLoading(true)
      setMessages((prev) => [...prev, userMessage])
      setInput('')
      setLastSendError(null)

      try {
        const mergedBriefingState = stateOverrides
          ? { ...serializedBriefingState, ...stateOverrides }
          : serializedBriefingState

        const response = await csrfFetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messagesRef.current, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            selectedStyles,
            moodboardHasStyles,
            briefingState: mergedBriefingState,
            latestStoryboard: latestStoryboardRef.current,
          }),
        })

        if (!response.ok) throw new Error('Failed to get response')

        const data: ChatApiResponse = await response.json()

        // Re-attach storyboard when response lacks new storyboard data
        let resolvedStructureOverride: StructureData | undefined
        if (!data.structureData && latestStoryboardRef.current) {
          resolvedStructureOverride = latestStoryboardRef.current
        }

        processApiResponse(data, resolvedStructureOverride)
      } catch {
        setLastSendError('Failed to send message. Please try again.')
        toast.error('Failed to send message. Please try again.')
      } finally {
        setIsLoading(false)
      }
    },
    [
      isLoading,
      selectedStyles,
      moodboardHasStyles,
      serializedBriefingState,
      processApiResponse,
      latestStoryboardRef,
      csrfFetch,
    ]
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
      setLastSendError(null)

      try {
        const response = await csrfFetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messagesRef.current, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            briefingState: serializedBriefingState,
            latestStoryboard: latestStoryboardRef.current,
            ...extraBody,
          }),
        })

        if (!response.ok) throw new Error('Failed to get response')

        const data: ChatApiResponse = await response.json()
        processApiResponse(data)
        return data
      } catch {
        setLastSendError('Failed to send message. Please try again.')
        toast.error('Failed to send message. Please try again.')
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [serializedBriefingState, processApiResponse, latestStoryboardRef, csrfFetch]
  )

  // Auto-continue conversation if last message was from user
  const runAutoContinue = useCallback(async () => {
    const currentMessages = messagesRef.current
    if (isLoading || currentMessages.length === 0) return
    const lastMessage = currentMessages[currentMessages.length - 1]
    if (lastMessage.role !== 'user') return

    setIsLoading(true)
    setLastSendError(null)
    requestStartTimeRef.current = Date.now()

    try {
      const response = await csrfFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages.map((m) => ({ role: m.role, content: m.content })),
          selectedStyles,
          moodboardHasStyles,
          briefingState: serializedBriefingState,
          latestStoryboard: latestStoryboardRef.current,
        }),
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data: ChatApiResponse = await response.json()
      processApiResponse(data)
    } catch {
      setLastSendError('Failed to continue conversation. Please try again.')
      toast.error('Failed to continue conversation. Please try again.')
    } finally {
      setIsLoading(false)
      requestStartTimeRef.current = null
    }
  }, [
    isLoading,
    selectedStyles,
    moodboardHasStyles,
    serializedBriefingState,
    processApiResponse,
    latestStoryboardRef,
    csrfFetch,
  ])

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
