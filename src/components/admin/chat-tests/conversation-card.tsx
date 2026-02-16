'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Clock, MessageSquare, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StagePipeline } from './stage-pipeline'

interface ConversationRowProps {
  run: {
    id: string
    scenarioName: string
    status: string
    totalTurns: number
    finalStage: string | null
    reachedReview: boolean
    errorMessage: string | null
    durationMs: number | null
    messages?: Array<{ stage?: string }>
    scenarioConfig: {
      industry: string
      platform: string
      contentType: string
    }
  }
}

function formatDuration(ms: number | null): string {
  if (!ms) return '-'
  if (ms < 1000) return `${ms}ms`
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

function getStagesReached(messages?: Array<{ stage?: string }>): string[] {
  if (!messages) return []
  const stages = new Set<string>()
  for (const msg of messages) {
    if (msg.stage) stages.add(msg.stage)
  }
  return Array.from(stages)
}

export function ConversationCard({ run }: ConversationRowProps) {
  const stagesReached = getStagesReached(run.messages)

  return (
    <Link href={`/admin/chat-tests/runs/${run.id}`}>
      <div
        className={cn(
          'flex items-center gap-4 px-4 py-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group',
          run.reachedReview && 'border-emerald-200/60',
          run.status === 'failed' && 'border-red-200/60'
        )}
      >
        {/* Status icon */}
        <div className="shrink-0">
          {run.reachedReview ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : run.status === 'failed' ? (
            <XCircle className="h-5 w-5 text-red-500" />
          ) : (
            <Clock className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        {/* Scenario name + tags */}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium truncate">{run.scenarioName}</p>
          <div className="flex gap-1.5">
            {run.scenarioConfig.industry && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {run.scenarioConfig.industry}
              </Badge>
            )}
            {run.scenarioConfig.platform && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {run.scenarioConfig.platform}
              </Badge>
            )}
          </div>
          {/* Error message for failed runs */}
          {run.errorMessage && (
            <p className="text-[11px] text-red-500 truncate">{run.errorMessage}</p>
          )}
        </div>

        {/* Stage pipeline */}
        <div className="hidden sm:block shrink-0">
          <StagePipeline
            stagesReached={stagesReached}
            status={run.status}
            reachedReview={run.reachedReview}
          />
        </div>

        {/* Metrics */}
        <div className="shrink-0 text-right space-y-0.5">
          <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
            <MessageSquare className="h-3 w-3" />
            {run.totalTurns}
          </p>
          <p className="text-xs text-muted-foreground">{formatDuration(run.durationMs)}</p>
        </div>

        {/* Arrow */}
        <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
      </div>
    </Link>
  )
}
