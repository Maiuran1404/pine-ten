'use client'

import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const STAGE_ORDER = [
  'EXTRACT',
  'TASK_TYPE',
  'INTENT',
  'INSPIRATION',
  'STRUCTURE',
  'STRATEGIC_REVIEW',
  'MOODBOARD',
  'REVIEW',
] as const

const STAGE_SHORT_LABELS: Record<string, string> = {
  EXTRACT: 'EXT',
  TASK_TYPE: 'TT',
  INTENT: 'INT',
  INSPIRATION: 'INS',
  STRUCTURE: 'STR',
  STRATEGIC_REVIEW: 'SR',
  MOODBOARD: 'MB',
  REVIEW: 'REV',
}

const STAGE_FULL_LABELS: Record<string, string> = {
  EXTRACT: 'Extract',
  TASK_TYPE: 'Task Type',
  INTENT: 'Intent',
  INSPIRATION: 'Inspiration',
  STRUCTURE: 'Structure',
  STRATEGIC_REVIEW: 'Strategic Review',
  MOODBOARD: 'Moodboard',
  REVIEW: 'Review',
}

interface StagePipelineProps {
  stagesReached: string[]
  status: string
  reachedReview: boolean
  compact?: boolean
}

export function StagePipeline({
  stagesReached,
  status,
  reachedReview,
  compact = false,
}: StagePipelineProps) {
  const reachedSet = new Set(stagesReached)

  // Find the last reached stage index
  let lastReachedIndex = -1
  for (let i = STAGE_ORDER.length - 1; i >= 0; i--) {
    if (reachedSet.has(STAGE_ORDER[i])) {
      lastReachedIndex = i
      break
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn('flex items-center', compact ? 'gap-0.5' : 'gap-1')}>
        {STAGE_ORDER.map((stage, i) => {
          const reached = reachedSet.has(stage)
          const isLast = i === lastReachedIndex
          const isFailed = isLast && status === 'failed'
          const isPassed = isLast && reachedReview

          return (
            <Tooltip key={stage}>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center gap-0.5">
                  {/* Dot */}
                  <div
                    className={cn(
                      'rounded-full transition-colors',
                      compact ? 'h-2 w-2' : 'h-2.5 w-2.5',
                      reached
                        ? isFailed
                          ? 'bg-red-500'
                          : isPassed
                            ? 'bg-emerald-500'
                            : 'bg-emerald-400'
                        : 'bg-muted border border-muted-foreground/20'
                    )}
                  />
                  {/* Label */}
                  {!compact && (
                    <span
                      className={cn(
                        'text-[9px] leading-none',
                        reached ? 'text-foreground/70' : 'text-muted-foreground/40'
                      )}
                    >
                      {STAGE_SHORT_LABELS[stage]}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {STAGE_FULL_LABELS[stage]}
                {reached ? ' (reached)' : ' (not reached)'}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
