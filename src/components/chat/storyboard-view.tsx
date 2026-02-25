'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Film,
  Clock,
  Eye,
  Target,
  Video,
  MessageSquare,
  ArrowRight,
  RefreshCw,
  Sparkles,
  ChevronDown,
  Check,
  GripVertical,
  Pencil,
  Minus,
  Plus,
  X,
  Play,
  Undo2,
  Redo2,
  Download,
  Clipboard,
} from 'lucide-react'
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent } from '@/components/ui/sheet'

import { OptimizedImage } from '@/components/ui/optimized-image'
import type { StoryboardScene } from '@/lib/ai/briefing-state-machine'
import type { SceneImageData } from '@/hooks/use-storyboard'
import { TimelineBar, getSceneRole } from './timeline-bar'
import { StoryboardPreview } from './storyboard-preview'
import { useStoryboardKeyboard } from '@/hooks/use-storyboard-keyboard'
import { copyStoryboardToClipboard, exportStoryboardJSON } from '@/lib/storyboard-export'

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
// SCENE GRADIENT — single neutral gradient for all scene thumbnails
// =============================================================================

const SCENE_GRADIENT = {
  bg: 'from-muted/60 to-muted/30 dark:from-muted/40 dark:to-muted/20',
  number: 'text-muted-foreground/20',
  icon: 'text-muted-foreground/10',
}

function getSceneGradient(_index: number) {
  return SCENE_GRADIENT
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
// EDITABLE FIELD — click to edit, blur/Enter to save (#7)
// =============================================================================

function EditableField({
  value,
  field,
  onSave,
  multiline = false,
  className,
  displayClassName,
}: {
  value: string
  field: string
  onSave: (field: string, value: string) => void
  multiline?: boolean
  className?: string
  displayClassName?: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    setEditValue(value)
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = useCallback(() => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== value) {
      onSave(field, trimmed)
    } else {
      setEditValue(value)
    }
    setIsEditing(false)
  }, [editValue, value, field, onSave])

  if (isEditing) {
    const sharedProps = {
      value: editValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setEditValue(e.target.value),
      onBlur: handleSave,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          handleSave()
        }
        if (e.key === 'Escape') {
          setEditValue(value)
          setIsEditing(false)
        }
      },
      className: cn(
        'w-full bg-transparent border border-primary/30 rounded px-1.5 py-0.5 text-foreground outline-none focus:ring-1 focus:ring-primary/50',
        className
      ),
    }

    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          rows={3}
          {...sharedProps}
        />
      )
    }
    return (
      <input ref={inputRef as React.RefObject<HTMLInputElement>} type="text" {...sharedProps} />
    )
  }

  return (
    <span
      className={cn('group/edit cursor-pointer inline-flex items-center gap-1', displayClassName)}
      onClick={(e) => {
        e.stopPropagation()
        setIsEditing(true)
      }}
    >
      <span className={className}>{value}</span>
      <Pencil className="h-2.5 w-2.5 text-muted-foreground/0 group-hover/edit:text-muted-foreground/60 transition-colors shrink-0" />
    </span>
  )
}

// =============================================================================
// DURATION CONTROL — +/- buttons around duration (#23)
// =============================================================================

function DurationControl({
  duration,
  onDurationChange,
  compact = false,
}: {
  duration: string
  onDurationChange: (newDuration: string) => void
  compact?: boolean
}) {
  const seconds = parseDurationSeconds(duration)

  const adjust = (delta: number) => {
    const newSeconds = Math.max(1, seconds + delta)
    onDurationChange(`${newSeconds}s`)
  }

  return (
    <div className="inline-flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => adjust(-1)}
        className={cn(
          'rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground',
          compact ? 'p-0.5' : 'p-1'
        )}
        title="Decrease duration"
      >
        <Minus className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      </button>
      <span className={cn('font-mono tabular-nums', compact ? 'text-xs px-0.5' : 'text-sm px-1')}>
        {seconds}s
      </span>
      <button
        type="button"
        onClick={() => adjust(1)}
        className={cn(
          'rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground',
          compact ? 'p-0.5' : 'p-1'
        )}
        title="Increase duration"
      >
        <Plus className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      </button>
    </div>
  )
}

