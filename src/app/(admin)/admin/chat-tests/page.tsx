'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { BatchProgress } from '@/components/admin/chat-tests/batch-progress'
import { FlaskConical, Play, Loader2, ArrowRight, CheckCircle2, XCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

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

export default function ChatTestsPage() {
  const [batches, setBatches] = useState<BatchSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [activeRuns, setActiveRuns] = useState<RunProgress[]>([])
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

        // Update active runs state
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
      // 1. Create batch
      const createRes = await fetch('/api/admin/chat-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!createRes.ok) throw new Error('Failed to create batch')
      const createData = await createRes.json()
      const runs: Array<{ id: string; scenarioName: string; status: string }> = createData.data.runs

      // Initialize active runs display
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

      // 2. Run with concurrency of 2 using a simple pool
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

      // Wait for remaining
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

  function batchStatus(batch: BatchSummary) {
    if (batch.runningRuns > 0 || batch.pendingRuns > 0) return 'Running'
    if (batch.failedRuns > 0 && batch.completedRuns > 0) return 'Partial'
    if (batch.failedRuns === batch.totalRuns) return 'Failed'
    return 'Done'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <FlaskConical className="h-6 w-6" />
            Chat QA Testing
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Test AI chat quality across 10 diverse scenarios
          </p>
        </div>
        <Button onClick={runBatch} disabled={running} size="lg">
          {running ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Running...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run 10 Chats
            </>
          )}
        </Button>
      </div>

      {/* Active batch progress */}
      {activeRuns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Run</CardTitle>
            <CardDescription>Conversations running with concurrency of 2</CardDescription>
          </CardHeader>
          <CardContent>
            <BatchProgress runs={activeRuns} />
          </CardContent>
        </Card>
      )}

      {/* Past batches */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Past Batches</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : batches.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No batches yet. Click &quot;Run 10 Chats&quot; to start.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Passed</TableHead>
                  <TableHead>Avg Turns</TableHead>
                  <TableHead>Avg Duration</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <TableRow key={batch.batchId}>
                    <TableCell className="text-sm">
                      {formatDistanceToNow(new Date(batch.createdAt), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          batchStatus(batch) === 'Done'
                            ? 'default'
                            : batchStatus(batch) === 'Failed'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {batchStatus(batch)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5">
                        {batch.reachedReviewCount === batch.totalRuns ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : batch.reachedReviewCount === 0 ? (
                          <XCircle className="h-3.5 w-3.5 text-red-500" />
                        ) : null}
                        {batch.reachedReviewCount}/{batch.totalRuns}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{batch.avgTurns ?? '-'}</TableCell>
                    <TableCell className="text-sm">
                      {batch.avgDurationMs ? `${Math.round(batch.avgDurationMs / 1000)}s` : '-'}
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/chat-tests/${batch.batchId}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
