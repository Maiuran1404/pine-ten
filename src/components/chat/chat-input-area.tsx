'use client'

import React, { memo, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/loading'
import {
  Image as ImageIcon,
  Paperclip,
  FileIcon,
  XCircle,
  X,
  Film,
  Share2,
  Megaphone,
  Bookmark,
  LayoutGrid,
  Link2,
  Palette,
  RotateCcw,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TaskProposal, MoodboardItem, QuickOptions as QuickOptionsType } from './types'
import type { PendingFile } from '@/hooks/use-file-upload'
import { QuickOptions } from './quick-options'
import { SubmitActionBar } from './submit-action-bar'
import type { LiveBrief } from './brief-panel/types'
import { useKeywordTagging } from '@/hooks/use-keyword-tagging'
import type { DeliverableCategory } from '@/lib/ai/briefing-state-machine'

// =============================================================================
// CATEGORY VISUALS (icon + color mapping per deliverable category)
// =============================================================================

const CATEGORY_ICON: Record<string, typeof Film> = {
  video: Film,
  website: LayoutGrid,
  content: Share2,
  design: Palette,
  brand: Bookmark,
}

const CATEGORY_ICON_BG: Record<string, string> = {
  video: 'bg-crafted-green/15',
  website: 'bg-crafted-sage/15',
  content: 'bg-crafted-mint/20',
  design: 'bg-crafted-green/15',
  brand: 'bg-crafted-sage/15',
}

const CATEGORY_SUBTITLE: Record<string, string> = {
  video: 'Motion & Film',
  website: 'Web Design',
  content: 'Social & Content',
  design: 'Graphic Design',
  brand: 'Brand Identity',
}

// =============================================================================
// PROPS
// =============================================================================

export interface ChatInputAreaProps {
  messageCount: number
  hasInlineStylePicker: boolean
  input: string
  setInput: (value: string) => void
  isLoading: boolean
  pendingFiles: PendingFile[]
  hasFiles: boolean
  pendingTask: TaskProposal | null
  isTaskMode: boolean
  seamlessTransition: boolean

  // Suggestions
  ghostText: string
  smartCompletion: string | null
  setSmartCompletion: (value: string | null) => void

  // Refs
  fileInputRef: React.RefObject<HTMLInputElement | null>
  inputRef: React.RefObject<HTMLTextAreaElement | null>

  // Credits
  userCredits: number

  // Briefing stage (used to gate certain buttons)
  briefingStage?: string | null

  // State machine quick options (rendered as chips when enabled)
  stateMachineQuickOptions?: QuickOptionsType | null
  onQuickOptionClick?: (option: string) => void

  // Moodboard (for submit action bar)
  moodboardItems?: MoodboardItem[]

  // Submit action bar handlers
  onConfirmTask?: () => Promise<void>
  onMakeChanges?: () => void
  onInsufficientCredits?: () => void
  isSubmitting?: boolean
  brief?: LiveBrief | null

  // When true, a strategic review card with its own CTA is showing — hide quick option chips
  hasStrategicReviewCTA?: boolean

  // Typing animation state — when set, quick options are hidden until animation completes
  animatingMessageId?: string | null

  // Scene references
  sceneReferences?: { sceneNumber: number; title: string }[]
  onRemoveSceneReference?: (sceneNumber: number) => void

  // Deliverable category (for type detection badge)
  deliverableCategory?: string | null

  // Estimated credit cost for current project type
  estimatedCredits?: number | null

  // Last draft save timestamp
  lastSavedAt?: Date | null

  // Whether a storyboard exists (for video submission guard)
  hasStoryboard?: boolean

  // Auto-continue confirmation (crash recovery) — rendered above input, outside scroll area
  needsAutoContinueConfirmation?: boolean
  onConfirmAutoContinue?: () => void
  onDismissAutoContinue?: () => void

  // Keyword tagging auto-classification callback
  onCategoryDetected?: (category: DeliverableCategory) => void

  // Handlers
  handleSend: () => void
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleRequestTaskSummary?: () => void
  removeFile: (idOrUrl: string) => void
}

// =============================================================================
// COMPONENT
// =============================================================================

// Stages too early for estimated credit display — only hide during initial extraction
const EARLY_STAGES = new Set(['EXTRACT'])

// Extracted into its own component to isolate re-renders from the input area
function WordCountRing({ input }: { input: string }) {
  const { pct, circumference, offset, color, tooltip } = useMemo(() => {
    const wordCount = input.trim().split(/\s+/).filter(Boolean).length
    const greatPromptWords = 20
    const specificityPatterns =
      /instagram|tiktok|youtube|linkedin|facebook|audience|brand|style|color|#[0-9a-f]/gi
    const specificityBonus = (input.match(specificityPatterns) || []).length * 2
    const rawScore = Math.min(wordCount + specificityBonus, greatPromptWords)
    const pctVal = Math.min((rawScore / greatPromptWords) * 100, 100)
    const r = 10
    const circ = 2 * Math.PI * r
    return {
      pct: pctVal,
      circumference: circ,
      offset: circ - (pctVal / 100) * circ,
      color:
        pctVal >= 100 ? 'text-crafted-green' : pctVal >= 50 ? 'text-ds-warning' : 'text-ds-error',
      tooltip:
        pctVal >= 100 ? 'Great detail!' : 'Add details like target audience or style preference',
    }
  }, [input])

  return (
    <div className="flex items-center gap-1.5" title={tooltip}>
      <svg width="20" height="20" viewBox="0 0 24 24" className={color}>
        <circle
          cx="12"
          cy="12"
          r={10}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          opacity={0.15}
        />
        <circle
          cx="12"
          cy="12"
          r={10}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 12 12)"
          className="transition-all duration-300"
        />
        {pct >= 100 && (
          <path
            d="M8 12.5l2.5 2.5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
      {pct < 100 && <span className={cn('text-[10px]', color)}>{Math.round(pct)}%</span>}
    </div>
  )
}

export const ChatInputArea = memo(function ChatInputArea({
  messageCount,
  hasInlineStylePicker,
  input,
  setInput,
  isLoading,
  pendingFiles,
  hasFiles,
  pendingTask,
  isTaskMode: _isTaskMode,
  seamlessTransition: _seamlessTransition,
  ghostText,
  smartCompletion,
  setSmartCompletion,
  fileInputRef,
  inputRef,
  userCredits,
  briefingStage,
  moodboardItems = [],
  onConfirmTask,
  onMakeChanges,
  onInsufficientCredits,
  isSubmitting = false,
  brief,
  stateMachineQuickOptions,
  onQuickOptionClick,
  hasStrategicReviewCTA = false,
  animatingMessageId: _animatingMessageId = null,
  sceneReferences = [],
  onRemoveSceneReference,
  deliverableCategory,
  estimatedCredits,
  lastSavedAt,
  hasStoryboard: _hasStoryboard = true,
  needsAutoContinueConfirmation,
  onConfirmAutoContinue,
  onDismissAutoContinue,
  onCategoryDetected,
  handleSend,
  handleFileUpload,
  handleRequestTaskSummary: _handleRequestTaskSummary,
  removeFile,
}: ChatInputAreaProps) {
  // Keyword tagging — detects deliverable keywords inline
  const { detectedTags, primaryCategory } = useKeywordTagging(input)

  // Fire category detection callback in useEffect to avoid setState-during-render
  const lastDetectedCategoryRef = useRef<DeliverableCategory | null>(null)
  const onCategoryDetectedRef = useRef(onCategoryDetected)

  useEffect(() => {
    onCategoryDetectedRef.current = onCategoryDetected
  }, [onCategoryDetected])

  useEffect(() => {
    if (primaryCategory && primaryCategory !== lastDetectedCategoryRef.current) {
      lastDetectedCategoryRef.current = primaryCategory
      onCategoryDetectedRef.current?.(primaryCategory)
    }
  }, [primaryCategory])

  // When a pending task exists, render the submit action bar instead of the input
  if (pendingTask && onConfirmTask && onMakeChanges && onInsufficientCredits) {
    return (
      <SubmitActionBar
        taskProposal={pendingTask}
        moodboardItems={moodboardItems}
        userCredits={userCredits}
        isSubmitting={isSubmitting}
        brief={brief}
        onConfirm={onConfirmTask}
        onMakeChanges={onMakeChanges}
        onInsufficientCredits={onInsufficientCredits}
      />
    )
  }

  return (
    <div className="shrink-0 mt-auto pt-4 pb-6 px-4 sm:px-8 lg:px-16 max-w-4xl mx-auto w-full">
      {/* Resume banner for crash recovery — outside scroll container for reliable click handling */}
      <AnimatePresence mode="popLayout">
        {needsAutoContinueConfirmation && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3 px-4 py-3 mb-3 rounded-2xl border border-border/40 bg-muted/30"
          >
            <RotateCcw className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground flex-1">Pick up where you left off?</span>
            <div className="flex gap-2 shrink-0">
              {onDismissAutoContinue && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismissAutoContinue}
                  className="text-muted-foreground"
                >
                  Dismiss
                </Button>
              )}
              {onConfirmAutoContinue && (
                <Button size="sm" onClick={onConfirmAutoContinue} className="gap-1.5">
                  <ArrowRight className="h-3.5 w-3.5" />
                  Resume
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* State machine quick option chips + "I'm ready to submit" grouped */}
      <AnimatePresence mode="popLayout">
        {stateMachineQuickOptions &&
          stateMachineQuickOptions.options.length > 0 &&
          onQuickOptionClick &&
          !isLoading &&
          !input.trim() &&
          !hasStrategicReviewCTA &&
          sceneReferences.length === 0 &&
          !hasInlineStylePicker && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="mb-2"
            >
              {stateMachineQuickOptions.question && (
                <p className="text-xs text-muted-foreground mb-2">
                  {stateMachineQuickOptions.question}
                </p>
              )}
              <QuickOptions
                options={stateMachineQuickOptions}
                onSelect={onQuickOptionClick}
                disabled={isLoading}
                showSkip={false}
              />
            </motion.div>
          )}
      </AnimatePresence>

      {/* Scene reference chips */}
      {sceneReferences.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {sceneReferences.map((ref) => (
            <div
              key={ref.sceneNumber}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-crafted-mint/10 dark:bg-crafted-green/15 border border-crafted-sage/25 dark:border-crafted-green/20 text-sm"
            >
              <Film className="h-3.5 w-3.5 text-crafted-green dark:text-crafted-mint shrink-0" />
              <span className="text-crafted-forest dark:text-crafted-mint font-medium">
                {/^Scene\s+\d+$/i.test(ref.title)
                  ? `Scene ${ref.sceneNumber}`
                  : `Scene ${ref.sceneNumber}: ${ref.title}`}
              </span>
              {onRemoveSceneReference && (
                <button
                  type="button"
                  onClick={() => onRemoveSceneReference(ref.sceneNumber)}
                  className="ml-1 text-crafted-sage hover:text-crafted-green dark:text-crafted-sage dark:hover:text-crafted-mint transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* File preview chips (optimistic — shown instantly before upload completes) */}
      {pendingFiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {pendingFiles.map((pf) => {
            const previewUrl = pf.result?.fileUrl ?? pf.localPreviewUrl
            const isImage = pf.fileType?.startsWith('image/')
            return (
              <div
                key={pf.id}
                className={cn(
                  'relative group flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border',
                  pf.status === 'error' ? 'border-destructive/50' : 'border-border'
                )}
              >
                {/* Thumbnail / icon */}
                <div className="relative">
                  {pf.result?.isExternalLink ? (
                    <Link2 className="h-5 w-5 text-muted-foreground" />
                  ) : isImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={previewUrl}
                      alt={pf.fileName || 'Uploaded file'}
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <FileIcon className="h-5 w-5 text-muted-foreground" />
                  )}
                  {/* Per-file upload spinner overlay */}
                  {pf.status === 'uploading' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded">
                      <LoadingSpinner size="sm" />
                    </div>
                  )}
                </div>
                <span className="text-sm max-w-[100px] truncate text-foreground">
                  {pf.fileName || 'File'}
                </span>
                {pf.status === 'error' && (
                  <span className="text-[10px] text-destructive">Failed</span>
                )}
                <button
                  onClick={() => removeFile(pf.id)}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Modern input box - matching design reference */}
      <div className="border border-border rounded-2xl bg-white/90 dark:bg-card/90 backdrop-blur-sm shadow-sm focus-within:ring-2 focus-within:ring-ring/50">
        {/* Input field with auto-resize and ghost text */}
        <div className="relative">
          {/* Ghost text suggestion overlay — mirrors textarea rendering exactly */}
          {ghostText && (
            <div
              className="absolute inset-0 px-4 py-4 pointer-events-none overflow-hidden"
              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            >
              <span className="text-sm text-transparent" style={{ whiteSpace: 'pre-wrap' }}>
                {input}
              </span>
              <span className="text-sm text-muted-foreground/40">{ghostText}</span>
            </div>
          )}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              // Auto-resize textarea
              const target = e.target
              target.style.height = 'auto'
              target.style.height = Math.min(target.scrollHeight, 200) + 'px'
            }}
            onKeyDown={(e) => {
              // Tab to accept smart completion suggestion
              if (e.key === 'Tab' && ghostText && smartCompletion) {
                e.preventDefault()
                setInput(input.trim() + ' ' + smartCompletion)
                setSmartCompletion(null)
              }
              // Escape to clear smart completion
              else if (e.key === 'Escape' && smartCompletion) {
                setSmartCompletion(null)
              }
              // Submit on Enter (without shift) or Cmd/Ctrl+Enter — guard against sending during streaming
              else if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                e.preventDefault()
                handleSend()
              } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isLoading) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={
              ghostText
                ? '' // Hide placeholder when showing ghost text
                : messageCount === 0
                  ? 'Describe what you want to craft...'
                  : 'Type your message...'
            }
            rows={1}
            className="w-full bg-transparent px-4 py-4 text-foreground placeholder:text-muted-foreground outline-none text-sm resize-none min-h-[52px] max-h-[200px] transition-all relative z-10"
            style={{ height: 'auto', overflow: 'hidden' }}
          />
          {/* Tab hint */}
          {ghostText && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-3 text-xs z-0 pointer-events-none">
              <div className="flex items-center gap-1.5 text-muted-foreground/60">
                <kbd className="px-2 py-0.5 rounded bg-muted/60 border border-border/60 text-[11px] font-medium shadow-sm">
                  Tab
                </kbd>
                <span className="text-[11px]">insert suggestion</span>
              </div>
            </div>
          )}
        </div>

        {/* Detected keyword entity cards — Perplexity-style */}
        <AnimatePresence mode="popLayout">
          {detectedTags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="px-4 pb-2"
            >
              <div className="flex flex-wrap gap-2">
                {detectedTags.map((tag) => {
                  const Icon = CATEGORY_ICON[tag.category] ?? Film
                  return (
                    <div
                      key={tag.label}
                      className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-xl bg-muted/60 border border-border/50"
                    >
                      <div
                        className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                          CATEGORY_ICON_BG[tag.category] ?? CATEGORY_ICON_BG.content
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 text-crafted-forest dark:text-crafted-mint" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground leading-tight truncate">
                          {tag.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          {CATEGORY_SUBTITLE[tag.category] ?? tag.category}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/50 bg-muted/20 rounded-b-2xl">
          {/* Left: Attach + Credits */}
          <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                multiple
                accept="image/*,video/*,.pdf,.zip,.rar,.pptx,.ppt,.doc,.docx,.ai,.eps,.psd"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                title="Attach files"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                title="Add image"
              >
                <ImageIcon className="h-4 w-4" />
              </button>
            </div>
            {/* Divider */}
            <div className="h-4 w-px bg-border/50 shrink-0" />
            {/* Credits — compact, left-aligned (hidden on very narrow viewports to avoid overflow) */}
            <div
              className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground/60"
              title="Credits are used when you submit a brief to a designer, not during chat."
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  userCredits === 0
                    ? 'bg-ds-error'
                    : userCredits < 15
                      ? 'bg-ds-warning'
                      : 'bg-ds-success'
                )}
              />
              <span>{userCredits} credits</span>
              {estimatedCredits && !EARLY_STAGES.has(briefingStage ?? '') && (
                <>
                  <span className="text-muted-foreground/30">&middot;</span>
                  <span>~{estimatedCredits} est.</span>
                </>
              )}
            </div>
            {/* Deliverable type badge */}
            {deliverableCategory &&
              !EARLY_STAGES.has(briefingStage ?? '') &&
              briefingStage !== 'STRUCTURE' && (
                <div
                  className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground/50"
                  title={`We detected this is a ${deliverableCategory} project \u2014 the brief is tailored accordingly`}
                >
                  {deliverableCategory === 'video' ? (
                    <Film className="h-2.5 w-2.5" />
                  ) : deliverableCategory === 'website' ? (
                    <LayoutGrid className="h-2.5 w-2.5" />
                  ) : deliverableCategory === 'design' || deliverableCategory === 'brand' ? (
                    <Palette className="h-2.5 w-2.5" />
                  ) : (
                    <Film className="h-2.5 w-2.5" />
                  )}
                  <span className="capitalize">{deliverableCategory}</span>
                </div>
              )}
            {/* Draft saved — very subtle */}
            {lastSavedAt && (
              <span className="text-[10px] leading-none text-muted-foreground/35 self-center">
                Saved
              </span>
            )}
          </div>

          {/* Right: Word count + CTA */}
          <div className="flex items-center gap-3 shrink-0 ml-3">
            {/* Word count ring — only while typing */}
            {input.trim().length > 0 && <WordCountRing input={input} />}
            <Button
              onClick={handleSend}
              disabled={isLoading || (!input.trim() && !hasFiles)}
              className="h-9 px-5 bg-crafted-green hover:bg-crafted-green-light text-white rounded-full gap-2"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-1.5">Thinking...</span>
                </>
              ) : (
                <>
                  Craft it
                  <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-medium leading-none">
                    ↵
                  </kbd>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced empty state with quick start suggestions */}
      {messageCount === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-4 space-y-4"
        >
          {/* Popular requests - clickable cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              {
                label: 'Instagram Carousel',
                prompt: 'Create a 5-slide Instagram carousel about ',
                icon: LayoutGrid,
                hint: '5 slides',
              },
              {
                label: 'Story Series',
                prompt: 'Design Instagram stories to promote ',
                icon: Share2,
                hint: '3-5 stories',
              },
              {
                label: 'LinkedIn Post',
                prompt: 'Create a professional LinkedIn post announcing ',
                icon: Bookmark,
                hint: '1 image',
              },
              {
                label: 'Ad Campaign',
                prompt: 'Design ads for a campaign promoting ',
                icon: Megaphone,
                hint: 'multi-size',
              },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setInput(item.prompt)
                  inputRef.current?.focus()
                }}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-xl border transition-all text-left group',
                  'bg-white/60 dark:bg-card/60 backdrop-blur-sm',
                  'hover:border-crafted-sage/50 hover:bg-white dark:hover:bg-card hover:shadow-md',
                  'border-border/50'
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-crafted-green/10 flex items-center justify-center shrink-0 group-hover:bg-crafted-green/20 transition-colors">
                  <item.icon className="h-4 w-4 text-crafted-green dark:text-crafted-mint" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.hint}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Keyboard hint */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">
              {typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent) ? '⌘' : 'Ctrl'}
            </kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">
              Enter
            </kbd>
            <span className="ml-1">to send</span>
          </div>
        </motion.div>
      )}
    </div>
  )
})