// =============================================================================
// SCENE ROLE BADGE COLORS (#24)
// =============================================================================

const ROLE_BADGE_COLORS: Record<string, string> = {
  hook: 'bg-amber-500/70',
  cta: 'bg-emerald-500/70',
  transition: 'bg-purple-500/70',
  feature: 'bg-black/40',
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
// SCENE THUMBNAIL — gradient placeholder or reference image
// =============================================================================

function SceneThumbnail({
  scene,
  index,
  sceneImageData,
  getImageUrl,
}: {
  scene: StoryboardScene
  index: number
  sceneImageData?: SceneImageData
  getImageUrl?: (imageId: string) => string
}) {
  const imageId = scene.referenceImageIds?.[0]
  const refImageUrl = imageId && getImageUrl ? getImageUrl(imageId) : null
  // Prefer multi-source scene image, fall back to persisted URL on scene, then reference image
  const imageUrl = sceneImageData?.primaryUrl || scene.resolvedImageUrl || refImageUrl
  const isGif = sceneImageData?.primaryMediaType === 'gif'
  const gradient = getSceneGradient(index)

  // Source display name for badge
  const sourceLabel = sceneImageData
    ? {
        'film-grab': 'Film-Grab',
        'flim-ai': 'Flim.ai',
        pexels: 'Pexels',
        eyecannndy: 'Eyecannndy',
        unsplash: 'Unsplash',
        dribbble: 'Dribbble',
      }[sceneImageData.primarySource]
    : null

  return (
    <div
      className={cn(
        'relative aspect-video w-full rounded-t-lg overflow-hidden',
        !imageUrl && `bg-gradient-to-br ${gradient.bg}`
      )}
    >
      {imageUrl ? (
        isGif ? (
          // Native <img> for GIFs — Next.js Image strips animation
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={`Scene ${scene.sceneNumber} thumbnail`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <OptimizedImage
            src={imageUrl}
            alt={`Scene ${scene.sceneNumber} thumbnail`}
            fill
            className="object-cover"
            containerClassName="absolute inset-0"
            sizes="(max-width: 768px) 100vw, 400px"
          />
        )
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
          <Film className={cn('h-6 w-6 mb-1.5', gradient.icon)} />
          <span
            className={cn(
              'text-xs font-semibold leading-tight line-clamp-2 select-none',
              gradient.number
            )}
          >
            {scene.title || `Scene ${scene.sceneNumber}`}
          </span>
        </div>
      )}

      {/* Source badge — bottom-left */}
      {imageUrl && sourceLabel && (
        <span className="absolute bottom-1.5 left-1.5 text-[9px] font-medium px-1.5 py-0.5 rounded bg-black/50 text-white/80 backdrop-blur-sm">
          {sourceLabel}
        </span>
      )}

      {/* Technique badge — bottom-right */}
      {sceneImageData?.techniqueRef && (
        <a
          href={sceneImageData.techniqueRef.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-1.5 right-1.5 text-[9px] font-medium px-1.5 py-0.5 rounded bg-emerald-700/70 text-white/90 backdrop-blur-sm hover:bg-emerald-600/80 transition-colors flex items-center gap-0.5"
        >
          <Video className="h-2.5 w-2.5" />
          {sceneImageData.techniqueRef.name}
        </a>
      )}
    </div>
  )
}

// =============================================================================
// RICH SCENE CARD — thumbnail-first card with information hierarchy
// =============================================================================

function RichSceneCard({
  scene,
  index,
  isFirst,
  totalScenes,
  timestamp,
  isSelected,
  isChanged,
  fieldChanges,
  onToggleSelect,
  onSceneEdit,
  onRegenerateScene,
  onOpenDetail,
  sceneImageData,
  getImageUrl,
}: {
  scene: StoryboardScene
  index: number
  isFirst: boolean
  totalScenes: number
  timestamp: { start: string; end: string }
  isSelected: boolean
  isChanged?: boolean
  fieldChanges?: { field: string; oldValue: string; newValue: string }[]
  onToggleSelect: () => void
  onSceneEdit?: (field: string, value: string) => void
  onRegenerateScene?: () => void
  onOpenDetail?: () => void
  sceneImageData?: SceneImageData
  getImageUrl?: (imageId: string) => string
}) {
  // Drag-and-drop via @dnd-kit/sortable (#6)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `scene-${scene.sceneNumber}`,
  })
  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const role = getSceneRole(scene, index, totalScenes)
  const badgeBg = ROLE_BADGE_COLORS[role] || ROLE_BADGE_COLORS.feature

  return (
    <div
      ref={setNodeRef}
      style={sortableStyle}
      {...attributes}
      onClick={onToggleSelect}
      className={cn(
        'group/card rounded-lg border overflow-hidden transition-all cursor-pointer',
        'border-border/50',
        isSelected && 'ring-2 ring-primary bg-primary/5',
        isChanged && !isSelected && 'ring-2 ring-emerald-400/60 animate-pulse',
        !isSelected && !isChanged && 'hover:shadow-sm hover:border-border/80',
        isDragging && 'opacity-50 shadow-lg z-50'
      )}
    >
      {/* Thumbnail area with overlaid controls */}
      <div className="relative">
        <SceneThumbnail
          scene={scene}
          index={index}
          sceneImageData={sceneImageData}
          getImageUrl={getImageUrl}
        />

        {/* Drag handle — top-left corner, hover-reveal (#6) */}
        <div
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 left-2 p-1 rounded bg-black/30 text-white/70 backdrop-blur-sm opacity-0 group-hover/card:opacity-100 hover:bg-black/50 hover:text-white transition-all cursor-grab active:cursor-grabbing z-10"
          title="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>

        {/* Selected checkmark badge — top-left, offset from drag handle */}
        {isSelected && (
          <div className="absolute top-2 left-9 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-3 w-3 text-primary-foreground" />
          </div>
        )}

        {/* Scene number badge — top-right, colored by role (#24) */}
        <Badge
          variant="secondary"
          className={cn(
            'absolute top-2 right-2 text-[10px] h-5 px-1.5 text-white border-0 backdrop-blur-sm',
            badgeBg
          )}
        >
          Scene {scene.sceneNumber}
        </Badge>

        {/* Updated badge — visual diff indicator (U1 + #21 field diffs) */}
        {isChanged && (
          <Badge
            variant="secondary"
            className={cn(
              'absolute top-2 text-[9px] h-4 px-1.5 bg-emerald-600/80 text-white border-0 backdrop-blur-sm animate-pulse cursor-help',
              isSelected ? 'left-16' : 'left-9'
            )}
            title={
              fieldChanges?.length
                ? fieldChanges
                    .map((c) =>
                      c.field === 'scene'
                        ? c.newValue
                        : `${c.field}: "${c.oldValue.slice(0, 30)}" → "${c.newValue.slice(0, 30)}"`
                    )
                    .join('\n')
                : 'Updated'
            }
          >
            Updated
          </Badge>
        )}

        {/* Regenerate button — bottom-right of thumbnail, hover-reveal */}
        {onRegenerateScene && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRegenerateScene()
            }}
            className="absolute bottom-2 right-2 p-1.5 rounded-md bg-black/40 text-white/80 backdrop-blur-sm opacity-0 group-hover/card:opacity-100 hover:bg-black/60 hover:text-white transition-all"
            title="Regenerate this scene"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Card body */}
      <div className="p-3 space-y-2">
        {/* Timestamp + duration row with DurationControl (#23) */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono font-semibold text-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded">
            {timestamp.start}–{timestamp.end}
          </span>
          <span className="text-xs text-muted-foreground/30">—</span>
          {onSceneEdit ? (
            <DurationControl
              duration={scene.duration}
              onDurationChange={(val) => onSceneEdit('duration', val)}
              compact
            />
          ) : (
            parseDurationSeconds(scene.duration) > 0 && (
              <span className="text-xs font-mono text-muted-foreground">
                {parseDurationSeconds(scene.duration)}s
              </span>
            )
          )}
        </div>

        {/* Title — editable (#7) */}
        <h4 className="text-sm font-medium text-foreground leading-snug">
          {onSceneEdit ? (
            <EditableField
              value={scene.title}
              field="title"
              onSave={onSceneEdit}
              className="text-sm font-medium"
            />
          ) : (
            scene.title
          )}
          {isFirst && (
            <Badge
              variant="outline"
              className="ml-1.5 text-[9px] h-4 px-1.5 border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 uppercase tracking-wide align-middle"
            >
              Hook
            </Badge>
          )}
        </h4>

        {/* Summary lines: Script, Visual */}
        <div className="space-y-1">
          {scene.voiceover && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              <span className="font-medium text-muted-foreground/80">Script:</span>{' '}
              {scene.voiceover}
            </p>
          )}
          {scene.visualNote && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              <span className="font-medium text-muted-foreground/80">Visual:</span>{' '}
              {scene.visualNote}
            </p>
          )}
        </div>

        {/* "More details" opens the detail drawer (#14) */}
        {onOpenDetail && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onOpenDetail()
            }}
            className="flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors py-1"
          >
            <ChevronDown className="h-3 w-3" />
            <span>More details</span>
          </button>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// DYNAMIC ATTRIBUTION — shows unique sources used
