/**
 * Hook for managing draft persistence (loading and auto-saving).
 * Handles loading drafts from local storage, auto-saving on state changes,
 * initial message processing, and payment success handling.
 */
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  getDraft,
  saveDraft,
  deleteDraft,
  generateDraftTitle,
  type ChatDraft,
} from '@/lib/chat-drafts'
import {
  type ChatMessage as Message,
  type UploadedFile,
  type TaskProposal,
  type MoodboardItem,
} from '@/components/chat/types'
import type { SerializedBriefingState } from '@/lib/ai/briefing-state-machine'
import { getChatTitle } from '@/components/chat/chat-interface.utils'
import type { TaskData } from '@/components/chat/chat-interface'

/**
 * Sanitize restored draft data to strip untrusted image URLs from storyboard scenes.
 * Prevents crash recovery loops (BUG-9) where poisoned URLs from external image
 * search results persist in draft storage and cause next/image to throw on render.
 */
const ALLOWED_IMAGE_HOSTS = [
  'supabase.co',
  'supabase.in',
  'oaidalleapiprodscus.blob.core.windows.net',
  'replicate.delivery',
  'fal.media',
  'getcrafted.ai',
]

function sanitizeRestoredMessages(messages: Array<Record<string, unknown>>): void {
  for (const msg of messages) {
    const sd = msg.structureData as
      | { type?: string; scenes?: Array<{ resolvedImageUrl?: string }> }
      | undefined
    if (sd?.type === 'storyboard' && sd.scenes) {
      for (const scene of sd.scenes) {
        if (scene.resolvedImageUrl) {
          try {
            const url = new URL(scene.resolvedImageUrl)
            const isAllowed =
              url.protocol === 'https:' &&
              ALLOWED_IMAGE_HOSTS.some((host) => url.hostname.endsWith(host))
            if (!isAllowed) {
              scene.resolvedImageUrl = undefined
            }
          } catch {
            // Invalid URL — strip it
            scene.resolvedImageUrl = undefined
          }
        }
      }
    }
  }
}

interface UseDraftPersistenceOptions {
  draftId: string
  onDraftUpdate?: () => void
  initialMessage?: string | null
  seamlessTransition?: boolean
  isTaskMode: boolean
  taskData?: TaskData | null
  // State setters
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  setSelectedStyles: React.Dispatch<React.SetStateAction<string[]>>
  setSelectedDeliverableStyles: React.Dispatch<React.SetStateAction<string[]>>
  setPendingTask: React.Dispatch<React.SetStateAction<TaskProposal | null>>
  setCompletedTypingIds: React.Dispatch<React.SetStateAction<Set<string>>>
  setCurrentDeliverableType: React.Dispatch<React.SetStateAction<string | null>>
  setNeedsAutoContinue: React.Dispatch<React.SetStateAction<boolean>>
  setNeedsAutoContinueConfirmation: React.Dispatch<React.SetStateAction<boolean>>
  setShowSubmissionModal: React.Dispatch<React.SetStateAction<boolean>>
  // Moodboard operations
  clearMoodboard: () => void
  addMoodboardItem: (item: Omit<MoodboardItem, 'id' | 'order' | 'addedAt'>) => void
  // State for saving
  messages: Message[]
  selectedStyles: string[]
  moodboardItems: MoodboardItem[]
  pendingTask: TaskProposal | null
  serializedBriefingState: SerializedBriefingState | undefined
  // Payment handling
  refreshCredits: () => void
  paymentProcessed: boolean
  setPaymentProcessed: React.Dispatch<React.SetStateAction<boolean>>
}

