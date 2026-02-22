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
import type { SerializedBriefingState } from '@/lib/ai/briefing-state-machine'
import type { ImageSource, ImageMediaType } from '@/lib/ai/storyboard-image-types'

/** Shape of a scene image match from the multi-source orchestrator */
export interface ApiSceneImageMatch {
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
}

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
  assetRequest?: Message['assetRequest']
  sceneImageMatches?: ApiSceneImageMatch[]
}

interface UseChatMessagesOptions {
  selectedStyles: string[]
  moodboardHasStyles: boolean
  serializedBriefingState: SerializedBriefingState | undefined
  syncBriefingFromServer: (state: SerializedBriefingState) => void
  processBriefMessage: (content: string) => void
  onTaskProposal: (proposal: TaskProposal) => void
  onDeliverableTypeChange: (type: string) => void
  onStructureData: (data: StructureData) => void
  onSceneImageMatches: (matches?: ApiSceneImageMatch[]) => void
  latestStoryboardRef: React.MutableRefObject<StructureData | null>
}

export function useChatMessages({
  selectedStyles,
  moodboardHasStyles,
  serializedBriefingState,
  syncBriefingFromServer,
  processBriefMessage,
  onTaskProposal,
  onDeliverableTypeChange,
  onStructureData,
  onSceneImageMatches,
  latestStoryboardRef,
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

      // Process Pexels scene image matches
      onSceneImageMatches(data.sceneImageMatches)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
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
      onSceneImageMatches,
      onTaskProposal,
      onDeliverableTypeChange,
      latestStoryboardRef,
    ]
  )

  // Send message handler
  const handleSend = useCallback(
    async (processedContent: string, currentFiles: Message['attachments']) => {
      if (!processedContent && (!currentFiles || currentFiles.length === 0)) return

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: processedContent,
        timestamp: new Date(),
        attachments: currentFiles && currentFiles.length > 0 ? currentFiles : undefined,
      }

      setMessages((prev) => [...prev, userMessage])
      setInput('')
      setIsLoading(true)
      setLastSendError(null)
      requestStartTimeRef.current = Date.now()

      if (userMessage.content) processBriefMessage(userMessage.content)

      try {
        const response = await fetch('/api/chat', {
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
        const isSceneFeedback = processedContent.startsWith('[Feedback on Scene')
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
      processBriefMessage,
      serializedBriefingState,
      processApiResponse,
      latestStoryboardRef,
    ]
  )

  // Send a specific message (for clickable options)
  const handleSendOption = useCallback(
    async (optionText: string) => {
      if (isLoading || !optionText.trim()) return

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: optionText,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      setInput('')
      setIsLoading(true)
      setLastSendError(null)

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messagesRef.current, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            selectedStyles,
            moodboardHasStyles,
            briefingState: serializedBriefingState,
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
        const response = await fetch('/api/chat', {
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
    [serializedBriefingState, processApiResponse, latestStoryboardRef]
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
      const response = await fetch('/api/chat', {
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
      const currentFeedback = messageFeedback[messageId]
      const newFeedback = currentFeedback === feedback ? null : feedback

      setMessageFeedback((prev) => ({ ...prev, [messageId]: newFeedback }))

      if (newFeedback) {
        fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId, feedback: newFeedback, context: 'chat' }),
        }).catch((err) => console.debug('Feedback logging:', err))

        toast.success(
          newFeedback === 'up' ? 'Thanks for the feedback!' : "We'll work on improving this",
          { duration: 2000 }
        )
      }
    },
    [messageFeedback]
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