// =============================================================================

const SOURCE_LINKS: Record<string, { name: string; url: string }> = {
  'film-grab': { name: 'Film-Grab', url: 'https://film-grab.com' },
  'flim-ai': { name: 'Flim.ai', url: 'https://flim.ai' },
  pexels: { name: 'Pexels', url: 'https://www.pexels.com' },
  eyecannndy: { name: 'Eyecannndy', url: 'https://eyecannndy.com' },
}

function DynamicAttribution({ sceneImageData }: { sceneImageData: Map<number, SceneImageData> }) {
  const uniqueSources = new Set<string>()
  for (const data of sceneImageData.values()) {
    uniqueSources.add(data.primarySource)
    if (data.techniqueRef) uniqueSources.add('eyecannndy')
  }

  const sourceEntries = [...uniqueSources].map((s) => SOURCE_LINKS[s]).filter(Boolean)

  if (sourceEntries.length === 0) return null

  return (
    <span className="text-[10px] text-muted-foreground/50">
      Images from{' '}
      {sourceEntries.map((source, i) => (
        <span key={source.name}>
          {i > 0 && (i === sourceEntries.length - 1 ? ' & ' : ', ')}
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground transition-colors"
          >
            {source.name}
          </a>
        </span>
      ))}
    </span>
  )
}

