'use client'

import { useState } from 'react'
import { Film, RefreshCw, Check, Pencil, X } from 'lucide-react'
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
// TAG COLORS — 6-color rotation matching the codebase palette
// =============================================================================

const TAG_COLORS = [
  'bg-violet-500/15 text-violet-300 border-violet-500/20',
  'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  'bg-amber-500/15 text-amber-300 border-amber-500/20',
  'bg-blue-500/15 text-blue-300 border-blue-500/20',
  'bg-rose-500/15 text-rose-300 border-rose-500/20',
  'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
]

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
  const [isEditing, setIsEditing] = useState(false)
  const [editConcept, setEditConcept] = useState(narrative.concept)
  const [editNarrative, setEditNarrative] = useState(narrative.narrative)
  const [editHook, setEditHook] = useState(narrative.hook)

  function startEditing() {
    setEditConcept(narrative.concept)
    setEditNarrative(narrative.narrative)
    setEditHook(narrative.hook)
    setIsEditing(true)
  }

  function saveEdits() {
    if (editConcept !== narrative.concept) onFieldEdit('concept', editConcept)
    if (editNarrative !== narrative.narrative) onFieldEdit('narrative', editNarrative)
    if (editHook !== narrative.hook) onFieldEdit('hook', editHook)
    setIsEditing(false)
  }

  function cancelEdits() {
    setIsEditing(false)
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="shrink-0 px-5 py-3.5 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-violet-500/10 border border-violet-500/20">
              <Film className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground tracking-tight">
                Video Blueprint
              </span>
            </div>
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
            {/* Edit toggle */}
            <button
              type="button"
              className={cn(
                'absolute top-3 right-3 z-10 p-1.5 rounded-md transition-all',
                isEditing
                  ? 'bg-violet-500/20 text-violet-300'
                  : 'text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-muted/30'
              )}
              onClick={() => (isEditing ? cancelEdits() : startEditing())}
            >
              {isEditing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
            </button>

            <div className="p-5 pr-10 space-y-4">
              {/* Concept — headline */}
              {isEditing ? (
                <input
                  type="text"
                  className="w-full bg-transparent text-base font-semibold text-foreground tracking-tight outline-none border-b border-dashed border-violet-500/30 pb-1"
                  value={editConcept}
                  onChange={(e) => setEditConcept(e.target.value)}
                  placeholder="One-line concept..."
                />
              ) : (
                <h3 className="text-base font-semibold text-foreground tracking-tight leading-snug">
                  {narrative.concept}
                </h3>
              )}

              {/* Narrative — body text */}
              {isEditing ? (
                <textarea
                  className="w-full bg-transparent text-sm text-foreground/80 leading-relaxed resize-none outline-none border-b border-dashed border-violet-500/30 pb-1 min-h-[4rem]"
                  value={editNarrative}
                  onChange={(e) => setEditNarrative(e.target.value)}
                  placeholder="Story arc, audience, emotional journey..."
                  rows={3}
                />
              ) : (
                <p className="text-sm text-foreground/70 leading-relaxed">{narrative.narrative}</p>
              )}

              {/* Hook — with accent line */}
              <div className="flex gap-3">
                <div className="w-0.5 shrink-0 rounded-full bg-amber-500/40" />
                {isEditing ? (
                  <textarea
                    className="flex-1 bg-transparent text-sm text-amber-200/80 leading-relaxed resize-none outline-none border-b border-dashed border-amber-500/30 pb-1 min-h-[2rem]"
                    value={editHook}
                    onChange={(e) => setEditHook(e.target.value)}
                    placeholder="Opening hook..."
                    rows={2}
                  />
                ) : (
                  <p className="text-sm text-foreground/70 leading-relaxed italic">
                    {narrative.hook ? `"${narrative.hook}"` : ''}
                  </p>
                )}
              </div>

              {/* Tags — chip row */}
              {narrative.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {narrative.tags.map((tag, i) => (
                    <span
                      key={tag}
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border',
                        TAG_COLORS[i % TAG_COLORS.length]
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Save bar in edit mode */}
            {isEditing && (
              <div className="px-5 py-2.5 border-t border-dashed border-border/40 flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7 gap-1 text-violet-400 hover:text-violet-300"
                  onClick={saveEdits}
                >
                  <Check className="h-3 w-3" />
                  Save changes
                </Button>
              </div>
            )}
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
