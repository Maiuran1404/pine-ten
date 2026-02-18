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
  ChevronDown,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { OptimizedImage } from '@/components/ui/optimized-image'
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
// SCENE GRADIENT PALETTE — per-scene soft gradients by index
// =============================================================================

const SCENE_GRADIENTS = [
  {
    bg: 'from-rose-50 to-orange-50 dark:from-rose-900/20 dark:to-orange-900/10',
    number: 'text-rose-300/60 dark:text-rose-700/40',
    icon: 'text-rose-200/60 dark:text-rose-800/20',
  },
  {
    bg: 'from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/10',
    number: 'text-sky-300/60 dark:text-sky-700/40',
    icon: 'text-sky-200/60 dark:text-sky-800/20',
  },
  {
    bg: 'from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/10',
    number: 'text-violet-300/60 dark:text-violet-700/40',
    icon: 'text-violet-200/60 dark:text-violet-800/20',
  },
  {
    bg: 'from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/10',
    number: 'text-teal-300/60 dark:text-teal-700/40',
    icon: 'text-teal-200/60 dark:text-teal-800/20',
  },
  {
    bg: 'from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/10',
    number: 'text-amber-300/60 dark:text-amber-700/40',
    icon: 'text-amber-200/60 dark:text-amber-800/20',
  },
]