// =============================================================================
// RICH STORYBOARD PANEL — full panel for the structure panel
// =============================================================================

interface RichStoryboardPanelProps {
  scenes: StoryboardScene[]
  className?: string
  sceneImageData?: Map<number, SceneImageData>
  isRegenerating?: boolean
  changedScenes?: Map<number, { field: string; oldValue: string; newValue: string }[]>
  onSceneClick?: (scene: StoryboardScene) => void
  onSelectionChange?: (scenes: StoryboardScene[]) => void
  onSceneEdit?: (sceneNumber: number, field: string, value: string) => void
  onSceneReorder?: (scenes: StoryboardScene[]) => void
  onRegenerateStoryboard?: () => void
  onRegenerateScene?: (scene: StoryboardScene) => void
  onRegenerateField?: (scene: StoryboardScene, field: string) => void
  getImageUrl?: (imageId: string) => string
  // Undo/Redo (#20)
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
}

// Duration targets (common video ad lengths in seconds)
const DURATION_TARGETS = [15, 30, 60, 90, 120]

function getDurationIndicator(totalDuration: number): {
  color: 'green' | 'amber' | null
  target: number | null
} {
  for (const target of DURATION_TARGETS) {
    const diff = Math.abs(totalDuration - target)
    if (diff <= 5) return { color: 'green', target }
    if (diff <= 10) return { color: 'amber', target }
  }
  return { color: null, target: null }
}

