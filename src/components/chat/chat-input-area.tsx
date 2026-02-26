'use client'

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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  ChatMessage as Message,
  TaskProposal,
  MoodboardItem,
  QuickOptions as QuickOptionsType,
} from './types'
import type { PendingFile } from '@/hooks/use-file-upload'
import { QuickOptions } from './quick-options'
import { SubmitActionBar } from './submit-action-bar'
import type { LiveBrief } from './brief-panel/types'

// =============================================================================
// PROPS
// =============================================================================

export interface ChatInputAreaProps {
  messages: Message[]
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

  // Handlers
  handleSend: () => void
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleRequestTaskSummary: () => void
  removeFile: (idOrUrl: string) => void
}

// =============================================================================
// COMPONENT
// =============================================================================

// Stages too early for "I'm ready to submit" — not enough brief info yet
const EARLY_STAGES = new Set(['EXTRACT', 'TASK_TYPE', 'INTENT', 'INSPIRATION'])

export function ChatInputArea({
  messages,
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
  handleSend,
  handleFileUpload,
  handleRequestTaskSummary: _handleRequestTaskSummary,
  removeFile,
}: ChatInputAreaProps) {
  // Hide quick options when the last assistant message already shows inline style/video references
  const lastAssistant = messages.findLast((m) => m.role === 'assistant')
  const hasInlineStylePicker =
    !!lastAssistant?.videoReferences?.length || !!lastAssistant?.deliverableStyles?.length

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
              // Submit on Enter (without shift) or Cmd/Ctrl+Enter
              else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={
              ghostText
                ? '' // Hide placeholder when showing ghost text
                : messages.length === 0
                  ? 'What would you like to create today?'
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

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/20 rounded-b-2xl">
          {/* Left toolbar */}
          <div className="flex items-center gap-4 flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-1">
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
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                title="Attach files"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                title="Add image"
              >
                <ImageIcon className="h-4 w-4" />
              </button>
            </div>
            {/* Divider */}
            <div className="h-4 w-px bg-border" />
            {/* Credits indicator */}
            <div
              className="flex items-center gap-1.5 text-sm"
              title="Credits are used when you submit a brief to a designer, not during chat."
            >
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  userCredits === 0
                    ? 'bg-ds-error'
                    : userCredits < 15
                      ? 'bg-ds-warning'
                      : 'bg-ds-success'
                )}
              />
              <span className="text-muted-foreground">{userCredits} credits available</span>
              {estimatedCredits && !EARLY_STAGES.has(briefingStage ?? '') && (
                <>
                  <span className="text-muted-foreground/40">&middot;</span>
                  <span className="text-muted-foreground">
                    ~{estimatedCredits} credits for this project
                  </span>
                </>
              )}
            </div>
            {/* Deliverable type detection badge */}
            {deliverableCategory &&
              !EARLY_STAGES.has(briefingStage ?? '') &&
              briefingStage !== 'STRUCTURE' && (
                <div
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/50 text-[11px] text-muted-foreground"
                  title={`We detected this is a ${deliverableCategory} project \u2014 the brief is tailored accordingly`}
                >
                  {deliverableCategory === 'video' ? (
                    <Film className="h-3 w-3" />
                  ) : deliverableCategory === 'website' ? (
                    <LayoutGrid className="h-3 w-3" />
                  ) : deliverableCategory === 'design' || deliverableCategory === 'brand' ? (
                    <Palette className="h-3 w-3" />
                  ) : (
                    <Film className="h-3 w-3" />
                  )}
                  <span className="capitalize">{deliverableCategory} detected</span>
                </div>
              )}
            {/* Draft save indicator */}
            {lastSavedAt && (
              <span className="text-[10px] text-muted-foreground/50">Draft saved</span>
            )}
            {/* Word count hint - only show when user starts typing */}
            {input.trim().length > 0 &&
              (() => {
                const wordCount = input.trim().split(/\s+/).filter(Boolean).length
                const greatPromptWords = 20

                // Score: word count + specificity (mentions platforms, audience, colors)
                const specificityPatterns =
                  /instagram|tiktok|youtube|linkedin|facebook|audience|brand|style|color|#[0-9a-f]/gi
                const specificityBonus = (input.match(specificityPatterns) || []).length * 2
                const rawScore = Math.min(wordCount + specificityBonus, greatPromptWords)
                const pct = Math.min((rawScore / greatPromptWords) * 100, 100)

                // SVG ring parameters
                const r = 10
                const circumference = 2 * Math.PI * r
                const offset = circumference - (pct / 100) * circumference
                const color =
                  pct >= 100
                    ? 'text-crafted-green'
                    : pct >= 50
                      ? 'text-ds-warning'
                      : 'text-ds-error'

                const tooltip =
                  pct >= 100
                    ? 'Great detail!'
                    : 'Add details like target audience or style preference'

                return (
                  <div className="flex items-center gap-1.5" title={tooltip}>
                    <svg width="24" height="24" viewBox="0 0 24 24" className={color}>
                      <circle
                        cx="12"
                        cy="12"
                        r={r}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        opacity={0.15}
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r={r}
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
                    {pct < 100 && (
                      <span className={cn('text-[10px]', color)}>{Math.round(pct)}%</span>
                    )}
                  </div>
                )
              })()}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <Button
              onClick={handleSend}
              disabled={isLoading || (!input.trim() && !hasFiles)}
              className="h-9 px-5 bg-crafted-green hover:bg-crafted-green-light text-white rounded-full"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-1.5">Thinking...</span>
                </>
              ) : (
                'Submit'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced empty state with quick start suggestions */}
      {messages.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-4 space-y-4"
        >
          {/* Popular requests - clickable cards */}
          <div className="grid grid-cols-2 gap-2">
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
}
