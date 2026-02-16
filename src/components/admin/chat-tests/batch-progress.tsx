'use client'

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, Loader2, XCircle, Clock } from 'lucide-react'
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

function statusIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    case 'running':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />
  }
}

function shortName(scenarioName: string): string {
  const parts = scenarioName.split(' ')
  if (parts.length <= 2) return scenarioName
  return parts.slice(0, 2).join(' ')
}

export function BatchProgress({ runs, className }: BatchProgressProps) {
  const completed = runs.filter((r) => r.status === 'completed' || r.status === 'failed').length
  const passed = runs.filter((r) => r.reachedReview).length
  const total = runs.length
  const progressPct = total > 0 ? (completed / total) * 100 : 0

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {completed}/{total} complete
          </p>
          <p className="text-xs text-muted-foreground">{passed} reached REVIEW</p>
        </div>
        <Badge variant={completed === total ? 'default' : 'secondary'}>
          {completed === total ? 'Done' : 'Running'}
        </Badge>
      </div>

      <Progress value={progressPct} className="h-2" />

      <div className="grid grid-cols-5 gap-2">
        {runs.map((run) => (
          <div
            key={run.id}
            className={cn(
              'rounded-lg border p-2 text-center space-y-1 transition-colors',
              run.status === 'completed' &&
                run.reachedReview &&
                'border-emerald-200 bg-emerald-50/50',
              run.status === 'completed' && !run.reachedReview && 'border-amber-200 bg-amber-50/50',
              run.status === 'failed' && 'border-red-200 bg-red-50/50',
              run.status === 'running' && 'border-blue-200 bg-blue-50/50',
              run.status === 'pending' && 'border-muted'
            )}
          >
            <div className="flex justify-center">{statusIcon(run.status)}</div>
            <p className="text-xs font-medium truncate" title={run.scenarioName}>
              {shortName(run.scenarioName)}
            </p>
            {run.status !== 'pending' && (
              <p className="text-[10px] text-muted-foreground">
                {run.totalTurns > 0 ? `${run.totalTurns} turns` : 'starting'}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
