'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Film, Clock, Eye, Target, Video, MessageSquare, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { StoryboardScene } from '@/lib/ai/briefing-state-machine'

// =============================================================================
// HELPERS
// =============================================================================

function parseDurationSeconds(duration: string): number {
  const match = duration.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

function formatTimestamp(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function computeTimestampRanges(scenes: StoryboardScene[]): { start: string; end: string }[] {
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
// LEGACY EXPORT — kept for backward compatibility
// =============================================================================

export { StoryboardSummaryCard as StoryboardView }
