'use client'

import { useState, useEffect } from 'react'
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
  Pencil,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TypingText } from './typing-text'
import { FileAttachmentList } from './file-attachment'
import { VideoReferenceGrid, type VideoReferenceStyle } from './video-reference-grid'
import { StyleSelectionGrid } from './style-selection-grid'
import { InlineCollection } from './inline-collection'
import { TaskProposalCard } from './task-proposal-card'
import { StoryboardView } from './storyboard-view'
import { LayoutPreview } from './layout-preview'
import { DesignSpecView } from './design-spec-view'
import { ContentCalendar } from './brief-panel/content-calendar'
import { StrategicReviewCard } from './strategic-review-card'
import type { ChatMessage as Message, DeliverableStyle, MoodboardItem, TaskProposal } from './types'

// =============================================================================
// LOADING INDICATOR
// =============================================================================

function LoadingIndicator({ requestStartTime }: { requestStartTime: number | null }) {
  const [loadingStage, setLoadingStage] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)

  const loadingMessages = [
    'Reading between the lines...',
    'Mapping out your moodboard...',
    'Curating the perfect visuals...',
    'Polishing the final touches...',
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      if (requestStartTime) {
        const elapsed = Math.floor((Date.now() - requestStartTime) / 1000)
        setElapsedTime(elapsed)

        // Progress through stages based on time
        if (elapsed >= 8) setLoadingStage(3)
        else if (elapsed >= 5) setLoadingStage(2)
        else if (elapsed >= 2) setLoadingStage(1)
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
      className="flex items-start gap-3"
    >
      {/* Minimal avatar - just a green circle */}
      <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-white/30"
        />
        <div className="w-2.5 h-2.5 rounded-full bg-white" />
      </div>
      <div className="bg-white/60 dark:bg-card/80 backdrop-blur-sm rounded-2xl px-4 py-3 border border-border/50">
        <div className="flex items-center gap-3">
          {/* Animated dots */}
          <div className="flex gap-1">
            <span
              className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
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

  // Edit handlers
  handleEditLastMessage: () => void

  // Briefing stage (used to gate legacy CTAs)
  briefingStage?: string | null
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
  handleEditLastMessage,
  briefingStage,
}: ChatMessageListProps) {
  return (
    <ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
      <div className="space-y-4 pb-4 px-4 sm:px-8 lg:px-16 max-w-4xl mx-auto">
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
                className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {message.role === 'assistant' ? (
                  /* Assistant message - left aligned with sparkle avatar */
                  <div className="group max-w-[85%] flex items-start gap-3">
                    {/* Sparkle avatar */}
                    <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Thinking time indicator */}
                      {message.thinkingTime && (
                        <div className="flex items-center gap-1.5 mb-2 text-muted-foreground">
                          <Lightbulb className="h-3.5 w-3.5" />
                          <span className="text-xs">Thought for {message.thinkingTime}s</span>
                        </div>
                      )}
                      {/* Message content - clean text without heavy borders */}
                      <div className="bg-white/60 dark:bg-card/80 backdrop-blur-sm rounded-2xl px-4 py-3 border border-border/50">
                        <TypingText
                          content={message.content}
                          animate={animatingMessageId === message.id}
                          speed={25}
                          onComplete={() => {
                            if (animatingMessageId === message.id) {
                              setAnimatingMessageId(null)
                              setCompletedTypingIds((prev) => new Set(prev).add(message.id))
                            }
                          }}
                          className="prose prose-sm max-w-none dark:prose-invert [&>p]:mb-3 [&>ul]:mb-3 [&>ol]:mb-3 [&>p:last-child]:mb-0 text-foreground"
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
                                  Click to select · You can pick multiple or describe something else
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

                        {/* Deliverable Style References - only on last assistant message when stage CTA is styleSelection */}
                        {isLastAssistant &&
                          (!briefingStage || stageCTA === 'styleSelection') &&
                          message.deliverableStyles &&
                          message.deliverableStyles.length > 0 &&
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
                              className="mt-5 ml-8"
                            >
                              <VideoReferenceGrid
                                videos={message.videoReferences}
                                onSelectVideo={handleSelectVideo}
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
                              {message.structureData.type === 'storyboard' && (
                                <StoryboardView scenes={message.structureData.scenes} />
                              )}
                              {message.structureData.type === 'layout' && (
                                <LayoutPreview sections={message.structureData.sections} />
                              )}
                              {message.structureData.type === 'calendar' && (
                                <ContentCalendar outline={message.structureData.outline} />
                              )}
                              {message.structureData.type === 'single_design' && (
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
                                onAction={() => {}}
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
                        <div className="mb-2 rounded-xl overflow-hidden max-w-[200px] border-2 border-emerald-300 dark:border-emerald-700 shadow-sm">
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
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl px-4 py-3 relative border border-emerald-200/50 dark:border-emerald-800/30 w-fit">
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {message.content}
                        </p>
                        {/* Edit icon - appears on hover for last message */}
                        {index === lastUserMessageIndex &&
                          !isLoading &&
                          !isTaskMode &&
                          !pendingTask && (
                            <button
                              onClick={handleEditLastMessage}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-emerald-200/50 dark:hover:bg-emerald-800/30 hover:text-foreground transition-all"
                              title="Edit this message"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
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
        {/* eslint-disable-next-line react-hooks/refs */}
        {isLoading && <LoadingIndicator requestStartTime={requestStartTimeRef.current} />}

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
                    className="gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-medium"
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
  )
}
