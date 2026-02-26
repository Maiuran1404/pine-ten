/**
 * Custom hook for ChatInterface component.
 * Facade that composes smaller focused hooks for chat messaging, file uploads,
 * style selection, task management, draft persistence, moodboard integration,
 * smart completions, scroll management, and storyboard/structure panel.
 *
 * This is the primary data/logic layer for the ChatInterface component.
 * The component itself remains the composition/rendering layer.
 */
'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useSession } from '@/lib/auth-client'
import { getDraft } from '@/lib/chat-drafts'
import { useMoodboard } from '@/lib/hooks/use-moodboard'
import { useBrief } from '@/lib/hooks/use-brief'
import { useBrandData } from '@/lib/hooks/use-brand-data'
import { calculateChatStage, calculateChatStageFromBriefing } from '@/lib/chat-progress'
import { useBriefingStateMachine } from '@/hooks/use-briefing-state-machine'
import { useChatMessages } from '@/hooks/use-chat-messages'
import { useFileUpload } from '@/hooks/use-file-upload'
import { useStyleSelection } from '@/hooks/use-style-selection'
import { useTaskSubmission } from '@/hooks/use-task-submission'
import { useSmartCompletion } from '@/hooks/use-smart-completion'
import { useChatScroll } from '@/hooks/use-chat-scroll'
import { useStoryboard } from '@/hooks/use-storyboard'
import { useDraftPersistence } from '@/hooks/use-draft-persistence'
import { useWebsiteChatInspiration } from '@/hooks/use-website-chat-inspiration'
import {
  autoCapitalizeI,
  hasReadyIndicator,
  constructTaskFromConversation,
} from './chat-interface.utils'
import type { TaskData } from './chat-interface'
import type { TaskProposal } from './types'

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
  const { data: session } = useSession()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const chatStartedRef = useRef(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showStartOverDialog, setShowStartOverDialog] = useState(false)

  // Stable no-op callbacks for draft persistence (styleOffset and excludedAxes
  // are internal to useStyleSelection — these avoid re-creating () => {} each render)
  const noopSetStyleOffset = useCallback(() => {}, [])
  const noopSetExcludedStyleAxes = useCallback(() => {}, [])

  // Forward-reference refs for callbacks that target hooks defined later in the
  // composition chain (useTaskSubmission, useStyleSelection).  Without refs the
  // inline arrow closures would be new on every render, destabilising
  // processApiResponse and every callback that depends on it.
  const taskSetPendingRef = useRef<(proposal: TaskProposal) => void>(() => {})
  const styleSetDeliverableTypeRef = useRef<(type: string) => void>(() => {})
  const stableOnTaskProposal = useCallback(
    (proposal: TaskProposal) => taskSetPendingRef.current(proposal),
    []
  )
  const stableOnDeliverableTypeChange = useCallback(
    (type: string) => styleSetDeliverableTypeRef.current(type),
    []
  )

  // ─── Moodboard ───────────────────────────────────────────────
  const {
    items: moodboardItems,
    addItem: addMoodboardItem,
    removeItem: removeMoodboardItem,
    clearAll: clearMoodboard,
    hasItem: hasMoodboardItem,
    addFromStyle,
    addFromUpload,
  } = useMoodboard()

  // ─── Brand data ──────────────────────────────────────────────
  const {
    brand: brandData,
    audiences: brandAudiences,
    brandColors,
    brandTypography,
    toneOfVoice,
    isLoading: isBrandLoading,
  } = useBrandData()

  // ─── Brief ───────────────────────────────────────────────────
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

  // ─── Briefing state machine ──────────────────────────────────
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

  // ─── Sync server brief into client brief panel ─────────────
  // The server state machine extracts richer field values via AI.
  // Merge those into the client-side brief so the panel shows them.
  const lastSyncedBriefRef = useRef<string | null>(null)
  useEffect(() => {
    const serverBrief = _briefingState?.brief
    if (!serverBrief) return

    // Deduplicate: only sync when the server brief actually changed
    const syncKey = serverBrief.updatedAt?.toString() ?? ''
    if (lastSyncedBriefRef.current === syncKey) return
    lastSyncedBriefRef.current = syncKey

    updateBrief({
      ...brief,
      // Only overwrite fields where the server has higher-confidence data
      ...(serverBrief.taskSummary.value &&
      serverBrief.taskSummary.confidence > brief.taskSummary.confidence
        ? { taskSummary: serverBrief.taskSummary }
        : {}),
      ...(serverBrief.taskType.value && serverBrief.taskType.confidence > brief.taskType.confidence
        ? { taskType: serverBrief.taskType }
        : {}),
      ...(serverBrief.intent.value && serverBrief.intent.confidence > brief.intent.confidence
        ? { intent: serverBrief.intent }
        : {}),
      ...(serverBrief.platform.value && serverBrief.platform.confidence > brief.platform.confidence
        ? { platform: serverBrief.platform }
        : {}),
      ...(serverBrief.audience.value && serverBrief.audience.confidence > brief.audience.confidence
        ? { audience: serverBrief.audience }
        : {}),
      ...(serverBrief.topic.value && serverBrief.topic.confidence > brief.topic.confidence
        ? { topic: serverBrief.topic }
        : {}),
      ...(serverBrief.dimensions.length > 0 ? { dimensions: serverBrief.dimensions } : {}),
      ...(serverBrief.contentOutline ? { contentOutline: serverBrief.contentOutline } : {}),
      updatedAt: new Date(),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_briefingState?.brief?.updatedAt])

  // ─── Storyboard / Structure panel ────────────────────────────
  // We need a forward ref for handleSendOption, which is created by useChatMessages
  // below. We use a placeholder callback that gets populated after useChatMessages is
  // instantiated.
  const sendOptionRef = useRef<(text: string) => void>(() => {})

  const storyboard = useStoryboard({
    inputRef,
    handleSendOption: useCallback((text: string) => sendOptionRef.current(text), []),
    briefingState: _briefingState,
  })

  // ─── Website inspiration (only active for website projects) ──
  const websiteInspiration = useWebsiteChatInspiration({
    enabled: _briefingState?.deliverableCategory === 'website',
  })

  // ─── Chat messages & API ─────────────────────────────────────
  const chatMessages = useChatMessages({
    selectedStyles: [], // Will be overridden via style selection
    moodboardHasStyles: moodboardItems.some((i) => i.type === 'style'),
    serializedBriefingState,
    syncBriefingFromServer,
    processBriefMessage,
    onTaskProposal: stableOnTaskProposal,
    onDeliverableTypeChange: stableOnDeliverableTypeChange,
    onStructureData: storyboard.updateStructureData,
    onSceneImageMatches: storyboard.processSceneImageMatches,
    onGlobalStyles: storyboard.setGlobalStyles,
    onVideoNarrative: storyboard.updateVideoNarrative,
    latestStoryboardRef: storyboard.latestStoryboardRef,
  })

  // Wire up the forward ref so storyboard regeneration can call handleSendOption
  sendOptionRef.current = chatMessages.handleSendOption

  // ─── File upload ─────────────────────────────────────────────
  const fileUpload = useFileUpload({ addFromUpload })

  // ─── Scroll management ──────────────────────────────────────
  const { scrollAreaRef, scrollToBottom } = useChatScroll({
    messages: chatMessages.messages,
    isLoading: chatMessages.isLoading,
    animatingMessageId: chatMessages.animatingMessageId,
    completedTypingIds: chatMessages.completedTypingIds,
  })

  // ─── Moodboard derived values ───────────────────────────────
  const moodboardStyleIds = useMemo(
    () => moodboardItems.filter((i) => i.type === 'style').map((i) => i.metadata?.styleId || ''),
    [moodboardItems]
  )

  const moodboardHasStyles = useMemo(
    () => moodboardItems.some((i) => i.type === 'style'),
    [moodboardItems]
  )

  // ─── Style selection ─────────────────────────────────────────
  const styleSelection = useStyleSelection({
    messages: chatMessages.messages,
    isLoading: chatMessages.isLoading,
    moodboardStyleIds,
    moodboardHasStyles,
    hasMoodboardItem,
    addFromStyle,
    addStyleToVisualDirection,
    removeMoodboardItem,
    moodboardItems,
    sendChatAndReceive: chatMessages.sendChatAndReceive,
    setIsLoading: (loading: boolean) => {
      // Style selection needs to control loading through the chat messages hook's state
      // This is handled by the sendChatAndReceive already managing isLoading
      void loading
    },
    setMessages: chatMessages.setMessages,
    setAnimatingMessageId: chatMessages.setAnimatingMessageId,
    selectedStyles: [], // self-reference resolved below
  })

  // ─── Task submission ─────────────────────────────────────────
  // Wire up forward-reference refs now that task/styleSelection are available
  styleSetDeliverableTypeRef.current = styleSelection.setCurrentDeliverableType

  const task = useTaskSubmission({
    draftId,
    messages: chatMessages.messages,
    selectedStyles: styleSelection.selectedStyles,
    moodboardItems,
    storyboardScenes: storyboard.storyboardScenes,
    latestStoryboardRef: storyboard.latestStoryboardRef,
    setMessages: chatMessages.setMessages,
    setAnimatingMessageId: chatMessages.setAnimatingMessageId,
    onDraftUpdate,
    onTaskCreated,
    initialTaskData: initialTaskData || undefined,
    briefingState: _briefingState,
    scrollAreaRef,
  })

  // Wire up task forward-reference ref
  taskSetPendingRef.current = task.setPendingTask

  // ─── Smart completion ───────────────────────────────────────
  const smartCompletion = useSmartCompletion({
    input: chatMessages.input,
    isLoading: chatMessages.isLoading,
  })

  // ─── Draft persistence ──────────────────────────────────────
  const draftPersistence = useDraftPersistence({
    draftId,
    onDraftUpdate,
    initialMessage,
    seamlessTransition,
    isTaskMode: task.isTaskMode,
    taskData: initialTaskData,
    setMessages: chatMessages.setMessages,
    setSelectedStyles: styleSelection.setSelectedStyles,
    setSelectedDeliverableStyles: styleSelection.setSelectedDeliverableStyles,
    setPendingTask: task.setPendingTask,
    setCompletedTypingIds: chatMessages.setCompletedTypingIds,
    setCurrentDeliverableType: styleSelection.setCurrentDeliverableType,
    setStyleOffset: noopSetStyleOffset,
    setExcludedStyleAxes: noopSetExcludedStyleAxes,
    setNeedsAutoContinue: chatMessages.setNeedsAutoContinue,
    setShowSubmissionModal: task.setShowSubmissionModal,
    clearMoodboard,
    addMoodboardItem,
    processBriefMessage,
    messages: chatMessages.messages,
    selectedStyles: styleSelection.selectedStyles,
    moodboardItems,
    pendingTask: task.pendingTask,
    serializedBriefingState,
    refreshCredits: task.refreshCredits,
    paymentProcessed: task.paymentProcessed,
    setPaymentProcessed: task.setPaymentProcessed,
  })

  // ─── Progress calculation ───────────────────────────────────
  const progressState = useMemo(() => {
    if (_briefingState) {
      return calculateChatStageFromBriefing(_briefingState.stage)
    }
    return calculateChatStage({
      messages: chatMessages.messages,
      selectedStyles: [
        ...styleSelection.selectedStyles,
        ...styleSelection.selectedDeliverableStyles,
      ],
      moodboardItems,
      pendingTask: task.pendingTask,
      taskSubmitted: task.taskSubmitted,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    _briefingState?.stage,
    chatMessages.messages,
    styleSelection.selectedStyles,
    styleSelection.selectedDeliverableStyles,
    moodboardItems,
    task.pendingTask,
    task.taskSubmitted,
  ])

  // ─── Estimated credits ─────────────────────────────────────
  const estimatedCredits = useMemo(() => {
    const category = _briefingState?.deliverableCategory
    if (!category) return null
    const CREDIT_ESTIMATES: Record<string, number> = {
      video: 30,
      website: 30,
      content: 15,
      design: 20,
      brand: 60,
    }
    return CREDIT_ESTIMATES[category] ?? null
  }, [_briefingState?.deliverableCategory])

  // ─── Quick options ──────────────────────────────────────────
  const resolvedQuickOptions = useMemo(() => {
    if (chatMessages.isLoading || task.pendingTask) return null
    const lastAssistantMessage = [...chatMessages.messages]
      .reverse()
      .find((m) => m.role === 'assistant')
    if (
      lastAssistantMessage?.quickOptions &&
      lastAssistantMessage.quickOptions.options.length > 0
    ) {
      return lastAssistantMessage.quickOptions
    }
    return null
  }, [chatMessages.messages, chatMessages.isLoading, task.pendingTask])

  // ─── Collapse left sidebar when chat starts ──────────────────
  useEffect(() => {
    if (chatMessages.messages.length > 0 && !chatStartedRef.current && onChatStart) {
      chatStartedRef.current = true
      onChatStart()
    }
  }, [chatMessages.messages.length, onChatStart])

  // ─── Messages ref (avoids dependency cycles in effects below) ─
  const messagesRef = useRef(chatMessages.messages)
  useEffect(() => {
    messagesRef.current = chatMessages.messages
  }, [chatMessages.messages])

  // ─── Auto-continue ──────────────────────────────────────────
  useEffect(() => {
    if (
      !chatMessages.needsAutoContinue ||
      chatMessages.isLoading ||
      messagesRef.current.length === 0
    )
      return
    const lastMessage = messagesRef.current[messagesRef.current.length - 1]
    if (lastMessage.role !== 'user') return

    chatMessages.setNeedsAutoContinue(false)
    chatMessages.runAutoContinue()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatMessages.needsAutoContinue, chatMessages.isLoading])

  // ─── Stability: restore storyboard from briefing state ──────
  useEffect(() => {
    if (_briefingState?.structure && !storyboard.storyboardScenes) {
      storyboard.setStoryboardScenes(_briefingState.structure)
      storyboard.latestStoryboardRef.current = _briefingState.structure
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_briefingState?.structure, storyboard.storyboardScenes])

  // ─── Stability: restore video narrative from briefing state ──
  useEffect(() => {
    if (_briefingState?.videoNarrative && !storyboard.videoNarrative) {
      storyboard.setVideoNarrative(_briefingState.videoNarrative)
    }
    if (_briefingState?.narrativeApproved && !storyboard.narrativeApproved) {
      storyboard.setNarrativeApproved(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_briefingState?.videoNarrative, _briefingState?.narrativeApproved])

  // ─── Detect "ready to execute" patterns ─────────────────────
  useEffect(() => {
    const lastMessage = messagesRef.current[messagesRef.current.length - 1]
    task.checkReadyIndicator(lastMessage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatMessages.messages.length])

  // ─── Auto-construct task proposal at SUBMIT stage ───────────
  // Track which stage we last constructed for to avoid infinite re-renders
  const lastConstructedStageRef = useRef<string | null>(null)

  useEffect(() => {
    const msgs = messagesRef.current
    if (chatMessages.isLoading || msgs.length === 0) return
    const stage = _briefingState?.stage

    const shouldConstruct =
      stage === 'SUBMIT' ||
      (stage === 'REVIEW' &&
        msgs[msgs.length - 1]?.role === 'assistant' &&
        hasReadyIndicator(msgs[msgs.length - 1].content))

    if (!shouldConstruct) return

    // Avoid re-constructing for the same stage + message count
    const constructKey = `${stage}-${msgs.length}`
    if (lastConstructedStageRef.current === constructKey) return
    lastConstructedStageRef.current = constructKey

    const constructedTask = constructTaskFromConversation(msgs, _briefingState?.brief)
    task.setPendingTask(constructedTask)

    chatMessages.setMessages((prev) => {
      const lastIdx = prev.length - 1
      if (lastIdx >= 0 && prev[lastIdx].role === 'assistant' && !prev[lastIdx].taskProposal) {
        const updated = [...prev]
        updated[lastIdx] = { ...updated[lastIdx], taskProposal: constructedTask }
        return updated
      }
      return prev
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    _briefingState?.stage,
    _briefingState?.brief,
    chatMessages.isLoading,
    chatMessages.messages.length,
  ])

  // ─── Sync taskData state with initialTaskData prop ──────────
  useEffect(() => {
    if (initialTaskData) {
      task.setTaskData(initialTaskData)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTaskData])

  // ─── Derived values ─────────────────────────────────────────
  const userName = session?.user?.name || 'You'
  const userInitial = userName.charAt(0).toUpperCase()

  const allAttachments = chatMessages.messages
    .filter((m) => m.attachments && m.attachments.length > 0)
    .flatMap((m) => m.attachments || [])
    .filter((file): file is NonNullable<typeof file> => file != null && file.fileUrl != null)

  const lastUserMessageIndex = useMemo(() => {
    for (let i = chatMessages.messages.length - 1; i >= 0; i--) {
      if (chatMessages.messages[i].role === 'user') return i
    }
    return -1
  }, [chatMessages.messages])

  // ─── Composed handlers ──────────────────────────────────────

  // Wrap handleSend to include file upload state and scene references.
  // When files are still uploading, we collect them via collectAndClear()
  // which clears the UI chips immediately, then await the in-flight uploads
  // before firing the chat API call. The upload wait is hidden behind
  // the "Thinking..." loading indicator.
  const handleSend = useCallback(async () => {
    if (!chatMessages.input.trim() && !fileUpload.hasFiles) return

    const fileCount = fileUpload.pendingFiles.length
    const rawContent = chatMessages.input
      ? autoCapitalizeI(chatMessages.input)
      : fileCount > 0
        ? `Attached ${fileCount} file(s)`
        : ''

    const processedContent =
      storyboard.sceneReferences.length > 0
        ? `[Feedback on ${storyboard.sceneReferences
            .map((s) => {
              const genericPattern = /^Scene\s+\d+$/i
              if (genericPattern.test(s.title)) {
                return `Scene ${s.sceneNumber}`
              }
              return `Scene ${s.sceneNumber}: ${s.title}`
            })
            .join(', ')}] ${rawContent}`
        : rawContent

    // Snapshot files and clear UI chips immediately.
    // allUploadsPromise resolves when in-flight uploads finish.
    const { alreadyDone, allUploadsPromise, hasInFlight } = fileUpload.collectAndClear()
    storyboard.setSceneReferences([])

    if (!hasInFlight) {
      // All files already uploaded — send directly
      await chatMessages.handleSend(processedContent, alreadyDone)
      return
    }

    // Files still uploading — await them then send.
    // chatMessages.handleSend shows the user message + "Thinking..."
    // so the upload wait is hidden behind the loading indicator.
    const allFiles = await allUploadsPromise
    await chatMessages.handleSend(processedContent, allFiles)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    chatMessages.input,
    chatMessages.handleSend,
    fileUpload.pendingFiles,
    fileUpload.hasFiles,
    fileUpload.collectAndClear,
    storyboard.sceneReferences,
    storyboard.setSceneReferences,
  ])

  const handleDiscard = useCallback(() => {
    chatMessages.setInput('')
    fileUpload.clearPendingFiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatMessages.setInput, fileUpload.clearPendingFiles])

  const handleEditLastMessage = useCallback(() => {
    const msgs = chatMessages.messages
    const lastUserMsgIndex = [...msgs].reverse().findIndex((m) => m.role === 'user')
    if (lastUserMsgIndex === -1) return

    const actualIndex = msgs.length - 1 - lastUserMsgIndex
    const msgToEdit = msgs[actualIndex]

    chatMessages.setInput(msgToEdit.content)
    chatMessages.setMessages((prev) => prev.slice(0, actualIndex))
    task.setPendingTask(null)
    task.setShowManualSubmit(false)
    inputRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    chatMessages.messages,
    chatMessages.setInput,
    chatMessages.setMessages,
    task.setPendingTask,
    task.setShowManualSubmit,
  ])

  // Wrap strategic review action to pass setMessages
  const handleStrategicReviewAction = useCallback(
    (response: 'accept' | 'override') => {
      storyboard.handleStrategicReviewAction(response, chatMessages.setMessages)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storyboard.handleStrategicReviewAction, chatMessages.setMessages]
  )

  // ─── Return the full interface (backward compatible) ────────
  return {
    // Router/session
    router: draftPersistence, // Not actually used by component (prefixed with _)
    session,
    userCredits: task.userCredits,

    // Messages and chat
    messages: chatMessages.messages,
    setMessages: chatMessages.setMessages,
    input: chatMessages.input,
    setInput: chatMessages.setInput,
    isLoading: chatMessages.isLoading,
    isUploading: fileUpload.isUploading,
    animatingMessageId: chatMessages.animatingMessageId,
    setAnimatingMessageId: chatMessages.setAnimatingMessageId,
    completedTypingIds: chatMessages.completedTypingIds,
    setCompletedTypingIds: chatMessages.setCompletedTypingIds,
    copiedMessageId: chatMessages.copiedMessageId,
    messageFeedback: chatMessages.messageFeedback,

    // Error state
    lastSendError: chatMessages.lastSendError,
    handleRetry: chatMessages.handleRetry,

    // Suggestions
    currentSuggestion: smartCompletion.currentSuggestion,
    ghostText: smartCompletion.ghostText,
    smartCompletion: smartCompletion.smartCompletion,
    setSmartCompletion: smartCompletion.setSmartCompletion,

    // Style selection
    selectedStyles: styleSelection.selectedStyles,
    hoveredStyleName: styleSelection.hoveredStyleName,
    setHoveredStyleName: styleSelection.setHoveredStyleName,
    selectedDeliverableStyles: styleSelection.selectedDeliverableStyles,
    selectedStyleForModal: styleSelection.selectedStyleForModal,
    setSelectedStyleForModal: styleSelection.setSelectedStyleForModal,
    lastStyleMessageIndex: styleSelection.lastStyleMessageIndex,

    // Task
    pendingTask: task.pendingTask,
    setPendingTask: task.setPendingTask,
    taskData: task.taskData,
    isTaskMode: task.isTaskMode,
    assignedArtist: task.assignedArtist,
    deliverables: task.deliverables,
    taskFiles: task.taskFiles,
    taskSubmitted: task.taskSubmitted,
    showManualSubmit: task.showManualSubmit,
    showCreditDialog: task.showCreditDialog,
    setShowCreditDialog: task.setShowCreditDialog,
    showSubmissionModal: task.showSubmissionModal,
    setShowSubmissionModal: task.setShowSubmissionModal,
    showSubmissionSuccess: task.showSubmissionSuccess,
    submittedTaskId: task.submittedTaskId,
    submittedAssignedArtist: task.submittedAssignedArtist,

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
    estimatedCredits,

    // Files
    uploadedFiles: fileUpload.uploadedFiles,
    pendingFiles: fileUpload.pendingFiles,
    hasFiles: fileUpload.hasFiles,
    allAttachments,
    isDragging: fileUpload.isDragging,

    // Refs
    scrollAreaRef,
    fileInputRef: fileUpload.fileInputRef,
    inputRef,
    requestStartTimeRef: chatMessages.requestStartTimeRef,

    // User info
    userName,
    userInitial,

    // Chat title & dialogs
    chatTitle: draftPersistence.chatTitle,
    lastSavedAt: draftPersistence.lastSavedAt,
    showDeleteDialog,
    setShowDeleteDialog,
    showStartOverDialog,
    setShowStartOverDialog,

    // Last user message index (for edit button)
    lastUserMessageIndex,

    // Quick options
    resolvedQuickOptions,

    // Scene references
    sceneReferences: storyboard.sceneReferences,
    setSceneReferences: storyboard.setSceneReferences,
    handleSceneClick: storyboard.handleSceneClick,
    handleMultiSceneFeedback: storyboard.handleMultiSceneFeedback,
    handleSceneSelectionChange: storyboard.handleSceneSelectionChange,

    // Storyboard / Structure panel
    storyboardScenes: storyboard.storyboardScenes,
    structureType: storyboard.structureType,
    structurePanelVisible: storyboard.structurePanelVisible,
    changedScenes: storyboard.changedScenes,
    sceneImageData: storyboard.sceneImageData,
    websiteGlobalStyles: storyboard.globalStyles,
    websiteFidelity: storyboard.websiteFidelity,

    // Website inspiration
    websiteInspirations: websiteInspiration.selectedInspirations,
    websiteInspirationIds: websiteInspiration.selectedIds,
    addWebsiteInspiration: websiteInspiration.addInspiration,
    removeWebsiteInspiration: websiteInspiration.removeInspiration,
    captureWebsiteScreenshot: websiteInspiration.captureScreenshot,
    isCapturingScreenshot: websiteInspiration.isCapturingScreenshot,
    inspirationGallery: websiteInspiration.inspirationGallery,
    isGalleryLoading: websiteInspiration.isGalleryLoading,
    industryFilter: websiteInspiration.industryFilter,
    setIndustryFilter: websiteInspiration.setIndustryFilter,
    styleFilter: websiteInspiration.styleFilter,
    setStyleFilter: websiteInspiration.setStyleFilter,
    // Visual similarity
    findSimilarWebsites: websiteInspiration.findSimilar,
    similarWebsiteResults: websiteInspiration.similarResults,
    isFindingSimilar: websiteInspiration.isFindingSimilar,
    canFindSimilar: websiteInspiration.canFindSimilar,
    // Inspiration notes
    updateInspirationNotes: websiteInspiration.updateInspirationNotes,
    handleStrategicReviewAction,
    handleSceneEdit: storyboard.handleSceneEdit,
    handleSceneReorder: storyboard.handleSceneReorder,
    handleSceneImageReplace: storyboard.handleSceneImageReplace,
    handleSectionEdit: storyboard.handleSectionEdit,
    handleSectionReorder: storyboard.handleSectionReorder,
    handleRegenerateStoryboard: storyboard.handleRegenerateStoryboard,
    handleRegenerateScene: storyboard.handleRegenerateScene,
    handleRegenerateField: storyboard.handleRegenerateField,
    undo: storyboard.undo,
    redo: storyboard.redo,
    canUndo: storyboard.canUndo,
    canRedo: storyboard.canRedo,
    // Video narrative
    videoNarrative: storyboard.videoNarrative,
    narrativeApproved: storyboard.narrativeApproved,
    handleApproveNarrative: storyboard.handleApproveNarrative,
    handleNarrativeFieldEdit: storyboard.handleNarrativeFieldEdit,
    handleRegenerateNarrative: storyboard.handleRegenerateNarrative,

    // Handlers
    handleSend,
    handleSendOption: chatMessages.handleSendOption,
    handleDiscard,
    handleCopyMessage: chatMessages.handleCopyMessage,
    handleMessageFeedback: chatMessages.handleMessageFeedback,
    handleStyleSelect: styleSelection.handleStyleSelect,
    handleStyleCardClick: styleSelection.handleStyleCardClick,
    handleAddToCollection: styleSelection.handleAddToCollection,
    handleRemoveFromCollection: styleSelection.handleRemoveFromCollection,
    handleClearStyleCollection: styleSelection.handleClearStyleCollection,
    handleSubmitStyles: styleSelection.handleSubmitStyles,
    handleSubmitDeliverableStyles: styleSelection.handleSubmitDeliverableStyles,
    handleConfirmStyleSelection: styleSelection.handleConfirmStyleSelection,
    handleSelectVideo: styleSelection.handleSelectVideo,
    handleShowMoreStyles: styleSelection.handleShowMoreStyles,
    handleShowDifferentStyles: styleSelection.handleShowDifferentStyles,
    handleConfirmTask: task.handleConfirmTask,
    handleOpenSubmissionModal: task.handleOpenSubmissionModal,
    handleInsufficientCredits: task.handleInsufficientCredits,
    handleViewProject: task.handleViewProject,
    handleRejectTask: task.handleRejectTask,
    handleRequestTaskSummary: task.handleRequestTaskSummary,
    handleDeleteChat: draftPersistence.handleDeleteChat,
    handleStartOver: draftPersistence.handleStartOver,
    handleEditLastMessage,
    handleFileUpload: fileUpload.handleFileUpload,
    handleDragEnter: fileUpload.handleDragEnter,
    handleDragLeave: fileUpload.handleDragLeave,
    handleDragOver: fileUpload.handleDragOver,
    handleDrop: fileUpload.handleDrop,
    removeFile: fileUpload.removeFile,
    addExternalLink: fileUpload.addExternalLink,
    uploadFiles: fileUpload.uploadFiles,
    refreshCredits: task.refreshCredits,
    scrollToBottom,
  }
}