// =============================================================================
// DURATION BUDGET BAR (#8) — visual bar showing current vs target duration
// =============================================================================

function DurationBudgetBar({
  totalDuration,
  targetDuration,
  onTargetChange,
}: {
  totalDuration: number
  targetDuration: number
  onTargetChange: (target: number) => void
}) {
  const ratio = targetDuration > 0 ? totalDuration / targetDuration : 0
  const isOver = ratio > 1
  const isClose = ratio >= 0.9 && ratio <= 1.1
  const barColor = isOver ? 'bg-red-500' : isClose ? 'bg-amber-500' : 'bg-emerald-500'
  const textColor = isOver ? 'text-red-500' : isClose ? 'text-amber-500' : 'text-emerald-600'

  return (
    <div className="shrink-0 px-4 py-2 border-b border-border/20 flex items-center gap-3">
      {/* Large numeric display */}
      <div className="flex items-baseline gap-1">
        <span className={cn('text-lg font-bold tabular-nums', textColor)}>
          {formatTimestamp(totalDuration)}
        </span>
        <span className="text-xs text-muted-foreground/60">/</span>
        <span className="text-sm text-muted-foreground tabular-nums">
          {formatTimestamp(targetDuration)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', barColor)}
          style={{ width: `${Math.min(ratio * 100, 100)}%` }}
        />
      </div>

      {/* Target selector */}
      <select
        value={targetDuration}
        onChange={(e) => onTargetChange(Number(e.target.value))}
        onClick={(e) => e.stopPropagation()}
        className="text-[10px] bg-transparent border border-border/50 rounded px-1.5 py-0.5 text-muted-foreground cursor-pointer outline-none focus:ring-1 focus:ring-primary/50"
      >
        {DURATION_TARGETS.map((t) => (
          <option key={t} value={t}>
            {t}s
          </option>
        ))}
      </select>
    </div>
  )
}

// Rotating loading messages for regeneration (U2)
const REGEN_LOADING_MESSAGES = [
  'Analyzing your feedback...',
  'Updating scenes...',
  'Refining the narrative...',
  'Generating visuals...',
  'Polishing transitions...',
]

export function RichStoryboardPanel({
  scenes,
  className,
  sceneImageData,
  isRegenerating,
  changedScenes,
  onSelectionChange,
  onSceneEdit,
  onSceneReorder,
  onRegenerateStoryboard,
  onRegenerateScene,
  onRegenerateField: _onRegenerateField,
  getImageUrl,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: RichStoryboardPanelProps) {
  const [selectedScenes, setSelectedScenes] = useState<number[]>([])
  const [regenConfirm, setRegenConfirm] = useState(false)
  const [_regenLoadingMsg, setRegenLoadingMsg] = useState(0)
  const [detailScene, setDetailScene] = useState<StoryboardScene | null>(null)
  const [targetDuration, setTargetDuration] = useState(60)
  const [previewOpen, setPreviewOpen] = useState(false)

  // DnD sensors with activation constraint to avoid conflicts with click (#6)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // Keyboard shortcuts (#18)
  useStoryboardKeyboard({
    enabled: !previewOpen && !detailScene,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
  })

  // Rotate loading messages during regeneration (U2)
  useEffect(() => {
    if (!isRegenerating) return
    const interval = setInterval(() => {
      setRegenLoadingMsg((prev) => (prev + 1) % REGEN_LOADING_MESSAGES.length)
    }, 3000)
    return () => {
      clearInterval(interval)
      setRegenLoadingMsg(0)
    }
  }, [isRegenerating])

  // Auto-reset regenerate confirmation after 3s (U15)
  useEffect(() => {
    if (!regenConfirm) return
    const timeout = setTimeout(() => setRegenConfirm(false), 3000)
    return () => clearTimeout(timeout)
  }, [regenConfirm])

  // Notify parent whenever selection changes
  useEffect(() => {
    if (onSelectionChange) {
      const selected = scenes.filter((s) => selectedScenes.includes(s.sceneNumber))
      onSelectionChange(selected)
    }
  }, [selectedScenes, scenes, onSelectionChange])

  // Handle drag end — reorder scenes (#6)
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id || !onSceneReorder) return

      const activeSceneNum = parseInt(String(active.id).replace('scene-', ''), 10)
      const overSceneNum = parseInt(String(over.id).replace('scene-', ''), 10)

      const oldIndex = scenes.findIndex((s) => s.sceneNumber === activeSceneNum)
      const newIndex = scenes.findIndex((s) => s.sceneNumber === overSceneNum)

      if (oldIndex === -1 || newIndex === -1) return

      const reordered = [...scenes]
      const [moved] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, moved)
      onSceneReorder(reordered)
    },
    [scenes, onSceneReorder]
  )

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
  const sortableIds = scenes.map((s) => `scene-${s.sceneNumber}`)

  const toggleSelect = (sceneNumber: number) => {
    setSelectedScenes((prev) =>
      prev.includes(sceneNumber) ? prev.filter((n) => n !== sceneNumber) : [...prev, sceneNumber]
    )
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
            {totalDuration > 0 &&
              (() => {
                const indicator = getDurationIndicator(totalDuration)
                return (
                  <>
                    <span className="text-muted-foreground/30">·</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatTimestamp(totalDuration)}</span>
                      {indicator.color === 'green' && indicator.target && (
                        <span
                          className="flex items-center gap-0.5 text-emerald-600"
                          title={`Within 5s of ${indicator.target}s target`}
                        >
                          <Check className="h-3 w-3" />
                          <span className="text-[10px]">{indicator.target}s</span>
                        </span>
                      )}
                      {indicator.color === 'amber' && indicator.target && (
                        <span
                          className="text-amber-500 text-[10px]"
                          title={`${Math.abs(totalDuration - indicator.target)}s from ${indicator.target}s target`}
                        >
                          ~{indicator.target}s
                        </span>
                      )}
                    </div>
                  </>
                )
              })()}
          </div>
          <div className="flex items-center gap-1">
            {/* Undo/Redo buttons (#20) */}
            {onUndo && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onUndo}
                disabled={!canUndo}
                className="h-7 w-7 text-muted-foreground hover:text-primary disabled:opacity-30"
                title="Undo (Cmd+Z)"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {onRedo && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRedo}
                disabled={!canRedo}
                className="h-7 w-7 text-muted-foreground hover:text-primary disabled:opacity-30"
                title="Redo (Cmd+Shift+Z)"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {/* Export buttons (#19) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => copyStoryboardToClipboard(scenes)}
              className="h-7 w-7 text-muted-foreground hover:text-primary"
              title="Copy to clipboard"
            >
              <Clipboard className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => exportStoryboardJSON(scenes)}
              className="h-7 w-7 text-muted-foreground hover:text-primary"
              title="Download JSON"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            {/* Preview button (#12) */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPreviewOpen(true)}
              className="gap-1.5 text-xs h-7 text-muted-foreground hover:text-primary"
            >
              <Play className="h-3 w-3" />
              Preview
            </Button>
            {onRegenerateStoryboard && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (regenConfirm) {
                    setRegenConfirm(false)
                    onRegenerateStoryboard()
                  } else {
                    setRegenConfirm(true)
                  }
                }}
                disabled={isRegenerating}
                className={cn(
                  'gap-1.5 text-xs h-7',
                  regenConfirm
                    ? 'text-amber-600 hover:text-amber-700 bg-amber-50 dark:bg-amber-900/20'
                    : 'text-muted-foreground hover:text-primary'
                )}
              >
                <RefreshCw className={cn('h-3 w-3', isRegenerating && 'animate-spin')} />
                {isRegenerating ? 'Regenerating...' : regenConfirm ? 'Confirm?' : 'Regenerate'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Duration Budget Bar (#8) */}
      {totalDuration > 0 && (
        <DurationBudgetBar
          totalDuration={totalDuration}
          targetDuration={targetDuration}
          onTargetChange={setTargetDuration}
        />
      )}

      {/* Timeline bar (#5) */}
      <TimelineBar scenes={scenes} className="shrink-0 py-2 border-b border-border/20" />

      {/* Scrollable rich scene cards with DnD (#6) */}
      <ScrollArea className="flex-1 relative">
        {/* Skeleton loading during regeneration (#3) */}
        {isRegenerating && (
          <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-[2px]">
            <div className="p-3 grid grid-cols-2 xl:grid-cols-3 gap-3">
              {scenes.map((scene) => (
                <div
                  key={scene.sceneNumber}
                  className="rounded-lg border border-border/30 overflow-hidden animate-pulse"
                >
                  <div className="aspect-video bg-muted/40" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 w-20 bg-muted/30 rounded" />
                    <div className="h-4 w-3/4 bg-muted/30 rounded" />
                    <div className="h-3 w-full bg-muted/20 rounded" />
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>Updating Scene {scene.sceneNumber}...</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
            <div className="p-3 grid grid-cols-2 xl:grid-cols-3 gap-3">
              {scenes.map((scene, index) => (
                <motion.div
                  key={scene.sceneNumber}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.04 }}
                >
                  <RichSceneCard
                    scene={scene}
                    index={index}
                    isFirst={index === 0}
                    totalScenes={scenes.length}
                    timestamp={timestampRanges[index]}
                    isSelected={selectedScenes.includes(scene.sceneNumber)}
                    isChanged={changedScenes?.has(scene.sceneNumber)}
                    fieldChanges={changedScenes?.get(scene.sceneNumber)}
                    onToggleSelect={() => toggleSelect(scene.sceneNumber)}
                    onSceneEdit={
                      onSceneEdit
                        ? (field, value) => onSceneEdit(scene.sceneNumber, field, value)
                        : undefined
                    }
                    onRegenerateScene={
                      onRegenerateScene ? () => onRegenerateScene(scene) : undefined
                    }
                    onOpenDetail={() => setDetailScene(scene)}
                    sceneImageData={sceneImageData?.get(scene.sceneNumber)}
                    getImageUrl={getImageUrl}
                  />
                </motion.div>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Dynamic attribution — shows unique sources used across all scenes */}
        {sceneImageData && sceneImageData.size > 0 && (
          <div className="px-3 pb-3 pt-1 text-center">
            <DynamicAttribution sceneImageData={sceneImageData} />
          </div>
        )}
      </ScrollArea>

      {/* Scene Detail Drawer (#14) */}
      <Sheet open={!!detailScene} onOpenChange={(open) => !open && setDetailScene(null)}>
        <SheetContent side="right" className="w-[420px] sm:w-[480px] p-0 overflow-y-auto">
          {detailScene && (
            <SceneDetailDrawer
              scene={detailScene}
              sceneImageData={sceneImageData?.get(detailScene.sceneNumber)}
              getImageUrl={getImageUrl}
              onSceneEdit={
                onSceneEdit
                  ? (field, value) => {
                      onSceneEdit(detailScene.sceneNumber, field, value)
                      // Keep drawer synced with latest data
                      setDetailScene((prev) => (prev ? { ...prev, [field]: value } : null))
                    }
                  : undefined
              }
              onClose={() => setDetailScene(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Storyboard Preview Dialog (#12) */}
      <StoryboardPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        scenes={scenes}
        sceneImageData={sceneImageData}
      />
    </div>
  )
}

// =============================================================================
// SCENE DETAIL DRAWER (#14) — right-anchored Sheet with all editable fields
// =============================================================================

function SceneDetailDrawer({
  scene,
  sceneImageData,
  getImageUrl,
  onSceneEdit,
  onClose,
}: {
  scene: StoryboardScene
  sceneImageData?: SceneImageData
  getImageUrl?: (imageId: string) => string
  onSceneEdit?: (field: string, value: string) => void
  onClose: () => void
}) {
  const imageId = scene.referenceImageIds?.[0]
  const refImageUrl = imageId && getImageUrl ? getImageUrl(imageId) : null
  const imageUrl = sceneImageData?.primaryUrl || scene.resolvedImageUrl || refImageUrl

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Scene {scene.sceneNumber}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{scene.duration}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Full-size thumbnail */}
      {imageUrl && (
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          <OptimizedImage
            src={imageUrl}
            alt={`Scene ${scene.sceneNumber}`}
            fill
            className="object-cover"
            containerClassName="absolute inset-0"
            sizes="480px"
          />
        </div>
      )}

      {/* Editable fields */}
      <div className="flex-1 px-6 py-4 space-y-5">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Title
          </label>
          {onSceneEdit ? (
            <EditableField
              value={scene.title}
              field="title"
              onSave={onSceneEdit}
              className="text-sm font-medium text-foreground"
            />
          ) : (
            <p className="text-sm font-medium text-foreground">{scene.title}</p>
          )}
        </div>

        {/* Duration */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Duration
          </label>
          {onSceneEdit ? (
            <DurationControl
              duration={scene.duration}
              onDurationChange={(val) => onSceneEdit('duration', val)}
            />
          ) : (
            <p className="text-sm text-foreground">{scene.duration}</p>
          )}
        </div>

        {/* Voiceover / Script */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Script / Voiceover
          </label>
          {onSceneEdit ? (
            <EditableField
              value={scene.voiceover || ''}
              field="voiceover"
              onSave={onSceneEdit}
              multiline
              className="text-xs text-muted-foreground leading-relaxed"
            />
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {scene.voiceover || 'No script yet'}
            </p>
          )}
        </div>

        {/* Visual Note */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Visual Direction
          </label>
          {onSceneEdit ? (
            <EditableField
              value={scene.visualNote || ''}
              field="visualNote"
              onSave={onSceneEdit}
              multiline
              className="text-xs text-muted-foreground leading-relaxed"
            />
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {scene.visualNote || 'No visual notes'}
            </p>
          )}
        </div>

        {/* Description */}
        {scene.description && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Description
            </label>
            {onSceneEdit ? (
              <EditableField
                value={scene.description}
                field="description"
                onSave={onSceneEdit}
                multiline
                className="text-xs text-muted-foreground leading-relaxed"
              />
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed">{scene.description}</p>
            )}
          </div>
        )}

        {/* Hook data — scene 1 only */}
        {scene.hookData && <HookDataInline hookData={scene.hookData} />}

        {/* Director Notes (elaboration) */}
        {scene.directorNotes && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Director Notes
            </label>
            <p className="text-xs text-muted-foreground leading-relaxed">{scene.directorNotes}</p>
          </div>
        )}

        {/* Camera Note */}
        {scene.cameraNote && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Camera
            </label>
            <p className="text-xs text-muted-foreground leading-relaxed">{scene.cameraNote}</p>
          </div>
        )}

        {/* Transition */}
        {scene.transition && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Transition
            </label>
            <p className="text-xs text-muted-foreground leading-relaxed">{scene.transition}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// LEGACY EXPORT — kept for backward compatibility
// =============================================================================

export { StoryboardSummaryCard as StoryboardView }
