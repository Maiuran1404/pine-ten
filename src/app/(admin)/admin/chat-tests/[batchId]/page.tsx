'use client'

import { useEffect, useState, useCallback, useMemo, use } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConversationCard } from '@/components/admin/chat-tests/conversation-card'
import { BatchAnalysis } from '@/components/admin/chat-tests/batch-analysis'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  Hash,
  Loader2,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  turn: number
  role: string
  content: string
  stage?: string
  generatedBy?: string
  durationMs?: number
}

interface Run {
  id: string
  scenarioName: string
  status: string
  totalTurns: number
  finalStage: string | null
  reachedReview: boolean
  errorMessage: string | null
  durationMs: number | null
  compositeScore: number | null
  scores: import('@/db/schema').ChatTestScores | null
  createdAt: string
  messages?: Message[]
  scenarioConfig: {
    name: string
    industry: string
    platform: string
    contentType: string
    intent: string
    openingMessage: string
  }
}

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

type FilterType = 'all' | 'passed' | 'failed'
type SortType = 'turns' | 'duration' | 'stage'

function getStageIndex(stage: string | null): number {
  if (!stage) return -1
  return STAGE_ORDER.indexOf(stage as (typeof STAGE_ORDER)[number])
}

export default function BatchDetailPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = use(params)
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [sort, setSort] = useState<SortType>('turns')

  const fetchBatch = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/chat-tests/${batchId}`)
      if (!res.ok) throw new Error('Failed to fetch batch')
      const data = await res.json()
      setRuns(data.data.runs ?? [])
    } catch {
      toast.error('Failed to load batch details')
    } finally {
      setLoading(false)
    }
  }, [batchId])

  const isRunning = runs.some((r) => r.status === 'pending' || r.status === 'running')

  useEffect(() => {
    fetchBatch()
  }, [fetchBatch])

  // Poll every 3s while any runs are still in progress
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(fetchBatch, 3000)
    return () => clearInterval(interval)
  }, [isRunning, fetchBatch])

  const passed = runs.filter((r) => r.reachedReview).length
  const failed = runs.filter((r) => r.status === 'failed').length
  const passRate = runs.length > 0 ? Math.round((passed / runs.length) * 100) : 0
  const avgTurns =
    runs.length > 0
      ? (runs.reduce((sum, r) => sum + r.totalTurns, 0) / runs.length).toFixed(1)
      : '-'
  const runsWithDuration = runs.filter((r) => r.durationMs)
  const avgDuration =
    runsWithDuration.length > 0
      ? Math.round(
          runsWithDuration.reduce((sum, r) => sum + (r.durationMs ?? 0), 0) /
            runsWithDuration.length /
            1000
        )
      : null
  const scoredRuns = runs.filter((r) => r.compositeScore !== null && r.compositeScore !== undefined)
  const avgScore =
    scoredRuns.length > 0
      ? Math.round(
          scoredRuns.reduce((sum, r) => sum + (r.compositeScore ?? 0), 0) / scoredRuns.length
        )
      : null

  const filteredRuns = useMemo(() => {
    let result = [...runs]

    if (filter === 'passed') result = result.filter((r) => r.reachedReview)
    else if (filter === 'failed') result = result.filter((r) => r.status === 'failed')

    result.sort((a, b) => {
      switch (sort) {
        case 'turns':
          return a.totalTurns - b.totalTurns
        case 'duration':
          return (a.durationMs ?? 0) - (b.durationMs ?? 0)
        case 'stage':
          return getStageIndex(b.finalStage) - getStageIndex(a.finalStage)
        default:
          return 0
      }
    })

    return result
  }, [runs, filter, sort])

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/chat-tests">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">Batch Analysis</h1>
            {isRunning && (
              <span className="flex items-center gap-1.5 text-xs text-ds-info bg-ds-info/10 px-2 py-0.5 rounded-full">
                <Loader2 className="h-3 w-3 animate-spin" />
                Live
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground font-mono">{batchId}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-10" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : (
        <>
          {/* Analysis Section */}
          <BatchAnalysis runs={runs} batchId={batchId} />

          {/* Summary Stats Strip */}
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-6 divide-x">
                <div className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Hash className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Total</span>
                  </div>
                  <p className="text-lg font-semibold">{runs.length}</p>
                </div>
                <div className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Target className="h-3 w-3 text-ds-status-review" />
                    <span className="text-[10px] text-muted-foreground">Avg Score</span>
                  </div>
                  <p
                    className={cn(
                      'text-lg font-semibold',
                      avgScore !== null
                        ? avgScore >= 75
                          ? 'text-ds-success'
                          : avgScore >= 50
                            ? 'text-ds-warning'
                            : 'text-ds-error'
                        : ''
                    )}
                  >
                    {avgScore ?? '-'}
                  </p>
                </div>
                <div className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <CheckCircle2 className="h-3 w-3 text-ds-success" />
                    <span className="text-[10px] text-muted-foreground">Passed</span>
                  </div>
                  <p className="text-lg font-semibold text-ds-success">{passed}</p>
                </div>
                <div className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <XCircle className="h-3 w-3 text-ds-error" />
                    <span className="text-[10px] text-muted-foreground">Failed</span>
                  </div>
                  <p className="text-lg font-semibold text-ds-error">{failed}</p>
                </div>
                <div className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <MessageSquare className="h-3 w-3 text-ds-info" />
                    <span className="text-[10px] text-muted-foreground">Avg Turns</span>
                  </div>
                  <p className="text-lg font-semibold">{avgTurns}</p>
                </div>
                <div className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Clock className="h-3 w-3 text-ds-warning" />
                    <span className="text-[10px] text-muted-foreground">Avg Duration</span>
                  </div>
                  <p className="text-lg font-semibold">{avgDuration ? `${avgDuration}s` : '-'}</p>
                </div>
              </div>
              {/* Pass rate bar + composite score bar */}
              <div className="px-3 pb-2 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-ds-success rounded-full transition-all"
                      style={{ width: `${passRate}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {passRate}% pass
                  </span>
                </div>
                {avgScore !== null && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          avgScore >= 75
                            ? 'bg-ds-success'
                            : avgScore >= 50
                              ? 'bg-ds-warning'
                              : 'bg-ds-error'
                        )}
                        style={{ width: `${avgScore}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {avgScore} score
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Filter/Sort Bar */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {(['all', 'passed', 'failed'] as const).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f)}
                  className="text-xs"
                >
                  {f === 'all'
                    ? `All (${runs.length})`
                    : f === 'passed'
                      ? `Passed (${passed})`
                      : `Failed (${failed})`}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground mr-1">Sort:</span>
              {(['turns', 'duration', 'stage'] as const).map((s) => (
                <Button
                  key={s}
                  variant={sort === s ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setSort(s)}
                  className={cn('text-xs', sort !== s && 'text-muted-foreground')}
                >
                  {s === 'turns' ? 'Turns' : s === 'duration' ? 'Duration' : 'Stage'}
                </Button>
              ))}
            </div>
          </div>

          {/* Run Rows */}
          <div className="space-y-2">
            {filteredRuns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No runs match the current filter
              </p>
            ) : (
              filteredRuns.map((run) => <ConversationCard key={run.id} run={run} />)
            )}
          </div>
        </>
      )}
    </div>
  )
}
