'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { parseDurationSeconds, formatTimestamp } from './storyboard-view'
import type { StoryboardScene } from '@/lib/ai/briefing-state-machine'

// =============================================================================
// SCENE ROLE COLORS
// =============================================================================

export type SceneRole = 'hook' | 'cta' | 'transition' | 'feature'

export function getSceneRole(
  scene: StoryboardScene,
  index: number,
  totalScenes: number
): SceneRole {
  const titleLower = (scene.title || '').toLowerCase()
  if (index === 0 || titleLower.includes('hook')) return 'hook'
  if (
    index === totalScenes - 1 ||
    titleLower.includes('cta') ||
    titleLower.includes('call to action')
  )
    return 'cta'
  if (titleLower.includes('transition')) return 'transition'
  return 'feature'
}

const ROLE_COLORS: Record<SceneRole, { bg: string; text: string }> = {
  hook: { bg: 'bg-amber-500/80', text: 'text-white' },
  cta: { bg: 'bg-emerald-500/80', text: 'text-white' },
  transition: { bg: 'bg-purple-500/80', text: 'text-white' },
  feature: { bg: 'bg-neutral-500/60 dark:bg-neutral-600/60', text: 'text-white' },
}

// =============================================================================
// TIMELINE BAR
// =============================================================================

interface TimelineBarProps {
  scenes: StoryboardScene[]
  onSegmentClick?: (sceneNumber: number) => void
  className?: string
}

export function TimelineBar({ scenes, onSegmentClick, className }: TimelineBarProps) {
  // Pre-compute segment data to avoid mutable variables in render
  const segments = useMemo(() => {
    const totalDuration = scenes.reduce((acc, s) => acc + parseDurationSeconds(s.duration), 0)
    if (totalDuration === 0) return null

    let cum = 0
    const items = scenes.map((scene, index) => {
      const dur = parseDurationSeconds(scene.duration)
      const widthPct = (dur / totalDuration) * 100
      const startTime = cum
      cum += dur
      const endTime = cum
      const role = getSceneRole(scene, index, scenes.length)
      return { scene, dur, widthPct, startTime, endTime, role, index }
    })
    return { items, totalDuration }
  }, [scenes])

  if (!segments) return null

  const { items, totalDuration } = segments

  return (
    <div className={cn('flex items-center gap-0.5 h-7 px-3', className)}>
      {/* Total duration label */}
      <span className="text-[10px] font-mono text-muted-foreground mr-1.5 shrink-0">
        {formatTimestamp(0)}
      </span>

      {/* Segments */}
      <div className="flex-1 flex h-5 rounded-md overflow-hidden">
        {items.map(({ scene, widthPct, startTime, endTime, role, index }) => {
          const colors = ROLE_COLORS[role]
          return (
            <button
              key={scene.sceneNumber}
              type="button"
              onClick={() => onSegmentClick?.(scene.sceneNumber)}
              title={`Scene ${scene.sceneNumber}: ${scene.title} (${formatTimestamp(startTime)}–${formatTimestamp(endTime)})`}
              className={cn(
                'h-full flex items-center justify-center transition-opacity hover:opacity-90',
                colors.bg,
                colors.text,
                index > 0 && 'border-l border-white/20'
              )}
              style={{ width: `${widthPct}%`, minWidth: widthPct > 5 ? undefined : '4px' }}
            >
              {widthPct > 12 && (
                <span className="text-[9px] font-medium truncate px-1 leading-none">
                  {scene.title}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* End time label */}
      <span className="text-[10px] font-mono text-muted-foreground ml-1.5 shrink-0">
        {formatTimestamp(totalDuration)}
      </span>
    </div>
  )
}
