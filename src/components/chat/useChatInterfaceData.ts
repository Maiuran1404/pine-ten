/**
 * Custom hook for ChatInterface component.
 * Manages chat messaging, file uploads, style selection, task management,
 * draft persistence, moodboard integration, and smart completions.
 *
 * This is the primary data/logic layer for the 3970-line ChatInterface component.
 * The component itself remains the composition/rendering layer.
 */
'use client'

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react'
import { flushSync } from 'react-dom'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useSession } from '@/lib/auth-client'
import { useCredits, dispatchCreditsUpdated } from '@/providers/credit-provider'
import {
  getDraft,
  saveDraft,
  deleteDraft,
  generateDraftTitle,
  type ChatDraft,
} from '@/lib/chat-drafts'
import {
  type UploadedFile,
  type DeliverableStyle,
  type TaskProposal,
  type ChatMessage as Message,
  type SceneReference,
  type StructureData,
} from './types'
import type { VideoReferenceStyle } from './video-reference-grid'
import type { LayoutSection } from '@/lib/ai/briefing-state-machine'
import { useMoodboard } from '@/lib/hooks/use-moodboard'
import { useBrief } from '@/lib/hooks/use-brief'
import { useBrandData } from '@/lib/hooks/use-brand-data'
import { calculateChatStage, calculateChatStageFromBriefing } from '@/lib/chat-progress'
import { useBriefingStateMachine } from '@/hooks/use-briefing-state-machine'
import {
  autoCapitalizeI,
  generateSmartCompletion,
  hasReadyIndicator,
  constructTaskFromConversation,
  getChatTitle,
} from './chat-interface.utils'
import type { TaskData } from './chat-interface'

interface UseChatInterfaceDataOptions {
  draftId: string
  onDraftUpdate?: () => void
  initialMessage?: string | null
  seamlessTransition?: boolean
  taskData?: TaskData | null
  onTaskUpdate?: () => void
  onTaskCreated?: (taskId: string) => void
  showRightPanel?: boolean
  onChatStart?: () => void
}

