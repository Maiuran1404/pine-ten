'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Film,
  Clock,
  Eye,
  Target,
  Video,
  ChevronDown,
  ChevronRight,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { StoryboardScene } from '@/lib/ai/briefing-state-machine'

// =============================================================================
// PROPS
// =============================================================================

interface StoryboardViewProps {
  scenes: StoryboardScene[]
  className?: string
  onSceneClick?: (scene: StoryboardScene) => void
  onMultiSceneFeedback?: (scenes: StoryboardScene[]) => void
}

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
// SCENE ROW — compact horizontal row with checkbox
// =============================================================================

function SceneRow({
  scene,
  isFirst,
  timestamp,
  isSelected,
  isExpanded,
  onToggleSelect,
  onToggleExpand,
  onClickFeedback,
}: {
  scene: StoryboardScene
  isFirst: boolean
  timestamp: { start: string; end: string }
  isSelected: boolean
  isExpanded: boolean
  onToggleSelect: () => void
  onToggleExpand: () => void
  onClickFeedback?: () => void
}) {
  return (
    <div
      className={cn(
        'rounded-lg border transition-all',
        isFirst ? 'border-amber-300/60 dark:border-amber-800/40' : 'border-border/40',
        isSelected && 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/10'
      )}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Checkbox */}
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

        {/* Scene number + timestamp */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono text-muted-foreground w-10">{timestamp.start}</span>
          {isFirst && (
            <Badge
              variant="outline"
              className="text-[9px] h-4 px-1.5 border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 uppercase tracking-wide"
            >
              Hook
            </Badge>
          )}
        </div>

        {/* Title + truncated description */}
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex-1 min-w-0 text-left flex items-center gap-2"
        >
          <h4 className="text-sm font-medium text-foreground truncate">{scene.title}</h4>
          <span className="text-xs text-muted-foreground truncate hidden sm:inline">
            {scene.description.length > 60
              ? scene.description.slice(0, 60) + '...'
              : scene.description}
          </span>
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
        </button>

        {/* Duration */}
        <span className="text-[10px] text-muted-foreground shrink-0">{scene.duration}</span>

        {/* Single scene feedback button */}
        {onClickFeedback && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onClickFeedback()
            }}
            className="p-1 rounded text-muted-foreground/50 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors shrink-0"
            title="Give feedback on this scene"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0 ml-7 space-y-2 border-t border-border/30">
              <p className="text-sm text-muted-foreground leading-relaxed pt-2">
                {scene.description}
              </p>

              {/* Visual note */}
              {scene.visualNote && (
                <div className="flex items-start gap-1.5 text-muted-foreground/80">
                  <Eye className="h-3 w-3 mt-0.5 shrink-0" />
                  <span className="text-xs italic">{scene.visualNote}</span>
                </div>
              )}

              {/* Hook data - only on scene 1 */}
              {isFirst && scene.hookData && <HookDataInline hookData={scene.hookData} />}

              {/* Reference video link */}
              {scene.referenceVideoId && (
                <div className="flex items-center gap-1.5">
                  <Video className="h-3 w-3 text-primary" />
                  <span className="text-xs text-primary">Reference video linked</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function StoryboardEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Film className="h-8 w-8 text-muted-foreground/40 mb-3" />
      <p className="text-sm text-muted-foreground">Storyboard will appear here</p>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function StoryboardView({
  scenes,
  className,
  onSceneClick,
  onMultiSceneFeedback,
}: StoryboardViewProps) {
  const [selectedScenes, setSelectedScenes] = useState<number[]>([])
  const [expandedScenes, setExpandedScenes] = useState<Set<number>>(new Set())

  if (scenes.length === 0) {
    return <StoryboardEmpty />
  }

  const totalDuration = scenes.reduce((acc, scene) => acc + parseDurationSeconds(scene.duration), 0)
  const timestampRanges = computeTimestampRanges(scenes)

  const toggleSelect = (sceneNumber: number) => {
    setSelectedScenes((prev) =>
      prev.includes(sceneNumber) ? prev.filter((n) => n !== sceneNumber) : [...prev, sceneNumber]
    )
  }

  const toggleExpand = (sceneNumber: number) => {
    setExpandedScenes((prev) => {
      const next = new Set(prev)
      if (next.has(sceneNumber)) {
        next.delete(sceneNumber)
      } else {
        next.add(sceneNumber)
      }
      return next
    })
  }

  const handleMultiFeedback = () => {
    if (selectedScenes.length === 0 || !onMultiSceneFeedback) return
    const selected = scenes.filter((s) => selectedScenes.includes(s.sceneNumber))
    onMultiSceneFeedback(selected)
    setSelectedScenes([])
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn('rounded-lg border border-border/60 overflow-hidden', className)}
    >
      {/* Header — simple icon + text + metadata on one line */}
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

      {/* Scene rows */}
      <div className="p-3 space-y-1.5">
        {scenes.map((scene, index) => (
          <motion.div
            key={scene.sceneNumber}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
          >
            <SceneRow
              scene={scene}
              isFirst={index === 0}
              timestamp={timestampRanges[index]}
              isSelected={selectedScenes.includes(scene.sceneNumber)}
              isExpanded={expandedScenes.has(scene.sceneNumber)}
              onToggleSelect={() => toggleSelect(scene.sceneNumber)}
              onToggleExpand={() => toggleExpand(scene.sceneNumber)}
              onClickFeedback={onSceneClick ? () => onSceneClick(scene) : undefined}
            />
          </motion.div>
        ))}
      </div>

      {/* Sticky multi-select action bar */}
      <AnimatePresence>
        {selectedScenes.length > 0 && onMultiSceneFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="sticky bottom-0 px-4 py-3 border-t border-border/40 bg-background/95 backdrop-blur-sm flex items-center justify-between"
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
    </motion.div>
  )
}
