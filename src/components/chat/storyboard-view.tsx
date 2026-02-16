'use client'

import { motion } from 'framer-motion'
import { Film, Clock, Eye, Target, TrendingUp, AlertCircle, Video } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { StoryboardScene } from '@/lib/ai/briefing-state-machine'

// =============================================================================
// PROPS
// =============================================================================

interface StoryboardViewProps {
  scenes: StoryboardScene[]
  className?: string
}

// =============================================================================
// HOOK DATA DISPLAY (Scene 1 highlight)
// =============================================================================

function HookDataCard({ hookData }: { hookData: NonNullable<StoryboardScene['hookData']> }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="mt-3 rounded-lg border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-900/10 p-3 space-y-2"
    >
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
    </motion.div>
  )
}

// =============================================================================
// SCENE CARD
// =============================================================================

function SceneCard({ scene, isFirst }: { scene: StoryboardScene; isFirst: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: scene.sceneNumber * 0.05 }}
      className={cn(
        'rounded-xl border p-4 transition-colors',
        isFirst
          ? 'border-amber-200 dark:border-amber-800/50 bg-white/80 dark:bg-card/90 shadow-sm'
          : 'border-border/50 bg-white/60 dark:bg-card/60'
      )}
    >
      {/* Scene header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
              isFirst
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                : 'bg-primary/10 text-primary'
            )}
          >
            {scene.sceneNumber}
          </div>
          <h4 className="text-sm font-semibold text-foreground">{scene.title}</h4>
          {isFirst && (
            <Badge
              variant="outline"
              className="text-[10px] h-5 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400"
            >
              Hook
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span className="text-xs">{scene.duration}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed">{scene.description}</p>

      {/* Visual note */}
      {scene.visualNote && (
        <div className="flex items-start gap-1.5 mt-2 text-muted-foreground/80">
          <Eye className="h-3 w-3 mt-0.5 shrink-0" />
          <span className="text-xs italic">{scene.visualNote}</span>
        </div>
      )}

      {/* Reference video link */}
      {scene.referenceVideoId && (
        <div className="flex items-center gap-1.5 mt-2">
          <Video className="h-3 w-3 text-primary" />
          <span className="text-xs text-primary">Reference video linked</span>
        </div>
      )}

      {/* Hook data - only on scene 1 */}
      {isFirst && scene.hookData && <HookDataCard hookData={scene.hookData} />}
    </motion.div>
  )
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function StoryboardEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Film className="h-8 w-8 text-muted-foreground/50 mb-3" />
      <p className="text-sm text-muted-foreground">Storyboard will appear here</p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        Scene-by-scene breakdown with hook strategy
      </p>
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

  const totalDuration = scenes.reduce((acc, scene) => {
    const match = scene.duration.match(/(\d+)/)
    return acc + (match ? parseInt(match[1], 10) : 0)
  }, 0)

  const hasHookData = scenes[0]?.hookData != null

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Storyboard</span>
          <Badge variant="secondary" className="text-xs">
            {scenes.length} {scenes.length === 1 ? 'scene' : 'scenes'}
          </Badge>
        </div>
        {totalDuration > 0 && (
          <span className="text-xs text-muted-foreground">~{totalDuration}s total</span>
        )}
      </div>

      {/* Hook data missing warning */}
      {!hasHookData && scenes.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg px-3 py-2 border border-amber-200/40 dark:border-amber-800/30">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Scene 1 hook data not yet generated</span>
        </div>
      )}

      {/* Timeline connector */}
      <div className="relative space-y-3 pl-3">
        {/* Vertical line */}
        <div className="absolute left-[14px] top-4 bottom-4 w-px bg-border/50" />

        {scenes.map((scene, index) => (
          <div key={scene.sceneNumber} className="relative">
            {/* Timeline dot */}
            <div
              className={cn(
                'absolute -left-[2px] top-5 w-2 h-2 rounded-full z-10',
                index === 0 ? 'bg-amber-500' : 'bg-border'
              )}
            />
            <div className="ml-4">
              <SceneCard scene={scene} isFirst={index === 0} />
            </div>
          </div>
        ))}
      </div>

      {/* Summary footer */}
      {hasHookData && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
          <TrendingUp className="h-3 w-3" />
          <span>Hook targets {scenes[0].hookData?.targetPersona} with quantifiable impact</span>
        </div>
      )}
    </div>
  )
}
