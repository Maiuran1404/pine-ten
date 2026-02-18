'use client'

import { cn } from '@/lib/utils'

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

const STAGE_LABELS: Record<string, string> = {
  EXTRACT: 'Extract',
  TASK_TYPE: 'Task Type',
  INTENT: 'Intent',
  INSPIRATION: 'Inspiration',
  STRUCTURE: 'Structure',
  STRATEGIC_REVIEW: 'Strategic Review',
  MOODBOARD: 'Moodboard',
  REVIEW: 'Review',
}

export interface FunnelData {
  stage: string
  count: number
  percentage: number
}

export function computeFunnel(runs: Array<{ messages?: Array<{ stage?: string }> }>): FunnelData[] {
  const total = runs.length
  if (total === 0) return []

  return STAGE_ORDER.map((stage) => {
    const count = runs.filter((run) => run.messages?.some((m) => m.stage === stage)).length
    return {
      stage,
      count,
      percentage: Math.round((count / total) * 100),
    }
  })
}

function getSegmentColor(percentage: number): string {
  if (percentage >= 90) return 'bg-emerald-500'
  if (percentage >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

function getTextColor(percentage: number): string {
  if (percentage >= 90) return 'text-emerald-700'
  if (percentage >= 50) return 'text-amber-700'
  return 'text-red-700'
}

interface StageFunnelProps {
  funnel: FunnelData[]
  totalRuns: number
}

export function StageFunnel({ funnel, totalRuns }: StageFunnelProps) {
  if (funnel.length === 0 || totalRuns === 0) {
    return <div className="text-sm text-muted-foreground text-center py-4">No data available</div>
  }

  const maxCount = funnel[0]?.count ?? totalRuns

  return (
    <div className="flex items-end gap-0.5 h-20">
      {funnel.map((item, i) => {
        const prevCount = i > 0 ? funnel[i - 1].count : totalRuns
        const dropOff = prevCount - item.count

        return (
          <div key={item.stage} className="flex-1 flex flex-col items-center gap-0.5">
            {/* Drop-off indicator */}
            {dropOff > 0 && i > 0 && (
              <span className="text-[10px] font-medium text-red-500">-{dropOff}</span>
            )}

            {/* Bar */}
            <div className="w-full flex flex-col items-center justify-end h-12">
              <div
                className={cn(
                  'w-full rounded-t-sm transition-all',
                  getSegmentColor(item.percentage),
                  i === 0 && 'rounded-tl-md',
                  i === funnel.length - 1 && 'rounded-tr-md'
                )}
                style={{
                  height: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%`,
                  minHeight: item.count > 0 ? '4px' : '0px',
                }}
              />
            </div>

            {/* Count */}
            <span className={cn('text-[10px] font-semibold', getTextColor(item.percentage))}>
              {item.count}/{totalRuns}
            </span>

            {/* Label */}
            <span className="text-[9px] text-muted-foreground text-center leading-tight">
              {STAGE_LABELS[item.stage] ?? item.stage}
            </span>
          </div>
        )
      })}
    </div>
  )
}
