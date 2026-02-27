'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Check,
  Image as ImageIcon,
  ArrowRight,
  Palette,
  Sparkles,
  Lightbulb,
  Film,
  AlertCircle,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TypingText } from './typing-text'
import { FileAttachmentList } from './file-attachment'
import { VideoReferenceGrid, type VideoReferenceStyle } from './video-reference-grid'
import { StyleSelectionGrid } from './style-selection-grid'
import { InlineCollection } from './inline-collection'
import { TaskProposalCard } from './task-proposal-card'
import { StoryboardSummaryCard } from './storyboard-view'
import { LayoutPreview } from './layout-preview'
import { DesignSpecView } from './design-spec-view'
import { ContentCalendar } from './brief-panel/content-calendar'
import { StrategicReviewCard } from './strategic-review-card'
import type {
  ChatMessage as Message,
  DeliverableStyle,
  MoodboardItem,
  TaskProposal,
  UploadedFile,
} from './types'
import { InlineUploadZone } from './inline-upload-zone'

// =============================================================================
// SCENE FEEDBACK PARSER — extracts scene chips from [Feedback on ...] prefix
// =============================================================================

function parseSceneFeedback(content: string): {
  scenes: { sceneNumber: string; title: string }[]
  text: string
} {
  const match = content.match(/^\[Feedback on (.*?)\]\s*([\s\S]*)$/)
  if (!match) return { scenes: [], text: content }

  const scenePart = match[1]
  const text = match[2]
  const scenes: { sceneNumber: string; title: string }[] = []

  // Parse "Scene 1: Hook, Scene 2: Problem Context" etc.
  const sceneRegex = /Scene\s+(\d+):\s*([^,]+)/g
  let sceneMatch
  while ((sceneMatch = sceneRegex.exec(scenePart)) !== null) {
    scenes.push({ sceneNumber: sceneMatch[1], title: sceneMatch[2].trim() })
  }

  return { scenes, text }
}

// =============================================================================
// STAGE-AWARE LOADING MESSAGES
// =============================================================================

const STAGE_LOADING_MESSAGES: Record<string, string[]> = {
  EXTRACT: [
    'Understanding your vision...',
    'Piecing together the details...',
    'Getting the full picture...',
    'Mapping out your brief fields...',
    'Refining the details...',
    'Wrapping up the analysis...',
  ],
  TASK_TYPE: [
    'Figuring out the best format...',
    'Matching your idea to the right medium...',
    'Narrowing down the approach...',
    'Evaluating deliverable options...',
    'Selecting the ideal format...',
    'Finalizing the recommendation...',
  ],
  INTENT: [
    'Identifying your goal...',
    'Aligning with your strategy...',
    'Connecting the dots...',
    'Fine-tuning the direction...',
    'Locking in the strategy...',
    'Wrapping up...',
  ],
  INSPIRATION: [
    'Scouting visual references...',
    'Curating styles that fit...',
    'Pulling together inspiration...',
    'Comparing reference styles...',
    'Selecting the best matches...',
    'Finalizing your options...',
  ],
  STRUCTURE: [
    'Designing your storyboard...',
    'Building out the structure...',
    'Crafting each scene...',
    'Adding visual direction...',
    'Polishing the narrative flow...',
    'Putting the finishing touches...',
  ],
  STRATEGIC_REVIEW: [
    'Reviewing your strategy...',
    'Spotting strengths and risks...',
    'Refining the approach...',
    'Running competitive analysis...',
    'Compiling recommendations...',
    'Preparing the review...',
  ],
  MOODBOARD: [
    'Mapping out your moodboard...',
    'Curating the perfect visuals...',
    'Locking in the aesthetic...',
    'Refining color and tone...',
    'Assembling the final board...',
    'Wrapping up...',
  ],
  REVIEW: [
    'Running a final review...',
    'Checking every detail...',
    'Polishing the brief...',
    'Ensuring consistency...',
    'Making final adjustments...',
    'Almost ready...',
  ],
  DEEPEN: [
    'Digging deeper...',
    'Adding layers of detail...',
    'Expanding the brief...',
    'Enriching the specifics...',
    'Refining nuances...',
    'Putting it all together...',
  ],
  SUBMIT: [
    'Packaging everything up...',
    'Preparing your submission...',
    'Running final checks...',
    'Validating the brief...',
    'Final touches...',
    'Almost ready to submit...',
  ],
}

