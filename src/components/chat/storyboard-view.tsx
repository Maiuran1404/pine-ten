'use client'

import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

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
  sceneImageUrl,
  getImageUrl,
}: {
  scene: StoryboardScene
  index: number
  sceneImageUrl?: string
  getImageUrl?: (imageId: string) => string
}) {
  const imageId = scene.referenceImageIds?.[0]
  const refImageUrl = imageId && getImageUrl ? getImageUrl(imageId) : null
  // Prefer Pexels scene image, fall back to reference image
  const imageUrl = sceneImageUrl || refImageUrl
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
          containerClassName="absolute inset-0"
          sizes="(max-width: 768px) 100vw, 400px"
        />
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
  timestamp,
  isSelected,
  onToggleSelect,
  onSceneEdit: _onSceneEdit,
  onRegenerateScene,
  onRegenerateField: _onRegenerateField,
  sceneImageUrl,
  getImageUrl,
}: {
  scene: StoryboardScene
  index: number
  isFirst: boolean
  timestamp: { start: string; end: string }
  isSelected: boolean
  onToggleSelect: () => void
  onSceneEdit?: (field: string, value: string) => void
  onRegenerateScene?: () => void
  onRegenerateField?: (field: string) => void
  sceneImageUrl?: string
  getImageUrl?: (imageId: string) => string
}) {
  const [isExpanded, setIsExpanded] = useState(isSelected)
  const durSeconds = parseDurationSeconds(scene.duration)

  // Sync expanded state with selection — selecting expands, deselecting collapses
  useEffect(() => {
    setIsExpanded(isSelected)
  }, [isSelected])
  const hasExpandableContent = !!scene.voiceover || !!scene.visualNote || !!scene.description

  return (
    <div
      onClick={onToggleSelect}
      className={cn(
        'group/card rounded-lg border overflow-hidden transition-all cursor-pointer',
        'border-border/50',
        isSelected && 'ring-2 ring-primary bg-primary/5',
        !isSelected && 'hover:shadow-sm hover:border-border/80'
      )}
    >
      {/* Thumbnail area with overlaid controls */}
      <div className="relative">
        <SceneThumbnail
          scene={scene}
          index={index}
          sceneImageUrl={sceneImageUrl}
          getImageUrl={getImageUrl}
        />

        {/* Selected checkmark badge — top-left */}
        {isSelected && (
          <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-3 w-3 text-primary-foreground" />
          </div>
        )}

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
        {/* Timestamp + duration row */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono font-semibold text-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded">
            {timestamp.start}–{timestamp.end}
          </span>
          <span className="text-xs text-muted-foreground/30">—</span>
          {durSeconds > 0 && (
            <span className="text-xs font-mono text-muted-foreground">{durSeconds}s</span>
          )}
        </div>

        {/* Title — full width, no truncation */}
        <h4 className="text-sm font-medium text-foreground leading-snug">
          {scene.title}
          {isFirst && (
            <Badge
              variant="outline"
              className="ml-1.5 text-[9px] h-4 px-1.5 border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 uppercase tracking-wide align-middle"
            >
              Hook
            </Badge>
          )}
        </h4>

        {/* Summary lines: Script, Visual — expand in-place when toggled */}
        <div className="space-y-1">
          {scene.voiceover && (
            <p
              className={cn(
                'text-xs text-muted-foreground leading-relaxed',
                !isExpanded && 'line-clamp-2'
              )}
            >
              <span className="font-medium text-muted-foreground/80">Script:</span>{' '}
              {scene.voiceover}
            </p>
          )}
          {scene.visualNote && (
            <p
              className={cn(
                'text-xs text-muted-foreground leading-relaxed',
                !isExpanded && 'line-clamp-2'
              )}
            >
              <span className="font-medium text-muted-foreground/80">Visual:</span>{' '}
              {scene.visualNote}
            </p>
          )}
          {/* Description — only visible when expanded */}
          {isExpanded && scene.description && (
            <p className="text-xs text-muted-foreground leading-relaxed">{scene.description}</p>
          )}
        </div>

        {/* Hook data — scene 1 only, shown when expanded */}
        {isExpanded && isFirst && scene.hookData && <HookDataInline hookData={scene.hookData} />}

        {/* Expand/collapse toggle */}
        {hasExpandableContent && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded((prev) => !prev)
            }}
            className="flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors py-1"
          >
            <ChevronDown
              className={cn('h-3 w-3 transition-transform', isExpanded && 'rotate-180')}
            />
            <span>{isExpanded ? 'Less' : 'More details'}</span>
          </button>
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
  sceneImageUrls?: Map<number, string>
  isRegenerating?: boolean
  onSceneClick?: (scene: StoryboardScene) => void
  onSelectionChange?: (scenes: StoryboardScene[]) => void
  onSceneEdit?: (sceneNumber: number, field: string, value: string) => void
  onRegenerateStoryboard?: () => void
  onRegenerateScene?: (scene: StoryboardScene) => void
  onRegenerateField?: (scene: StoryboardScene, field: string) => void
  getImageUrl?: (imageId: string) => string
}

export function RichStoryboardPanel({
  scenes,
  className,
  sceneImageUrls,
  isRegenerating,
  onSelectionChange,
  onSceneEdit,
  onRegenerateStoryboard,
  onRegenerateScene,
  onRegenerateField,
  getImageUrl,
}: RichStoryboardPanelProps) {
  const [selectedScenes, setSelectedScenes] = useState<number[]>([])

  // Notify parent whenever selection changes
  useEffect(() => {
    if (onSelectionChange) {
      const selected = scenes.filter((s) => selectedScenes.includes(s.sceneNumber))
      onSelectionChange(selected)
    }
  }, [selectedScenes, scenes, onSelectionChange])

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
              disabled={isRegenerating}
              className="gap-1.5 text-xs h-7 text-muted-foreground hover:text-primary"
            >
              <RefreshCw className={cn('h-3 w-3', isRegenerating && 'animate-spin')} />
              {isRegenerating ? 'Regenerating...' : 'Regenerate'}
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable rich scene cards */}
      <ScrollArea className="flex-1 relative">
        {/* Loading overlay during regeneration */}
        {isRegenerating && (
          <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[1px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary animate-spin" />
              <span className="text-xs text-muted-foreground">Regenerating storyboard...</span>
            </div>
          </div>
        )}
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
                timestamp={timestampRanges[index]}
                isSelected={selectedScenes.includes(scene.sceneNumber)}
                onToggleSelect={() => toggleSelect(scene.sceneNumber)}
                onSceneEdit={
                  onSceneEdit
                    ? (field, value) => onSceneEdit(scene.sceneNumber, field, value)
                    : undefined
                }
                onRegenerateScene={onRegenerateScene ? () => onRegenerateScene(scene) : undefined}
                onRegenerateField={
                  onRegenerateField ? (field) => onRegenerateField(scene, field) : undefined
                }
                sceneImageUrl={sceneImageUrls?.get(scene.sceneNumber)}
                getImageUrl={getImageUrl}
              />
            </motion.div>
          ))}
        </div>

        {/* Pexels attribution — shown when any scene has a Pexels image */}
        {sceneImageUrls && sceneImageUrls.size > 0 && (
          <div className="px-3 pb-3 pt-1 text-center">
            <a
              href="https://www.pexels.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              Photos provided by Pexels
            </a>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

// =============================================================================
// LEGACY EXPORT — kept for backward compatibility
// =============================================================================

export { StoryboardSummaryCard as StoryboardView }
