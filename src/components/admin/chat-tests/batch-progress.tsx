'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CheckCircle2, Loader2, XCircle, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RunProgress {
  id: string
  scenarioName: string
  status: string
  totalTurns: number
  finalStage: string | null
  reachedReview: boolean
}

interface BatchProgressProps {
  runs: RunProgress[]
  className?: string
}

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

function statusConfig(status: string, reachedReview: boolean) {
  if (status === 'completed' && reachedReview) {
    return {
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
      ringColor: 'ring-emerald-500/20',
      bgColor: 'bg-emerald-50',
      label: 'Passed',
    }
  }
  if (status === 'completed' && !reachedReview) {
    return {
      icon: <AlertCircle className="h-3.5 w-3.5 text-amber-500" />,
      ringColor: 'ring-amber-500/20',
      bgColor: 'bg-amber-50',
      label: 'Completed (no review)',
    }
  }
  if (status === 'running') {
    return {
      icon: <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />,
      ringColor: 'ring-blue-500/20',
      bgColor: 'bg-blue-50',
      label: 'Running',
    }
  }
  if (status === 'failed') {
    return {
      icon: <XCircle className="h-3.5 w-3.5 text-red-500" />,
      ringColor: 'ring-red-500/20',
      bgColor: 'bg-red-50',
      label: 'Failed',
    }
  }
  return {
    icon: <Clock className="h-3.5 w-3.5 text-muted-foreground/50" />,
    ringColor: 'ring-muted/50',
    bgColor: 'bg-muted/30',
    label: 'Waiting',
  }
}

export function BatchProgress({ runs, className }: BatchProgressProps) {
  const completed = runs.filter((r) => r.status === 'completed' || r.status === 'failed').length
  const passed = runs.filter((r) => r.reachedReview).length
  const failed = runs.filter((r) => r.status === 'failed').length
  const running = runs.filter((r) => r.status === 'running').length
  const total = runs.length
  const progressPct = total > 0 ? (completed / total) * 100 : 0
  const isDone = completed === total

  return (
    <Card className={cn(isDone ? '' : 'border-blue-200', className)}>
      <CardContent className="pt-5 pb-4 px-5">
        <div className="space-y-4">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{isDone ? 'Batch Complete' : 'Running Batch'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isDone ? (
                  <>
                    {passed} of {total} passed
                    {failed > 0 && <span className="text-red-500 ml-1">({failed} failed)</span>}
                  </>
                ) : (
                  <>
                    {completed} of {total} complete
                    {running > 0 && <span className="text-blue-500 ml-1">({running} running)</span>}
                  </>
                )}
              </p>
            </div>
            <Badge
              variant={isDone ? (failed === 0 ? 'default' : 'secondary') : 'secondary'}
              className={cn(!isDone && 'bg-blue-100 text-blue-700 border-blue-200')}
            >
              {isDone
                ? failed === 0
                  ? 'All Passed'
                  : `${passed}/${total} Passed`
                : `${Math.round(progressPct)}%`}
            </Badge>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <Progress value={progressPct} className="h-1.5" />
            {!isDone && (
              <p className="text-[10px] text-muted-foreground text-right tabular-nums">
                {completed}/{total}
              </p>
            )}
          </div>

          {/* Run tiles -- compact visual grid */}
          <TooltipProvider delayDuration={150}>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
              {runs.map((run) => {
                const config = statusConfig(run.status, run.reachedReview)
                return (
                  <Tooltip key={run.id}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'flex items-center justify-center rounded-md ring-1 ring-inset',
                          'h-9 transition-all',
                          config.ringColor,
                          config.bgColor
                        )}
                      >
                        {config.icon}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-48">
                      <p className="text-xs font-medium">{run.scenarioName}</p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                        <span>{config.label}</span>
                        {run.totalTurns > 0 && (
                          <>
                            <span>-</span>
                            <span>{run.totalTurns} turns</span>
                          </>
                        )}
                      </div>
                      {run.finalStage && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Stage: {STAGE_LABELS[run.finalStage] ?? run.finalStage}
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  )
}
