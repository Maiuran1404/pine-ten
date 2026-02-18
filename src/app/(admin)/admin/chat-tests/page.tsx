'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { BatchProgress } from '@/components/admin/chat-tests/batch-progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Play,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  MessageSquare,
  Activity,
  ChevronRight,
  Trash2,
} from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BatchSummary {
  batchId: string
  triggeredBy: string
  createdAt: string
  totalRuns: number
  completedRuns: number
  failedRuns: number
  runningRuns: number
  pendingRuns: number
  reachedReviewCount: number
  avgTurns: number | null
  avgDurationMs: number | null
}

interface RunProgress {
  id: string
  scenarioName: string
  status: string
  totalTurns: number
  finalStage: string | null
  reachedReview: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function batchStatus(batch: BatchSummary) {
  if (batch.runningRuns > 0 || batch.pendingRuns > 0) return 'Running'
  if (batch.failedRuns > 0 && batch.completedRuns > 0) return 'Partial'
  if (batch.failedRuns === batch.totalRuns) return 'Failed'
  return 'Done'
}

function passRate(batch: BatchSummary): number {
  if (batch.totalRuns === 0) return 0
  return Math.round((batch.reachedReviewCount / batch.totalRuns) * 100)
}

function passRateColor(rate: number): string {
  if (rate >= 80) return 'text-emerald-600'
  if (rate >= 50) return 'text-amber-600'
  return 'text-red-600'
}

function passRateBg(rate: number): string {
  if (rate >= 80) return 'bg-emerald-500'
  if (rate >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

function passRateBgMuted(rate: number): string {
  if (rate >= 80) return 'bg-emerald-100'
  if (rate >= 50) return 'bg-amber-100'
  return 'bg-red-100'
}

function statusDotColor(status: string): string {
  switch (status) {
    case 'Done':
      return 'bg-emerald-500'
    case 'Running':
      return 'bg-blue-500'
    case 'Partial':
      return 'bg-amber-500'
    case 'Failed':
      return 'bg-red-500'
    default:
      return 'bg-muted-foreground'
  }
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) return `Today at ${format(date, 'h:mm a')}`
  if (isYesterday(date)) return `Yesterday at ${format(date, 'h:mm a')}`
  return format(date, 'MMM d, h:mm a')
}

function formatDurationShort(ms: number | null): string {
  if (!ms) return '--'
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const rem = seconds % 60
  return `${minutes}m ${rem}s`
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Large health indicator shown at top of page. */
function HealthSummary({ batches }: { batches: BatchSummary[] }) {
  const completedBatches = batches.filter(
    (b) => batchStatus(b) === 'Done' || batchStatus(b) === 'Partial' || batchStatus(b) === 'Failed'
  )

  if (completedBatches.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No test data yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Run your first batch to see chat health metrics
          </p>
        </CardContent>
      </Card>
    )
  }

  const latest = completedBatches[0]
  const previous = completedBatches.length > 1 ? completedBatches[1] : null
  const latestRate = passRate(latest)
  const previousRate = previous ? passRate(previous) : null
  const trend = previousRate !== null ? latestRate - previousRate : null

  // Compute rolling average from last 5 completed batches
  const recentBatches = completedBatches.slice(0, 5)
  const rollingRate =
    recentBatches.length > 0
      ? Math.round(recentBatches.reduce((sum, b) => sum + passRate(b), 0) / recentBatches.length)
      : latestRate

  const avgTurns =
    recentBatches.length > 0
      ? (
          recentBatches.reduce((sum, b) => sum + (b.avgTurns ?? 0), 0) /
          recentBatches.filter((b) => b.avgTurns !== null).length
        ).toFixed(1)
      : '--'

  const avgDuration =
    recentBatches.length > 0
      ? formatDurationShort(
          Math.round(
            recentBatches.reduce((sum, b) => sum + (b.avgDurationMs ?? 0), 0) /
              recentBatches.filter((b) => b.avgDurationMs !== null).length
          )
        )
      : '--'

  return (
    <Card>
      <CardContent className="pt-6 pb-5 px-6">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto_1fr] gap-6 items-center">
          {/* Latest pass rate -- the hero number */}
          <div className="text-center sm:text-left">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Latest Pass Rate
            </p>
            <div className="flex items-baseline gap-2 justify-center sm:justify-start">
              <span className={cn('text-4xl font-bold tabular-nums', passRateColor(latestRate))}>
                {latestRate}%
              </span>
              {trend !== null && (
                <span
                  className={cn(
                    'flex items-center gap-0.5 text-sm font-medium',
                    trend > 0
                      ? 'text-emerald-600'
                      : trend < 0
                        ? 'text-red-600'
                        : 'text-muted-foreground'
                  )}
                >
                  {trend > 0 ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : trend < 0 ? (
                    <TrendingDown className="h-3.5 w-3.5" />
                  ) : (
                    <Minus className="h-3.5 w-3.5" />
                  )}
                  {trend > 0 ? '+' : ''}
                  {trend}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {latest.reachedReviewCount} of {latest.totalRuns} reached review
            </p>
          </div>

          <Separator orientation="vertical" className="hidden sm:block h-16" />

          {/* Rolling averages */}
          <div className="text-center">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              5-Batch Average
            </p>
            <span className={cn('text-2xl font-bold tabular-nums', passRateColor(rollingRate))}>
              {rollingRate}%
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              across {recentBatches.length} batch{recentBatches.length !== 1 ? 'es' : ''}
            </p>
          </div>

          <Separator orientation="vertical" className="hidden sm:block h-16" />

          {/* Efficiency metrics */}
          <div className="flex gap-6 justify-center sm:justify-end">
            <div className="text-center">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Avg Turns
              </p>
              <div className="flex items-center gap-1.5 justify-center">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-2xl font-bold tabular-nums">{avgTurns}</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Avg Duration
              </p>
              <div className="flex items-center gap-1.5 justify-center">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-2xl font-bold tabular-nums">{avgDuration}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sparkline-style mini bar chart of recent pass rates */}
        {completedBatches.length >= 2 && (
          <div className="mt-5 pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2.5">Recent trend (newest on right)</p>
            <TrendBars batches={[...completedBatches].reverse().slice(-10)} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/** A row of small vertical bars showing pass rates over time. */
function TrendBars({ batches }: { batches: BatchSummary[] }) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-end gap-1 h-10">
        {batches.map((batch) => {
          const rate = passRate(batch)
          const heightPct = Math.max(rate, 4) // minimum visible height
          return (
            <Tooltip key={batch.batchId}>
              <TooltipTrigger asChild>
                <div className="flex-1 flex flex-col justify-end h-full max-w-10">
                  <div
                    className={cn(
                      'w-full rounded-sm transition-all',
                      passRateBg(rate),
                      'opacity-80 hover:opacity-100'
                    )}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p className="font-medium">{rate}% pass rate</p>
                <p className="text-muted-foreground">
                  {batch.reachedReviewCount}/{batch.totalRuns} passed
                </p>
                <p className="text-muted-foreground">{formatTimestamp(batch.createdAt)}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}

/** A single batch row in the history list. */
function BatchRow({
  batch,
  onDelete,
}: {
  batch: BatchSummary
  onDelete?: (batchId: string) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const status = batchStatus(batch)
  const rate = passRate(batch)
  const isActive = status === 'Running'

  return (
    <div
      className={cn(
        'flex items-center gap-4 px-4 py-3.5 rounded-lg border bg-card',
        'hover:bg-accent/50 transition-colors',
        isActive && 'border-blue-200 bg-blue-50/30'
      )}
    >
      <Link
        href={`/admin/chat-tests/${batch.batchId}`}
        className="flex items-center gap-4 flex-1 min-w-0"
      >
        {/* Pass rate indicator */}
        <div className="shrink-0 w-12 text-center">
          {isActive ? (
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin mx-auto" />
          ) : (
            <span className={cn('text-lg font-bold tabular-nums', passRateColor(rate))}>
              {rate}%
            </span>
          )}
        </div>

        {/* Mini pass-rate bar */}
        <div className="shrink-0 w-16">
          <div className={cn('h-1.5 rounded-full overflow-hidden', passRateBgMuted(rate))}>
            <div
              className={cn('h-full rounded-full transition-all', passRateBg(rate))}
              style={{ width: `${isActive ? 0 : rate}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 text-center tabular-nums">
            {batch.reachedReviewCount}/{batch.totalRuns}
          </p>
        </div>

        {/* Middle: timestamp + status */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{formatTimestamp(batch.createdAt)}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full shrink-0',
                  statusDotColor(status),
                  isActive && 'animate-pulse'
                )}
              />
              <span className="text-xs text-muted-foreground">{status}</span>
            </span>
            {batch.failedRuns > 0 && status !== 'Failed' && (
              <span className="text-xs text-red-500">{batch.failedRuns} failed</span>
            )}
          </div>
        </div>

        {/* Right: efficiency metrics */}
        <div className="hidden sm:flex items-center gap-5 shrink-0">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Turns</p>
            <p className="text-sm font-medium tabular-nums">
              {batch.avgTurns !== null ? batch.avgTurns : '--'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className="text-sm font-medium tabular-nums">
              {formatDurationShort(batch.avgDurationMs)}
            </p>
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
      </Link>

      {/* Delete button */}
      {onDelete && (
        <button
          onClick={() => {
            if (deleting) return
            setDeleting(true)
            onDelete(batch.batchId)
          }}
          disabled={deleting}
          className={cn(
            'shrink-0 p-1.5 rounded-md transition-colors',
            'text-muted-foreground/40 hover:text-red-600 hover:bg-red-50',
            deleting && 'text-red-600'
          )}
          title="Delete batch"
        >
          {deleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton states
// ---------------------------------------------------------------------------

function HealthSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6 pb-5 px-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-24 mx-auto" />
            <Skeleton className="h-8 w-16 mx-auto" />
            <Skeleton className="h-3 w-20 mx-auto" />
          </div>
          <div className="flex gap-6 justify-end">
            <div className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-8 w-12" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-8 w-12" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function BatchListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ChatTestsPage() {
  const [batches, setBatches] = useState<BatchSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [activeRuns, setActiveRuns] = useState<RunProgress[]>([])
  const [chatCount, setChatCount] = useState('3')
  const abortRef = useRef(false)

  const fetchBatches = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/chat-tests')
      if (!res.ok) throw new Error('Failed to fetch batches')
      const data = await res.json()
      setBatches(data.data ?? [])
    } catch {
      toast.error('Failed to load chat test batches')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBatches()
  }, [fetchBatches])

  async function stepUntilComplete(runId: string) {
    let isComplete = false
    while (!isComplete && !abortRef.current) {
      try {
        const res = await fetch('/api/admin/chat-tests/step', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ runId }),
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData?.error?.message ?? `Step failed: ${res.status}`)
        }
        const data = await res.json()
        isComplete = data.data.isComplete

        if (data.data.run) {
          setActiveRuns((prev) =>
            prev.map((r) =>
              r.id === runId
                ? {
                    ...r,
                    status: data.data.run.status,
                    totalTurns: data.data.run.totalTurns,
                    finalStage: data.data.run.finalStage,
                    reachedReview: data.data.run.reachedReview,
                  }
                : r
            )
          )
        }
      } catch (err) {
        toast.error(`Run failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
        setActiveRuns((prev) => prev.map((r) => (r.id === runId ? { ...r, status: 'failed' } : r)))
        break
      }
    }
  }

  async function runBatch() {
    setRunning(true)
    abortRef.current = false

    try {
      const createRes = await fetch('/api/admin/chat-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: parseInt(chatCount, 10) }),
      })
      if (!createRes.ok) throw new Error('Failed to create batch')
      const createData = await createRes.json()
      const runs: Array<{ id: string; scenarioName: string; status: string }> = createData.data.runs

      setActiveRuns(
        runs.map((r) => ({
          id: r.id,
          scenarioName: r.scenarioName,
          status: 'pending',
          totalTurns: 0,
          finalStage: null,
          reachedReview: false,
        }))
      )

      toast.success(`Started batch with ${runs.length} conversations`)

      const queue = [...runs]
      const activePromises: Promise<void>[] = []
      const CONCURRENCY = 2

      while (queue.length > 0 || activePromises.length > 0) {
        while (queue.length > 0 && activePromises.length < CONCURRENCY && !abortRef.current) {
          const run = queue.shift()!
          const promise = stepUntilComplete(run.id).then(() => {
            const idx = activePromises.indexOf(promise)
            if (idx !== -1) activePromises.splice(idx, 1)
          })
          activePromises.push(promise)
        }

        if (activePromises.length > 0) {
          await Promise.race(activePromises)
        }

        if (abortRef.current) break
      }

      await Promise.allSettled(activePromises)

      toast.success('Batch complete!')
      fetchBatches()
    } catch (err) {
      toast.error(`Batch failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setRunning(false)
      setActiveRuns([])
    }
  }

  async function deleteBatch(batchId: string) {
    try {
      const res = await fetch(`/api/admin/chat-tests/${batchId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete batch')
      setBatches((prev) => prev.filter((b) => b.batchId !== batchId))
      toast.success('Batch deleted')
    } catch {
      toast.error('Failed to delete batch')
    }
  }

  // Separate running batches from completed history
  const { activeBatches, historyBatches } = useMemo(() => {
    const active: BatchSummary[] = []
    const history: BatchSummary[] = []
    for (const b of batches) {
      if (batchStatus(b) === 'Running') {
        active.push(b)
      } else {
        history.push(b)
      }
    }
    return { activeBatches: active, historyBatches: history }
  }, [batches])

  return (
    <div className="space-y-8">
      {/* ----------------------------------------------------------------- */}
      {/* Header: title left, action right                                  */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Chat QA</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Monitor and test AI chat quality</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={chatCount} onValueChange={setChatCount} disabled={running}>
            <SelectTrigger className="w-[72px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 5, 10].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={runBatch} disabled={running} size="sm" className="h-9">
            {running ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Running
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 mr-1.5" />
                Run Batch
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Health summary -- the hero section                                */}
      {/* ----------------------------------------------------------------- */}
      {loading ? <HealthSkeleton /> : <HealthSummary batches={batches} />}

      {/* ----------------------------------------------------------------- */}
      {/* Active run progress (client-side running batch)                    */}
      {/* ----------------------------------------------------------------- */}
      {activeRuns.length > 0 && (
        <div>
          <BatchProgress runs={activeRuns} />
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Running batches from server (persisted running state)              */}
      {/* ----------------------------------------------------------------- */}
      {activeBatches.length > 0 && activeRuns.length === 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            In Progress
          </p>
          {activeBatches.map((batch) => (
            <BatchRow key={batch.batchId} batch={batch} onDelete={deleteBatch} />
          ))}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Batch history                                                     */}
      {/* ----------------------------------------------------------------- */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          History
        </p>
        {loading ? (
          <BatchListSkeleton />
        ) : historyBatches.length === 0 && activeBatches.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No batches yet. Choose a count and run your first batch.
              </p>
            </CardContent>
          </Card>
        ) : historyBatches.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No completed batches yet</p>
        ) : (
          <div className="space-y-2">
            {historyBatches.map((batch) => (
              <BatchRow key={batch.batchId} batch={batch} onDelete={deleteBatch} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
