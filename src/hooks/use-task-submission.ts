/**
 * Hook for managing task submission logic.
 * Handles task creation, credit checks, submission modals,
 * and post-submission state.
 */
'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { useCsrfContext } from '@/providers/csrf-provider'
import { usePostHog } from 'posthog-js/react'
import { PostHogEvents } from '@/lib/posthog-events'
import { useCredits, dispatchCreditsUpdated } from '@/providers/credit-provider'
import {
  type ChatMessage as Message,
  type TaskProposal,
  type StructureData,
} from '@/components/chat/types'
import type { MoodboardItem } from '@/components/chat/types'
import type { TaskData } from '@/components/chat/chat-interface'
import {
  hasReadyIndicator,
  constructTaskFromConversation,
} from '@/components/chat/chat-interface.utils'
import { deleteDraft } from '@/lib/chat-drafts'
import type { LiveBrief } from '@/components/chat/brief-panel/types'

interface UseTaskSubmissionOptions {
  draftId: string
  messages: Message[]
  selectedStyles: string[]
  moodboardItems: MoodboardItem[]
  storyboardScenes: StructureData | null
  latestStoryboardRef: React.MutableRefObject<StructureData | null>
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  setAnimatingMessageId: (id: string | null) => void
  onDraftUpdate?: () => void
  onTaskCreated?: (taskId: string) => void
  initialTaskData?: TaskData | null
  briefingState?: { stage?: string; brief?: LiveBrief } | null
  scrollAreaRef: React.RefObject<HTMLDivElement | null>
}

