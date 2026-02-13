'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StatCard } from '@/components/admin/stat-card'
import {
  MessageSquare,
  Search,
  FileText,
  CheckCircle,
  Clock,
  Eye,
  User,
  Palette,
  Paperclip,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { logger } from '@/lib/logger'
import type { AdminChatMessage, ChatLog } from '@/types/admin-chat-logs'

interface Stats {
  total: number
  drafts: number
  tasks: number
  avgMessages: number
}

export default function ChatLogsPage() {
  const [logs, setLogs] = useState<ChatLog[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, drafts: 0, tasks: 0, avgMessages: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedLog, setSelectedLog] = useState<ChatLog | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    fetchLogs()
  }, [statusFilter, searchTerm])

  const fetchLogs = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (searchTerm) params.set('search', searchTerm)

      const response = await fetch(`/api/admin/chat-logs?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
        setStats(data.stats || { total: 0, drafts: 0, tasks: 0, avgMessages: 0 })
      }
    } catch (error) {
      logger.error({ err: error }, 'Failed to fetch chat logs')
      toast.error('Failed to load chat logs')
    } finally {
      setIsLoading(false)
    }
  }

  const openDetailDialog = (log: ChatLog) => {
    setSelectedLog(log)
    setDialogOpen(true)
  }

  const getStatusBadge = (log: ChatLog) => {
    if (log.type === 'draft') {
      if (log.pendingTask) {
        return <Badge className="bg-yellow-500">Ready to Submit</Badge>
      }
      return <Badge variant="secondary">Draft</Badge>
    }

    const statusColors: Record<string, string> = {
      PENDING: 'bg-yellow-500',
      ASSIGNED: 'bg-blue-500',
      IN_PROGRESS: 'bg-purple-500',
      IN_REVIEW: 'bg-orange-500',
      COMPLETED: 'bg-green-500',
    }

    return (
      <Badge className={statusColors[log.taskStatus || ''] || 'bg-gray-500'}>
        {log.taskStatus?.replace('_', ' ') || 'Unknown'}
      </Badge>
    )
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getMessagePreview = (messages: AdminChatMessage[]) => {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')
    if (lastUserMessage) {
      return lastUserMessage.content.length > 100
        ? lastUserMessage.content.slice(0, 100) + '...'
        : lastUserMessage.content
    }
    return 'No messages'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chat Logs</h1>
        <p className="text-muted-foreground">Monitor all user conversations and style selections</p>
      </div>

      {/* Stats */}
      {!isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Conversations" value={stats.total} icon={MessageSquare} />
          <StatCard
            label="Active Drafts"
            value={stats.drafts}
            subtext="In-progress requests"
            icon={FileText}
          />
          <StatCard
            label="Converted to Tasks"
            value={stats.tasks}
            subtext="Submitted requests"
            icon={CheckCircle}
          />
          <StatCard
            label="Avg Messages"
            value={stats.avgMessages}
            subtext="Per conversation"
            icon={Clock}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by user or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="draft">Drafts Only</SelectItem>
            <SelectItem value="task">Tasks Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : logs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">No Chat Logs Found</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'Chat conversations will appear here as users start interacting.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Title / Preview</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Messages</TableHead>
                  <TableHead className="text-center">Styles</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openDetailDialog(log)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={log.userImage || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(log.userName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{log.userName}</p>
                          <p className="text-xs text-muted-foreground truncate">{log.userEmail}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0 max-w-xs">
                        <p className="font-medium text-sm truncate">{log.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {getMessagePreview(log.messages)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(log)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{log.messages.length}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {log.styleDetails && log.styleDetails.length > 0 ? (
                        <div className="flex -space-x-2 justify-center">
                          {log.styleDetails.slice(0, 3).map((style) => (
                            <div
                              key={style.id}
                              className="w-6 h-6 rounded border-2 border-background bg-muted overflow-hidden"
                              title={style.name}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={style.imageUrl}
                                alt={style.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                          {log.styleDetails.length > 3 && (
                            <div className="w-6 h-6 rounded border-2 border-background bg-muted flex items-center justify-center text-xs">
                              +{log.styleDetails.length - 3}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(log.updatedAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          openDetailDialog(log)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {selectedLog?.title || 'Conversation Details'}
            </DialogTitle>
            <DialogDescription>
              {selectedLog && (
                <span className="flex items-center gap-2">
                  {getStatusBadge(selectedLog)}
                  <span className="text-muted-foreground">
                    {selectedLog.messages.length} messages
                  </span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="flex-1 overflow-hidden grid grid-cols-3 gap-4">
              {/* Messages */}
              <div className="col-span-2 flex flex-col">
                <h3 className="font-medium text-sm mb-2">Conversation</h3>
                <ScrollArea className="flex-1 pr-4 border rounded-lg p-4 bg-muted/30">
                  <div className="space-y-4">
                    {selectedLog.messages.map((message, idx) => (
                      <div
                        key={message.id || idx}
                        className={cn(
                          'flex',
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[80%] rounded-lg p-3',
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-background border'
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {message.attachments.map((att, i) => (
                                <a
                                  key={i}
                                  href={att.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(
                                    'flex items-center gap-1 text-xs px-2 py-1 rounded',
                                    message.role === 'user'
                                      ? 'bg-primary-foreground/20 text-primary-foreground'
                                      : 'bg-muted'
                                  )}
                                >
                                  <Paperclip className="h-3 w-3" />
                                  {att.fileName}
                                </a>
                              ))}
                            </div>
                          )}
                          <p
                            className={cn(
                              'text-[10px] mt-1',
                              message.role === 'user'
                                ? 'text-primary-foreground/70'
                                : 'text-muted-foreground'
                            )}
                          >
                            {new Date(message.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Sidebar */}
              <div className="space-y-4 overflow-y-auto">
                {/* User Info */}
                <div>
                  <h3 className="font-medium text-sm mb-2 flex items-center gap-1">
                    <User className="h-4 w-4" />
                    User
                  </h3>
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-background">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedLog.userImage || undefined} />
                      <AvatarFallback>{getInitials(selectedLog.userName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{selectedLog.userName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {selectedLog.userEmail}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Style References */}
                {selectedLog.styleDetails && selectedLog.styleDetails.length > 0 && (
                  <div>
                    <h3 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <Palette className="h-4 w-4" />
                      Selected Styles ({selectedLog.styleDetails.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedLog.styleDetails.map((style) => (
                        <div
                          key={style.id}
                          className="flex items-center gap-2 p-2 rounded-lg border bg-background"
                        >
                          <div className="w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={style.imageUrl}
                              alt={style.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-xs truncate">{style.name}</p>
                            <div className="flex gap-1 mt-1">
                              <Badge variant="outline" className="text-[10px] px-1">
                                {style.deliverableType.replace('_', ' ')}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px] px-1">
                                {style.styleAxis}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending Task */}
                {selectedLog.pendingTask && (
                  <div>
                    <h3 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      Pending Task
                    </h3>
                    <div className="p-3 rounded-lg border bg-background space-y-2">
                      <p className="font-medium text-sm">{selectedLog.pendingTask.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedLog.pendingTask.description}
                      </p>
                      <div className="flex gap-2">
                        <Badge variant="outline">{selectedLog.pendingTask.category}</Badge>
                        <Badge>{selectedLog.pendingTask.creditsRequired} credits</Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* Task Status */}
                {selectedLog.type === 'task' && selectedLog.taskStatus && (
                  <div>
                    <h3 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      Task Status
                    </h3>
                    <div className="p-3 rounded-lg border bg-background">
                      {getStatusBadge(selectedLog)}
                      <p className="text-xs text-muted-foreground mt-2">
                        Created{' '}
                        {formatDistanceToNow(new Date(selectedLog.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                  <p>Created: {new Date(selectedLog.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(selectedLog.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
