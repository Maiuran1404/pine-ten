'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Play,
  RefreshCw,
  ExternalLink,
  Copy,
  Terminal,
  Image as ImageIcon,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TestResult {
  id: string
  status: string
  errorMessage: string | null
  stackTrace: string | null
  findings: Array<{
    type: string
    severity: string
    message: string
    location?: string
  }> | null
  screenshots: string[]
  consoleErrors: string[]
  networkErrors: Array<{
    url: string
    status: number
    message: string
  }> | null
  startedAt: string | null
  completedAt: string | null
  durationMs: number | null
  test: {
    id: string
    name: string
    description: string | null
    category: string
    testType: string
    severity: string
  } | null
}

interface TestRun {
  id: string
  status: string
  targetUrl: string
  environment: string
  totalTests: number
  passedTests: number
  failedTests: number
  errorTests: number
  skippedTests: number
  score: string | null
  startedAt: string | null
  completedAt: string | null
  durationMs: number | null
  createdAt: string
  metadata: {
    browserInfo?: string
    viewport?: { width: number; height: number }
    notes?: string
  } | null
}

export default function RunDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const runId = params.runId as string

  const [run, setRun] = useState<TestRun | null>(null)
  const [results, setResults] = useState<TestResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionPlan, setExecutionPlan] = useState<unknown[] | null>(null)

  const fetchRunDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/security/runs?id=${runId}`)
      if (res.ok) {
        const data = await res.json()
        setRun(data.run)
        setResults(data.results || [])
      }
    } catch (error) {
      console.error('Failed to fetch run details:', error)
    } finally {
      setIsLoading(false)
    }
  }, [runId])

  useEffect(() => {
    fetchRunDetails()
  }, [fetchRunDetails])

  // Auto-refresh if running
  useEffect(() => {
    if (run?.status === 'RUNNING') {
      const interval = setInterval(fetchRunDetails, 5000)
      return () => clearInterval(interval)
    }
  }, [run?.status, fetchRunDetails])

  const handleStartExecution = async () => {
    setIsExecuting(true)
    try {
      const res = await fetch('/api/admin/security/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId }),
      })
      if (res.ok) {
        const data = await res.json()
        setExecutionPlan(data.executionPlan)
        await fetchRunDetails()
      }
    } catch (error) {
      console.error('Failed to start execution:', error)
    }
    setIsExecuting(false)
  }

  const handleCompleteRun = async () => {
    try {
      const res = await fetch('/api/admin/security/execute/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId }),
      })
      if (res.ok) {
        await fetchRunDetails()
      }
    } catch (error) {
      console.error('Failed to complete run:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASSED':
        return <CheckCircle2 className="h-5 w-5 text-ds-success" />
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-ds-error" />
      case 'ERROR':
        return <AlertCircle className="h-5 w-5 text-ds-warning" />
      case 'RUNNING':
        return <RefreshCw className="h-5 w-5 text-ds-info animate-spin" />
      case 'PENDING':
        return <Clock className="h-5 w-5 text-muted-foreground" />
      default:
        return <AlertTriangle className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-ds-success/10 text-ds-success">Completed</Badge>
      case 'RUNNING':
        return <Badge className="bg-ds-info/10 text-ds-info">Running</Badge>
      case 'PENDING':
        return <Badge className="bg-muted text-muted-foreground">Pending</Badge>
      case 'FAILED':
        return <Badge className="bg-ds-error/10 text-ds-error">Failed</Badge>
      case 'CANCELLED':
        return <Badge className="bg-muted text-muted-foreground">Cancelled</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-ds-error/10 text-ds-error">Critical</Badge>
      case 'high':
        return <Badge className="bg-ds-warning/10 text-ds-warning">High</Badge>
      case 'medium':
        return <Badge className="bg-ds-warning/10 text-ds-warning">Medium</Badge>
      case 'low':
        return <Badge className="bg-muted text-muted-foreground">Low</Badge>
      default:
        return <Badge>{severity}</Badge>
    }
  }

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString()
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-ds-success'
    if (score >= 70) return 'text-ds-warning'
    if (score >= 50) return 'text-ds-warning'
    return 'text-ds-error'
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!run) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Run not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const score = run.score ? parseFloat(run.score) : 0
  const passRate = run.totalTests > 0 ? (run.passedTests / run.totalTests) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Test Run Details</h1>
            <p className="text-muted-foreground text-sm font-mono">{run.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {run.status === 'PENDING' && (
            <Button onClick={handleStartExecution} disabled={isExecuting}>
              <Play className="h-4 w-4 mr-2" />
              {isExecuting ? 'Starting...' : 'Start Execution'}
            </Button>
          )}
          {run.status === 'RUNNING' && (
            <Button onClick={handleCompleteRun}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Complete Run
            </Button>
          )}
          <Button variant="outline" onClick={fetchRunDetails}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>{getStatusBadge(run.status)}</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', getScoreColor(score))}>
              {score.toFixed(0)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {run.passedTests}/{run.totalTests}
            </div>
            <p className="text-xs text-muted-foreground">{passRate.toFixed(0)}% passed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(run.durationMs)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Environment</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="capitalize">
              {run.environment}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Target Info */}
      <Card>
        <CardHeader>
          <CardTitle>Run Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Target URL</p>
              <a
                href={run.targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-ds-info hover:underline"
              >
                {run.targetUrl}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Started</p>
              <p>{formatDate(run.startedAt)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p>{formatDate(run.completedAt)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p>{formatDate(run.createdAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-ds-success/30 bg-ds-success/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ds-success">Passed</p>
                <p className="text-2xl font-bold text-ds-success">{run.passedTests}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-ds-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-ds-error/30 bg-ds-error/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ds-error">Failed</p>
                <p className="text-2xl font-bold text-ds-error">{run.failedTests}</p>
              </div>
              <XCircle className="h-8 w-8 text-ds-error" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-ds-warning/30 bg-ds-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ds-warning">Errors</p>
                <p className="text-2xl font-bold text-ds-warning">{run.errorTests}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-ds-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Skipped</p>
                <p className="text-2xl font-bold text-muted-foreground">{run.skippedTests}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Execution Plan (if available) */}
      {executionPlan && run.status === 'RUNNING' && (
        <Card>
          <CardHeader>
            <CardTitle>Execution Plan</CardTitle>
            <CardDescription>Use the Playwright MCP to execute these tests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-background text-foreground p-4 rounded-lg overflow-x-auto border">
              <pre className="text-sm">{JSON.stringify(executionPlan, null, 2)}</pre>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(executionPlan, null, 2))
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy to Clipboard
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
          <CardDescription>Individual test outcomes</CardDescription>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No results yet. Start execution to run tests.
            </p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {results.map((result, _index) => (
                <AccordionItem key={result.id} value={result.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 w-full pr-4">
                      {getStatusIcon(result.status)}
                      <div className="flex-1 text-left">
                        <div className="font-medium">{result.test?.name || 'Unknown Test'}</div>
                        <div className="text-xs text-muted-foreground">
                          {result.test?.category} | {result.test?.testType}
                        </div>
                      </div>
                      {result.test?.severity && getSeverityBadge(result.test.severity)}
                      <div className="text-sm text-muted-foreground">
                        {formatDuration(result.durationMs)}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-8 space-y-4">
                      {result.test?.description && (
                        <div>
                          <p className="text-sm font-medium">Description</p>
                          <p className="text-sm text-muted-foreground">{result.test.description}</p>
                        </div>
                      )}

                      {result.errorMessage && (
                        <div>
                          <p className="text-sm font-medium text-ds-error">Error Message</p>
                          <div className="bg-ds-error/5 p-3 rounded-lg mt-1">
                            <p className="text-sm text-ds-error">{result.errorMessage}</p>
                          </div>
                        </div>
                      )}

                      {result.stackTrace && (
                        <div>
                          <p className="text-sm font-medium">Stack Trace</p>
                          <pre className="bg-muted p-3 rounded-lg mt-1 text-xs overflow-x-auto">
                            {result.stackTrace}
                          </pre>
                        </div>
                      )}

                      {result.findings && result.findings.length > 0 && (
                        <div>
                          <p className="text-sm font-medium">Findings</p>
                          <div className="space-y-2 mt-1">
                            {result.findings.map((finding, i) => (
                              <div
                                key={i}
                                className="bg-ds-warning/5 p-3 rounded-lg border border-ds-warning/30"
                              >
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-ds-warning" />
                                  <Badge className="bg-ds-warning/10 text-ds-warning">
                                    {finding.severity}
                                  </Badge>
                                  <span className="text-sm font-medium">{finding.type}</span>
                                </div>
                                <p className="text-sm mt-1">{finding.message}</p>
                                {finding.location && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Location: {finding.location}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {result.consoleErrors && result.consoleErrors.length > 0 && (
                        <div>
                          <p className="text-sm font-medium flex items-center gap-2">
                            <Terminal className="h-4 w-4" />
                            Console Errors ({result.consoleErrors.length})
                          </p>
                          <div className="bg-background text-foreground p-3 rounded-lg mt-1 border">
                            {result.consoleErrors.map((error, i) => (
                              <p key={i} className="text-xs text-ds-error">
                                {error}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      {result.networkErrors && result.networkErrors.length > 0 && (
                        <div>
                          <p className="text-sm font-medium">
                            Network Errors ({result.networkErrors.length})
                          </p>
                          <div className="space-y-1 mt-1">
                            {result.networkErrors.map((error, i) => (
                              <div key={i} className="text-xs p-2 bg-ds-error/5 rounded">
                                <span className="font-mono text-ds-error">{error.status}</span>{' '}
                                {error.url}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {result.screenshots && result.screenshots.length > 0 && (
                        <div>
                          <p className="text-sm font-medium flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" />
                            Screenshots ({result.screenshots.length})
                          </p>
                          <div className="flex gap-2 mt-1 overflow-x-auto">
                            {result.screenshots.map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt={`Screenshot ${i + 1}`}
                                  className="h-24 rounded border hover:border-ds-info transition-colors"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Started: {formatDate(result.startedAt)}</span>
                        <span>Completed: {formatDate(result.completedAt)}</span>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