export function useDraftPersistence({
  draftId,
  onDraftUpdate,
  initialMessage,
  seamlessTransition = false,
  isTaskMode,
  taskData,
  setMessages,
  setSelectedStyles,
  setSelectedDeliverableStyles,
  setPendingTask,
  setCompletedTypingIds,
  setCurrentDeliverableType,
  setNeedsAutoContinue,
  setNeedsAutoContinueConfirmation,
  setShowSubmissionModal,
  clearMoodboard,
  addMoodboardItem,
  messages,
  selectedStyles,
  moodboardItems,
  pendingTask,
  serializedBriefingState,
  refreshCredits,
  paymentProcessed,
  setPaymentProcessed,
}: UseDraftPersistenceOptions) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isInitialized, setIsInitialized] = useState(false)
  const [initialMessageProcessed, setInitialMessageProcessed] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  // Ref to access current messages without creating dependency cycles
  const messagesRef = useRef(messages)
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Load draft when draftId changes
  useEffect(() => {
    if (isTaskMode && taskData?.chatHistory) {
      const loadedMessages = taskData.chatHistory.map((m, idx) => ({
        id: `task-msg-${idx}`,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.timestamp),
        attachments: m.attachments,
      }))
      setMessages(loadedMessages)
      setCompletedTypingIds(new Set(loadedMessages.map((m) => m.id)))
      setIsInitialized(true) // eslint-disable-line react-hooks/set-state-in-effect -- initialization requires synchronous state update
      return
    }

    const draft = getDraft(draftId)
    if (draft) {
      const loadedMessages = draft.messages.map((m) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }))
      // Sanitize restored scene image URLs to prevent crash loops (BUG-9)
      sanitizeRestoredMessages(loadedMessages)
      setMessages(loadedMessages)
      setSelectedStyles(draft.selectedStyles)
      setPendingTask(draft.pendingTask)
      setCompletedTypingIds(new Set(loadedMessages.map((m) => m.id)))

      if (draft.moodboardItems && draft.moodboardItems.length > 0) {
        clearMoodboard()
        draft.moodboardItems.forEach((item) => {
          addMoodboardItem({
            type: item.type,
            imageUrl: item.imageUrl,
            name: item.name,
            metadata: item.metadata,
          })
        })
      }

      const lastMessage = loadedMessages[loadedMessages.length - 1]
      if (lastMessage && lastMessage.role === 'user') {
        setNeedsAutoContinueConfirmation(true)
      }
    } else {
      setMessages([])
      setSelectedStyles([])
      setSelectedDeliverableStyles([])
      setPendingTask(null)
      setCompletedTypingIds(new Set())
      setCurrentDeliverableType(null)
      clearMoodboard()
    }
    setIsInitialized(true)
  }, [
    draftId,
    isTaskMode,
    taskData,
    clearMoodboard,
    addMoodboardItem,
    setMessages,
    setSelectedStyles,
    setSelectedDeliverableStyles,
    setPendingTask,
    setCompletedTypingIds,
    setCurrentDeliverableType,
    setNeedsAutoContinueConfirmation,
  ])

  // Handle initial message from URL param
  useEffect(() => {
    if (!initialMessage || initialMessageProcessed || !isInitialized) return
    setInitialMessageProcessed(true) // eslint-disable-line react-hooks/set-state-in-effect -- one-time guard requires synchronous flag

    const currentMessages = messagesRef.current
    if (currentMessages.length > 0) {
      const firstUserMessage = currentMessages.find((m) => m.role === 'user')
      if (firstUserMessage && firstUserMessage.content === initialMessage) {
        const url = new URL(window.location.href)
        url.searchParams.delete('message')
        url.searchParams.set('draft', draftId)
        window.history.replaceState({}, '', url.toString())
        return
      }
      const hasAssistantResponse = currentMessages.some((m) => m.role === 'assistant')
      if (hasAssistantResponse) {
        const url = new URL(window.location.href)
        url.searchParams.delete('message')
        url.searchParams.set('draft', draftId)
        window.history.replaceState({}, '', url.toString())
        return
      }
    }

    let pendingFiles: UploadedFile[] = []
    try {
      const storedFiles = sessionStorage.getItem('pending_chat_files')
      if (storedFiles) {
        pendingFiles = JSON.parse(storedFiles)
        sessionStorage.removeItem('pending_chat_files')
      }
    } catch {
      // Ignore parsing errors
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: initialMessage,
      timestamp: new Date(),
      attachments: pendingFiles.length > 0 ? pendingFiles : undefined,
    }

    if (seamlessTransition) {
      setMessages([userMessage])
    } else {
      setMessages((prev) => [...prev, userMessage])
    }

    const url = new URL(window.location.href)
    url.searchParams.delete('message')
    url.searchParams.set('draft', draftId)
    window.history.replaceState({}, '', url.toString())

    setNeedsAutoContinue(true)
  }, [
    initialMessage,
    initialMessageProcessed,
    isInitialized,
    seamlessTransition,
    draftId,
    setMessages,
    setNeedsAutoContinue,
  ])

  // Auto-save draft when messages change (debounced to reduce localStorage writes)
  const onDraftUpdateRef = useRef(onDraftUpdate)
  useEffect(() => {
    onDraftUpdateRef.current = onDraftUpdate
  }, [onDraftUpdate])

  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    if (!isInitialized) return
    if (messages.length <= 1 && messages[0]?.id === 'welcome') return

    clearTimeout(draftSaveTimerRef.current)
    draftSaveTimerRef.current = setTimeout(() => {
      const moodboardItemsForTitle = moodboardItems.map((item) => ({
        id: item.id,
        type: item.type,
        imageUrl: item.imageUrl,
        name: item.name,
        metadata: item.metadata,
        order: item.order,
        addedAt: item.addedAt.toISOString(),
      }))

      const existingDraft = getDraft(draftId)
      const draftCreatedAt = existingDraft?.createdAt || new Date().toISOString()

      const draft: ChatDraft = {
        id: draftId,
        title: generateDraftTitle(messages, moodboardItemsForTitle, draftCreatedAt),
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString(),
          attachments: m.attachments,
          quickOptions: m.quickOptions,
          deliverableStyles: m.deliverableStyles,
          deliverableStyleMarker: m.deliverableStyleMarker,
          selectedStyle: m.selectedStyle,
          taskProposal: m.taskProposal,
          videoReferences: m.videoReferences,
        })),
        selectedStyles,
        moodboardItems: moodboardItems.map((item) => ({
          id: item.id,
          type: item.type,
          imageUrl: item.imageUrl,
          name: item.name,
          metadata: item.metadata,
          order: item.order,
          addedAt: item.addedAt.toISOString(),
        })),
        briefingState: serializedBriefingState,
        pendingTask,
        createdAt: draftCreatedAt,
        updatedAt: new Date().toISOString(),
      }

      const saved = saveDraft(draft)
      if (saved) {
        setLastSavedAt(new Date())
      }
      onDraftUpdateRef.current?.()
    }, 2000)

    return () => clearTimeout(draftSaveTimerRef.current)
  }, [
    messages,
    selectedStyles,
    moodboardItems,
    pendingTask,
    draftId,
    isInitialized,
    serializedBriefingState,
  ])

  // Handle payment success
  useEffect(() => {
    const payment = searchParams.get('payment')
    const creditsParam = searchParams.get('credits')

    if (payment === 'success' && creditsParam && !paymentProcessed) {
      setPaymentProcessed(true)
      toast.success(`Successfully purchased ${creditsParam} credits!`, { duration: 5000 })

      const url = new URL(window.location.href)
      url.searchParams.delete('payment')
      url.searchParams.delete('credits')
      window.history.replaceState({}, '', url.toString())

      refreshCredits()

      try {
        const savedState = sessionStorage.getItem('pending_task_state')
        if (savedState) {
          const { taskProposal } = JSON.parse(savedState)
          sessionStorage.removeItem('pending_task_state')
          if (taskProposal) {
            setPendingTask(taskProposal)
            setTimeout(() => {
              setShowSubmissionModal(true)
              toast.success('Credits purchased! Review your task and click Submit.', {
                duration: 5000,
              })
            }, 500)
          }
        }
      } catch {
        // Ignore parsing errors
      }
    } else if (payment === 'cancelled') {
      toast.info('Payment was cancelled')
      const url = new URL(window.location.href)
      url.searchParams.delete('payment')
      window.history.replaceState({}, '', url.toString())
    }
  }, [
    searchParams,
    paymentProcessed,
    refreshCredits,
    setPendingTask,
    setShowSubmissionModal,
    setPaymentProcessed,
  ])

  // Chat title for seamless transitions
  const chatTitle = seamlessTransition ? getChatTitle(messages) : null

  // Delete / start over handlers
  const handleDeleteChat = useCallback(() => {
    deleteDraft(draftId)
    onDraftUpdate?.()
    router.push('/dashboard/chat')
  }, [draftId, onDraftUpdate, router])

  const handleStartOver = useCallback(() => {
    setMessages([])
    setPendingTask(null)
    setSelectedStyles([])
    setSelectedDeliverableStyles([])
    setCurrentDeliverableType(null)
    clearMoodboard()
    setCompletedTypingIds(new Set())

    if (draftId) {
      deleteDraft(draftId)
      onDraftUpdate?.()
    }

    router.push('/dashboard/chat')
  }, [
    draftId,
    onDraftUpdate,
    clearMoodboard,
    router,
    setMessages,
    setPendingTask,
    setSelectedStyles,
    setSelectedDeliverableStyles,
    setCurrentDeliverableType,
    setCompletedTypingIds,
  ])

  return {
    isInitialized,
    chatTitle,
    lastSavedAt,
    handleDeleteChat,
    handleStartOver,
  }
}