export function useChatInterfaceData({
  draftId,
  onDraftUpdate,
  initialMessage,
  seamlessTransition = false,
  taskData: initialTaskData,
  onTaskUpdate: _onTaskUpdate,
  onTaskCreated,
  onChatStart,
}: UseChatInterfaceDataOptions) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const { credits: userCredits, refreshCredits, deductCredits } = useCredits()
  const [showCreditDialog, setShowCreditDialog] = useState(false)
  const [showSubmissionModal, setShowSubmissionModal] = useState(false)
  const [taskData, setTaskData] = useState<TaskData | null>(initialTaskData || null)
  const [paymentProcessed, setPaymentProcessed] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [pendingTask, setPendingTask] = useState<TaskProposal | null>(null)
  const [lastSendError, setLastSendError] = useState<string | null>(null)
  const [selectedStyles, setSelectedStyles] = useState<string[]>([])
  const [hoveredStyleName, setHoveredStyleName] = useState<string | null>(null)
  const [selectedDeliverableStyles, setSelectedDeliverableStyles] = useState<string[]>([])
  const [selectedStyleForModal, setSelectedStyleForModal] = useState<DeliverableStyle | null>(null)
  const [currentDeliverableType, setCurrentDeliverableType] = useState<string | null>(null)
  const [styleOffset, setStyleOffset] = useState<Record<string, number>>({})
  const [excludedStyleAxes, setExcludedStyleAxes] = useState<string[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [animatingMessageId, setAnimatingMessageId] = useState<string | null>(null)
  const [completedTypingIds, setCompletedTypingIds] = useState<Set<string>>(new Set())
  const [messageFeedback, setMessageFeedback] = useState<Record<string, 'up' | 'down' | null>>({})
  const [taskSubmitted, setTaskSubmitted] = useState(false)
  const [showSubmissionSuccess, setShowSubmissionSuccess] = useState(false)
  const [submittedTaskId, setSubmittedTaskId] = useState<string | null>(null)
  const [sceneReferences, setSceneReferences] = useState<SceneReference[]>([])
  const [submittedAssignedArtist, setSubmittedAssignedArtist] = useState<string | null>(null)
  const [storyboardScenes, setStoryboardScenes] = useState<StructureData | null>(null)
  const [_sceneImageUrls, setSceneImageUrls] = useState<Map<number, string>>(new Map())
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const dragCounterRef = useRef(0)
  const requestStartTimeRef = useRef<number | null>(null)
  const chatStartedRef = useRef(false)
  const latestStoryboardRef = useRef<StructureData | null>(null)

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

  // Moodboard state management
  const {
    items: moodboardItems,
    addItem: addMoodboardItem,
    removeItem: removeMoodboardItem,
    clearAll: clearMoodboard,
    hasItem: hasMoodboardItem,
    addFromStyle,
    addFromUpload,
  } = useMoodboard()

  // Fetch brand data for the logged-in user's company
  const {
    brand: brandData,
    audiences: brandAudiences,
    brandColors,
    brandTypography,
    toneOfVoice,
    isLoading: isBrandLoading,
  } = useBrandData()

  // Brief state management
  const {
    brief,
    completion: briefCompletion,
    isReady: isBriefReady,
    processMessage: processBriefMessage,
    updateBrief,
    addStyleToVisualDirection,
    syncMoodboardToVisualDirection,
    generateOutline,
    exportBrief,
  } = useBrief({
    draftId,
    brandAudiences,
    brandColors,
    brandTypography,
    brandName: brandData?.name || '',
    brandIndustry: brandData?.industry || '',
    brandToneOfVoice: toneOfVoice,
    brandDescription: brandData?.description || '',
  })

  // Briefing state machine — restore initial state from draft if available
  const initialBriefingState = useMemo(() => {
    const draft = getDraft(draftId)
    return draft?.briefingState ?? undefined
  }, [draftId])

  const {
    briefingState: _briefingState,
    serializedState: serializedBriefingState,
    syncFromServer: syncBriefingFromServer,
  } = useBriefingStateMachine(initialBriefingState, { draftId })

  // Sync moodboard changes to visual direction
  useEffect(() => {
    if (moodboardItems.length > 0) {
      syncMoodboardToVisualDirection(moodboardItems)
    }
  }, [moodboardItems, syncMoodboardToVisualDirection])

  // Calculate chat progress
  const progressState = useMemo(() => {
    // Derive progress from briefing stage when available
    if (_briefingState) {
      return calculateChatStageFromBriefing(_briefingState.stage)
    }
    // Fallback: existing message-count-based progress
    return calculateChatStage({
      messages,
      selectedStyles: [...selectedStyles, ...selectedDeliverableStyles],
      moodboardItems,
      pendingTask,
      taskSubmitted,
    })
  }, [
    _briefingState,
    messages,
    selectedStyles,
    selectedDeliverableStyles,
    moodboardItems,
    pendingTask,
    taskSubmitted,
  ])

  // Compute structure type from deliverable category
  const structureType = useMemo((): StructureData['type'] | null => {
    const cat = _briefingState?.deliverableCategory
    if (!cat) return null
    const map: Record<string, StructureData['type']> = {
      video: 'storyboard',
      website: 'layout',
      content: 'calendar',
      design: 'single_design',
      brand: 'single_design',
    }
    return map[cat] ?? null
  }, [_briefingState?.deliverableCategory])

  // Structure panel visible only when we have actual structure data
  const structurePanelVisible = storyboardScenes !== null

  // Stability: restore storyboard from briefing state when it exists but local state is null
  useEffect(() => {
    if (_briefingState?.structure && !storyboardScenes) {
      setStoryboardScenes(_briefingState.structure)
      latestStoryboardRef.current = _briefingState.structure
    }
  }, [_briefingState?.structure, storyboardScenes])

  // Resolve quick options — only from AI response, never generic stage-based fallback
  const resolvedQuickOptions = useMemo(() => {
    if (isLoading || pendingTask) return null

    // Only show quick options the AI explicitly included in its response
    const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant')
    if (
      lastAssistantMessage?.quickOptions &&
      lastAssistantMessage.quickOptions.options.length > 0
    ) {
      return lastAssistantMessage.quickOptions
    }

    return null
  }, [messages, isLoading, pendingTask])

  // Collapse left sidebar when chat starts
  useEffect(() => {
    if (messages.length > 0 && !chatStartedRef.current && onChatStart) {
      chatStartedRef.current = true
      onChatStart()
    }
  }, [messages.length, onChatStart])

  // Get moodboard style IDs for tracking what's already added
  const moodboardStyleIds = useMemo(
    () => moodboardItems.filter((i) => i.type === 'style').map((i) => i.metadata?.styleId || ''),
    [moodboardItems]
  )

  const moodboardHasStyles = useMemo(
    () => moodboardItems.some((i) => i.type === 'style'),
    [moodboardItems]
  )

  // Smart autocomplete state
  const [smartCompletion, setSmartCompletion] = useState<string | null>(null)
  const smartCompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Update smart completion when input changes (debounced)
  useEffect(() => {
    if (smartCompleteTimeoutRef.current) {
      clearTimeout(smartCompleteTimeoutRef.current)
    }

    if (isLoading || input.length < 3) {
      setSmartCompletion(null)
      return
    }

    smartCompleteTimeoutRef.current = setTimeout(() => {
      const completion = generateSmartCompletion(input)
      setSmartCompletion(completion)
    }, 150)

    return () => {
      if (smartCompleteTimeoutRef.current) {
        clearTimeout(smartCompleteTimeoutRef.current)
      }
    }
  }, [input, isLoading])

  // Determine which suggestion to show
  const currentSuggestion = useMemo(() => {
    if (isLoading) return null

    if (smartCompletion && input.trim().length >= 3) {
      return input.trim() + ' ' + smartCompletion
    }

    return null
  }, [smartCompletion, input, isLoading])

  // Get the ghost text to display
  const ghostText = useMemo(() => {
    if (!currentSuggestion || isLoading) return ''

    if (smartCompletion && input.trim().length >= 3) {
      return ' ' + smartCompletion
    }

    return ''
  }, [currentSuggestion, smartCompletion, input, isLoading])

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

  const [needsAutoContinue, setNeedsAutoContinue] = useState(false)
  const [initialMessageProcessed, setInitialMessageProcessed] = useState(false)
  const [showManualSubmit, setShowManualSubmit] = useState(false)
  const [hasRequestedTaskSummary, setHasRequestedTaskSummary] = useState(false)

  // Sync taskData state with initialTaskData prop
  useEffect(() => {
    if (initialTaskData) {
      setTaskData(initialTaskData)
    }
  }, [initialTaskData])

  const isTaskMode = !!taskData
  const assignedArtist = taskData?.freelancer
  const deliverables = taskData?.files?.filter((f) => f.isDeliverable) || []
  const taskFiles = taskData?.files?.filter((f) => !f.isDeliverable) || []

  const userName = session?.user?.name || 'You'
  const userInitial = userName.charAt(0).toUpperCase()

  const allAttachments = messages
    .filter((m) => m.attachments && m.attachments.length > 0)
    .flatMap((m) => m.attachments || [])
    .filter((file): file is NonNullable<typeof file> => file != null && file.fileUrl != null)

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
      setIsInitialized(true)
      return
    }

    const draft = getDraft(draftId)
    if (draft) {
      const loadedMessages = draft.messages.map((m) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }))
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
        setNeedsAutoContinue(true)
      }
    } else {
      setMessages([])
      setSelectedStyles([])
      setSelectedDeliverableStyles([])
      setPendingTask(null)
      setCompletedTypingIds(new Set())
      setCurrentDeliverableType(null)
      setStyleOffset({})
      setExcludedStyleAxes([])
      clearMoodboard()
    }
    setIsInitialized(true)
  }, [draftId, isTaskMode, taskData, clearMoodboard, addMoodboardItem])

  // Process all user messages for brief inference on load
  const hasProcessedMessagesForBriefRef = useRef(false)
  useEffect(() => {
    if (!isInitialized || messages.length === 0 || hasProcessedMessagesForBriefRef.current) return
    hasProcessedMessagesForBriefRef.current = true
    const userMessages = messages.filter((m) => m.role === 'user')
    userMessages.forEach((msg) => {
      if (msg.content) processBriefMessage(msg.content)
    })
  }, [isInitialized, messages, processBriefMessage])

  // Handle initial message from URL param
  useEffect(() => {
    if (!initialMessage || initialMessageProcessed || !isInitialized) return
    setInitialMessageProcessed(true)

    if (messages.length > 0) {
      const firstUserMessage = messages.find((m) => m.role === 'user')
      if (firstUserMessage && firstUserMessage.content === initialMessage) {
        const url = new URL(window.location.href)
        url.searchParams.delete('message')
        url.searchParams.set('draft', draftId)
        window.history.replaceState({}, '', url.toString())
        return
      }
      const hasAssistantResponse = messages.some((m) => m.role === 'assistant')
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
      id: Date.now().toString(),
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

    if (initialMessage) {
      processBriefMessage(initialMessage)
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
    messages,
    draftId,
    processBriefMessage,
  ])

  // Auto-continue conversation if last message was from user
  useEffect(() => {
    if (!needsAutoContinue || isLoading || messages.length === 0) return
    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'user') return

    setNeedsAutoContinue(false)

    const continueConversation = async () => {
      setIsLoading(true)
      setLastSendError(null)
      requestStartTimeRef.current = Date.now()

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            selectedStyles,
            moodboardHasStyles,
            briefingState: serializedBriefingState,
          }),
        })

        if (!response.ok) throw new Error('Failed to get response')

        const data = await response.json()
        const thinkingTime = requestStartTimeRef.current
          ? Math.round((Date.now() - requestStartTimeRef.current) / 1000)
          : undefined

        if (data.briefingState) {
          syncBriefingFromServer(data.briefingState)
        }

        // Track latest storyboard data
        if (data.structureData?.type === 'storyboard') {
          latestStoryboardRef.current = data.structureData
          setStoryboardScenes(data.structureData)
        }

        // Process Pexels scene image matches
        processSceneImageMatches(data.sceneImageMatches)

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
          structureData: data.structureData ?? undefined,
          strategicReviewData: data.strategicReviewData ?? undefined,
          assetRequest: data.assetRequest ?? undefined,
        }

        setMessages((prev) => [...prev, assistantMessage])
        setAnimatingMessageId(assistantMessage.id)

        if (data.taskProposal) setPendingTask(data.taskProposal)
        if (data.deliverableStyleMarker)
          setCurrentDeliverableType(data.deliverableStyleMarker.deliverableType)
      } catch {
        setLastSendError('Failed to continue conversation. Please try again.')
        toast.error('Failed to continue conversation. Please try again.')
      } finally {
        setIsLoading(false)
        requestStartTimeRef.current = null
      }
    }

    continueConversation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsAutoContinue, isLoading, messages, selectedStyles])

  // Auto-save draft when messages change
  const onDraftUpdateRef = useRef(onDraftUpdate)
  useEffect(() => {
    onDraftUpdateRef.current = onDraftUpdate
  }, [onDraftUpdate])

  useEffect(() => {
    if (!isInitialized) return
    if (messages.length <= 1 && messages[0]?.id === 'welcome') return

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

    saveDraft(draft)
    onDraftUpdateRef.current?.()
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
  }, [searchParams, paymentProcessed, refreshCredits])

  // Detect "ready to execute" patterns
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (hasRequestedTaskSummary) {
      setShowManualSubmit(false)
      return
    }
    if (lastMessage?.role === 'assistant' && !pendingTask) {
      setShowManualSubmit(hasReadyIndicator(lastMessage.content))
    } else {
      setShowManualSubmit(false)
    }
  }, [messages, pendingTask, hasRequestedTaskSummary])

  // Auto-construct task proposal when briefing reaches SUBMIT stage
  // The AI is instructed to output [TASK_READY] but doesn't reliably do so.
  // When the stage transitions to SUBMIT and no taskProposal came from the API,
  // deterministically build one from the conversation (same as "You decide & submit").
  // Guard: once pendingTask is set, !pendingTask prevents re-firing — no prev-stage ref needed.
  useEffect(() => {
    if (_briefingState?.stage === 'SUBMIT' && !pendingTask && !isLoading && messages.length > 0) {
      const constructedTask = constructTaskFromConversation(messages)
      setPendingTask(constructedTask)

      // Add the task proposal to the last assistant message so it renders inline
      setMessages((prev) => {
        const updated = [...prev]
        const lastIdx = updated.length - 1
        if (
          lastIdx >= 0 &&
          updated[lastIdx].role === 'assistant' &&
          !updated[lastIdx].taskProposal
        ) {
          updated[lastIdx] = { ...updated[lastIdx], taskProposal: constructedTask }
        }
        return updated
      })
    }
  }, [_briefingState?.stage, pendingTask, isLoading, messages])

  // Scroll to bottom helper
  const scrollToBottom = useRef((smooth = false) => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      const target = viewport || scrollAreaRef.current
      if (smooth) {
        target.scrollTo({ top: target.scrollHeight, behavior: 'smooth' })
      } else {
        target.scrollTop = target.scrollHeight
      }
    }
  }).current

  useLayoutEffect(() => {
    scrollToBottom()
    const frame1 = requestAnimationFrame(() => {
      scrollToBottom()
      const frame2 = requestAnimationFrame(() => {
        scrollToBottom()
      })
      return () => cancelAnimationFrame(frame2)
    })
    return () => cancelAnimationFrame(frame1)
  }, [messages, isLoading, scrollToBottom])

  // Continuously scroll during typing animation to keep up with growing content
  useEffect(() => {
    if (!animatingMessageId) return
    const interval = setInterval(() => scrollToBottom(true), 200)
    return () => clearInterval(interval)
  }, [animatingMessageId, scrollToBottom])

  // Final scroll when typing animation completes
  useEffect(() => {
    if (animatingMessageId === null && completedTypingIds.size > 0) {
      scrollToBottom(true)
    }
  }, [animatingMessageId, completedTypingIds, scrollToBottom])

  // File upload logic
  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files)
      if (fileArray.length === 0) return

      setIsUploading(true)

      try {
        const uploadPromises = fileArray.map(async (file) => {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('folder', 'attachments')

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error?.message || errorData.message || 'Upload failed')
          }

          const data = await response.json()
          return (data.data?.file || data.file) as UploadedFile
        })

        const newFiles = await Promise.all(uploadPromises)
        const validFiles = newFiles.filter((f): f is UploadedFile => !!f && !!f.fileUrl)
        setUploadedFiles((prev) => [...prev, ...validFiles])

        validFiles.forEach((file) => {
          if (file.fileType?.startsWith('image/')) {
            addFromUpload(file)
          }
        })

        toast.success(`${validFiles.length} file(s) uploaded`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to upload files')
      } finally {
        setIsUploading(false)
      }
    },
    [addFromUpload]
  )

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return
      await uploadFiles(files)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [uploadFiles]
  )

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      dragCounterRef.current = 0

      const files = e.dataTransfer.files
      if (files && files.length > 0) {
        await uploadFiles(files)
      }
    },
    [uploadFiles]
  )

  const removeFile = useCallback((fileUrl: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.fileUrl !== fileUrl))
  }, [])

  // Add an external link as an uploaded file
  const addExternalLink = useCallback((file: UploadedFile) => {
    setUploadedFiles((prev) => [...prev, file])
  }, [])

  // Send message handler
  const handleSend = useCallback(async () => {
    if (!input.trim() && uploadedFiles.length === 0) return

    const currentFiles = [...uploadedFiles]
    const rawContent = input
      ? autoCapitalizeI(input)
      : currentFiles.length > 0
        ? `Attached ${currentFiles.length} file(s)`
        : ''
    // Prefix with scene reference context if any are attached
    const processedContent =
      sceneReferences.length > 0
        ? `[Feedback on ${sceneReferences
            .map((s) => {
              // Avoid redundant "Scene 1: Scene 1" when title is generic
              const genericPattern = /^Scene\s+\d+$/i
              if (genericPattern.test(s.title)) {
                return `Scene ${s.sceneNumber}`
              }
              return `Scene ${s.sceneNumber}: ${s.title}`
            })
            .join(', ')}] ${rawContent}`
        : rawContent
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: processedContent,
      timestamp: new Date(),
      attachments: currentFiles.length > 0 ? currentFiles : undefined,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setUploadedFiles([])
    setSceneReferences([])
    setIsLoading(true)
    setLastSendError(null)
    requestStartTimeRef.current = Date.now()

    if (userMessage.content) processBriefMessage(userMessage.content)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments,
          })),
          attachments: currentFiles.length > 0 ? currentFiles : undefined,
          selectedStyles,
          moodboardHasStyles,
          briefingState: serializedBriefingState,
        }),
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()
      const thinkingTime = requestStartTimeRef.current
        ? Math.round((Date.now() - requestStartTimeRef.current) / 1000)
        : undefined

      // Sync state machine from server response
      if (data.briefingState) {
        syncBriefingFromServer(data.briefingState)
      }

      // Track latest structure data and activate panel
      let resolvedStructureData: StructureData | undefined = data.structureData ?? undefined
      if (resolvedStructureData) {
        if (resolvedStructureData.type === 'storyboard') {
          latestStoryboardRef.current = resolvedStructureData
        }
        setStoryboardScenes(resolvedStructureData)
      }

      // Process Pexels scene image matches
      processSceneImageMatches(data.sceneImageMatches)

      // Re-attach storyboard when AI responds to scene feedback without new storyboard
      const isSceneFeedback = processedContent.startsWith('[Feedback on Scene')
      if (isSceneFeedback && !resolvedStructureData && latestStoryboardRef.current) {
        resolvedStructureData = latestStoryboardRef.current
      }

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

      if (data.taskProposal) setPendingTask(data.taskProposal)
    } catch {
      setLastSendError('Failed to send message. Please try again.')
      toast.error('Failed to send message. Please try again.')
    } finally {
      setIsLoading(false)
      requestStartTimeRef.current = null
    }
  }, [
    input,
    uploadedFiles,
    messages,
    selectedStyles,
    moodboardHasStyles,
    processBriefMessage,
    serializedBriefingState,
    syncBriefingFromServer,
    sceneReferences,
    processSceneImageMatches,
  ])

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
            messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
            selectedStyles,
            moodboardHasStyles,
            briefingState: serializedBriefingState,
          }),
        })

        if (!response.ok) throw new Error('Failed to get response')

        const data = await response.json()

        if (data.briefingState) {
          syncBriefingFromServer(data.briefingState)
        }

        // Track latest storyboard data (mirrors handleSend logic)
        let resolvedStructureData: StructureData | undefined = data.structureData ?? undefined
        if (resolvedStructureData?.type === 'storyboard') {
          latestStoryboardRef.current = resolvedStructureData
          setStoryboardScenes(resolvedStructureData)
        }

        // Process Pexels scene image matches
        processSceneImageMatches(data.sceneImageMatches)

        // Re-attach storyboard when response lacks new storyboard data
        if (!resolvedStructureData && latestStoryboardRef.current) {
          resolvedStructureData = latestStoryboardRef.current
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.content,
          timestamp: new Date(),
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

        if (data.taskProposal) setPendingTask(data.taskProposal)
      } catch {
        setLastSendError('Failed to send message. Please try again.')
        toast.error('Failed to send message. Please try again.')
      } finally {
        setIsLoading(false)
      }
    },
    [
      isLoading,
      messages,
      selectedStyles,
      moodboardHasStyles,
      serializedBriefingState,
      syncBriefingFromServer,
      setStoryboardScenes,
      processSceneImageMatches,
    ]
  )

  const handleDiscard = useCallback(() => {
    setInput('')
    setUploadedFiles([])
  }, [])

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

        fetch('/api/style-history', {
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
    [hasMoodboardItem, addFromStyle, addStyleToVisualDirection]
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

  // Task confirmation handler
  const handleConfirmTask = useCallback(async () => {
    if (!pendingTask) return

    const normalizedTask = {
      ...pendingTask,
      creditsRequired: pendingTask.creditsRequired ?? 15,
      estimatedHours: pendingTask.estimatedHours ?? 24,
      deliveryDays: pendingTask.deliveryDays ?? 3,
    }

    if (userCredits < normalizedTask.creditsRequired) {
      setShowCreditDialog(true)
      return
    }

    setIsLoading(true)

    const allAttachmentsForTask = messages
      .filter((m) => m.attachments && m.attachments.length > 0)
      .flatMap((m) => m.attachments || [])
      .filter((file) => file != null && file.fileUrl != null)

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...normalizedTask,
          chatHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
            attachments: m.attachments?.filter((a) => a != null),
          })),
          styleReferences: selectedStyles,
          attachments: allAttachmentsForTask,
          moodboardItems: moodboardItems.map((item) => ({
            id: item.id,
            type: item.type,
            imageUrl: item.imageUrl,
            name: item.name,
            metadata: item.metadata,
          })),
          structureData: latestStoryboardRef.current ?? storyboardScenes ?? undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || error.message || 'Failed to create task')
      }

      const result = await response.json()
      const taskId = result.data?.taskId
      if (!taskId) {
        throw new Error('Task was created but no task ID was returned')
      }

      setTaskSubmitted(true)
      deleteDraft(draftId)
      onDraftUpdate?.()

      const successMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `**Your task has been submitted!** You'll receive updates as your design progresses.`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, successMessage])
      setAnimatingMessageId(successMessage.id)
      setPendingTask(null)

      try {
        const taskResponse = await fetch(`/api/tasks/${taskId}`)
        if (taskResponse.ok) {
          const taskResult = await taskResponse.json()
          const fetchedTaskData: TaskData = {
            id: taskResult.task.id,
            title: taskResult.task.title,
            description: taskResult.task.description,
            status: taskResult.task.status,
            creditsUsed: taskResult.task.creditsUsed,
            maxRevisions: taskResult.task.maxRevisions,
            revisionsUsed: taskResult.task.revisionsUsed,
            estimatedHours: taskResult.task.estimatedHours,
            deadline: taskResult.task.deadline,
            assignedAt: taskResult.task.assignedAt,
            completedAt: taskResult.task.completedAt,
            createdAt: taskResult.task.createdAt,
            freelancer: taskResult.task.freelancer
              ? {
                  id: taskResult.task.freelancer.id,
                  name: taskResult.task.freelancer.name,
                  email: '',
                  image: taskResult.task.freelancer.image,
                }
              : null,
            files: taskResult.task.files,
            chatHistory: taskResult.task.chatHistory,
          }
          setTaskData(fetchedTaskData)
        }
      } catch {
        // Task was created but we couldn't fetch details
      }

      window.dispatchEvent(new CustomEvent('tasks-updated'))
      deductCredits(normalizedTask.creditsRequired)
      dispatchCreditsUpdated()
      onTaskCreated?.(taskId)

      // Show celebration overlay instead of immediate redirect
      setSubmittedTaskId(taskId)
      setSubmittedAssignedArtist(result.data.assignedTo || null)
      setShowSubmissionSuccess(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create task')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [
    pendingTask,
    userCredits,
    messages,
    selectedStyles,
    moodboardItems,
    storyboardScenes,
    draftId,
    onDraftUpdate,
    onTaskCreated,
    deductCredits,
  ])

  const handleOpenSubmissionModal = useCallback(() => {
    if (!pendingTask) return
    const creditsNeeded = pendingTask.creditsRequired ?? 15
    if (userCredits < creditsNeeded) {
      setShowCreditDialog(true)
      return
    }
    setShowSubmissionModal(true)
  }, [pendingTask, userCredits])

  const handleInsufficientCredits = useCallback(() => {
    setShowCreditDialog(true)
  }, [])

  const handleViewProject = useCallback(() => {
    if (submittedTaskId && submittedTaskId !== 'undefined') {
      router.push(`/dashboard/tasks/${submittedTaskId}`)
    } else {
      router.push('/dashboard/tasks')
    }
  }, [submittedTaskId, router])

  const handleRejectTask = useCallback(() => {
    setPendingTask(null)
    const clarifyMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content:
        'No problem! What would you like to change? I can adjust the scope, timeline, or any other details.',
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, clarifyMessage])
    setAnimatingMessageId(clarifyMessage.id)
  }, [])

  const handleRequestTaskSummary = useCallback(async () => {
    if (isLoading) return

    setShowManualSubmit(false)
    setHasRequestedTaskSummary(true)

    const constructedTask = constructTaskFromConversation(messages)

    const summaryMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content:
        "Here's a summary of your design brief. Review the details below and submit when you're ready!",
      taskProposal: constructedTask,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, summaryMessage])
    setPendingTask(constructedTask)

    setTimeout(() => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector(
          '[data-radix-scroll-area-viewport]'
        )
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight
        }
      }
    }, 100)
  }, [isLoading, messages])

  const chatTitle = seamlessTransition ? getChatTitle(messages) : null
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showStartOverDialog, setShowStartOverDialog] = useState(false)

  const handleDeleteChat = useCallback(() => {
    deleteDraft(draftId)
    onDraftUpdate?.()
    router.push('/dashboard')
  }, [draftId, onDraftUpdate, router])

  const handleStartOver = useCallback(() => {
    setMessages([])
    setPendingTask(null)
    setSelectedStyles([])
    setSelectedDeliverableStyles([])
    setCurrentDeliverableType(null)
    setStyleOffset({})
    setExcludedStyleAxes([])
    setUploadedFiles([])
    setTaskSubmitted(false)
    setShowManualSubmit(false)
    setHasRequestedTaskSummary(false)
    clearMoodboard()
    setCompletedTypingIds(new Set())

    if (draftId) {
      deleteDraft(draftId)
      onDraftUpdate?.()
    }

    router.push('/dashboard')
    setShowStartOverDialog(false)
  }, [draftId, onDraftUpdate, clearMoodboard, router])

  const handleEditLastMessage = useCallback(() => {
    const lastUserMsgIndex = [...messages].reverse().findIndex((m) => m.role === 'user')
    if (lastUserMsgIndex === -1) return

    const actualIndex = messages.length - 1 - lastUserMsgIndex
    const msgToEdit = messages[actualIndex]

    setInput(msgToEdit.content)
    setMessages((prev) => prev.slice(0, actualIndex))
    setPendingTask(null)
    setShowManualSubmit(false)
    inputRef.current?.focus()
  }, [messages])

  // Retry last failed send — clears the error and re-triggers auto-continue
  const handleRetry = useCallback(() => {
    setLastSendError(null)
    setNeedsAutoContinue(true)
  }, [])

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
    []
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
    []
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
    []
  )

  // Handle strategic review action (accept / override)
  const handleStrategicReviewAction = useCallback(
    (response: 'accept' | 'override') => {
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

  const lastUserMessageIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return i
    }
    return -1
  }, [messages])

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
            messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
            briefingState: serializedBriefingState,
            ...extraBody,
          }),
        })

        if (!response.ok) throw new Error('Failed to get response')

        const data = await response.json()

        if (data.briefingState) {
          syncBriefingFromServer(data.briefingState)
        }

        // Track latest storyboard data
        if (data.structureData?.type === 'storyboard') {
          latestStoryboardRef.current = data.structureData
          setStoryboardScenes(data.structureData)
        }

        // Process Pexels scene image matches
        processSceneImageMatches(data.sceneImageMatches)

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.content,
          timestamp: new Date(),
          styleReferences: data.styleReferences,
          deliverableStyles: data.deliverableStyles,
          deliverableStyleMarker: data.deliverableStyleMarker,
          videoReferences: data.videoReferences,
          taskProposal: data.taskProposal,
          quickOptions: data.quickOptions ?? undefined,
          structureData: data.structureData ?? undefined,
          strategicReviewData: data.strategicReviewData ?? undefined,
          assetRequest: data.assetRequest ?? undefined,
        }

        setMessages((prev) => [...prev, assistantMessage])
        setAnimatingMessageId(assistantMessage.id)

        if (data.taskProposal) setPendingTask(data.taskProposal)
        if (data.deliverableStyleMarker)
          setCurrentDeliverableType(data.deliverableStyleMarker.deliverableType)

        return data
      } catch {
        setLastSendError('Failed to send message. Please try again.')
        toast.error('Failed to send message. Please try again.')
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [messages, serializedBriefingState, syncBriefingFromServer, processSceneImageMatches]
  )

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
      id: Date.now().toString(),
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
        id: Date.now().toString(),
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
        id: Date.now().toString(),
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
        id: Date.now().toString(),
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

      // Derive deliverable type: use tracked value, or fall back to last message with styles/videos
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
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            selectedStyles,
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
          // Video response — show video references
          const assistantMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `Here are more video style options:`,
            timestamp: new Date(),
            videoReferences: data.videoReferences,
            deliverableStyleMarker: data.deliverableStyleMarker,
          }

          setMessages((prev) => [...prev, assistantMessage])
          setAnimatingMessageId(assistantMessage.id)
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

          const assistantMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: isCycled
              ? `Here are some recommended ${styleAxis} styles:`
              : `Here are more ${styleAxis} style options:`,
            timestamp: new Date(),
            deliverableStyles: data.deliverableStyles,
            deliverableStyleMarker: data.deliverableStyleMarker,
          }

          setMessages((prev) => [...prev, assistantMessage])
          setAnimatingMessageId(assistantMessage.id)
        } else {
          toast.info('Showing top recommended styles')
        }
      } catch {
        toast.error('Failed to load more styles')
      } finally {
        setIsLoading(false)
      }
    },
    [currentDeliverableType, isLoading, styleOffset, messages, selectedStyles]
  )

  const handleShowDifferentStyles = useCallback(async () => {
    if (isLoading) return

    // Derive deliverable type: use tracked value, or fall back to last message with styles/videos
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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          selectedStyles,
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
        // Video response — show video references
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Here are some different video style directions:',
          timestamp: new Date(),
          videoReferences: data.videoReferences,
          deliverableStyleMarker: data.deliverableStyleMarker,
        }

        setMessages((prev) => [...prev, assistantMessage])
        setAnimatingMessageId(assistantMessage.id)
      } else if (data.deliverableStyles && data.deliverableStyles.length > 0) {
        setExcludedStyleAxes(newExcludedAxes)

        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Here are some different style directions:',
          timestamp: new Date(),
          deliverableStyles: data.deliverableStyles,
          deliverableStyleMarker: data.deliverableStyleMarker,
        }

        setMessages((prev) => [...prev, assistantMessage])
        setAnimatingMessageId(assistantMessage.id)
      } else {
        toast.info('No more style directions available')
        setExcludedStyleAxes([])
      }
    } catch {
      toast.error('Failed to load different styles')
    } finally {
      setIsLoading(false)
    }
  }, [currentDeliverableType, isLoading, excludedStyleAxes, messages, selectedStyles])

  return {
    // Router/session
    router,
    session,
    userCredits,

    // Messages and chat
    messages,
    setMessages,
    input,
    setInput,
    isLoading,
    isUploading,
    animatingMessageId,
    setAnimatingMessageId,
    completedTypingIds,
    setCompletedTypingIds,
    copiedMessageId,
    messageFeedback,

    // Error state
    lastSendError,
    handleRetry,

    // Suggestions
    currentSuggestion,
    ghostText,
    smartCompletion,
    setSmartCompletion,

    // Style selection
    selectedStyles,
    hoveredStyleName,
    setHoveredStyleName,
    selectedDeliverableStyles,
    selectedStyleForModal,
    setSelectedStyleForModal,
    lastStyleMessageIndex,

    // Task
    pendingTask,
    setPendingTask,
    taskData,
    isTaskMode,
    assignedArtist,
    deliverables,
    taskFiles,
    taskSubmitted,
    showManualSubmit,
    showCreditDialog,
    setShowCreditDialog,
    showSubmissionModal,
    setShowSubmissionModal,
    showSubmissionSuccess,
    submittedTaskId,
    submittedAssignedArtist,

    // Moodboard
    moodboardItems,
    moodboardStyleIds,
    moodboardHasStyles,
    addMoodboardItem,
    removeMoodboardItem,
    clearMoodboard,
    hasMoodboardItem,
    addFromStyle,
    addFromUpload,

    // Brief
    brief,
    briefCompletion,
    isBriefReady,
    updateBrief,
    generateOutline,
    exportBrief,

    // Brand data
    brandData,
    isBrandLoading,

    // Progress
    progressState,
    briefingStage: _briefingState?.stage ?? null,
    deliverableCategory: _briefingState?.deliverableCategory ?? null,

    // Files
    uploadedFiles,
    allAttachments,
    isDragging,

    // Refs
    scrollAreaRef,
    fileInputRef,
    inputRef,
    requestStartTimeRef,

    // User info
    userName,
    userInitial,

    // Chat title & dialogs
    chatTitle,
    showDeleteDialog,
    setShowDeleteDialog,
    showStartOverDialog,
    setShowStartOverDialog,

    // Last user message index (for edit button)
    lastUserMessageIndex,

    // Quick options
    resolvedQuickOptions,

    // Scene references
    sceneReferences,
    setSceneReferences,
    handleSceneClick,
    handleMultiSceneFeedback,
    handleSceneSelectionChange,

    // Storyboard / Structure panel
    storyboardScenes,
    structureType,
    structurePanelVisible,
    sceneImageUrls: _sceneImageUrls,
    handleStrategicReviewAction,
    handleSceneEdit,
    handleSectionEdit,
    handleSectionReorder,
    handleRegenerateStoryboard,
    handleRegenerateScene,
    handleRegenerateField,

    // Handlers
    handleSend,
    handleSendOption,
    handleDiscard,
    handleCopyMessage,
    handleMessageFeedback,
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
    handleConfirmTask,
    handleOpenSubmissionModal,
    handleInsufficientCredits,
    handleViewProject,
    handleRejectTask,
    handleRequestTaskSummary,
    handleDeleteChat,
    handleStartOver,
    handleEditLastMessage,
    handleFileUpload,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    removeFile,
    addExternalLink,
    uploadFiles,
    refreshCredits,
    scrollToBottom,
  }
}
