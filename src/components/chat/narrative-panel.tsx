'use client'

import { useState, useCallback, type ReactNode } from 'react'
import { Film, ArrowRight, Check, Pencil, Sparkles } from 'lucide-react'
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
  isApproved?: boolean
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
          className="inline-flex items-center px-1.5 py-0 rounded-md bg-crafted-mint/20 text-crafted-forest text-[0.85em] font-medium mx-0.5"
        >
          {inner}
        </span>
      )
    }
    return <span key={i}>{part}</span>
  })
}

// =============================================================================
// EDITABLE FIELD WRAPPER — shows pencil icon and hover border hint
// =============================================================================

function EditableField({
  children,
  onClick,
  label,
  className: fieldClassName,
}: {
  children: ReactNode
  onClick: () => void
  label: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative group/field cursor-pointer rounded-lg transition-all duration-150',
        'hover:bg-muted/20 hover:ring-1 hover:ring-crafted-sage/20',
        '-mx-2 px-2 py-1.5',
        fieldClassName
      )}
      onClick={onClick}
    >
      {children}
      <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover/field:opacity-100 transition-opacity">
        <span className="text-[9px] text-muted-foreground/50">{label}</span>
        <Pencil className="h-3 w-3 text-muted-foreground/40" />
      </div>
    </div>
  )
}

// =============================================================================
// EDIT CONTROLS — Save & Cancel buttons for edit mode
// =============================================================================

function EditControls({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex items-center gap-2 pt-1.5">
      <Button
        type="button"
        size="sm"
        className="h-7 px-3 text-xs gap-1.5 bg-crafted-green hover:bg-crafted-forest text-white rounded-lg"
        onClick={onSave}
      >
        <Check className="h-3 w-3" />
        Save
      </Button>
      <button
        type="button"
        onClick={onCancel}
        className="text-xs px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        Cancel
      </button>
      <span className="text-[10px] text-muted-foreground/30 ml-auto">Esc to cancel</span>
    </div>
  )
}

// =============================================================================
// ANIMATED BLUEPRINT MOTIF — subtle SVG drawings in the whitespace
// Film frames, camera paths, aspect ratios, director annotations
// =============================================================================

