'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/loading'
import {
  Check,
  Image as ImageIcon,
  Paperclip,
  FileIcon,
  XCircle,
  X,
  Film,
  Sparkles,
  Share2,
  Megaphone,
  Bookmark,
  LayoutGrid,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  ChatMessage as Message,
  UploadedFile,
  TaskProposal,
  MoodboardItem,
  QuickOptions as QuickOptionsType,
} from './types'
import { QuickOptions } from './quick-options'
import { SubmitActionBar } from './submit-action-bar'

// =============================================================================
// PROPS
// =============================================================================

export interface ChatInputAreaProps {
  messages: Message[]
  input: string
  setInput: (value: string) => void
  isLoading: boolean
  isUploading: boolean
  uploadedFiles: UploadedFile[]
  pendingTask: TaskProposal | null
  isTaskMode: boolean
  seamlessTransition: boolean

  // Suggestions
  ghostText: string
  smartCompletion: string | null
  setSmartCompletion: (value: string | null) => void
  currentSuggestion: string | null
  quickOptionSuggestion?: string | null
  suggestionIndex?: number
  setSuggestionIndex?: React.Dispatch<React.SetStateAction<number>>

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

  // When true, a strategic review card with its own CTA is showing — hide quick option chips
  hasStrategicReviewCTA?: boolean

  // Scene references
  sceneReferences?: { sceneNumber: number; title: string }[]
  onRemoveSceneReference?: (sceneNumber: number) => void