const DEFAULT_LOADING_MESSAGES = [
  'Thinking about your project...',
  'Working on a response...',
  'Putting ideas together...',
  'Crafting the perfect reply...',
  'Refining the details...',
  'Almost done...',
]

// =============================================================================
// LOADING INDICATOR
// =============================================================================

function LoadingIndicator({
  requestStartTime,
  briefingStage,
}: {
  requestStartTime: number | null
  briefingStage?: string | null
}) {
  const [loadingStage, setLoadingStage] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)

  const loadingMessages =
    briefingStage && STAGE_LOADING_MESSAGES[briefingStage]
      ? STAGE_LOADING_MESSAGES[briefingStage]
      : DEFAULT_LOADING_MESSAGES

  useEffect(() => {
    const interval = setInterval(() => {
      if (requestStartTime) {
        const elapsed = Math.floor((Date.now() - requestStartTime) / 1000)
        setElapsedTime(elapsed)

        // Progress through stages based on time (6 stages for long waits)
        if (elapsed >= 25) setLoadingStage(5)
        else if (elapsed >= 18) setLoadingStage(4)
        else if (elapsed >= 12) setLoadingStage(3)
        else if (elapsed >= 7) setLoadingStage(2)
        else if (elapsed >= 3) setLoadingStage(1)
        else setLoadingStage(0)
      }
    }, 500)

    return () => clearInterval(interval)
  }, [requestStartTime])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-3 mt-5"
      role="status"
      aria-label={loadingMessages[loadingStage]}
    >
      {/* Avatar — pulled into gutter on lg+ to align with input */}
      <div className="lg:-ml-12 w-9 h-9 rounded-full bg-gradient-to-br from-crafted-forest to-crafted-green dark:from-crafted-forest dark:to-crafted-green shadow-md flex items-center justify-center shrink-0">
        <Sparkles className="h-4 w-4 text-crafted-mint animate-pulse" />
      </div>
      <div className="bg-white/60 dark:bg-card/80 backdrop-blur-sm rounded-2xl px-4 py-3 border border-border/30">
        <div className="flex items-center gap-2">
          {/* Progressive message with shimmer effect */}
          <motion.div
            key={loadingStage}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm relative overflow-hidden"
          >
            <span className="text-muted-foreground">{loadingMessages[loadingStage]}</span>
            {/* Shimmer overlay */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent -skew-x-12"
              animate={{ x: ['-100%', '200%'] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
                repeatDelay: 0.5,
              }}
            />
          </motion.div>
          {/* Timer */}
          {elapsedTime > 0 && (
            <span className="text-xs text-muted-foreground/60 tabular-nums">{elapsedTime}s</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Map a briefing stage to the CTA type that should be shown.
 * Returns null when the state machine is inactive or at a stage with no CTA.
 */
function getStageCTA(briefingStage: string | null): 'styleSelection' | 'taskProposal' | null {
  switch (briefingStage) {
    case 'INSPIRATION':
    case 'MOODBOARD':
      return 'styleSelection'
    case 'REVIEW':
    case 'SUBMIT':
      return 'taskProposal'
    default:
      return null
  }
}

// =============================================================================
// PROPS
// =============================================================================

export interface ChatMessageListProps {
  messages: Message[]
  isLoading: boolean
  seamlessTransition: boolean

  // Animation & typing
  animatingMessageId: string | null
  setAnimatingMessageId: (id: string | null) => void
  completedTypingIds: Set<string>
  setCompletedTypingIds: React.Dispatch<React.SetStateAction<Set<string>>>

  // Style selection
  selectedStyles: string[]
  hoveredStyleName: string | null
  setHoveredStyleName: (name: string | null) => void
  lastStyleMessageIndex: number

  // Moodboard
  moodboardStyleIds: string[]
  moodboardItems: MoodboardItem[]

  // Task
  pendingTask: TaskProposal | null
  isTaskMode: boolean
  showManualSubmit: boolean
  userCredits: number
  lastUserMessageIndex: number

  // Refs
  scrollAreaRef: React.RefObject<HTMLDivElement | null>
  requestStartTimeRef: React.MutableRefObject<number | null>

  // Style handlers
  handleStyleSelect: (name: string) => void
  handleSubmitStyles: () => void
  handleAddToCollection: (style: DeliverableStyle) => void
  handleRemoveFromCollection: (id: string) => void
  handleConfirmStyleSelection: (styles: DeliverableStyle[]) => void
  handleShowMoreStyles: (axis: string) => void
  handleShowDifferentStyles: () => void
  handleSubmitDeliverableStyles: (styles: DeliverableStyle[]) => void
  removeMoodboardItem: (id: string) => void
  handleClearStyleCollection: () => void

  // Video handlers
  handleSelectVideo: (video: VideoReferenceStyle) => void

  // Task handlers
  handleOpenSubmissionModal: () => void
  handleRejectTask: () => void
  handleRequestTaskSummary: () => void

  // Strategic review handler
  onStrategicReviewAction?: (response: 'accept' | 'override') => void

  // Briefing stage (used to gate legacy CTAs)
  briefingStage?: string | null

  // Scene click handler for storyboard interactivity
  onSceneClick?: (scene: {
    sceneNumber: number
    title: string
    description: string
    visualNote: string
  }) => void

  // Multi-scene feedback handler
  onMultiSceneFeedback?: (scenes: { sceneNumber: number; title: string }[]) => void

  // View storyboard in panel handler
  onViewStoryboard?: () => void

  // Whether the structure panel is currently visible (suppresses inline structure rendering)
  structurePanelVisible?: boolean

  // Latest live storyboard scenes (for keeping inline summary cards up to date)
  latestStoryboardScenes?: import('@/lib/ai/briefing-state-machine').StoryboardScene[]

  // Inline upload zone
  onInlineUpload?: (files: FileList | File[]) => void
  isUploading?: boolean
  uploadedFiles?: UploadedFile[]
  onRemoveUploadedFile?: (fileUrl: string) => void
  onAddExternalLink?: (file: UploadedFile) => void

  // Error state
  lastSendError?: string | null
  onRetry?: () => void
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ChatMessageList({
  messages,
  isLoading,
  seamlessTransition,
  animatingMessageId,
  setAnimatingMessageId,
  completedTypingIds,
  setCompletedTypingIds,
  selectedStyles,
  hoveredStyleName,
  setHoveredStyleName,
  lastStyleMessageIndex,
  moodboardStyleIds,
  moodboardItems,
  pendingTask,
  isTaskMode,
  showManualSubmit,
  userCredits,
  lastUserMessageIndex,
  scrollAreaRef,
  requestStartTimeRef,
  handleStyleSelect,
  handleSubmitStyles,
  handleAddToCollection,
  handleRemoveFromCollection,
  handleConfirmStyleSelection,
  handleShowMoreStyles,
  handleShowDifferentStyles,
  handleSubmitDeliverableStyles,
  removeMoodboardItem,
  handleClearStyleCollection,
  handleSelectVideo,
  handleOpenSubmissionModal: _handleOpenSubmissionModal,
  handleRejectTask: _handleRejectTask,
  handleRequestTaskSummary,
  onStrategicReviewAction,
  briefingStage,
  onSceneClick: _onSceneClick,
  onMultiSceneFeedback: _onMultiSceneFeedback,
  onViewStoryboard,
  structurePanelVisible = false,
  latestStoryboardScenes,
  onInlineUpload,
  isUploading = false,
  uploadedFiles = [],
  onRemoveUploadedFile,
  onAddExternalLink,
  lastSendError,
  onRetry,
}: ChatMessageListProps) {
  // Screen reader announcement for new messages
  const [announcement, setAnnouncement] = useState('')
  const prevMessageCountRef = useRef(messages.length)

  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      const newMessage = messages[messages.length - 1]
      if (newMessage.role === 'assistant') {
        const truncated =
          newMessage.content.length > 100
            ? newMessage.content.slice(0, 100) + '...'
            : newMessage.content
        setAnnouncement(`New response: ${truncated}`)
      } else {
        setAnnouncement('Message sent')
      }
    }
    prevMessageCountRef.current = messages.length
  }, [messages])

  // Compute the last message ID that has storyboard data (BUG-10:
  // only show the "storyboard is on the canvas" button on the latest such message)
  const lastStoryboardMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].structureData?.type === 'storyboard') return messages[i].id
    }
    return null
  }, [messages])

  // Same for layout messages
  const lastLayoutMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].structureData?.type === 'layout') return messages[i].id
    }
    return null
  }, [messages])

  const handleTypingComplete = useCallback(
    (messageId: string) => {
      if (animatingMessageId === messageId) {
        setAnimatingMessageId(null)
        setCompletedTypingIds((prev) => new Set(prev).add(messageId))
      }
    },
    [animatingMessageId, setAnimatingMessageId, setCompletedTypingIds]
  )

  return (
    <>
      <ScrollArea className="flex-1 min-h-0 relative" ref={scrollAreaRef}>
        {/* Decorative watermark */}
        <div className="chat-watermark" aria-hidden="true" />
        <div
          className="pb-4 px-4 sm:px-8 lg:px-16 max-w-4xl mx-auto relative z-[1]"
          role="log"
          aria-label="Chat messages"
        >
          <AnimatePresence>
            {messages.map((message, index) => {
              // Determine if this is the last assistant message (for CTA gating)
              const isLastAssistant =
                message.role === 'assistant' &&
                (index === messages.length - 1 ||
                  (index === messages.length - 2 &&
                    messages[messages.length - 1]?.role !== 'assistant'))
              const stageCTA = getStageCTA(briefingStage ?? null)

              return (
                <motion.div
                  key={message.id}
                  initial={seamlessTransition && index > 0 ? { opacity: 0, y: 10 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start',
                    index > 0 && messages[index - 1]?.role !== message.role
                      ? 'mt-5'
                      : index > 0
                        ? 'mt-3'
                        : ''
                  )}
                >
                  {message.role === 'assistant' ? (
                    /* Assistant message - left aligned with sparkle avatar */
                    <div className="group max-w-[85%] flex items-start gap-3">
                      {/* Sparkle avatar — pulled into gutter on lg+ to align content with input */}
                      <div className="lg:-ml-12 w-9 h-9 rounded-full bg-gradient-to-br from-crafted-forest to-crafted-green dark:from-crafted-forest dark:to-crafted-green shadow-md flex items-center justify-center shrink-0">
                        <Sparkles className="h-4 w-4 text-crafted-mint" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Thinking time indicator */}
                        {message.thinkingTime && (
                          <div className="inline-flex items-center gap-1.5 mb-2 px-2.5 py-0.5 rounded-full bg-muted/60">
                            <Lightbulb className="h-3.5 w-3.5 text-crafted-sage" />
                            <span className="text-xs text-muted-foreground">
                              Thought for {message.thinkingTime}s
                            </span>
                          </div>
                        )}
                        {/* Message content - clean text without heavy borders */}
                        <div className="bg-white/60 dark:bg-card/80 backdrop-blur-sm rounded-2xl px-5 py-4 border border-border/30">
                          <TypingText
                            content={message.content}
                            animate={animatingMessageId === message.id}
                            speed={25}
                            onComplete={() => handleTypingComplete(message.id)}
                            className="prose prose-sm max-w-none dark:prose-invert [&>p]:mb-4 [&>p:first-child]:font-medium [&_strong]:text-foreground [&_strong]:font-semibold [&>ul]:mb-3 [&>ol]:mb-3 [&>p:last-child]:mb-0 leading-relaxed text-foreground"
                          />

                          {/* Attachments */}
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-3 ml-8">
                              <FileAttachmentList files={message.attachments} />
                            </div>
                          )}

                          {/* Style References - only on last assistant message when stage CTA is styleSelection */}
                          {isLastAssistant &&
                            (!briefingStage || stageCTA === 'styleSelection') &&
                            message.styleReferences &&
                            message.styleReferences.length > 0 &&
                            (animatingMessageId !== message.id ||
                              completedTypingIds.has(message.id)) && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="mt-5 ml-8"
                              >
                                <p className="text-sm font-medium mb-4 text-foreground">
                                  Which style direction resonates with you?
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl">
                                  {message.styleReferences.slice(0, 3).map((style, idx) => {
                                    const isHovered = hoveredStyleName === style.name
                                    const isSelected = selectedStyles.includes(style.name)
                                    return (
                                      <div
                                        key={`${style.name}-${idx}`}
                                        role="button"
                                        tabIndex={0}
                                        aria-pressed={isSelected}
                                        aria-label={`Select ${style.name} style`}
                                        className={cn(
                                          'relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200',
                                          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                                          isHovered && 'scale-110 z-10 shadow-2xl',
                                          isSelected
                                            ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-xl'
                                            : isHovered &&
                                                'ring-2 ring-primary/30 ring-offset-2 ring-offset-background'
                                        )}
                                        onClick={() => handleStyleSelect(style.name)}
                                        onMouseEnter={() => setHoveredStyleName(style.name)}
                                        onMouseLeave={() => setHoveredStyleName(null)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault()
                                            handleStyleSelect(style.name)
                                          }
                                        }}
                                      >
                                        {/* Selection indicator */}
                                        {isSelected && (
                                          <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
                                            <Check className="h-4 w-4 text-primary-foreground" />
                                          </div>
                                        )}

                                        {/* Image */}
                                        <div className="aspect-[4/3] bg-muted overflow-hidden">
                                          {style.imageUrl ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img
                                              src={style.imageUrl}
                                              alt={style.name}
                                              className="w-full h-full object-cover"
                                            />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                              <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                          )}
                                        </div>

                                        {/* Hover overlay with name - only visible on THIS card */}
                                        {(isHovered || isSelected) && (
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent transition-opacity duration-200">
                                            <div className="absolute bottom-0 left-0 right-0 p-3">
                                              <p className="text-white text-sm font-semibold">
                                                {style.name}
                                              </p>
                                              {style.description && (
                                                <p className="text-white/80 text-xs line-clamp-2 mt-1">
                                                  {style.description}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                                <div className="flex items-center justify-between mt-3">
                                  <p className="text-xs text-muted-foreground ml-1">
                                    Click to select · You can pick multiple or describe something
                                    else
                                  </p>
                                  {selectedStyles.length > 0 && (
                                    <Button
                                      onClick={handleSubmitStyles}
                                      disabled={isLoading}
                                      size="sm"
                                      className="gap-2"
                                    >
                                      Continue with{' '}
                                      {selectedStyles.length === 1
                                        ? 'style'
                                        : `${selectedStyles.length} styles`}
                                      <ArrowRight className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </motion.div>
                            )}

                          {/* Deliverable Style References - only on last assistant message when stage CTA is styleSelection.
                              Hidden when video references are present (they already serve as the visual direction picker). */}
                          {isLastAssistant &&
                            (!briefingStage || stageCTA === 'styleSelection') &&
                            message.deliverableStyles &&
                            message.deliverableStyles.length > 0 &&
                            !(message.videoReferences && message.videoReferences.length > 0) &&
                            (animatingMessageId !== message.id ||
                              completedTypingIds.has(message.id)) && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="mt-5 ml-8"
                              >
                                {/* Only show full grid for the most recent message with styles */}
                                {index === lastStyleMessageIndex ? (
                                  <div className="space-y-4">
                                    <StyleSelectionGrid
                                      styles={message.deliverableStyles}
                                      collectionStyleIds={moodboardStyleIds}
                                      onAddToCollection={handleAddToCollection}
                                      onRemoveFromCollection={handleRemoveFromCollection}
                                      onConfirmSelection={handleConfirmStyleSelection}
                                      onShowMore={handleShowMoreStyles}
                                      onShowDifferent={handleShowDifferentStyles}
                                      isLoading={isLoading || index < messages.length - 1}
                                    />
                                    {/* Inline collection - shows collected styles (hidden when using new flow) */}
                                    {false && moodboardStyleIds.length > 0 && (
                                      <InlineCollection
                                        items={moodboardItems.filter((i) => i.type === 'style')}
                                        onRemoveItem={removeMoodboardItem}
                                        onClearAll={handleClearStyleCollection}
                                        onContinue={() =>
                                          handleSubmitDeliverableStyles(
                                            message.deliverableStyles || []
                                          )
                                        }
                                        isLoading={isLoading || index < messages.length - 1}
                                      />
                                    )}
                                  </div>
                                ) : (
                                  /* Collapsed summary for older style messages */
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Palette className="h-4 w-4" />
                                    <span>
                                      {Math.min(3, message.deliverableStyles.length)} style options
                                      shown
                                    </span>
                                    {moodboardStyleIds.length > 0 && (
                                      <span className="text-primary">
                                        •{' '}
                                        {
                                          moodboardStyleIds.filter((id) =>
                                            message.deliverableStyles?.some((s) => s.id === id)
                                          ).length
                                        }{' '}
                                        in collection
                                      </span>
                                    )}
                                  </div>
                                )}
                              </motion.div>
                            )}

                          {/* Video References - only on last assistant message when stage CTA is styleSelection */}
                          {isLastAssistant &&
                            (!briefingStage || stageCTA === 'styleSelection') &&
                            message.videoReferences &&
                            message.videoReferences.length > 0 &&
                            (animatingMessageId !== message.id ||
                              completedTypingIds.has(message.id)) && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.2 }}
                                className="mt-5"
                              >
                                <VideoReferenceGrid
                                  videos={message.videoReferences}
                                  onSelectVideo={handleSelectVideo}
                                  onShowMore={() => handleShowMoreStyles('video')}
                                  onShowDifferent={handleShowDifferentStyles}
                                  isLoading={isLoading}
                                  title="Video Style References"
                                />
                              </motion.div>
                            )}

                          {/* Structure components - show after typing completes */}
                          {message.structureData &&
                            (animatingMessageId !== message.id ||
                              completedTypingIds.has(message.id)) && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="mt-4"
                              >
                                {message.structureData.type === 'storyboard' &&
                                  !structurePanelVisible && (
                                    <StoryboardSummaryCard
                                      scenes={
                                        latestStoryboardScenes ?? message.structureData.scenes
                                      }
                                      onViewStoryboard={onViewStoryboard}
                                    />
                                  )}
                                {message.structureData.type === 'storyboard' &&
                                  structurePanelVisible &&
                                  message.id === lastStoryboardMessageId && (
                                    <button
                                      type="button"
                                      onClick={onViewStoryboard}
                                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/40 bg-muted/30 hover:bg-muted/50 transition-colors text-sm text-muted-foreground hover:text-foreground group"
                                    >
                                      <Film className="h-4 w-4 text-crafted-green" />
                                      <span>Your storyboard is on the canvas</span>
                                      <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                  )}
                                {message.structureData.type === 'layout' &&
                                  !structurePanelVisible && (
                                    <LayoutPreview sections={message.structureData.sections} />
                                  )}
                                {message.structureData.type === 'layout' &&
                                  structurePanelVisible &&
                                  message.id === lastLayoutMessageId && (
                                    <button
                                      type="button"
                                      onClick={onViewStoryboard}
                                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/40 bg-muted/30 hover:bg-muted/50 transition-colors text-sm text-muted-foreground hover:text-foreground group"
                                    >
                                      <Palette className="h-4 w-4 text-crafted-green" />
                                      <span>Your page layout is on the canvas</span>
                                      <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                  )}
                                {message.structureData.type === 'calendar' &&
                                  !structurePanelVisible && (
                                    <ContentCalendar outline={message.structureData.outline} />
                                  )}
                                {message.structureData.type === 'single_design' &&
                                  !structurePanelVisible && (
                                    <DesignSpecView
                                      specification={message.structureData.specification}
                                    />
                                  )}
                              </motion.div>
                            )}

                          {/* Strategic Review card */}
                          {message.strategicReviewData &&
                            (animatingMessageId !== message.id ||
                              completedTypingIds.has(message.id)) && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="mt-4"
                              >
                                <StrategicReviewCard
                                  review={message.strategicReviewData}
                                  onAction={onStrategicReviewAction || (() => {})}
                                />
                              </motion.div>
                            )}

                          {/* Inline Upload Zone */}
                          {message.assetRequest &&
                            isLastAssistant &&
                            onInlineUpload &&
                            onRemoveUploadedFile &&
                            onAddExternalLink &&
                            (animatingMessageId !== message.id ||
                              completedTypingIds.has(message.id)) && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="mt-4"
                              >
                                <InlineUploadZone
                                  assetRequest={message.assetRequest}
                                  onUpload={onInlineUpload}
                                  isUploading={isUploading}
                                  uploadedFiles={uploadedFiles}
                                  onRemoveFile={onRemoveUploadedFile}
                                  onAddExternalLink={onAddExternalLink}
                                />
                              </motion.div>
                            )}

                          {/* Task Proposal - read-only card when submit bar handles actions */}
                          {isLastAssistant &&
                            (!briefingStage || stageCTA === 'taskProposal') &&
                            message.taskProposal && (
                              <div className="mt-4 ml-8">
                                <TaskProposalCard
                                  proposal={message.taskProposal}
                                  showActions={false}
                                  userCredits={userCredits}
                                />
                              </div>
                            )}

                          {/* Quick Options removed - using input field suggestions instead */}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* User message - beige/cream bubble with edit icon and avatar */
                    <div className="max-w-[75%] group">
                      <div className="flex flex-col items-end">
                        {/* Selected style image - shows above the text when style was selected */}
                        {message.selectedStyle && message.selectedStyle.imageUrl && (
                          <div className="mb-2 rounded-xl overflow-hidden max-w-[200px] border-2 border-crafted-sage dark:border-crafted-green/50 shadow-sm">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={message.selectedStyle.imageUrl}
                              alt={message.selectedStyle.name}
                              className="w-full h-auto object-cover"
                              onError={(e) => {
                                // Hide image if it fails to load
                                ;(e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          </div>
                        )}
                        <div className="bg-crafted-mint/10 dark:bg-crafted-green/15 rounded-2xl px-5 py-3.5 relative border border-crafted-sage/25 dark:border-crafted-green/20 w-fit">
                          {(() => {
                            const { scenes, text } = parseSceneFeedback(message.content)
                            return (
                              <>
                                {scenes.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mb-2">
                                    {scenes.map((s) => (
                                      <span
                                        key={s.sceneNumber}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-crafted-mint/20 dark:bg-crafted-green/20 text-xs font-medium text-crafted-forest dark:text-crafted-mint"
                                      >
                                        <Film className="h-3 w-3" />
                                        Scene {s.sceneNumber}: {s.title}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <p className="text-sm text-foreground whitespace-pre-wrap">
                                  {text}
                                </p>
                              </>
                            )
                          })()}
                        </div>
                        {/* User attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2">
                            <FileAttachmentList files={message.attachments} />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Enhanced loading indicator with progressive messages */}
          {/* eslint-disable react-hooks/refs */}
          {isLoading && (
            <LoadingIndicator
              requestStartTime={requestStartTimeRef.current}
              briefingStage={briefingStage}
            />
          )}
          {/* eslint-enable react-hooks/refs */}

          {/* Inline error banner for failed sends */}
          {lastSendError && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              role="alert"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-destructive/30 bg-destructive/5"
            >
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <span className="text-sm text-destructive flex-1">{lastSendError}</span>
              {onRetry && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRetry}
                  className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Retry
                </Button>
              )}
            </motion.div>
          )}

          {/* Inline submit prompt - shown as an AI message when ready to submit */}
          {/* Hidden when state machine is active (briefingStage is set) */}
          {!isLoading &&
            !pendingTask &&
            !isTaskMode &&
            !briefingStage &&
            (() => {
              // Check if the last assistant message asked a question (ends with ?)
              const lastAssistantMsg = messages.filter((m) => m.role === 'assistant').pop()
              const lastMsg = messages[messages.length - 1]
              const aiJustAskedQuestion =
                lastMsg?.role === 'assistant' && lastAssistantMsg?.content?.trim().endsWith('?')

              // Don't show submit prompt if AI just asked a question
              if (aiJustAskedQuestion) return null

              // Don't show immediately after a style selection
              const lastUserMessage = messages.filter((m) => m.role === 'user').slice(-1)[0]
              const lastUserWasStyleSelection =
                lastUserMessage?.content?.includes('style selected') ||
                lastUserMessage?.content?.includes('Style selected') ||
                lastUserMessage?.selectedStyle != null

              // Show when AI indicates ready or user has enough context
              // BUT not right after a style selection (let user respond first)
              const shouldShow =
                showManualSubmit ||
                (moodboardItems.length > 0 &&
                  messages.filter((m) => m.role === 'user').length >= 3 &&
                  !lastUserWasStyleSelection)

              if (!shouldShow) return null

              // Render as a subtle inline CTA, not a fake AI message
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex justify-center"
                >
                  <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-muted/60 border border-border/50 backdrop-blur-sm">
                    <Button
                      onClick={handleRequestTaskSummary}
                      disabled={isLoading}
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-crafted-green hover:text-crafted-green-light hover:bg-crafted-mint/10 dark:hover:bg-crafted-green/15 font-medium"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Generate Summary
                    </Button>
                    <span className="text-xs text-muted-foreground">or keep chatting</span>
                  </div>
                </motion.div>
              )
            })()}
        </div>
      </ScrollArea>
      {/* Screen reader announcement for new messages */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </>
  )
}
