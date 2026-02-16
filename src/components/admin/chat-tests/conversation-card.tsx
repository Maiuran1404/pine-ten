'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Clock, MessageSquare, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConversationCardProps {
  run: {
    id: string
    scenarioName: string
    status: string
    totalTurns: number
    finalStage: string | null
    reachedReview: boolean
    errorMessage: string | null
    durationMs: number | null
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

export function ConversationCard({ run }: ConversationCardProps) {
  return (
    <Link href={`/admin/chat-tests/runs/${run.id}`}>
      <Card
        className={cn(
          'hover:shadow-md transition-shadow cursor-pointer',
          run.reachedReview && 'border-emerald-200',
          run.status === 'failed' && 'border-red-200'
        )}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="font-medium text-sm">{run.scenarioName}</p>
              <div className="flex gap-1.5">
                {run.scenarioConfig.industry && (
                  <Badge variant="outline" className="text-[10px]">
                    {run.scenarioConfig.industry}
                  </Badge>
                )}
                {run.scenarioConfig.platform && (
                  <Badge variant="outline" className="text-[10px]">
                    {run.scenarioConfig.platform}
                  </Badge>
                )}
              </div>
            </div>
            {run.reachedReview ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            ) : run.status === 'failed' ? (
              <XCircle className="h-5 w-5 text-red-500 shrink-0" />
            ) : (
              <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {run.totalTurns} turns
              </span>
              <span>{formatDuration(run.durationMs)}</span>
            </div>
            {run.finalStage && (
              <Badge variant="secondary" className="text-[10px]">
                {run.finalStage}
              </Badge>
            )}
          </div>

          {run.errorMessage && (
            <p className="text-xs text-red-600 line-clamp-2">{run.errorMessage}</p>
          )}

          <div className="flex justify-end">
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
