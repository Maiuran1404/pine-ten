'use client'

import { useEffect, useState, useCallback, use } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ConversationCard } from '@/components/admin/chat-tests/conversation-card'
import { ArrowLeft, CheckCircle2, XCircle, MessageSquare, Clock } from 'lucide-react'

interface Run {
  id: string
  scenarioName: string
  status: string
  totalTurns: number
  finalStage: string | null
  reachedReview: boolean
  errorMessage: string | null
  durationMs: number | null
  createdAt: string
  scenarioConfig: {
    name: string
    industry: string
    platform: string
    contentType: string
    intent: string
    openingMessage: string
  }
}

export default function BatchDetailPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = use(params)
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    fetchBatch()
  }, [fetchBatch])

  const completed = runs.filter((r) => r.status === 'completed').length
  const failed = runs.filter((r) => r.status === 'failed').length
  const passed = runs.filter((r) => r.reachedReview).length
  const avgTurns =
    runs.length > 0
      ? (runs.reduce((sum, r) => sum + r.totalTurns, 0) / runs.length).toFixed(1)
      : '-'
  const avgDuration =
    runs.filter((r) => r.durationMs).length > 0
      ? Math.round(
          runs.filter((r) => r.durationMs).reduce((sum, r) => sum + (r.durationMs ?? 0), 0) /
            runs.filter((r) => r.durationMs).length /
            1000
        )
      : null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/chat-tests">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Batch Detail</h1>
          <p className="text-xs text-muted-foreground font-mono">{batchId}</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-2xl font-semibold">
                {passed}/{runs.length}
              </p>
              <p className="text-xs text-muted-foreground">Reached REVIEW</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-2xl font-semibold">{failed}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-2xl font-semibold">{avgTurns}</p>
              <p className="text-xs text-muted-foreground">Avg Turns</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-2xl font-semibold">{avgDuration ? `${avgDuration}s` : '-'}</p>
              <p className="text-xs text-muted-foreground">Avg Duration</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Run grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {runs.map((run) => (
            <ConversationCard key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  )
}
