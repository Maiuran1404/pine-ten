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
import { useBrandData } from '@/lib/hooks/use-brand-data'
import { useBriefAutoSave } from '@/lib/hooks/use-brief-auto-save'
import {
  calculateChatStage,
  calculateChatStageFromBriefing,
  getContextualStageDescription,
  BRIEFING_CHAT_STAGES,
} from '@/lib/chat-progress'
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
import type { DeliverableStyle, MoodboardItem } from './types'
import {
  calculateBriefCompletion,
  isBriefReadyForDesigner,
} from '@/components/chat/brief-panel/types'
import {
  generateDesignerBrief,
  exportBriefAsMarkdown,
  generateContentOutline,
} from '@/lib/ai/brief-generator'
import { logger } from '@/lib/logger'
import { useCsrfContext } from '@/providers/csrf-provider'

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
  const { csrfFetch } = useCsrfContext()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const chatStartedRef = useRef(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showStartOverDialog, setShowStartOverDialog] = useState(false)
  const [needsAutoContinueConfirmation, setNeedsAutoContinueConfirmation] = useState(false)

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

  // ─── Briefing state machine (single source of truth for brief) ─
  const initialBriefingState = useMemo(() => {
    const draft = getDraft(draftId)
    return draft?.briefingState ?? undefined
  }, [draftId])

  const {
    briefingState: _briefingState,
    serializedState: serializedBriefingState,
    syncFromServer: syncBriefingFromServer,
    updateBrief: updateBriefInState,
    updateStructure,
    quickOptions: stateMachineQuickOptions,
    setDeliverableCategory,
  } = useBriefingStateMachine(initialBriefingState, { draftId })

  // ─── Brief (derived from _briefingState — single source of truth) ─
  const brief = _briefingState.brief
  const briefCompletion = useMemo(() => calculateBriefCompletion(brief), [brief])
  const isBriefReady = useMemo(() => isBriefReadyForDesigner(brief), [brief])

  // Auto-save brief to server
  useBriefAutoSave(brief, draftId)

  // Apply brand data to brief when brand data becomes available
  const brandDataAppliedRef = useRef(false)
  useEffect(() => {
    if (brandDataAppliedRef.current) return
    if (!brandColors.length && !brandAudiences.length) return

    brandDataAppliedRef.current = true
    updateBriefInState((current) => {
      let updated = { ...current }

      // Apply brand colors
      if (brandColors.length > 0 && !current.visualDirection?.colorPalette?.length) {
        updated = {
          ...updated,
          visualDirection: {
            selectedStyles: current.visualDirection?.selectedStyles || [],
            moodKeywords: current.visualDirection?.moodKeywords || [],
            colorPalette: brandColors,
            typography: brandTypography,
            avoidElements: current.visualDirection?.avoidElements || [],
          },
        }
      }

      // Apply brand audiences
      if (brandAudiences.length > 0 && !current.audience?.value?.name) {
        const primaryAudience = brandAudiences.find((a) => a.isPrimary) || brandAudiences[0]
        updated = {
          ...updated,
          audience: {
            value: {
              name: primaryAudience.name,
              demographics: primaryAudience.demographics
                ? `Ages ${primaryAudience.demographics.ageRange?.min}-${primaryAudience.demographics.ageRange?.max}`
                : undefined,
              psychographics: primaryAudience.psychographics?.values?.join(', '),
              painPoints: primaryAudience.psychographics?.painPoints,
              goals: primaryAudience.psychographics?.goals,
              source: 'inferred',
            },
            confidence: 0.75,
            source: 'inferred',
          },
        }
      }

      return updated
    })
  }, [brandColors, brandTypography, brandAudiences, updateBriefInState])

  // Convenience wrapper for direct brief replacement
  const updateBrief = useCallback(
    (newBrief: typeof brief) => updateBriefInState(() => newBrief),
    [updateBriefInState]
  )

  // Add style to visual direction
  const addStyleToVisualDirection = useCallback(
    (style: DeliverableStyle) => {
      updateBriefInState((current) => {
        const currentDirection = current.visualDirection || {
          selectedStyles: [],
          moodKeywords: [],
          colorPalette: brandColors,
          typography: brandTypography,
          avoidElements: [],
        }
        if (currentDirection.selectedStyles.some((s) => s.id === style.id)) return current
        return {
          ...current,
          visualDirection: {
            ...currentDirection,
            selectedStyles: [...currentDirection.selectedStyles, style],
          },
          updatedAt: new Date(),
        }
      })
    },
    [updateBriefInState, brandColors, brandTypography]
  )

  // Sync moodboard items to visual direction
  const syncMoodboardToVisualDirection = useCallback(
    (items: MoodboardItem[]) => {
      updateBriefInState((current) => {
        const styles: DeliverableStyle[] = items
          .filter((item) => item.type === 'style' && item.metadata?.styleId)
          .map((item) => ({
            id: item.metadata!.styleId!,
            name: item.name,
            description: null,
            imageUrl: item.imageUrl,
            deliverableType: item.metadata?.deliverableType || '',
            styleAxis: item.metadata?.styleAxis || '',
            subStyle: null,
            semanticTags: [],
          }))
        const colors: string[] = [
          ...brandColors,
          ...items
            .filter((item) => item.type === 'color')
            .flatMap((item) => item.metadata?.colorSamples || []),
        ]
        return {
          ...current,
          visualDirection: {
            selectedStyles: styles,
            moodKeywords: current.visualDirection?.moodKeywords || [],
            colorPalette: [...new Set(colors)],
            typography: brandTypography,
            avoidElements: current.visualDirection?.avoidElements || [],
          },
          updatedAt: new Date(),
        }
      })
    },
    [updateBriefInState, brandColors, brandTypography]
  )

  // Sync moodboard changes to visual direction
  useEffect(() => {
    if (moodboardItems.length > 0) {
      syncMoodboardToVisualDirection(moodboardItems)
    }
  }, [moodboardItems, syncMoodboardToVisualDirection])

  // Generate content outline
  const generateOutline = useCallback(
    async (durationDays: number = 30) => {
      if (!brief.platform.value || !brief.intent.value) return
      try {
        const response = await csrfFetch('/api/brief/generate-outline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: brief.topic.value || 'content',
            platform: brief.platform.value,
            contentType: 'post',
            intent: brief.intent.value,
            durationDays,
            audienceName: brief.audience.value?.name,
            audienceDescription: brief.audience.value?.psychographics,
            brandName: brandData?.name || '',
            brandIndustry: brandData?.industry || '',
            brandTone: toneOfVoice,
          }),
        })
        if (!response.ok) throw new Error('Failed to generate outline')
        const data = await response.json()
        updateBriefInState((current) => ({
          ...current,
          contentOutline: data.outline,
          updatedAt: new Date(),
        }))
      } catch (error) {
        logger.error({ err: error }, 'Failed to generate AI outline, falling back to template')
        const outline = generateContentOutline({
          topic: brief.topic.value || 'content',
          platform: brief.platform.value,
          contentType: 'post',
          intent: brief.intent.value,
          durationDays,
          audienceName: brief.audience.value?.name,
        })
        updateBriefInState((current) => ({
          ...current,
          contentOutline: outline,
          updatedAt: new Date(),
        }))
      }
    },
    [brief, brandData, toneOfVoice, updateBriefInState, csrfFetch]
  )

  // Export brief as markdown
  const exportBrief = useCallback(() => {
    const designerBrief = generateDesignerBrief(
      brief,
      {
        name: brandData?.name || 'Brand',
        industry: brandData?.industry || 'General',
        toneOfVoice: toneOfVoice || 'Professional',
        brandDescription: brandData?.description || '',
      },
      draftId
    )
    return exportBriefAsMarkdown(designerBrief)
  }, [brief, brandData, toneOfVoice, draftId])

  // ─── Storyboard / Structure panel ────────────────────────────
  // Forward refs for callbacks that target hooks defined later in the composition chain.
  // handleSendOption is created by useChatMessages below, and handleRegenerateImage
  // is defined after useChatMessages. Both use placeholder callbacks that get populated
  // after their respective hooks are instantiated.
  const regenerateImageRef = useRef<(sceneNumbers: number[]) => void>(() => {})
  const stableOnRegenerateSceneImages = useCallback(
    (sceneNumbers: number[]) => regenerateImageRef.current(sceneNumbers),
    []
  )
  const sendOptionRef = useRef<
    (
      text: string,
      stateOverrides?: Partial<import('@/lib/ai/briefing-state-machine').SerializedBriefingState>
    ) => void
  >(() => {})
  const setMessagesRef = useRef<
    React.Dispatch<React.SetStateAction<import('./types').ChatMessage[]>>
  >(() => {})

  const storyboard = useStoryboard({
    inputRef,
    handleSendOption: useCallback(
      (
        text: string,
        overrides?: Partial<import('@/lib/ai/briefing-state-machine').SerializedBriefingState>
      ) => sendOptionRef.current(text, overrides),
      []
    ),
    briefingState: _briefingState,
    setMessages: useCallback<React.Dispatch<React.SetStateAction<import('./types').ChatMessage[]>>>(
      (action) => setMessagesRef.current(action),
      []
    ),
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
    onTaskProposal: stableOnTaskProposal,
    onDeliverableTypeChange: stableOnDeliverableTypeChange,
    onStructureData: storyboard.updateStructureData,
    onGlobalStyles: storyboard.setGlobalStyles,
    onVideoNarrative: storyboard.updateVideoNarrative,
    onRegenerateSceneImages: stableOnRegenerateSceneImages,
    latestStoryboardRef: storyboard.latestStoryboardRef,
  })

  // Wire up forward refs now that chatMessages is available
  sendOptionRef.current = chatMessages.handleSendOption
  setMessagesRef.current = chatMessages.setMessages

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
  const lastAssistantMsg = useMemo(
    () => [...chatMessages.messages].reverse().find((m) => m.role === 'assistant'),
    [chatMessages.messages]
  )

  const smartCompletion = useSmartCompletion({
    input: chatMessages.input,
    isLoading: chatMessages.isLoading,
    briefingStage: _briefingState?.stage ?? null,
    deliverableCategory: _briefingState?.deliverableCategory ?? null,
    lastAssistantMessage: lastAssistantMsg?.content ?? null,
    brandName: brandData?.name ?? null,
    platform: _briefingState?.brief?.platform?.value ?? null,
    intent: _briefingState?.brief?.intent?.value ?? null,
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
    setNeedsAutoContinue: chatMessages.setNeedsAutoContinue,
    setNeedsAutoContinueConfirmation,
    setShowSubmissionModal: task.setShowSubmissionModal,
    clearMoodboard,
    addMoodboardItem,
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
  // High-water mark prevents progress bar from going backwards during transient
  // state-machine regressions (e.g. re-visiting an earlier stage briefly).
  const progressHighWaterRef = useRef(0)

  const progressState = useMemo(() => {
    if (_briefingState) {
      const result = calculateChatStageFromBriefing(_briefingState.stage)
      const stageIndex = BRIEFING_CHAT_STAGES.indexOf(result.currentStage)

      // Clamp: never go below the high-water mark
      if (stageIndex >= 0 && stageIndex < progressHighWaterRef.current) {
        const hwStage = BRIEFING_CHAT_STAGES[progressHighWaterRef.current]
        const hwResult = calculateChatStageFromBriefing(
          // Map chat stage back — use the high-water stage for progress display
          _briefingState.stage
        )
        const hwPercentage = Math.round(
          (progressHighWaterRef.current / (BRIEFING_CHAT_STAGES.length - 1)) * 100
        )
        return {
          ...hwResult,
          currentStage: hwStage,
          progressPercentage: Math.min(100, hwPercentage),
          stageDescription: getContextualStageDescription(_briefingState.stage, {
            deliverableCategory: _briefingState.deliverableCategory,
            structure: _briefingState.structure,
            videoNarrative: _briefingState.videoNarrative,
            narrativeApproved: _briefingState.narrativeApproved,
          }),
        }
      }

      if (stageIndex >= 0) {
        progressHighWaterRef.current = Math.max(progressHighWaterRef.current, stageIndex)
      }

      return {
        ...result,
        stageDescription: getContextualStageDescription(_briefingState.stage, {
          deliverableCategory: _briefingState.deliverableCategory,
          structure: _briefingState.structure,
          videoNarrative: _briefingState.videoNarrative,
          narrativeApproved: _briefingState.narrativeApproved,
        }),
      }
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
    _briefingState?.deliverableCategory,
    _briefingState?.structure,
    _briefingState?.videoNarrative,
    _briefingState?.narrativeApproved,
    chatMessages.messages,
    styleSelection.selectedStyles,
    styleSelection.selectedDeliverableStyles,
    moodboardItems,
    task.pendingTask,
    task.taskSubmitted,
  ])

  // ─── Estimated credits ─────────────────────────────────────
  // Use a ref to preserve the last known credit estimate when deliverableCategory
  // goes null during sync, preventing flicker (BUG-5)
  const lastKnownCreditsRef = useRef<number | null>(null)
  const estimatedCredits = useMemo(() => {
    const category = _briefingState?.deliverableCategory
    if (!category) return lastKnownCreditsRef.current
    const CREDIT_ESTIMATES: Record<string, number> = {
      video: 30,
      website: 30,
      content: 15,
      design: 20,
      brand: 60,
    }
    const estimate = CREDIT_ESTIMATES[category] ?? null
    if (estimate !== null) lastKnownCreditsRef.current = estimate
    return estimate
  }, [_briefingState?.deliverableCategory])

  // ─── Quick options ──────────────────────────────────────────
  const resolvedQuickOptions = useMemo(() => {
    if (chatMessages.isLoading || task.pendingTask || task.taskSubmitted) return null
    // Note: INSPIRATION suppression removed — chat-input-area.tsx already hides chips
    // when inline style/video pickers are present (hasInlineStylePicker check).
    // The redundant guard here caused a race with async briefingState sync.
    const msgs = chatMessages.messages
    // Dismiss chips after user answers (BUG-7)
    if (msgs.length > 0 && msgs[msgs.length - 1].role === 'user') return null

    // State machine quick options take priority (deterministic, stage-appropriate)
    if (stateMachineQuickOptions && stateMachineQuickOptions.options.length > 0) {
      return stateMachineQuickOptions
    }

    // Fallback: AI-returned quick options from last assistant message
    const lastAssistantMessage = [...msgs].reverse().find((m) => m.role === 'assistant')
    if (
      lastAssistantMessage?.quickOptions &&
      lastAssistantMessage.quickOptions.options.length > 0
    ) {
      return lastAssistantMessage.quickOptions
    }
    return null
  }, [
    chatMessages.messages,
    chatMessages.isLoading,
    task.pendingTask,
    task.taskSubmitted,
    stateMachineQuickOptions,
  ])

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

  // ─── Stability: restore video narrative + storyboard review from briefing state ──
  useEffect(() => {
    if (_briefingState?.videoNarrative && !storyboard.videoNarrative) {
      storyboard.setVideoNarrative(_briefingState.videoNarrative)
    }
    if (_briefingState?.narrativeApproved && !storyboard.narrativeApproved) {
      storyboard.setNarrativeApproved(true)
    }
    if (_briefingState?.storyboardReviewed && !storyboard.storyboardReviewed) {
      storyboard.setStoryboardReviewed(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    _briefingState?.videoNarrative,
    _briefingState?.narrativeApproved,
    _briefingState?.storyboardReviewed,
  ])

  // ─── Auto-trigger storyboard generation at ELABORATE entry ──────
  // When the state machine advances to ELABORATE for a video project (after style
  // selection), nobody fires the AI call that generates the storyboard. This effect
  // detects that entry and sends the storyboard generation request.
  // We use handleSendOption (same as handleRetryGeneration) rather than
  // runAutoContinue because after style confirmation the last message is from the
  // assistant — runAutoContinue requires the last message to be from the user.
  const elaborateTriggeredRef = useRef(false)
  useEffect(() => {
    const stage = _briefingState?.stage
    const category = _briefingState?.deliverableCategory
    if (stage !== 'ELABORATE') {
      elaborateTriggeredRef.current = false
      return
    }
    if (category !== 'video') return
    if (storyboard.storyboardScenes) return
    if (elaborateTriggeredRef.current) return
    if (chatMessages.isLoading) return
    if (messagesRef.current.length === 0) return
    elaborateTriggeredRef.current = true
    setNeedsAutoContinueConfirmation(false)
    chatMessages.handleSendOption(
      'Now build the full storyboard based on the approved narrative and selected visual style.',
      { narrativeApproved: true, stage: 'ELABORATE', turnsInCurrentStage: 0 }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    _briefingState?.stage,
    _briefingState?.deliverableCategory,
    storyboard.storyboardScenes,
    chatMessages.isLoading,
  ])

  // ─── Auto-fetch styles when entering INSPIRATION with no styles ──
  const styleFetchTriggeredRef = useRef(false)
  useEffect(() => {
    const stage = _briefingState?.stage
    const category = _briefingState?.deliverableCategory

    // Reset trigger when leaving INSPIRATION
    if (stage !== 'INSPIRATION') {
      styleFetchTriggeredRef.current = false
      return
    }

    // Only proceed if at INSPIRATION with a known category and not already fetched
    if (!category || styleFetchTriggeredRef.current) return
    if (chatMessages.isLoading) return

    // Check if any message already has deliverableStyles
    const hasStyles = chatMessages.messages.some(
      (m) => m.deliverableStyles && m.deliverableStyles.length > 0
    )
    if (hasStyles) return

    styleFetchTriggeredRef.current = true
    styleSelection.fetchInitialStyles(category)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    _briefingState?.stage,
    _briefingState?.deliverableCategory,
    chatMessages.isLoading,
    chatMessages.messages,
  ])

  // ─── Image generation trigger: when storyboard first appears for video ──
  const imageGenTriggeredRef = useRef(false)
  useEffect(() => {
    const category = _briefingState?.deliverableCategory
    const structure = storyboard.storyboardScenes

    // Only trigger for video projects that have a storyboard
    // Note: we don't gate on stage === 'ELABORATE' because the stage may have
    // already advanced to DEEPEN/REVIEW by the time the storyboard arrives
    // (stage derivation happens in the same API response that produces the storyboard)
    if (category !== 'video') {
      imageGenTriggeredRef.current = false
      return
    }
    if (!structure || structure.type !== 'storyboard') return
    if (storyboard.isGeneratingImages) return

    // Check if scenes already have images (e.g. from draft restore)
    const scenesNeedingImages = structure.scenes.filter((s) => !s.resolvedImageUrl)

    // If ALL scenes need images, this is a fresh/regenerated storyboard — reset trigger
    if (scenesNeedingImages.length > 0 && scenesNeedingImages.length === structure.scenes.length) {
      imageGenTriggeredRef.current = false
    }
    if (imageGenTriggeredRef.current) return
    if (scenesNeedingImages.length === 0) return

    // Extract style context from visual direction — filter out synthetic placeholders
    const selectedStyles = _briefingState?.brief?.visualDirection?.selectedStyles?.filter(
      (s) => s.id !== 'moodboard-synced' && s.imageUrl !== ''
    )
    if (!selectedStyles || selectedStyles.length === 0) return

    const rawStyleContext = selectedStyles
      .map((s) => s.promptGuide || `${s.name}${s.description ? `: ${s.description}` : ''}`)
      .join('; ')
    // Truncate to fit the API's 2000-char Zod limit
    const styleContext =
      rawStyleContext.length > 1950 ? rawStyleContext.slice(0, 1950) : rawStyleContext

    const briefId = _briefingState?.brief?.id || draftId
    const styleIds = selectedStyles.map((s) => s.id).filter((id) => id && id !== 'moodboard-synced')

    // Build brand context for color/tone integration in image generation
    const imgBrandContext = brandData
      ? {
          colors: {
            primary: brandData.primaryColor ?? undefined,
            secondary: brandData.secondaryColor ?? undefined,
            accent: brandData.accentColor ?? undefined,
          },
          industry: brandData.industry ?? undefined,
          toneOfVoice: toneOfVoice ?? undefined,
          brandDescription: brandData.description ?? undefined,
        }
      : undefined

    imageGenTriggeredRef.current = true
    storyboard.generateSceneImages(
      structure.scenes,
      styleContext,
      briefId,
      styleIds,
      imgBrandContext
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    _briefingState?.deliverableCategory,
    _briefingState?.brief?.visualDirection?.selectedStyles,
    storyboard.storyboardScenes,
    storyboard.isGeneratingImages,
  ])

  // Wrapped callback for single-scene image regeneration (auto-supplies style context, briefId, styleIds, heroImageUrl, brandContext)
  const handleRegenerateImage = useCallback(
    (scene: import('@/lib/ai/briefing-state-machine').StoryboardScene) => {
      const selectedStylesList = _briefingState?.brief?.visualDirection?.selectedStyles?.filter(
        (s) => s.id !== 'moodboard-synced' && s.imageUrl !== ''
      )
      const rawCtx =
        selectedStylesList
          ?.map((s) => s.promptGuide || `${s.name}${s.description ? `: ${s.description}` : ''}`)
          .join('; ') || ''
      // Truncate to fit the API's 2000-char Zod limit
      const styleCtx = rawCtx.length > 1950 ? rawCtx.slice(0, 1950) : rawCtx
      const bId = _briefingState?.brief?.id || draftId
      const sIds = selectedStylesList
        ?.map((s) => s.id)
        .filter((id) => id && id !== 'moodboard-synced')

      // Get hero image URL (scene 1's resolved image) for consistency anchoring
      const currentStoryboard = storyboard.latestStoryboardRef.current
      let heroUrl: string | undefined
      if (currentStoryboard?.type === 'storyboard' && scene.sceneNumber !== 1) {
        const heroScene = currentStoryboard.scenes.find((s) => s.sceneNumber === 1)
        heroUrl = heroScene?.resolvedImageUrl ?? undefined
      }

      // Build brand context
      const regenBrandContext = brandData
        ? {
            colors: {
              primary: brandData.primaryColor ?? undefined,
              secondary: brandData.secondaryColor ?? undefined,
              accent: brandData.accentColor ?? undefined,
            },
            industry: brandData.industry ?? undefined,
            toneOfVoice: toneOfVoice ?? undefined,
            brandDescription: brandData.description ?? undefined,
          }
        : undefined

      storyboard.regenerateSceneImage(
        scene,
        styleCtx,
        bId,
        undefined,
        sIds,
        heroUrl,
        regenBrandContext
      )
    },
    [_briefingState, draftId, storyboard, brandData, toneOfVoice]
  )

  // ─── Change visual style from storyboard toolbar ──────────
  const handleChangeVisualStyle = useCallback(
    (styles: DeliverableStyle[], regenerateImages: boolean) => {
      // 1. Replace selected styles in brief visual direction
      updateBriefInState((current) => {
        const currentDirection = current.visualDirection || {
          selectedStyles: [],
          moodKeywords: [],
          colorPalette: brandColors,
          typography: brandTypography,
          avoidElements: [],
        }
        return {
          ...current,
          visualDirection: {
            ...currentDirection,
            selectedStyles: styles,
          },
          updatedAt: new Date(),
        }
      })

      // 2. Add styles to moodboard if not already present
      for (const style of styles) {
        if (!hasMoodboardItem(style.id)) {
          addFromStyle(style)
        }
      }

      // 3. Optionally regenerate all scene images with new style
      if (regenerateImages) {
        const currentStoryboard = storyboard.latestStoryboardRef.current
        if (currentStoryboard?.type === 'storyboard') {
          // Build style context from new styles
          const rawStyleContext = styles
            .map((s) => s.promptGuide || `${s.name}${s.description ? `: ${s.description}` : ''}`)
            .join('; ')
          const styleContext =
            rawStyleContext.length > 1950 ? rawStyleContext.slice(0, 1950) : rawStyleContext

          const briefId = _briefingState?.brief?.id || draftId
          const styleIds = styles.map((s) => s.id).filter((id) => id && id !== 'moodboard-synced')

          // Clear existing resolved image URLs so the generator picks them up
          const clearedScenes = currentStoryboard.scenes.map((s) => ({
            ...s,
            resolvedImageUrl: undefined,
          }))
          storyboard.setStoryboardScenes({
            ...currentStoryboard,
            scenes: clearedScenes,
          })

          // Build brand context
          const imgBrandContext = brandData
            ? {
                colors: {
                  primary: brandData.primaryColor ?? undefined,
                  secondary: brandData.secondaryColor ?? undefined,
                  accent: brandData.accentColor ?? undefined,
                },
                industry: brandData.industry ?? undefined,
                toneOfVoice: toneOfVoice ?? undefined,
                brandDescription: brandData.description ?? undefined,
              }
            : undefined

          storyboard.generateSceneImages(
            clearedScenes,
            styleContext,
            briefId,
            styleIds,
            imgBrandContext
          )
        }
      }
    },
    [
      updateBriefInState,
      brandColors,
      brandTypography,
      hasMoodboardItem,
      addFromStyle,
      storyboard,
      _briefingState,
      draftId,
      brandData,
      toneOfVoice,
    ]
  )

  // Fetch styles for the style change sheet
  const handleFetchStylesForChange = useCallback(() => {
    const category = _briefingState?.deliverableCategory
    if (category) {
      styleSelection.fetchInitialStyles(category)
    }
  }, [_briefingState?.deliverableCategory, styleSelection])

  // Wire up forward ref for AI-triggered image regeneration (via [REGENERATE_IMAGES] marker)
  regenerateImageRef.current = (sceneNumbers: number[]) => {
    if (storyboard.isGeneratingImages) return
    const currentStoryboard = storyboard.latestStoryboardRef.current
    if (!currentStoryboard || currentStoryboard.type !== 'storyboard') return

    for (const sceneNum of sceneNumbers) {
      // Only regenerate scenes that already have images
      if (!storyboard.sceneImageData.has(sceneNum)) continue
      const scene = currentStoryboard.scenes.find((s) => s.sceneNumber === sceneNum)
      if (scene) handleRegenerateImage(scene)
    }
  }

  // ─── Auto-regenerate scene images when visual fields change ──
  useEffect(() => {
    if (storyboard.changedScenes.size === 0) return
    if (storyboard.isGeneratingImages) return

    const VISUAL_FIELDS = ['visualNote', 'description', 'imageGenerationPrompt']
    const scenesToRegen: number[] = []

    for (const [sceneNum, changes] of storyboard.changedScenes) {
      const hasVisualChange = changes.some((c) => VISUAL_FIELDS.includes(c.field))
      const hasExistingImage = storyboard.sceneImageData.has(sceneNum)
      if (hasVisualChange && hasExistingImage) {
        scenesToRegen.push(sceneNum)
      }
    }

    if (scenesToRegen.length === 0) return

    const currentStoryboard = storyboard.latestStoryboardRef.current
    if (!currentStoryboard || currentStoryboard.type !== 'storyboard') return

    for (const sceneNum of scenesToRegen) {
      const scene = currentStoryboard.scenes.find((s) => s.sceneNumber === sceneNum)
      if (scene) handleRegenerateImage(scene)
    }

    // Clear changedScenes after processing to prevent re-triggering
    storyboard.dismissChangedScenes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyboard.changedScenes])

  // ─── Sync storyboard edits to briefing state for draft persistence ──
  const structureSyncRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    if (!storyboard.storyboardScenes) return
    clearTimeout(structureSyncRef.current)
    structureSyncRef.current = setTimeout(() => {
      updateStructure(storyboard.storyboardScenes)
    }, 500)
    return () => clearTimeout(structureSyncRef.current)
  }, [storyboard.storyboardScenes, updateStructure])

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

    const lastMsg = msgs[msgs.length - 1]
    const aiSignalsReady = lastMsg?.role === 'assistant' && hasReadyIndicator(lastMsg.content)

    // REVIEW stage = the brief IS ready by definition. Don't gate on AI regex.
    // DEEPEN still requires the AI to explicitly signal readiness.
    const baseReady =
      stage === 'SUBMIT' ||
      (stage === 'REVIEW' && lastMsg?.role === 'assistant') ||
      ((stage === 'REVIEW' || stage === 'DEEPEN') && aiSignalsReady)

    // For video projects, also require storyboard reviewed + images done.
    // When stage is SUBMIT or the AI explicitly signals readiness, bypass
    // the video gate to avoid blocking submission on slow/stuck image generation.
    const videoReady =
      _briefingState?.deliverableCategory !== 'video' ||
      stage === 'SUBMIT' ||
      aiSignalsReady ||
      (_briefingState?.storyboardReviewed === true && !storyboard.isGeneratingImages)

    const shouldConstruct = baseReady && videoReady

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
    _briefingState?.deliverableCategory,
    _briefingState?.storyboardReviewed,
    storyboard.isGeneratingImages,
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
    const hasSceneRefs = storyboard.sceneReferences.length > 0
    storyboard.setSceneReferences([])

    if (!hasInFlight) {
      // All files already uploaded — send directly
      await chatMessages.handleSend(processedContent, alreadyDone, hasSceneRefs || undefined)
      return
    }

    // Files still uploading — await them then send.
    // chatMessages.handleSend shows the user message + "Thinking..."
    // so the upload wait is hidden behind the loading indicator.
    const allFiles = await allUploadsPromise
    await chatMessages.handleSend(processedContent, allFiles, hasSceneRefs || undefined)
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

  // Retry storyboard generation after narrative approval failure
  const handleRetryGeneration = useCallback(() => {
    chatMessages.setLastSendError(null)
    storyboard.handleApproveNarrative()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyboard.handleApproveNarrative, chatMessages.setLastSendError])

  // Reset narrative approval to allow re-editing (error recovery escape hatch)
  const handleEditNarrative = useCallback(() => {
    chatMessages.setLastSendError(null)
    storyboard.setNarrativeApproved(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyboard.setNarrativeApproved, chatMessages.setLastSendError])

  // Auto-continue confirmation handlers (crash recovery)
  const handleConfirmAutoContinue = useCallback(() => {
    setNeedsAutoContinueConfirmation(false)
    chatMessages.setNeedsAutoContinue(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatMessages.setNeedsAutoContinue])

  const handleDismissAutoContinue = useCallback(() => {
    setNeedsAutoContinueConfirmation(false)
  }, [])

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

    // Auto-continue confirmation (crash recovery)
    needsAutoContinueConfirmation,
    handleConfirmAutoContinue,
    handleDismissAutoContinue,

    // Suggestions
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
    setDeliverableCategory,
    estimatedCredits,
    targetDurationSeconds: _briefingState?.targetDurationSeconds ?? null,

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
    // Scene image generation
    isGeneratingImages: storyboard.isGeneratingImages,
    imageGenerationProgress: storyboard.imageGenerationProgress,
    handleRegenerateImage,
    // Style change from storyboard toolbar
    handleChangeVisualStyle,
    handleFetchStylesForChange,

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
    storyboardReviewed: storyboard.storyboardReviewed,
    handleApproveNarrative: storyboard.handleApproveNarrative,
    handleApproveStoryboard: storyboard.handleApproveStoryboard,
    handleNarrativeFieldEdit: storyboard.handleNarrativeFieldEdit,
    handleRegenerateNarrative: storyboard.handleRegenerateNarrative,
    handleRetryGeneration,
    handleEditNarrative,

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
