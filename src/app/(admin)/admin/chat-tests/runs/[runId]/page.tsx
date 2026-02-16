'use client'

import { useEffect, useState, useCallback, use } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ConversationReplay } from '@/components/admin/chat-tests/conversation-replay'
import { ArrowLeft, XCircle, MessageSquare, Building2, Target, Layers } from 'lucide-react'

interface Message {
  turn: number
  role: 'user' | 'assistant'
  content: string
  stage: string
  quickOptions?: { question: string; options: string[] } | null
  hasStructureData: boolean
  hasStrategicReview: boolean
  deliverableStyleCount: number
  videoReferenceCount: number
  generatedBy?: 'quick_option' | 'template' | 'haiku'
  durationMs?: number
}

interface Run {
  id: string
  batchId: string
  scenarioName: string
  status: string
  totalTurns: number
  finalStage: string | null
  reachedReview: boolean
  errorMessage: string | null
  durationMs: number | null
  messages: Message[]
  scenarioConfig: {
    name: string
    industry: string
    platform: string
    contentType: string
    intent: string
    openingMessage: string
  }
}

function formatDuration(ms: number | null): string {
  if (!ms) return '-'
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

export default function RunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = use(params)
  const [run, setRun] = useState<Run | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchRun = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/chat-tests/runs/${runId}`)
      if (!res.ok) throw new Error('Failed to fetch run')
      const data = await res.json()
      setRun(data.data)
    } catch {
      toast.error('Failed to load run details')
    } finally {
      setLoading(false)
    }
  }, [runId])

  useEffect(() => {
    fetchRun()
  }, [fetchRun])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!run) {
    return <div className="text-center py-12 text-muted-foreground">Run not found</div>
  }

  // Count generation methods
  const userMessages = run.messages.filter((m) => m.role === 'user')
  const quickOptionCount = userMessages.filter((m) => m.generatedBy === 'quick_option').length
  const templateCount = userMessages.filter((m) => m.generatedBy === 'template').length
  const haikuCount = userMessages.filter((m) => m.generatedBy === 'haiku').length

  // Unique stages traversed
  const stages = [...new Set(run.messages.map((m) => m.stage))]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/chat-tests/${run.batchId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{run.scenarioName}</h1>
          <p className="text-xs text-muted-foreground font-mono">{run.id}</p>
        </div>
        <Badge
          variant={
            run.reachedReview ? 'default' : run.status === 'failed' ? 'destructive' : 'secondary'
          }
          className="text-sm"
        >
          {run.reachedReview ? 'Passed' : run.status === 'failed' ? 'Failed' : run.status}
        </Badge>
      </div>

      {/* Scenario info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scenario Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" /> Industry
              </p>
              <p className="font-medium">{run.scenarioConfig.industry || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground flex items-center gap-1">
                <Layers className="h-3 w-3" /> Platform
              </p>
              <p className="font-medium">{run.scenarioConfig.platform || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" /> Intent
              </p>
              <p className="font-medium">{run.scenarioConfig.intent || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Content Type</p>
              <p className="font-medium">{run.scenarioConfig.contentType || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-semibold">{run.totalTurns}</p>
            <p className="text-xs text-muted-foreground">Turns</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-semibold">{formatDuration(run.durationMs)}</p>
            <p className="text-xs text-muted-foreground">Duration</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-semibold">{quickOptionCount}</p>
            <p className="text-xs text-muted-foreground">Quick Options</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-semibold">{templateCount}</p>
            <p className="text-xs text-muted-foreground">Templates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-semibold">{haikuCount}</p>
            <p className="text-xs text-muted-foreground">Haiku</p>
          </CardContent>
        </Card>
      </div>

      {/* Stage traversal */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Stages:</span>
        {stages.map((stage, idx) => (
          <div key={stage} className="flex items-center gap-1">
            <Badge variant={stage === run.finalStage ? 'default' : 'outline'} className="text-xs">
              {stage}
            </Badge>
            {idx < stages.length - 1 && <span className="text-muted-foreground text-xs">→</span>}
          </div>
        ))}
      </div>

      {/* Error message */}
      {run.errorMessage && (
        <Card className="border-red-200">
          <CardContent className="p-4 flex items-start gap-2">
            <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{run.errorMessage}</p>
          </CardContent>
        </Card>
      )}

      {/* Conversation replay */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Conversation ({run.messages.length} messages)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <ConversationReplay messages={run.messages} />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
