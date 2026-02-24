'use client'

import { cn } from '@/lib/utils'
import type { WebsiteFlowPhase } from '@/hooks/use-website-flow'

const PHASES: { key: WebsiteFlowPhase; label: string }[] = [
  { key: 'INSPIRATION', label: 'Inspiration' },
  { key: 'SKELETON', label: 'Design' },
  { key: 'APPROVAL', label: 'Approve' },
]

interface WebsiteProgressBarProps {
  currentPhase: WebsiteFlowPhase
  onPhaseClick?: (phase: WebsiteFlowPhase) => void
  className?: string
}

export function WebsiteProgressBar({
  currentPhase,
  onPhaseClick,
  className,
}: WebsiteProgressBarProps) {
  const currentIndex = PHASES.findIndex((p) => p.key === currentPhase)

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {PHASES.map((phase, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex
        const isClickable = isCompleted && !!onPhaseClick

        return (
          <div key={phase.key} className="flex items-center gap-2 flex-1">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onPhaseClick(phase.key)}
              className={cn(
                'flex items-center gap-2 flex-1',
                isClickable && 'cursor-pointer hover:opacity-80',
                !isClickable && 'cursor-default'
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 ring-2 ring-green-500'
                      : 'bg-gray-100 dark:bg-zinc-800 text-muted-foreground'
                )}
              >
                {isCompleted ? '\u2713' : index + 1}
              </div>
              <span
                className={cn(
                  'text-sm font-medium',
                  isCurrent ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {phase.label}
              </span>
            </button>
            {index < PHASES.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 rounded-full',
                  isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-zinc-700'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