export function useTaskSubmission({
  draftId,
  messages,
  selectedStyles,
  moodboardItems,
  storyboardScenes,
  latestStoryboardRef,
  setMessages,
  setAnimatingMessageId,
  onDraftUpdate,
  onTaskCreated,
  initialTaskData,
  briefingState,
  scrollAreaRef,
}: UseTaskSubmissionOptions) {
  const { csrfFetch } = useCsrfContext()
  const router = useRouter()
  const posthog = usePostHog()
  const { credits: userCredits, refreshCredits, deductCredits } = useCredits()
  const [pendingTask, setPendingTask] = useState<TaskProposal | null>(null)
  const [taskData, setTaskData] = useState<TaskData | null>(initialTaskData || null)
  const [taskSubmitted, setTaskSubmitted] = useState(false)
  const [showManualSubmit, setShowManualSubmit] = useState(false)
  const [hasRequestedTaskSummary, setHasRequestedTaskSummary] = useState(false)
  const [showCreditDialog, setShowCreditDialog] = useState(false)
  const [showSubmissionModal, setShowSubmissionModal] = useState(false)
  const [showSubmissionSuccess, _setShowSubmissionSuccess] = useState(false)
  const [submittedTaskId, _setSubmittedTaskId] = useState<string | null>(null)
  const [submittedAssignedArtist, _setSubmittedAssignedArtist] = useState<string | null>(null)
  const [isLoading, _setIsLoading] = useState(false)

  // Track payment processing
  const [paymentProcessed, setPaymentProcessed] = useState(false)
  const paymentProcessedRef = useRef(paymentProcessed)
  paymentProcessedRef.current = paymentProcessed

  // Guard against duplicate submissions (ref-based for synchronous check)
  const isSubmittingRef = useRef(false)

  const isTaskMode = !!taskData
  const assignedArtist = taskData?.freelancer
  const deliverables = taskData?.files?.filter((f) => f.isDeliverable) || []
  const taskFiles = taskData?.files?.filter((f) => !f.isDeliverable) || []

  // Task confirmation handler — navigates IMMEDIATELY, API call runs in background
  const handleConfirmTask = useCallback(async () => {
    if (!pendingTask) return
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true

    const normalizedTask = {
      ...pendingTask,
      creditsRequired: pendingTask.creditsRequired ?? 15,
      estimatedHours: pendingTask.estimatedHours ?? 24,
      deliveryDays: pendingTask.deliveryDays ?? 3,
    }

    if (userCredits < normalizedTask.creditsRequired) {
      Sentry.addBreadcrumb({
        category: 'task-submission',
        message: 'Insufficient credits',
        data: { required: normalizedTask.creditsRequired, available: userCredits },
        level: 'warning',
      })
      posthog?.capture(PostHogEvents.INSUFFICIENT_CREDITS_SHOWN, {
        credits_required: normalizedTask.creditsRequired,
        credits_available: userCredits,
        $source: 'client',
      })
      setShowCreditDialog(true)
      isSubmittingRef.current = false
      return
    }

    Sentry.addBreadcrumb({
      category: 'task-submission',
      message: 'Creating task',
      data: { credits: normalizedTask.creditsRequired },
      level: 'info',
    })

    // Store submission metadata for the celebration page to display immediately
    sessionStorage.setItem('crafted-previous-credits', String(userCredits))
    sessionStorage.setItem(
      'crafted-pending-submission',
      JSON.stringify({
        title: normalizedTask.title,
        description: normalizedTask.description,
        category: normalizedTask.category,
        creditsRequired: normalizedTask.creditsRequired,
        estimatedHours: normalizedTask.estimatedHours,
        deliveryDays: normalizedTask.deliveryDays,
      })
    )
    sessionStorage.removeItem('crafted-launched-task-id')
    sessionStorage.removeItem('crafted-launch-error')

    // Navigate IMMEDIATELY — user sees celebration page instantly
    router.push('/dashboard/tasks/launching')

    // Build API payload and fire in background (fire-and-forget)
    const allAttachmentsForTask = messages
      .filter((m) => m.attachments && m.attachments.length > 0)
      .flatMap((m) => m.attachments || [])
      .filter((file) => file != null && file.fileUrl != null)

    const apiBody = {
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
    }

    // Fire-and-forget — continues even after the chat component unmounts
    void (async () => {
      try {
        const response = await csrfFetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiBody),
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

        // Store result for the launching page to pick up
        sessionStorage.setItem('crafted-launched-task-id', taskId)

        // Background cleanup (state updates are no-ops if component unmounted — that's fine)
        deleteDraft(draftId)
        onDraftUpdate?.()

        Sentry.addBreadcrumb({
          category: 'task-submission',
          message: 'Task created successfully',
          data: { taskId },
          level: 'info',
        })

        posthog?.capture(PostHogEvents.BRIEFING_COMPLETED, {
          task_id: taskId,
          credits_used: normalizedTask.creditsRequired,
          $source: 'client',
        })

        window.dispatchEvent(new CustomEvent('tasks-updated'))
        const newCredits = userCredits - (normalizedTask.creditsRequired ?? 0)
        deductCredits(normalizedTask.creditsRequired)
        dispatchCreditsUpdated(newCredits)
        onTaskCreated?.(taskId)
      } catch (error) {
        sessionStorage.setItem(
          'crafted-launch-error',
          error instanceof Error ? error.message : 'Failed to create task'
        )
      } finally {
        isSubmittingRef.current = false
      }
    })()
  }, [
    pendingTask,
    userCredits,
    messages,
    selectedStyles,
    moodboardItems,
    storyboardScenes,
    latestStoryboardRef,
    draftId,
    onDraftUpdate,
    onTaskCreated,
    deductCredits,
    posthog,
    csrfFetch,
    router,
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
      id: crypto.randomUUID(),
      role: 'assistant',
      content:
        'No problem! What would you like to change? I can adjust the scope, timeline, or any other details.',
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, clarifyMessage])
    setAnimatingMessageId(clarifyMessage.id)
  }, [setMessages, setAnimatingMessageId])

  const handleRequestTaskSummary = useCallback(async () => {
    if (isLoading || pendingTask) return

    setShowManualSubmit(false)
    setHasRequestedTaskSummary(true)

    const constructedTask = constructTaskFromConversation(messages, briefingState?.brief)

    const summaryMessage: Message = {
      id: crypto.randomUUID(),
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
  }, [isLoading, messages, pendingTask, briefingState?.brief, setMessages, scrollAreaRef])

  // Detect "ready to execute" patterns
  const checkReadyIndicator = useCallback(
    (lastMessage: Message | undefined) => {
      if (hasRequestedTaskSummary) {
        setShowManualSubmit(false)
        return
      }
      if (lastMessage?.role === 'assistant' && !pendingTask) {
        setShowManualSubmit(hasReadyIndicator(lastMessage.content))
      } else {
        setShowManualSubmit(false)
      }
    },
    [pendingTask, hasRequestedTaskSummary]
  )

  return {
    pendingTask,
    setPendingTask,
    taskData,
    setTaskData,
    isTaskMode,
    assignedArtist,
    deliverables,
    taskFiles,
    taskSubmitted,
    setTaskSubmitted,
    showManualSubmit,
    setShowManualSubmit,
    hasRequestedTaskSummary,
    setHasRequestedTaskSummary,
    showCreditDialog,
    setShowCreditDialog,
    showSubmissionModal,
    setShowSubmissionModal,
    showSubmissionSuccess,
    submittedTaskId,
    submittedAssignedArtist,
    isSubmissionLoading: isLoading,
    paymentProcessed,
    setPaymentProcessed,
    userCredits,
    refreshCredits,
    handleConfirmTask,
    handleOpenSubmissionModal,
    handleInsufficientCredits,
    handleViewProject,
    handleRejectTask,
    handleRequestTaskSummary,
    checkReadyIndicator,
  }
}
