'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { RefreshCw, RotateCcw, Trash2, Layers, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { queryKeys } from '@/hooks/use-queries'
import { useCsrfContext } from '@/providers/csrf-provider'
import { toast } from 'sonner'

interface QueueMetrics {
  name: string
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  isPaused: boolean
}

interface FailedJob {
  id: string
  name: string
  data: Record<string, unknown>
  failedReason: string
  attemptsMade: number
  timestamp: number
  processedOn: number | null
  finishedOn: number | null
}

const QUEUE_LABELS: Record<string, string> = {
  'content-generation': 'Content Generation',
  'image-generation': 'Image Generation',
  'template-rendering': 'Template Rendering',
  'social-publishing': 'Social Publishing',
  'video-rendering': 'Video Rendering',
  'competitor-scraping': 'Competitor Scraping',
}

function getHealthStatus(metrics: QueueMetrics): 'healthy' | 'warning' | 'error' {
  if (metrics.failed > 0) return 'error'
  if (metrics.waiting > 100 || metrics.delayed > 50) return 'warning'
  return 'healthy'
}

export default function QueuesPage() {
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const { csrfFetch } = useCsrfContext()

  const { data: queuesData, isLoading: isLoadingQueues } = useQuery({
    queryKey: queryKeys.admin.queues(),
    queryFn: async () => {
      const res = await fetch('/api/admin/queues')
      if (!res.ok) throw new Error('Failed to fetch queue metrics')
      const json = await res.json()
      return json.data as { queues: QueueMetrics[] }
    },
    refetchInterval: 30000,
  })

  const { data: detailData, isLoading: isLoadingDetail } = useQuery({
    queryKey: queryKeys.admin.queueDetail(selectedQueue || ''),
    queryFn: async () => {
      const res = await fetch(`/api/admin/queues/${selectedQueue}`)
      if (!res.ok) throw new Error('Failed to fetch queue detail')
      const json = await res.json()
      return json.data as { metrics: QueueMetrics; failedJobs: FailedJob[] }
    },
    enabled: !!selectedQueue,
    refetchInterval: 30000,
  })

  const deadLetterMutation = useMutation({
    mutationFn: async ({
      queueName,
      action,
      jobId,
    }: {
      queueName: string
      action: 'retry' | 'remove'
      jobId: string
    }) => {
      const res = await csrfFetch(`/api/admin/queues/${queueName}/dead-letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, jobId }),
      })
      if (!res.ok) throw new Error(`Failed to ${action} job`)
      return res.json()
    },
    onSuccess: (_, variables) => {
      toast.success(`Job ${variables.action === 'retry' ? 'retried' : 'removed'} successfully`)
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.queues() })
      if (selectedQueue) {
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.queueDetail(selectedQueue) })
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    },
  })

  const queues = queuesData?.queues ?? []

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Job Queues</h1>
          <p className="text-sm text-muted-foreground">
            Monitor BullMQ job queue health and manage failed jobs
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.queues() })
            if (selectedQueue) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.admin.queueDetail(selectedQueue),
              })
            }
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Queue stats grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoadingQueues
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))
          : queues.map((queue) => {
              const health = getHealthStatus(queue)
              const isSelected = selectedQueue === queue.name

              return (
                <Card
                  key={queue.name}
                  className={`cursor-pointer transition-colors hover:border-ds-accent/50 ${
                    isSelected ? 'border-ds-accent' : ''
                  }`}
                  onClick={() => setSelectedQueue(queue.name)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        {QUEUE_LABELS[queue.name] ?? queue.name}
                      </CardTitle>
                      {health === 'healthy' && (
                        <Badge variant="outline" className="border-ds-success/30 text-ds-success">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Healthy
                        </Badge>
                      )}
                      {health === 'warning' && (
                        <Badge variant="outline" className="border-ds-warning/30 text-ds-warning">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          High Depth
                        </Badge>
                      )}
                      {health === 'error' && (
                        <Badge variant="outline" className="border-destructive/30 text-destructive">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Failed
                        </Badge>
                      )}
                    </div>
                    {queue.isPaused && (
                      <CardDescription className="text-ds-warning">Paused</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Wait </span>
                        <span className="font-mono font-medium">{queue.waiting}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Active </span>
                        <span className="font-mono font-medium">{queue.active}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Delay </span>
                        <span className="font-mono font-medium">{queue.delayed}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fail </span>
                        <span className="font-mono font-medium text-destructive">
                          {queue.failed}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
      </div>

      {/* Selected queue detail — failed jobs table */}
      {selectedQueue && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers className="h-5 w-5" />
              {QUEUE_LABELS[selectedQueue] ?? selectedQueue} — Failed Jobs
            </CardTitle>
            <CardDescription>Dead letter queue — retry or remove failed jobs</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingDetail ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !detailData?.failedJobs?.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No failed jobs in this queue
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job ID</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Failed At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailData.failedJobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-mono text-xs">{job.id}</TableCell>
                        <TableCell className="max-w-xs truncate text-sm">
                          {job.failedReason}
                        </TableCell>
                        <TableCell>{job.attemptsMade}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {job.finishedOn ? new Date(job.finishedOn).toLocaleString() : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={deadLetterMutation.isPending}
                              onClick={(e) => {
                                e.stopPropagation()
                                deadLetterMutation.mutate({
                                  queueName: selectedQueue,
                                  action: 'retry',
                                  jobId: job.id,
                                })
                              }}
                            >
                              <RotateCcw className="mr-1 h-3 w-3" />
                              Retry
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              disabled={deadLetterMutation.isPending}
                              onClick={(e) => {
                                e.stopPropagation()
                                deadLetterMutation.mutate({
                                  queueName: selectedQueue,
                                  action: 'remove',
                                  jobId: job.id,
                                })
                              }}
                            >
                              <Trash2 className="mr-1 h-3 w-3" />
                              Remove
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