function BlueprintMotif() {
  return (
    <div className="relative w-full h-48 mt-6 overflow-hidden opacity-[0.07] pointer-events-none select-none">
      <svg
        viewBox="0 0 400 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Film frame outlines — two frames side by side */}
        <rect
          x="20"
          y="20"
          width="80"
          height="50"
          rx="3"
          stroke="var(--crafted-sage)"
          strokeWidth="1.2"
          className="animate-[draw_3s_ease-out_forwards]"
          style={{ strokeDasharray: 260, strokeDashoffset: 260, animationDelay: '0.2s' }}
        />
        <rect
          x="24"
          y="24"
          width="72"
          height="42"
          rx="1"
          stroke="var(--crafted-sage)"
          strokeWidth="0.6"
          className="animate-[draw_2s_ease-out_forwards]"
          style={{ strokeDasharray: 228, strokeDashoffset: 228, animationDelay: '0.8s' }}
        />
        {/* Sprocket holes top */}
        {[30, 42, 54, 66, 78, 90].map((x) => (
          <rect
            key={`sp-${x}`}
            x={x}
            y="14"
            width="4"
            height="4"
            rx="0.5"
            stroke="var(--crafted-sage)"
            strokeWidth="0.6"
            className="animate-[draw_1s_ease-out_forwards]"
            style={{
              strokeDasharray: 16,
              strokeDashoffset: 16,
              animationDelay: `${0.5 + x * 0.01}s`,
            }}
          />
        ))}

        {/* Aspect ratio annotation */}
        <text
          x="60"
          y="82"
          textAnchor="middle"
          className="animate-[fadeIn_1.5s_ease-out_forwards]"
          style={{
            opacity: 0,
            animationDelay: '1.8s',
            fill: 'var(--crafted-sage)',
            fontSize: '7px',
            fontFamily: 'monospace',
          }}
        >
          16:9
        </text>

        {/* Camera movement path — dolly curve */}
        <path
          d="M140 60 C160 30, 200 30, 220 55 S280 80, 300 50"
          stroke="var(--crafted-sage)"
          strokeWidth="1"
          strokeLinecap="round"
          className="animate-[draw_4s_ease-in-out_forwards]"
          style={{ strokeDasharray: 200, strokeDashoffset: 200, animationDelay: '0.5s' }}
        />
        {/* Arrow head on camera path */}
        <path
          d="M296 52 L304 48 L300 56"
          stroke="var(--crafted-sage)"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-[draw_0.8s_ease-out_forwards]"
          style={{ strokeDasharray: 20, strokeDashoffset: 20, animationDelay: '4.2s' }}
        />
        {/* Camera path label */}
        <text
          x="220"
          y="25"
          textAnchor="middle"
          className="animate-[fadeIn_1.5s_ease-out_forwards]"
          style={{
            opacity: 0,
            animationDelay: '2.5s',
            fill: 'var(--crafted-sage)',
            fontSize: '6px',
            fontFamily: 'monospace',
            letterSpacing: '0.5px',
          }}
        >
          CAMERA PATH
        </text>

        {/* Second film frame — further right */}
        <rect
          x="130"
          y="90"
          width="80"
          height="50"
          rx="3"
          stroke="var(--crafted-sage)"
          strokeWidth="1.2"
          className="animate-[draw_3s_ease-out_forwards]"
          style={{ strokeDasharray: 260, strokeDashoffset: 260, animationDelay: '1s' }}
        />
        <rect
          x="134"
          y="94"
          width="72"
          height="42"
          rx="1"
          stroke="var(--crafted-sage)"
          strokeWidth="0.6"
          className="animate-[draw_2s_ease-out_forwards]"
          style={{ strokeDasharray: 228, strokeDashoffset: 228, animationDelay: '1.6s' }}
        />
        {/* Scene arrow between frames */}
        <path
          d="M105 45 L125 95"
          stroke="var(--crafted-sage)"
          strokeWidth="0.8"
          strokeDasharray="3 3"
          className="animate-[draw_2s_ease-out_forwards]"
          style={{ strokeDasharray: 60, strokeDashoffset: 60, animationDelay: '2s' }}
        />

        {/* Scene label */}
        <text
          x="170"
          y="156"
          textAnchor="middle"
          className="animate-[fadeIn_1.5s_ease-out_forwards]"
          style={{
            opacity: 0,
            animationDelay: '3s',
            fill: 'var(--crafted-sage)',
            fontSize: '6px',
            fontFamily: 'monospace',
          }}
        >
          SCENE 2 →
        </text>

        {/* Timeline ticks at bottom */}
        {[240, 260, 280, 300, 320, 340, 360].map((x, i) => (
          <line
            key={`tick-${x}`}
            x1={x}
            y1="140"
            x2={x}
            y2={i % 3 === 0 ? 130 : 135}
            stroke="var(--crafted-sage)"
            strokeWidth="0.7"
            className="animate-[draw_0.5s_ease-out_forwards]"
            style={{
              strokeDasharray: 12,
              strokeDashoffset: 12,
              animationDelay: `${2.5 + i * 0.15}s`,
            }}
          />
        ))}
        {/* Timeline baseline */}
        <line
          x1="235"
          y1="140"
          x2="365"
          y2="140"
          stroke="var(--crafted-sage)"
          strokeWidth="0.8"
          className="animate-[draw_2s_ease-out_forwards]"
          style={{ strokeDasharray: 130, strokeDashoffset: 130, animationDelay: '2.2s' }}
        />
        {/* Timeline labels */}
        <text
          x="240"
          y="152"
          textAnchor="start"
          className="animate-[fadeIn_1.5s_ease-out_forwards]"
          style={{
            opacity: 0,
            animationDelay: '3.5s',
            fill: 'var(--crafted-sage)',
            fontSize: '5.5px',
            fontFamily: 'monospace',
          }}
        >
          0:00
        </text>
        <text
          x="300"
          y="152"
          textAnchor="middle"
          className="animate-[fadeIn_1.5s_ease-out_forwards]"
          style={{
            opacity: 0,
            animationDelay: '3.8s',
            fill: 'var(--crafted-sage)',
            fontSize: '5.5px',
            fontFamily: 'monospace',
          }}
        >
          0:15
        </text>
        <text
          x="360"
          y="152"
          textAnchor="end"
          className="animate-[fadeIn_1.5s_ease-out_forwards]"
          style={{
            opacity: 0,
            animationDelay: '4.1s',
            fill: 'var(--crafted-sage)',
            fontSize: '5.5px',
            fontFamily: 'monospace',
          }}
        >
          0:30
        </text>

        {/* Director's crosshair / viewfinder */}
        <circle
          cx="330"
          cy="75"
          r="18"
          stroke="var(--crafted-sage)"
          strokeWidth="0.8"
          className="animate-[draw_2s_ease-out_forwards]"
          style={{ strokeDasharray: 113, strokeDashoffset: 113, animationDelay: '1.5s' }}
        />
        <line
          x1="330"
          y1="62"
          x2="330"
          y2="68"
          stroke="var(--crafted-sage)"
          strokeWidth="0.6"
          className="animate-[draw_0.5s_ease-out_forwards]"
          style={{ strokeDasharray: 6, strokeDashoffset: 6, animationDelay: '3s' }}
        />
        <line
          x1="330"
          y1="82"
          x2="330"
          y2="88"
          stroke="var(--crafted-sage)"
          strokeWidth="0.6"
          className="animate-[draw_0.5s_ease-out_forwards]"
          style={{ strokeDasharray: 6, strokeDashoffset: 6, animationDelay: '3.1s' }}
        />
        <line
          x1="317"
          y1="75"
          x2="323"
          y2="75"
          stroke="var(--crafted-sage)"
          strokeWidth="0.6"
          className="animate-[draw_0.5s_ease-out_forwards]"
          style={{ strokeDasharray: 6, strokeDashoffset: 6, animationDelay: '3.2s' }}
        />
        <line
          x1="337"
          y1="75"
          x2="343"
          y2="75"
          stroke="var(--crafted-sage)"
          strokeWidth="0.6"
          className="animate-[draw_0.5s_ease-out_forwards]"
          style={{ strokeDasharray: 6, strokeDashoffset: 6, animationDelay: '3.3s' }}
        />

        {/* Composition grid lines (rule of thirds inside viewfinder) */}
        <line
          x1="324"
          y1="62"
          x2="324"
          y2="88"
          stroke="var(--crafted-sage)"
          strokeWidth="0.3"
          className="animate-[draw_1s_ease-out_forwards]"
          style={{ strokeDasharray: 26, strokeDashoffset: 26, animationDelay: '3.5s' }}
        />
        <line
          x1="336"
          y1="62"
          x2="336"
          y2="88"
          stroke="var(--crafted-sage)"
          strokeWidth="0.3"
          className="animate-[draw_1s_ease-out_forwards]"
          style={{ strokeDasharray: 26, strokeDashoffset: 26, animationDelay: '3.6s' }}
        />

        {/* Small annotation — "TAKE 1" */}
        <text
          x="330"
          y="102"
          textAnchor="middle"
          className="animate-[fadeIn_1.5s_ease-out_forwards]"
          style={{
            opacity: 0,
            animationDelay: '4s',
            fill: 'var(--crafted-sage)',
            fontSize: '5px',
            fontFamily: 'monospace',
            letterSpacing: '1px',
          }}
        >
          TAKE 1
        </text>

        {/* Dashed guide line connecting elements */}
        <path
          d="M100 45 Q130 45 140 60 T175 90"
          stroke="var(--crafted-sage)"
          strokeWidth="0.5"
          strokeDasharray="2 3"
          fill="none"
          className="animate-[draw_3s_ease-out_forwards]"
          style={{ strokeDasharray: 100, strokeDashoffset: 100, animationDelay: '2.8s' }}
        />
      </svg>

      <style>{`
        @keyframes draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes fadeIn {
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// =============================================================================
// COMPONENT
// =============================================================================

export function NarrativePanel({
  narrative,
  onApprove,
  onFieldEdit,
  isApproved,
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
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-crafted-mint/20 border border-crafted-sage/30">
              <Film className="h-3.5 w-3.5 text-crafted-green" />
            </div>
            <span className="text-sm font-semibold text-foreground tracking-tight">
              Video Blueprint
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-crafted-sage/30 font-mono">
            narrative
          </span>
        </div>
      </div>

      {/* Blueprint content */}
      <ScrollArea className="flex-1">
        <div className="p-5">
          {/* Blueprint card */}
          <div
            className="relative rounded-xl border border-dashed border-crafted-sage/20 overflow-hidden"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--crafted-mint) 5%, transparent)',
              backgroundImage:
                'linear-gradient(color-mix(in srgb, var(--crafted-sage) 8%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--crafted-sage) 8%, transparent) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          >
            <div className="p-5 space-y-2">
              {/* Concept — headline (click to edit) */}
              {editingField === 'concept' ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    className="w-full bg-white/80 dark:bg-card/80 rounded-lg px-3 py-2 text-base font-semibold text-foreground tracking-tight outline-none border border-crafted-green/40 focus:border-crafted-green/60 shadow-sm"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit()
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    autoFocus
                  />
                  <EditControls onSave={saveEdit} onCancel={cancelEdit} />
                </div>
              ) : (
                <EditableField onClick={() => startEditing('concept')} label="Edit title">
                  <h3 className="text-base font-semibold text-crafted-forest dark:text-foreground tracking-tight leading-snug pr-16">
                    {renderHighlightedText(narrative.concept)}
                  </h3>
                </EditableField>
              )}

              {/* Narrative — body text (click to edit) */}
              {editingField === 'narrative' ? (
                <div className="space-y-1">
                  <textarea
                    className="w-full bg-white/80 dark:bg-card/80 rounded-lg px-3 py-2 text-sm text-foreground/80 leading-relaxed resize-none outline-none border border-crafted-green/40 focus:border-crafted-green/60 shadow-sm min-h-[5rem]"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    rows={4}
                    autoFocus
                  />
                  <EditControls onSave={saveEdit} onCancel={cancelEdit} />
                </div>
              ) : (
                <EditableField onClick={() => startEditing('narrative')} label="Edit narrative">
                  <p className="text-sm text-foreground/70 leading-relaxed pr-20">
                    {renderHighlightedText(narrative.narrative)}
                  </p>
                </EditableField>
              )}

              {/* Hook — labeled CTA/key action with accent line */}
              {editingField === 'hook' ? (
                <div className="mt-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-crafted-sage/60 mb-1.5 block">
                    CTA
                  </span>
                  <div className="flex gap-3">
                    <div className="w-0.5 shrink-0 rounded-full bg-crafted-green/40" />
                    <div className="flex-1 space-y-1">
                      <textarea
                        className="w-full bg-white/80 dark:bg-card/80 rounded-lg px-3 py-2 text-sm text-foreground/80 leading-relaxed resize-none outline-none border border-crafted-green/40 focus:border-crafted-green/60 shadow-sm min-h-[2.5rem]"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') cancelEdit()
                        }}
                        rows={2}
                        autoFocus
                      />
                      <EditControls onSave={saveEdit} onCancel={cancelEdit} />
                    </div>
                  </div>
                </div>
              ) : narrative.hook ? (
                <EditableField onClick={() => startEditing('hook')} label="Edit CTA">
                  <div className="mt-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-crafted-sage/60 mb-1.5 block">
                      CTA
                    </span>
                    <div className="flex gap-3">
                      <div className="w-0.5 shrink-0 rounded-full bg-crafted-green/40" />
                      <p className="flex-1 text-sm text-foreground/70 leading-relaxed italic pr-16">
                        &ldquo;{renderHighlightedText(narrative.hook)}&rdquo;
                      </p>
                    </div>
                  </div>
                </EditableField>
              ) : null}
            </div>
          </div>

          {/* Refine hint or approved status */}
          {!isApproved ? (
            <div className="flex items-center gap-2 mt-4 rounded-lg border border-crafted-sage/20 bg-crafted-sage/5 px-3 py-2">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-crafted-sage" />
              <span className="text-xs text-muted-foreground">
                Chat to refine, or edit directly above
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-4 rounded-lg border border-crafted-sage/30 bg-crafted-sage/10 px-3 py-2.5">
              <Check className="h-3.5 w-3.5 shrink-0 text-crafted-green" />
              <span className="text-xs text-muted-foreground">
                Narrative approved — answer the chat to build scenes
              </span>
            </div>
          )}

          {/* Continue CTA — only shown before approval */}
          {!isApproved && (
            <div className="mt-4">
              <Button
                size="lg"
                className="gap-2 w-full bg-crafted-green hover:bg-crafted-forest text-white rounded-xl h-11 font-medium shadow-sm shadow-crafted-green/15"
                onClick={onApprove}
              >
                Continue to Storyboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Animated blueprint motif — fills whitespace below */}
          <BlueprintMotif />
        </div>
      </ScrollArea>
    </div>
  )
}
