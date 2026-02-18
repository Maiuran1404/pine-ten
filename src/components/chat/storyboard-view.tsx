'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Film,
  Clock,
  Eye,
  Target,
  Video,
  MessageSquare,
  ArrowRight,
  Camera,
  Mic,
  ArrowRightLeft,
  RefreshCw,
  Pencil,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { StoryboardScene } from '@/lib/ai/briefing-state-machine'

// =============================================================================
// HELPERS
// =============================================================================

export function parseDurationSeconds(duration: string): number {
  const match = duration.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

export function formatTimestamp(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function computeTimestampRanges(
  scenes: StoryboardScene[]
): { start: string; end: string }[] {
  const ranges: { start: string; end: string }[] = []
  let cumulative = 0
  for (const scene of scenes) {
    const dur = parseDurationSeconds(scene.duration)
    ranges.push({
      start: formatTimestamp(cumulative),
      end: formatTimestamp(cumulative + dur),
    })
    cumulative += dur
  }
  return ranges
}

// =============================================================================
// HOOK DATA (amber sub-section for Scene 1)
// =============================================================================

function HookDataInline({ hookData }: { hookData: NonNullable<StoryboardScene['hookData']> }) {
  return (
    <div className="mt-2 rounded-md border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-900/10 px-3 py-2 space-y-1">
      <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
        <Target className="h-3 w-3" />
        <span className="text-[10px] font-semibold uppercase tracking-wide">Hook Strategy</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-500 uppercase tracking-wider">
            Persona
          </span>
          <p className="text-foreground">{hookData.targetPersona}</p>
        </div>
        <div>
          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-500 uppercase tracking-wider">
            Pain
          </span>
          <p className="text-foreground">{hookData.painMetric}</p>
        </div>
        <div>
          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-500 uppercase tracking-wider">
            Impact
          </span>
          <p className="text-foreground font-medium">{hookData.quantifiableImpact}</p>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// ELABORATION DETAIL (blue sub-section for elaborated scenes)
// =============================================================================

function ElaborationDetail({ scene }: { scene: StoryboardScene }) {
  const hasDetail = scene.fullScript || scene.directorNotes || scene.referenceDescription
  if (!hasDetail) return null

  return (
    <div className="mt-2 rounded-md border border-blue-200/60 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-900/10 px-3 py-2 space-y-2">
      <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
        <Sparkles className="h-3 w-3" />
        <span className="text-[10px] font-semibold uppercase tracking-wide">Elaboration</span>
      </div>
      {scene.fullScript && (
        <div>
          <span className="text-[10px] font-medium text-blue-600 dark:text-blue-500 uppercase tracking-wider">
            Full Script
          </span>
          <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
            {scene.fullScript}
          </p>
        </div>
      )}
      {scene.directorNotes && (
        <div>
          <span className="text-[10px] font-medium text-blue-600 dark:text-blue-500 uppercase tracking-wider">
            Director Notes
          </span>
          <p className="text-xs text-foreground/80 italic leading-relaxed">{scene.directorNotes}</p>
        </div>
      )}
      {scene.referenceDescription && (
        <div>
          <span className="text-[10px] font-medium text-blue-600 dark:text-blue-500 uppercase tracking-wider">
            Reference Description
          </span>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {scene.referenceDescription}
          </p>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// STORYBOARD SUMMARY CARD — compact inline chat component
// =============================================================================

interface StoryboardSummaryCardProps {
  scenes: StoryboardScene[]
  className?: string
  onViewStoryboard?: () => void
}

export function StoryboardSummaryCard({
  scenes,
  className,
  onViewStoryboard,
}: StoryboardSummaryCardProps) {
  if (scenes.length === 0) return null

  const totalDuration = scenes.reduce((acc, scene) => acc + parseDurationSeconds(scene.duration), 0)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn('rounded-lg border border-border/60 overflow-hidden', className)}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-semibold text-foreground">Storyboard</span>
          <span className="text-xs text-muted-foreground">
            {scenes.length} {scenes.length === 1 ? 'scene' : 'scenes'}
          </span>
        </div>
        {totalDuration > 0 && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="text-xs">{formatTimestamp(totalDuration)}</span>
          </div>
        )}
      </div>

      {/* Compact scene list */}
      <div className="px-4 py-2.5 space-y-1">
        {scenes.map((scene, index) => (
          <div key={scene.sceneNumber} className="flex items-center gap-2 text-sm">
            <span className="text-xs text-muted-foreground/60 w-4 text-right shrink-0">
              {index + 1}.
            </span>
            <span className="text-foreground truncate">{scene.title}</span>
            {index === 0 && (
              <Badge
                variant="outline"
                className="text-[9px] h-4 px-1.5 border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 uppercase tracking-wide shrink-0"
              >
                Hook
              </Badge>
            )}
          </div>
        ))}
      </div>

      {/* View Storyboard button */}
      {onViewStoryboard && (
        <div className="px-4 py-2.5 border-t border-border/40">
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewStoryboard}
            className="w-full gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
          >
            View Storyboard
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </motion.div>
  )
}

// =============================================================================
// SCENE CARD — vertical card for the sidebar panel
// =============================================================================

function SceneCard({
  scene,
  isFirst,
  timestamp,
  isSelected,
  onToggleSelect,
  onClickFeedback,
}: {
  scene: StoryboardScene
  isFirst: boolean
  timestamp: { start: string; end: string }
  isSelected: boolean
  onToggleSelect: () => void
  onClickFeedback?: () => void
}) {
  return (
    <div
      className={cn(
        'rounded-lg border transition-all',
        isFirst ? 'border-amber-300/60 dark:border-amber-800/40' : 'border-border/40',
        isSelected && 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/10',
        !isSelected && 'hover:shadow-sm hover:border-border/80'
      )}
    >
      <div className="p-3 space-y-2">
        {/* Top row: checkbox, scene number, timestamp */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleSelect()
            }}
            className={cn(
              'w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors',
              isSelected
                ? 'bg-emerald-600 border-emerald-600'
                : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400'
            )}
          >
            {isSelected && (
              <svg
                className="w-2.5 h-2.5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          <span className="text-[11px] font-medium text-muted-foreground">
            Scene {scene.sceneNumber}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground/60 ml-auto">
            {timestamp.start}
          </span>
          {isFirst && (
            <Badge
              variant="outline"
              className="text-[9px] h-4 px-1.5 border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 uppercase tracking-wide"
            >
              Hook
            </Badge>
          )}
        </div>

        {/* Title */}
        <h4 className="text-sm font-medium text-foreground leading-snug">{scene.title}</h4>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
          {scene.description}
        </p>

        {/* Visual note */}
        {scene.visualNote && (
          <div className="flex items-start gap-1.5 text-muted-foreground/70">
            <Eye className="h-3 w-3 mt-0.5 shrink-0" />
            <span className="text-[11px] italic leading-relaxed">{scene.visualNote}</span>
          </div>
        )}

        {/* Hook data — scene 1 only */}
        {isFirst && scene.hookData && <HookDataInline hookData={scene.hookData} />}

        {/* Reference video link */}
        {scene.referenceVideoId && (
          <div className="flex items-center gap-1.5">
            <Video className="h-3 w-3 text-primary" />
            <span className="text-[11px] text-primary">Reference video linked</span>
          </div>
        )}

        {/* Bottom row: duration + feedback */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-muted-foreground">{scene.duration}</span>
          {onClickFeedback && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onClickFeedback()
              }}
              className="p-1 rounded text-muted-foreground/50 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
              title="Give feedback on this scene"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// STORYBOARD PANEL — full vertical cards for the right sidebar
// =============================================================================

interface StoryboardPanelProps {
  scenes: StoryboardScene[]
  className?: string
  onSceneClick?: (scene: StoryboardScene) => void
  onMultiSceneFeedback?: (scenes: StoryboardScene[]) => void
}

export function StoryboardPanel({
  scenes,
  className,
  onSceneClick,
  onMultiSceneFeedback,
}: StoryboardPanelProps) {
  const [selectedScenes, setSelectedScenes] = useState<number[]>([])

  if (scenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Film className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Storyboard will appear here</p>
      </div>
    )
  }

  const totalDuration = scenes.reduce((acc, scene) => acc + parseDurationSeconds(scene.duration), 0)
  const timestampRanges = computeTimestampRanges(scenes)

  const toggleSelect = (sceneNumber: number) => {
    setSelectedScenes((prev) =>
      prev.includes(sceneNumber) ? prev.filter((n) => n !== sceneNumber) : [...prev, sceneNumber]
    )
  }

  const handleMultiFeedback = () => {
    if (selectedScenes.length === 0 || !onMultiSceneFeedback) return
    const selected = scenes.filter((s) => selectedScenes.includes(s.sceneNumber))
    onMultiSceneFeedback(selected)
    setSelectedScenes([])
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-foreground">Storyboard</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {scenes.length} {scenes.length === 1 ? 'scene' : 'scenes'}
            </span>
            {totalDuration > 0 && (
              <>
                <span className="text-muted-foreground/30">·</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatTimestamp(totalDuration)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable scene cards */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {scenes.map((scene, index) => (
            <motion.div
              key={scene.sceneNumber}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.04 }}
            >
              <SceneCard
                scene={scene}
                isFirst={index === 0}
                timestamp={timestampRanges[index]}
                isSelected={selectedScenes.includes(scene.sceneNumber)}
                onToggleSelect={() => toggleSelect(scene.sceneNumber)}
                onClickFeedback={onSceneClick ? () => onSceneClick(scene) : undefined}
              />
            </motion.div>
          ))}
        </div>
      </ScrollArea>

      {/* Sticky multi-select action bar */}
      <AnimatePresence>
        {selectedScenes.length > 0 && onMultiSceneFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 px-4 py-3 border-t border-border/40 bg-background/95 backdrop-blur-sm flex items-center justify-between"
          >
            <span className="text-sm text-muted-foreground">
              {selectedScenes.length} {selectedScenes.length === 1 ? 'scene' : 'scenes'} selected
            </span>
            <Button size="sm" onClick={handleMultiFeedback} className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Give feedback
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// =============================================================================
// EDITABLE FIELD — click-to-edit inline text
// =============================================================================

function EditableField({
  value,
  onChange,
  onRegenerateField,
  placeholder,
  multiline,
  className,
  fieldLabel,
}: {
  value: string
  onChange: (val: string) => void
  onRegenerateField?: () => void
  placeholder?: string
  multiline?: boolean
  className?: string
  fieldLabel?: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleCommit = () => {
    setIsEditing(false)
    if (editValue.trim() !== value) {
      onChange(editValue.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleCommit()
    }
    if (e.key === 'Escape') {
      setEditValue(value)
      setIsEditing(false)
    }
  }

  if (isEditing) {
    const sharedProps = {
      value: editValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setEditValue(e.target.value),
      onBlur: handleCommit,
      onKeyDown: handleKeyDown,
      placeholder,
      className: cn(
        'w-full bg-background border border-primary/30 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50',
        className
      ),
    }

    return multiline ? (
      <textarea ref={inputRef as React.RefObject<HTMLTextAreaElement>} rows={3} {...sharedProps} />
    ) : (
      <input ref={inputRef as React.RefObject<HTMLInputElement>} type="text" {...sharedProps} />
    )
  }

  return (
    <span
      className={cn(
        'group/edit inline-flex items-center gap-1 cursor-pointer rounded px-0.5 -mx-0.5 hover:bg-muted/50 transition-colors',
        className
      )}
      onClick={() => {
        setEditValue(value)
        setIsEditing(true)
      }}
      title={fieldLabel ? `Click to edit ${fieldLabel}` : 'Click to edit'}
    >
      <span className="min-w-0">
        {value || <span className="text-muted-foreground/40 italic">{placeholder}</span>}
      </span>
      <Pencil className="h-2.5 w-2.5 text-muted-foreground/0 group-hover/edit:text-muted-foreground/50 shrink-0 transition-colors" />
      {onRegenerateField && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRegenerateField()
          }}
          className="text-muted-foreground/0 group-hover/edit:text-primary/60 hover:!text-primary shrink-0 transition-colors"
          title={`Regenerate ${fieldLabel || 'field'}`}
        >
          <RefreshCw className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  )
}

// =============================================================================
// RICH SCENE CARD — wider card with all fields + inline editing
// =============================================================================

function RichSceneCard({
  scene,
  isFirst,
  timestamp,
  isSelected,
  onToggleSelect,
  onClickFeedback,
  onSceneEdit,
  onRegenerateScene,
  onRegenerateField,
}: {
  scene: StoryboardScene
  isFirst: boolean
  timestamp: { start: string; end: string }
  isSelected: boolean
  onToggleSelect: () => void
  onClickFeedback?: () => void
  onSceneEdit?: (field: string, value: string) => void
  onRegenerateScene?: () => void
  onRegenerateField?: (field: string) => void
}) {
  return (
    <div
      className={cn(
        'rounded-lg border transition-all',
        isFirst ? 'border-amber-300/60 dark:border-amber-800/40' : 'border-border/40',
        isSelected && 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/10',
        !isSelected && 'hover:shadow-sm hover:border-border/80'
      )}
    >
      <div className="p-4 space-y-3">
        {/* Top row: checkbox, timestamp range, badge, regenerate */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleSelect()
            }}
            className={cn(
              'w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors',
              isSelected
                ? 'bg-emerald-600 border-emerald-600'
                : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400'
            )}
          >
            {isSelected && (
              <svg
                className="w-2.5 h-2.5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          <span className="text-xs font-mono text-muted-foreground/60">
            {timestamp.start}–{timestamp.end}
          </span>
          <span className="text-xs text-muted-foreground/40">·</span>
          <EditableField
            value={scene.title}
            onChange={(val) => onSceneEdit?.('title', val)}
            className="text-sm font-medium text-foreground"
            fieldLabel="title"
          />
          {isFirst && (
            <Badge
              variant="outline"
              className="text-[9px] h-4 px-1.5 border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 uppercase tracking-wide ml-auto shrink-0"
            >
              Hook
            </Badge>
          )}
          {onRegenerateScene && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRegenerateScene()
              }}
              className="ml-auto p-1 rounded text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
              title="Regenerate this scene"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Description — full, no line clamp */}
        <div className="text-xs text-muted-foreground leading-relaxed">
          <EditableField
            value={scene.description}
            onChange={(val) => onSceneEdit?.('description', val)}
            onRegenerateField={() => onRegenerateField?.('description')}
            placeholder="Scene description..."
            multiline
            fieldLabel="description"
          />
        </div>

        {/* Camera note */}
        {(scene.cameraNote || onSceneEdit) && (
          <div className="flex items-start gap-1.5 text-muted-foreground/70">
            <Camera className="h-3 w-3 mt-0.5 shrink-0" />
            <EditableField
              value={scene.cameraNote || ''}
              onChange={(val) => onSceneEdit?.('cameraNote', val)}
              onRegenerateField={() => onRegenerateField?.('cameraNote')}
              placeholder="Camera direction..."
              className="text-[11px] leading-relaxed"
              fieldLabel="camera note"
            />
          </div>
        )}

        {/* Visual note */}
        {(scene.visualNote || onSceneEdit) && (
          <div className="flex items-start gap-1.5 text-muted-foreground/70">
            <Eye className="h-3 w-3 mt-0.5 shrink-0" />
            <EditableField
              value={scene.visualNote}
              onChange={(val) => onSceneEdit?.('visualNote', val)}
              onRegenerateField={() => onRegenerateField?.('visualNote')}
              placeholder="Visual note..."
              className="text-[11px] italic leading-relaxed"
              fieldLabel="visual note"
            />
          </div>
        )}

        {/* Voiceover */}
        {(scene.voiceover || onSceneEdit) && (
          <div className="rounded-md bg-muted/40 px-3 py-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Mic className="h-3 w-3 text-muted-foreground/60" />
              <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                VO
              </span>
            </div>
            <EditableField
              value={scene.voiceover || ''}
              onChange={(val) => onSceneEdit?.('voiceover', val)}
              onRegenerateField={() => onRegenerateField?.('voiceover')}
              placeholder="Voiceover text..."
              multiline
              className="text-xs italic text-foreground/80 leading-relaxed"
              fieldLabel="voiceover"
            />
          </div>
        )}

        {/* Transition */}
        {(scene.transition || onSceneEdit) && (
          <div className="flex items-center gap-1.5 text-muted-foreground/60">
            <ArrowRightLeft className="h-3 w-3 shrink-0" />
            <span className="text-[10px] uppercase tracking-wider font-medium">Transition:</span>
            <EditableField
              value={scene.transition || ''}
              onChange={(val) => onSceneEdit?.('transition', val)}
              placeholder="cut"
              className="text-[11px]"
              fieldLabel="transition"
            />
          </div>
        )}

        {/* Elaboration detail */}
        <ElaborationDetail scene={scene} />

        {/* Hook data — scene 1 only */}
        {isFirst && scene.hookData && <HookDataInline hookData={scene.hookData} />}

        {/* Reference video link */}
        {scene.referenceVideoId && (
          <div className="flex items-center gap-1.5">
            <Video className="h-3 w-3 text-primary" />
            <span className="text-[11px] text-primary">Reference video linked</span>
          </div>
        )}

        {/* Style references */}
        {scene.styleReferences && scene.styleReferences.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium">
              Refs:
            </span>
            {scene.styleReferences.map((ref, i) => (
              <span
                key={i}
                className="text-[11px] text-primary/70 underline underline-offset-2 decoration-primary/20"
              >
                {ref}
              </span>
            ))}
          </div>
        )}

        {/* Bottom row: duration + feedback */}
        <div className="flex items-center justify-between pt-1 border-t border-border/20">
          <span className="text-[10px] text-muted-foreground">
            <EditableField
              value={scene.duration}
              onChange={(val) => onSceneEdit?.('duration', val)}
              placeholder="0s"
              className="font-mono"
              fieldLabel="duration"
            />
          </span>
          {onClickFeedback && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onClickFeedback()
              }}
              className="p-1 rounded text-muted-foreground/50 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
              title="Give feedback on this scene"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// RICH STORYBOARD PANEL — full panel for the structure panel
// =============================================================================

interface RichStoryboardPanelProps {
  scenes: StoryboardScene[]
  className?: string
  onSceneClick?: (scene: StoryboardScene) => void
  onMultiSceneFeedback?: (scenes: StoryboardScene[]) => void
  onSceneEdit?: (sceneNumber: number, field: string, value: string) => void
  onRegenerateStoryboard?: () => void
  onRegenerateScene?: (scene: StoryboardScene) => void
  onRegenerateField?: (scene: StoryboardScene, field: string) => void
}

export function RichStoryboardPanel({
  scenes,
  className,
  onSceneClick,
  onMultiSceneFeedback,
  onSceneEdit,
  onRegenerateStoryboard,
  onRegenerateScene,
  onRegenerateField,
}: RichStoryboardPanelProps) {
  const [selectedScenes, setSelectedScenes] = useState<number[]>([])

  if (scenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Film className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Storyboard will appear here</p>
      </div>
    )
  }

  const totalDuration = scenes.reduce((acc, scene) => acc + parseDurationSeconds(scene.duration), 0)
  const timestampRanges = computeTimestampRanges(scenes)

  const toggleSelect = (sceneNumber: number) => {
    setSelectedScenes((prev) =>
      prev.includes(sceneNumber) ? prev.filter((n) => n !== sceneNumber) : [...prev, sceneNumber]
    )
  }

  const handleMultiFeedback = () => {
    if (selectedScenes.length === 0 || !onMultiSceneFeedback) return
    const selected = scenes.filter((s) => selectedScenes.includes(s.sceneNumber))
    onMultiSceneFeedback(selected)
    setSelectedScenes([])
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-foreground">Storyboard</span>
            <span className="text-xs text-muted-foreground">
              {scenes.length} {scenes.length === 1 ? 'scene' : 'scenes'}
            </span>
            {totalDuration > 0 && (
              <>
                <span className="text-muted-foreground/30">·</span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatTimestamp(totalDuration)}</span>
                </div>
              </>
            )}
          </div>
          {onRegenerateStoryboard && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRegenerateStoryboard}
              className="gap-1.5 text-xs h-7 text-muted-foreground hover:text-primary"
            >
              <RefreshCw className="h-3 w-3" />
              Regenerate
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable rich scene cards */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {scenes.map((scene, index) => (
            <motion.div
              key={scene.sceneNumber}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.04 }}
            >
              <RichSceneCard
                scene={scene}
                isFirst={index === 0}
                timestamp={timestampRanges[index]}
                isSelected={selectedScenes.includes(scene.sceneNumber)}
                onToggleSelect={() => toggleSelect(scene.sceneNumber)}
                onClickFeedback={onSceneClick ? () => onSceneClick(scene) : undefined}
                onSceneEdit={
                  onSceneEdit
                    ? (field, value) => onSceneEdit(scene.sceneNumber, field, value)
                    : undefined
                }
                onRegenerateScene={onRegenerateScene ? () => onRegenerateScene(scene) : undefined}
                onRegenerateField={
                  onRegenerateField ? (field) => onRegenerateField(scene, field) : undefined
                }
              />
            </motion.div>
          ))}
        </div>
      </ScrollArea>

      {/* Sticky multi-select action bar */}
      <AnimatePresence>
        {selectedScenes.length > 0 && onMultiSceneFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 px-4 py-3 border-t border-border/40 bg-background/95 backdrop-blur-sm flex items-center justify-between"
          >
            <span className="text-sm text-muted-foreground">
              {selectedScenes.length} {selectedScenes.length === 1 ? 'scene' : 'scenes'} selected
            </span>
            <Button size="sm" onClick={handleMultiFeedback} className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Give feedback
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// =============================================================================
// LEGACY EXPORT — kept for backward compatibility
// =============================================================================

export { StoryboardSummaryCard as StoryboardView }