  // Handlers
  handleSend: () => void
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleRequestTaskSummary: () => void
  removeFile: (fileUrl: string) => void
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ChatInputArea({
  messages,
  input,
  setInput,
  isLoading,
  isUploading,
  uploadedFiles,
  pendingTask,
  isTaskMode: _isTaskMode,
  seamlessTransition: _seamlessTransition,
  ghostText,
  smartCompletion,
  setSmartCompletion,
  currentSuggestion,
  quickOptionSuggestion = null,
  suggestionIndex: _suggestionIndex = 0,
  setSuggestionIndex,
  fileInputRef,
  inputRef,
  userCredits,
  briefingStage,
  moodboardItems = [],
  onConfirmTask,
  onMakeChanges,
  onInsufficientCredits,
  isSubmitting = false,
  stateMachineQuickOptions,
  onQuickOptionClick,
  hasStrategicReviewCTA = false,
  sceneReferences = [],
  onRemoveSceneReference,
  handleSend,
  handleFileUpload,
  handleRequestTaskSummary,
  removeFile,
}: ChatInputAreaProps) {
  // When a pending task exists, render the submit action bar instead of the input
  if (pendingTask && onConfirmTask && onMakeChanges && onInsufficientCredits) {
    return (
      <SubmitActionBar
        taskProposal={pendingTask}
        moodboardItems={moodboardItems}
        userCredits={userCredits}
        isSubmitting={isSubmitting}
        onConfirm={onConfirmTask}
        onMakeChanges={onMakeChanges}
        onInsufficientCredits={onInsufficientCredits}
      />
    )
  }

  return (
    <div className="shrink-0 mt-auto pt-4 pb-6 px-4 sm:px-8 lg:px-16 max-w-4xl mx-auto w-full">
      {/* State machine quick option chips + "You decide & submit" grouped */}
      <AnimatePresence>
        {stateMachineQuickOptions &&
          stateMachineQuickOptions.options.length > 0 &&
          onQuickOptionClick &&
          !isLoading &&
          !input.trim() &&
          !hasStrategicReviewCTA &&
          sceneReferences.length === 0 && (
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
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <QuickOptions
                    options={stateMachineQuickOptions}
                    onSelect={onQuickOptionClick}
                    disabled={isLoading}
                  />
                </div>
                {messages.length > 0 &&
                  !pendingTask &&
                  (!briefingStage || briefingStage !== 'EXTRACT') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRequestTaskSummary}
                      className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-7 px-3 shrink-0"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      You decide & submit
                    </Button>
                  )}
              </div>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Scene reference chips */}
      {sceneReferences.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {sceneReferences.map((ref) => (
            <div
              key={ref.sceneNumber}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/40 text-sm"
            >
              <Film className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                {/^Scene\s+\d+$/i.test(ref.title)
                  ? `Scene ${ref.sceneNumber}`
                  : `Scene ${ref.sceneNumber}: ${ref.title}`}
              </span>
              {onRemoveSceneReference && (
                <button
                  type="button"
                  onClick={() => onRemoveSceneReference(ref.sceneNumber)}
                  className="ml-1 text-emerald-400 hover:text-emerald-600 dark:text-emerald-500 dark:hover:text-emerald-300 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pending uploads preview */}
      {uploadedFiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {uploadedFiles.filter(Boolean).map((file) => {
            if (!file || !file.fileUrl) return null
            return (
              <div
                key={file.fileUrl}
                className="relative group flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border"
              >
                {file.fileType?.startsWith('image/') ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={file.fileUrl}
                    alt={file.fileName || 'Uploaded file'}
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <FileIcon className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-sm max-w-[100px] truncate text-foreground">
                  {file.fileName || 'File'}
                </span>
                <button
                  onClick={() => removeFile(file.fileUrl)}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Quick submit button - only when no quick options are showing */}
      {messages.length > 0 &&
        !pendingTask &&
        !isLoading &&
        (!briefingStage || briefingStage !== 'EXTRACT') &&
        !(
          stateMachineQuickOptions &&
          stateMachineQuickOptions.options.length > 0 &&
          !input.trim()
        ) && (
          <div className="flex justify-end mb-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRequestTaskSummary}
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-7 px-3"
            >
              <Sparkles className="h-3.5 w-3.5" />
              You decide & submit
            </Button>
          </div>
        )}

      {/* Modern input box - matching design reference */}
      <div className="border border-border rounded-2xl bg-white/90 dark:bg-card/90 backdrop-blur-sm overflow-hidden shadow-sm">
        {/* Input field with auto-resize and ghost text */}
        <div className="relative">
          {/* Ghost text suggestion overlay */}
          {ghostText && (
            <div className="absolute inset-0 px-4 py-4 pointer-events-none flex items-start">
              <span className="text-sm text-transparent">{input}</span>
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
              // Tab to accept suggestion (smart completion or quick option)
              if (e.key === 'Tab' && ghostText) {
                e.preventDefault()
                // For smart completions, append the completion
                if (smartCompletion && input.trim().length >= 3) {
                  setInput(input.trim() + ' ' + smartCompletion)
                  setSmartCompletion(null) // Clear so new completions can generate
                } else if (currentSuggestion) {
                  // For quick options, use the full suggestion
                  setInput(currentSuggestion)
                }
              }
              // Arrow down to cycle through quick options (only when empty)
              else if (e.key === 'ArrowDown' && quickOptionSuggestion && !input.trim()) {
                e.preventDefault()
                setSuggestionIndex?.((prev) => prev + 1)
              }
              // Arrow up to cycle back through quick options
              else if (e.key === 'ArrowUp' && quickOptionSuggestion && !input.trim()) {
                e.preventDefault()
                setSuggestionIndex?.((prev) => Math.max(0, prev - 1))
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
            className="w-full bg-transparent px-4 py-4 text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:rounded-lg text-sm resize-none min-h-[52px] max-h-[200px] transition-all relative z-10"
            style={{ height: 'auto', overflow: 'hidden' }}
          />
          {/* Tab hint - show different hints based on context */}
          {ghostText && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-3 text-xs z-0 pointer-events-none">
              {/* Show arrow keys only when empty and have quick options */}
              {!input.trim() && quickOptionSuggestion && (
                <>
                  <div className="flex items-center gap-1.5 text-muted-foreground/60">
                    <div className="flex items-center gap-0.5">
                      <kbd className="px-1.5 py-0.5 rounded bg-muted/60 border border-border/60 text-[11px] font-medium shadow-sm">
                        ↑
                      </kbd>
                      <kbd className="px-1.5 py-0.5 rounded bg-muted/60 border border-border/60 text-[11px] font-medium shadow-sm">
                        ↓
                      </kbd>
                    </div>
                    <span className="text-[11px]">browse</span>
                  </div>
                  <span className="text-muted-foreground/30">•</span>
                </>
              )}
              <div className="flex items-center gap-1.5 text-muted-foreground/60">
                <kbd className="px-2 py-0.5 rounded bg-muted/60 border border-border/60 text-[11px] font-medium shadow-sm">
                  Tab
                </kbd>
                <span className="text-[11px]">
                  {input.trim() ? 'insert suggestion' : 'use suggestion'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/20">
          {/* Left toolbar */}
          <div className="flex items-center gap-4">
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
                disabled={isUploading}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                title="Attach files"
              >
                {isUploading ? <LoadingSpinner size="sm" /> : <Paperclip className="h-4 w-4" />}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                title="Add image"
              >
                <ImageIcon className="h-4 w-4" />
              </button>
            </div>
            {/* Divider */}
            <div className="h-4 w-px bg-border" />
            {/* Credits indicator */}
            <div className="flex items-center gap-1.5 text-sm">
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  userCredits === 0
                    ? 'bg-red-500'
                    : userCredits < 15
                      ? 'bg-amber-500'
                      : 'bg-emerald-600'
                )}
              />
              <span className="text-muted-foreground">{userCredits} credits available</span>
            </div>
            {/* Word count hint - only show when user starts typing */}
            {input.trim().length > 0 &&
              (() => {
                const wordCount = input.trim().split(/\s+/).filter(Boolean).length
                const solidPromptWords = 10
                const greatPromptWords = 20

                // Calculate progress percentage for the gradient bar
                const progress = Math.min((wordCount / greatPromptWords) * 100, 100)

                if (wordCount >= greatPromptWords) {
                  return (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10">
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-xs font-medium text-emerald-600">Great detail!</span>
                      </div>
                    </div>
                  )
                } else if (wordCount >= solidPromptWords) {
                  const wordsNeeded = greatPromptWords - wordCount
                  return (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        +{wordsNeeded} for best results
                      </span>
                    </div>
                  )
                } else {
                  const wordsNeeded = solidPromptWords - wordCount
                  return (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-rose-400 to-amber-400 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-rose-500 dark:text-rose-400">
                        +{wordsNeeded} for a solid prompt
                      </span>
                    </div>
                  )
                }
              })()}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSend}
              disabled={isLoading || (!input.trim() && uploadedFiles.length === 0)}
              className="h-9 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full"
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
                  'hover:border-emerald-500/50 hover:bg-white dark:hover:bg-card hover:shadow-md',
                  'border-border/50'
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-600/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-600/20 transition-colors">
                  <item.icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
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