function getSceneGradient(index: number) {
  return SCENE_GRADIENTS[index % SCENE_GRADIENTS.length]
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
// SCENE THUMBNAIL — gradient placeholder or reference image
// =============================================================================

function SceneThumbnail({
  scene,
  index,
  getImageUrl,
}: {
  scene: StoryboardScene
  index: number
  getImageUrl?: (imageId: string) => string
}) {
  const imageId = scene.referenceImageIds?.[0]
  const imageUrl = imageId && getImageUrl ? getImageUrl(imageId) : null
  const gradient = getSceneGradient(index)

  return (
    <div
      className={cn(
        'relative aspect-video w-full rounded-t-lg overflow-hidden',
        !imageUrl && `bg-gradient-to-br ${gradient.bg}`
      )}
    >
      {imageUrl ? (
        <OptimizedImage
          src={imageUrl}
          alt={`Scene ${scene.sceneNumber} thumbnail`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 400px"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('text-5xl font-bold select-none', gradient.number)}>
            {scene.sceneNumber}
          </span>
          <Film className={cn('absolute bottom-2 right-2 h-4 w-4', gradient.icon)} />
        </div>
      )}
    </div>
  )
}

// =============================================================================
// RICH SCENE CARD — thumbnail-first card with information hierarchy
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
  getImageUrl,
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
  getImageUrl?: (imageId: string) => string
}) {
  const durSeconds = parseDurationSeconds(scene.duration)
  const hasTertiaryContent =
    scene.description ||
    scene.cameraNote ||
    (isFirst && scene.hookData) ||
    scene.fullScript ||
    scene.directorNotes ||
    scene.referenceDescription ||
    scene.referenceVideoId ||
    (scene.styleReferences && scene.styleReferences.length > 0)

  return (
    <div
      className={cn(
        'group/card rounded-lg border overflow-hidden transition-all',
        isFirst ? 'border-amber-300/60 dark:border-amber-800/40' : 'border-border/40',
        isSelected && 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/10',
        !isSelected && 'hover:shadow-sm hover:border-border/80'
      )}
    >
      {/* Thumbnail area with overlaid controls */}
      <div className="relative">
        <SceneThumbnail
          scene={scene}
          index={isFirst ? 0 : scene.sceneNumber - 1}
          getImageUrl={getImageUrl}
        />

        {/* Checkbox — top-left, hover-reveal (always visible when selected) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleSelect()
          }}
          className={cn(
            'absolute top-2 left-2 w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-all',
            isSelected
              ? 'bg-emerald-600 border-emerald-600 opacity-100'
              : 'border-white/80 bg-black/20 opacity-0 group-hover/card:opacity-100 hover:border-emerald-400'
          )}
        >
          {isSelected && (
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Scene number badge — top-right */}
        <Badge
          variant="secondary"
          className="absolute top-2 right-2 text-[10px] h-5 px-1.5 bg-black/40 text-white border-0 backdrop-blur-sm"
        >
          Scene {scene.sceneNumber}
        </Badge>

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
        {/* Heading row: timestamp range + title + duration badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-mono text-muted-foreground/60 shrink-0">
                {timestamp.start}–{timestamp.end}
              </span>
              <span className="text-xs text-muted-foreground/30">—</span>
              <span className="text-sm font-medium text-foreground truncate">{scene.title}</span>
              {isFirst && (
                <Badge
                  variant="outline"
                  className="text-[9px] h-4 px-1.5 border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 uppercase tracking-wide shrink-0"
                >
                  Hook
                </Badge>
              )}
            </div>
          </div>
          {durSeconds > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0 font-mono">
              {durSeconds}s
            </Badge>
          )}
        </div>

        {/* Summary lines: VO, Visual, Transition */}
        <div className="space-y-1">
          {scene.voiceover && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              <span className="font-medium text-muted-foreground/80">VO:</span> {scene.voiceover}
            </p>
          )}
          {scene.visualNote && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              <span className="font-medium text-muted-foreground/80">Visual:</span>{' '}
              {scene.visualNote}
            </p>
          )}
          {scene.transition && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-medium text-muted-foreground/80">Transition:</span>{' '}
              {scene.transition}
            </p>
          )}
        </div>

        {/* Collapsible tertiary details */}
        {hasTertiaryContent && (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors py-1 group/trigger">
              <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]/trigger:rotate-180" />
              <span>More details</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pt-2 space-y-3 border-t border-border/20 mt-1">
                {/* Description — full editable */}
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

                {/* Voiceover — full editable */}
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

                {/* Transition — editable */}
                {(scene.transition || onSceneEdit) && (
                  <div className="flex items-center gap-1.5 text-muted-foreground/60">
                    <ArrowRightLeft className="h-3 w-3 shrink-0" />
                    <span className="text-[10px] uppercase tracking-wider font-medium">
                      Transition:
                    </span>
                    <EditableField
                      value={scene.transition || ''}
                      onChange={(val) => onSceneEdit?.('transition', val)}
                      placeholder="cut"
                      className="text-[11px]"
                      fieldLabel="transition"
                    />
                  </div>
                )}

                {/* Hook data — scene 1 only */}
                {isFirst && scene.hookData && <HookDataInline hookData={scene.hookData} />}

                {/* Elaboration detail */}
                <ElaborationDetail scene={scene} />

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

                {/* Reference video link */}
                {scene.referenceVideoId && (
                  <div className="flex items-center gap-1.5">
                    <Video className="h-3 w-3 text-primary" />
                    <span className="text-[11px] text-primary">Reference video linked</span>
                  </div>
                )}

                {/* Duration — editable */}
                <div className="flex items-center gap-1.5 text-muted-foreground/60">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span className="text-[10px] uppercase tracking-wider font-medium">
                    Duration:
                  </span>
                  <EditableField
                    value={scene.duration}
                    onChange={(val) => onSceneEdit?.('duration', val)}
                    placeholder="0s"
                    className="text-[11px] font-mono"
                    fieldLabel="duration"
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Bottom row: feedback button (hover-revealed) */}
        {onClickFeedback && (
          <div className="flex items-center justify-end pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onClickFeedback()
              }}
              className="p-1 rounded text-muted-foreground/50 opacity-0 group-hover/card:opacity-100 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
              title="Give feedback on this scene"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
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
  getImageUrl?: (imageId: string) => string
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
  getImageUrl,
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
                getImageUrl={getImageUrl}
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
