'use client'

import { useState, useCallback, type ReactNode } from 'react'
import { Film, RefreshCw, Check, Pencil, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { VideoNarrative } from '@/lib/ai/briefing-state-machine'

// =============================================================================
// TYPES
// =============================================================================

interface NarrativePanelProps {
  narrative: VideoNarrative
  onApprove: () => void
  onFieldEdit: (field: 'concept' | 'narrative' | 'hook', value: string) => void
  onRegenerate: () => void
  isRegenerating?: boolean
  className?: string
}

// =============================================================================
// INLINE HIGHLIGHT PARSER
// Parses <<highlighted phrases>> in text and renders them as inline chips
// =============================================================================

function renderHighlightedText(text: string): ReactNode[] {
  const parts = text.split(/(<<[^>]+>>)/)
  return parts.map((part, i) => {
    if (part.startsWith('<<') && part.endsWith('>>')) {
      const inner = part.slice(2, -2)
      return (
        <span
          key={i}
          className="inline-flex items-center px-1.5 py-0 rounded-md bg-violet-500/10 text-violet-300 text-[0.85em] font-medium mx-0.5"
        >
          {inner}
        </span>
      )
    }
    return <span key={i}>{part}</span>
  })
}

// =============================================================================
// COMPONENT
// =============================================================================

export function NarrativePanel({
  narrative,
  onApprove,
  onFieldEdit,
  onRegenerate,
  isRegenerating,
  className,
}: NarrativePanelProps) {
  const [editingField, setEditingField] = useState<'concept' | 'narrative' | 'hook' | null>(null)
  const [editValue, setEditValue] = useState('')

  const startEditing = useCallback(
    (field: 'concept' | 'narrative' | 'hook') => {
      // Strip <<markers>> for editing — user sees clean text
      const raw = narrative[field].replace(/<<|>>/g, '')
      setEditValue(raw)
      setEditingField(field)
    },
    [narrative]
  )

  const saveEdit = useCallback(() => {
    if (editingField) {
      onFieldEdit(editingField, editValue)
      setEditingField(null)
    }
  }, [editingField, editValue, onFieldEdit])

  const cancelEdit = useCallback(() => {
    setEditingField(null)
  }, [])

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="shrink-0 px-5 py-3.5 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-violet-500/10 border border-violet-500/20">
              <Film className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <span className="text-sm font-semibold text-foreground tracking-tight">
              Video Blueprint
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-mono">
            narrative
          </span>
        </div>
      </div>

      {/* Blueprint content */}
      <ScrollArea className="flex-1">
        <div className="p-5">
          {/* Blueprint card */}
          <div
            className="relative rounded-xl border border-dashed border-border/50 overflow-hidden"
            style={{
              backgroundImage:
                'radial-gradient(circle, hsl(var(--muted-foreground) / 0.06) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          >
            <div className="p-5 space-y-4">
              {/* Concept — headline (click to edit) */}
              {editingField === 'concept' ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    className="w-full bg-muted/30 rounded-lg px-3 py-2 text-base font-semibold text-foreground tracking-tight outline-none border border-violet-500/30 focus:border-violet-500/50"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit()
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    autoFocus
                  />
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={saveEdit}
                      className="text-[10px] px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="text-[10px] px-2 py-0.5 rounded text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <h3
                  className="text-base font-semibold text-foreground tracking-tight leading-snug cursor-pointer group flex items-start gap-2"
                  onClick={() => startEditing('concept')}
                >
                  <span className="flex-1">{renderHighlightedText(narrative.concept)}</span>
                  <Pencil className="h-3 w-3 mt-1 shrink-0 text-muted-foreground/0 group-hover:text-muted-foreground/40 transition-colors" />
                </h3>
              )}

              {/* Narrative — body text (click to edit) */}
              {editingField === 'narrative' ? (
                <div className="space-y-2">
                  <textarea
                    className="w-full bg-muted/30 rounded-lg px-3 py-2 text-sm text-foreground/80 leading-relaxed resize-none outline-none border border-violet-500/30 focus:border-violet-500/50 min-h-[5rem]"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    rows={4}
                    autoFocus
                  />
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={saveEdit}
                      className="text-[10px] px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="text-[10px] px-2 py-0.5 rounded text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  className="text-sm text-foreground/70 leading-relaxed cursor-pointer group flex items-start gap-2"
                  onClick={() => startEditing('narrative')}
                >
                  <span className="flex-1">{renderHighlightedText(narrative.narrative)}</span>
                  <Pencil className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/0 group-hover:text-muted-foreground/40 transition-colors" />
                </p>
              )}

              {/* Hook — with accent line (click to edit) */}
              {editingField === 'hook' ? (
                <div className="flex gap-3">
                  <div className="w-0.5 shrink-0 rounded-full bg-amber-500/40" />
                  <div className="flex-1 space-y-2">
                    <textarea
                      className="w-full bg-muted/30 rounded-lg px-3 py-2 text-sm text-foreground/80 leading-relaxed resize-none outline-none border border-amber-500/30 focus:border-amber-500/50 min-h-[2.5rem]"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      rows={2}
                      autoFocus
                    />
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="text-[10px] px-2 py-0.5 rounded text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : narrative.hook ? (
                <div
                  className="flex gap-3 cursor-pointer group"
                  onClick={() => startEditing('hook')}
                >
                  <div className="w-0.5 shrink-0 rounded-full bg-amber-500/40" />
                  <p className="flex-1 text-sm text-foreground/70 leading-relaxed italic">
                    &ldquo;{renderHighlightedText(narrative.hook)}&rdquo;
                  </p>
                  <Pencil className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/0 group-hover:text-muted-foreground/40 transition-colors" />
                </div>
              ) : null}
            </div>
          </div>

          {/* Refine hint */}
          <div className="flex items-center gap-1.5 mt-3 px-1">
            <Sparkles className="h-3 w-3 text-muted-foreground/30" />
            <span className="text-[10px] text-muted-foreground/40">
              Click to edit directly, or chat to refine with AI
            </span>
          </div>
        </div>
      </ScrollArea>

      {/* Action buttons */}
      <div className="shrink-0 px-5 py-3 border-t border-border/40 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={onRegenerate}
          disabled={isRegenerating}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isRegenerating && 'animate-spin')} />
          Regenerate
        </Button>
        <Button
          size="sm"
          className="gap-1.5 text-xs ml-auto bg-violet-600 hover:bg-violet-700 text-white"
          onClick={onApprove}
          disabled={isRegenerating}
        >
          <Check className="h-3.5 w-3.5" />
          Approve & Build Storyboard
        </Button>
      </div>
    </div>
  )
}
