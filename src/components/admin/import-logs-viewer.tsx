'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  History,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  User,
  Search,
  RefreshCw,
  Trash2,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, format } from 'date-fns'

interface ImportedItem {
  id: string
  name: string
  imageUrl: string
  deliverableType?: string
  styleAxis?: string
  toneBucket?: string
  energyBucket?: string
  confidence?: number
}

interface FailedItem {
  url: string
  error: string
}

interface SkippedItem {
  url: string
  reason: string
}

interface ImportLog {
  id: string
  source: 'bigged' | 'dribbble' | 'manual_url' | 'file_upload' | 'page_scrape'
  target: 'deliverable_style' | 'brand_reference'
  triggeredBy: string | null
  triggeredByEmail: string | null
  searchQuery: string | null
  sourceUrl: string | null
  totalAttempted: number
  totalSuccessful: number
  totalFailed: number
  totalSkipped: number
  importedItems: ImportedItem[]
  failedItems: FailedItem[]
  skippedItems: SkippedItem[]
  processingTimeMs: number | null
  confidenceThreshold: string | null
  status: string
  errorMessage: string | null
  startedAt: string
  completedAt: string | null
  createdAt: string
  userName: string | null
}

interface ImportLogsViewerProps {
  target: 'deliverable_style' | 'brand_reference'
  title?: string
  description?: string
}

const SOURCE_LABELS: Record<string, string> = {
  bigged: 'Bigged Ad Spy',
  dribbble: 'Dribbble',
  manual_url: 'Manual URL',
  file_upload: 'File Upload',
  page_scrape: 'Page Scrape',
}

const SOURCE_COLORS: Record<string, string> = {
  bigged: 'bg-purple-500',
  dribbble: 'bg-pink-500',
  manual_url: 'bg-blue-500',
  file_upload: 'bg-green-500',
  page_scrape: 'bg-orange-500',
}

