'use client'

import { motion } from 'framer-motion'
import { Film, Clock, Eye, Target, Video, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ImagePlaceholder, TextLines, CircleIcon, BlockRect } from '@/components/chat/wireframe'
import type { StoryboardScene } from '@/lib/ai/briefing-state-machine'

// =============================================================================
// PROPS
// =============================================================================

interface StoryboardViewProps {
  scenes: StoryboardScene[]
  className?: string
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
// SCENE THUMBNAIL — wireframe shapes based on visualNote keywords
// =============================================================================

function SceneThumbnail({ visualNote }: { visualNote: string }) {
  const note = visualNote.toLowerCase()

  if (/close[\s-]?up|face|person/.test(note)) {
    return (
      <div className="flex items-center justify-center h-full">
        <CircleIcon size="lg" className="w-16 h-16" />
      </div>
    )
  }

  if (/wide[\s-]?shot|landscape/.test(note)) {
    return (
      <div className="flex flex-col items-center justify-end h-full px-6 pb-4 gap-2">
        <div className="w-full h-px bg-slate-300 dark:bg-slate-600" style={{ marginTop: '60%' }} />
        <div className="flex items-end gap-3 w-full justify-center">
          <BlockRect className="w-8 h-5" />
          <BlockRect className="w-6 h-8" />
          <BlockRect className="w-10 h-4" />
        </div>
      </div>
    )
  }

  if (/product|object|screen/.test(note)) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <BlockRect className="w-20 h-14" />
        <div className="flex gap-2">
          <div className="w-8 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="w-6 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    )
  }

  if (/text|title|overlay/.test(note)) {
    return (
      <div className="flex items-center justify-center h-full px-8">
        <TextLines lines={3} widths={[70, 90, 50]} className="w-full" />
      </div>
    )
  }

  if (/montage|split|multiple/.test(note)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="relative w-28 h-20">
          <BlockRect className="absolute top-0 left-0 w-16 h-12 rotate-[-3deg]" />
          <BlockRect className="absolute top-2 left-6 w-16 h-12 rotate-[2deg]" />
          <BlockRect className="absolute top-4 left-12 w-16 h-12 rotate-[5deg]" />
        </div>
      </div>
    )
  }

  // Fallback: diagonal X cross
  return (
    <div className="flex items-center justify-center h-full px-6 py-4">
      <ImagePlaceholder className="w-full h-full" />
    </div>
  )
}

// =============================================================================
// HOOK DATA CARD (amber sub-card for Scene 1)
// =============================================================================

function HookDataCard({ hookData }: { hookData: NonNullable<StoryboardScene['hookData']> }) {
  return (
    <div className="mt-3 rounded-lg border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-900/10 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
        <Target className="h-3.5 w-3.5" />
        <span className="text-xs font-semibold uppercase tracking-wide">Hook Strategy</span>
      </div>
      <div className="grid gap-2">
        <div className="flex items-start gap-2">
          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-500 uppercase tracking-wider shrink-0 mt-0.5 w-16">
            Persona
          </span>
          <span className="text-sm text-foreground">{hookData.targetPersona}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-500 uppercase tracking-wider shrink-0 mt-0.5 w-16">
            Pain
          </span>
          <span className="text-sm text-foreground">{hookData.painMetric}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-500 uppercase tracking-wider shrink-0 mt-0.5 w-16">
            Impact
          </span>
          <span className="text-sm text-foreground font-medium">{hookData.quantifiableImpact}</span>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// SCENE CARD
// =============================================================================

function SceneCard({
  scene,
  isFirst,
  timestamp,
}: {
  scene: StoryboardScene
  isFirst: boolean
  timestamp: { start: string; end: string }
}) {
  return (
    <div
      className={cn(
        'rounded-lg border overflow-hidden transition-colors',
        isFirst
          ? 'border-amber-400 shadow-sm shadow-amber-200/20 dark:shadow-amber-900/20'
          : 'border-border/60'
      )}
    >
      {/* 16:9 Thumbnail */}
      <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-t-lg overflow-hidden">
        <SceneThumbnail visualNote={scene.visualNote} />
      </div>

      {/* Content below thumbnail */}
      <div className="p-3 space-y-2">
        {/* Timestamp + title row */}
        <div className="flex items-start gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-mono text-muted-foreground">
              {timestamp.start}-{timestamp.end}
            </span>
            {isFirst && (
              <Badge
                variant="outline"
                className="text-[10px] h-5 border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 uppercase tracking-wide"
              >
                Hook
              </Badge>
            )}
          </div>
          <h4 className="text-sm font-bold text-foreground leading-snug">{scene.title}</h4>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">{scene.description}</p>

        {/* Visual note */}
        {scene.visualNote && (
          <div className="flex items-start gap-1.5 text-muted-foreground/80">
            <Eye className="h-3 w-3 mt-0.5 shrink-0" />
            <span className="text-xs">
              <span className="italic text-muted-foreground/60">Visual:</span>{' '}
              <span className="italic">{scene.visualNote}</span>
            </span>
          </div>
        )}

        {/* Hook data - only on scene 1 */}
        {isFirst && scene.hookData && <HookDataCard hookData={scene.hookData} />}

        {/* Reference video link */}
        {scene.referenceVideoId && (
          <div className="flex items-center gap-1.5 mt-1">
            <Video className="h-3 w-3 text-primary" />
            <span className="text-xs text-primary">Reference video linked</span>
          </div>
        )}
      </div>
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

export function StoryboardView({ scenes, className }: StoryboardViewProps) {
  if (scenes.length === 0) {
    return <StoryboardEmpty />
  }

  const totalDuration = scenes.reduce((acc, scene) => acc + parseDurationSeconds(scene.duration), 0)
  const timestampRanges = computeTimestampRanges(scenes)
  const hasHookData = scenes[0]?.hookData != null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn('rounded-xl border border-border/60 overflow-hidden', className)}
    >
      {/* Header Banner */}
      <div className="bg-emerald-900 px-5 py-3.5 flex items-center justify-between rounded-t-xl">
        <span
          className="text-white text-xl"
          style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
        >
          Storyboard
        </span>
        <span className="text-white/70 text-xs uppercase tracking-widest font-medium">Crafted</span>
      </div>

      {/* Metadata Row */}
      <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {scenes.length} {scenes.length === 1 ? 'Scene' : 'Scenes'}
          </span>
          {totalDuration > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="text-xs">{formatTimestamp(totalDuration)} total</span>
            </div>
          )}
        </div>
      </div>

      {/* Hook data missing warning */}
      {!hasHookData && scenes.length > 0 && (
        <div className="mx-5 mt-4 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg px-3 py-2 border border-amber-200/40 dark:border-amber-800/30">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Scene 1 hook data not yet generated</span>
        </div>
      )}

      {/* Scene Grid */}
      <div className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenes.map((scene, index) => (
            <motion.div
              key={scene.sceneNumber}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.05 }}
            >
              <SceneCard scene={scene} isFirst={index === 0} timestamp={timestampRanges[index]} />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