export function ImportLogsViewer({
  target,
  title = 'Import History',
  description = 'View import logs and history',
}: ImportLogsViewerProps) {
  const [logs, setLogs] = useState<ImportLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sourceFilter, setSourceFilter] = useState('all')
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const [selectedLog, setSelectedLog] = useState<ImportLog | null>(null)
  const [stats, setStats] = useState({
    totalLogs: 0,
    totalImported: 0,
    totalFailed: 0,
    totalSkipped: 0,
  })

  useEffect(() => {
    fetchLogs()
  }, [target, sourceFilter])

  const fetchLogs = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ target, limit: '100' })
      if (sourceFilter !== 'all') {
        params.set('source', sourceFilter)
      }

      const response = await fetch(`/api/admin/import-logs?${params}`)
      const data = await response.json()

      if (data.success) {
        setLogs(data.data.logs)
        setStats(data.data.stats)
      } else {
        toast.error('Failed to fetch import logs')
      }
    } catch (error) {
      console.error('Failed to fetch import logs:', error)
      toast.error('Failed to fetch import logs')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/import-logs?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setLogs((prev) => prev.filter((log) => log.id !== id))
        toast.success('Log deleted')
      } else {
        toast.error('Failed to delete log')
      }
    } catch {
      toast.error('Failed to delete log')
    }
  }

  const toggleLogExpanded = (id: string) => {
    setExpandedLogs((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const getStatusBadge = (status: string, totalFailed: number, totalSuccessful: number) => {
    if (status === 'failed' || totalSuccessful === 0) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      )
    }
    if (status === 'partial' || totalFailed > 0) {
      return (
        <Badge
          variant="outline"
          className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 flex items-center gap-1"
        >
          <AlertCircle className="h-3 w-3" />
          Partial
        </Badge>
      )
    }
    return (
      <Badge className="bg-green-500 flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Success
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="bigged">Bigged Ad Spy</SelectItem>
                <SelectItem value="dribbble">Dribbble</SelectItem>
                <SelectItem value="manual_url">Manual URL</SelectItem>
                <SelectItem value="file_upload">File Upload</SelectItem>
                <SelectItem value="page_scrape">Page Scrape</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchLogs}>
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats summary */}
        <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.totalLogs}</div>
            <div className="text-xs text-muted-foreground">Total Imports</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.totalImported}</div>
            <div className="text-xs text-muted-foreground">Items Imported</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.totalFailed}</div>
            <div className="text-xs text-muted-foreground">Items Failed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.totalSkipped}</div>
            <div className="text-xs text-muted-foreground">Items Skipped</div>
          </div>
        </div>

        {/* Logs list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No import logs found</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {logs.map((log) => (
              <Collapsible
                key={log.id}
                open={expandedLogs.has(log.id)}
                onOpenChange={() => toggleLogExpanded(log.id)}
              >
                <div className="border rounded-lg overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer">
                      <div className="flex items-center gap-3">
                        {expandedLogs.has(log.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <Badge className={cn('text-white', SOURCE_COLORS[log.source])}>
                          {SOURCE_LABELS[log.source]}
                        </Badge>
                        {log.searchQuery && (
                          <span className="flex items-center gap-1 text-sm">
                            <Search className="h-3 w-3" />
                            &quot;{log.searchQuery}&quot;
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-green-600">{log.totalSuccessful}</span>
                            <span className="text-muted-foreground">/</span>
                            <span>{log.totalAttempted}</span>
                            {log.totalFailed > 0 && (
                              <span className="text-red-500">({log.totalFailed} failed)</span>
                            )}
                          </div>
                        </div>
                        {getStatusBadge(log.status, log.totalFailed, log.totalSuccessful)}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t p-4 space-y-4 bg-muted/20">
                      {/* Details row */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{log.userName || log.triggeredByEmail || 'System'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Started:</span>{' '}
                          {format(new Date(log.startedAt), 'MMM d, yyyy h:mm a')}
                        </div>
                        {log.processingTimeMs && (
                          <div>
                            <span className="text-muted-foreground">Duration:</span>{' '}
                            {log.processingTimeMs < 1000
                              ? `${log.processingTimeMs}ms`
                              : `${(log.processingTimeMs / 1000).toFixed(1)}s`}
                          </div>
                        )}
                        {log.confidenceThreshold && (
                          <div>
                            <span className="text-muted-foreground">Confidence threshold:</span>{' '}
                            {Math.round(parseFloat(log.confidenceThreshold) * 100)}%
                          </div>
                        )}
                      </div>

                      {/* Imported items */}
                      {log.importedItems && log.importedItems.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 text-green-600">
                            Imported ({log.importedItems.length})
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                            {log.importedItems.slice(0, 12).map((item, idx) => (
                              <div
                                key={idx}
                                className="relative aspect-square rounded-lg overflow-hidden bg-muted group cursor-pointer"
                                onClick={() => setSelectedLog(log)}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="text-white text-xs text-center px-1 line-clamp-2">
                                    {item.name}
                                  </span>
                                </div>
                              </div>
                            ))}
                            {log.importedItems.length > 12 && (
                              <button
                                className="aspect-square rounded-lg bg-muted flex items-center justify-center text-sm text-muted-foreground hover:bg-muted/80"
                                onClick={() => setSelectedLog(log)}
                              >
                                +{log.importedItems.length - 12} more
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Failed items */}
                      {log.failedItems && log.failedItems.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 text-red-600">
                            Failed ({log.failedItems.length})
                          </h4>
                          <div className="space-y-1">
                            {log.failedItems.slice(0, 3).map((item, idx) => (
                              <div
                                key={idx}
                                className="text-xs flex items-start gap-2 text-red-600"
                              >
                                <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span className="truncate">{item.error}</span>
                              </div>
                            ))}
                            {log.failedItems.length > 3 && (
                              <button
                                className="text-xs text-muted-foreground hover:underline"
                                onClick={() => setSelectedLog(log)}
                              >
                                View all {log.failedItems.length} failed items
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Skipped items */}
                      {log.skippedItems && log.skippedItems.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 text-yellow-600">
                            Skipped ({log.skippedItems.length})
                          </h4>
                          <div className="text-xs text-muted-foreground">
                            {log.skippedItems.length} duplicate(s) detected and skipped
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View Details
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(log.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>

      {/* Detail dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedLog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Badge className={cn('text-white', SOURCE_COLORS[selectedLog.source])}>
                    {SOURCE_LABELS[selectedLog.source]}
                  </Badge>
                  {selectedLog.searchQuery && `"${selectedLog.searchQuery}"`}
                </DialogTitle>
                <DialogDescription>
                  {format(new Date(selectedLog.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                  {' • '}
                  {selectedLog.userName || selectedLog.triggeredByEmail || 'System'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <div className="text-xl font-bold">{selectedLog.totalAttempted}</div>
                    <div className="text-xs text-muted-foreground">Attempted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600">
                      {selectedLog.totalSuccessful}
                    </div>
                    <div className="text-xs text-muted-foreground">Successful</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-red-600">{selectedLog.totalFailed}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-yellow-600">
                      {selectedLog.totalSkipped}
                    </div>
                    <div className="text-xs text-muted-foreground">Skipped</div>
                  </div>
                </div>

                {/* All imported items */}
                {selectedLog.importedItems && selectedLog.importedItems.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3 text-green-600">
                      All Imported Items ({selectedLog.importedItems.length})
                    </h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[300px] overflow-y-auto">
                      {selectedLog.importedItems.map((item, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <p className="text-xs truncate" title={item.name}>
                            {item.name}
                          </p>
                          <div className="flex gap-1">
                            {item.deliverableType && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0">
                                {item.deliverableType}
                              </Badge>
                            )}
                            {item.styleAxis && (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0">
                                {item.styleAxis}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All failed items */}
                {selectedLog.failedItems && selectedLog.failedItems.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3 text-red-600">
                      All Failed Items ({selectedLog.failedItems.length})
                    </h4>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {selectedLog.failedItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-2 bg-red-500/5 rounded-lg text-sm"
                        >
                          <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-red-600 font-medium">{item.error}</p>
                            <p className="text-xs text-muted-foreground truncate">{item.url}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All skipped items */}
                {selectedLog.skippedItems && selectedLog.skippedItems.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3 text-yellow-600">
                      All Skipped Items ({selectedLog.skippedItems.length})
                    </h4>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {selectedLog.skippedItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-2 bg-yellow-500/5 rounded-lg text-sm"
                        >
                          <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-yellow-600">{item.reason}</p>
                            <p className="text-xs text-muted-foreground truncate">{item.url}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
