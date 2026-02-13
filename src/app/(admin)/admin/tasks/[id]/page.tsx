'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Clock,
  Coins,
  FileText,
  User,
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Download,
  Image as ImageIcon,
  FileIcon,
  ExternalLink,
  UserPlus,
  Loader2,
  Star,
} from 'lucide-react'
import { TaskProgressCard } from '@/components/admin/task-progress-card'
import { toast } from 'sonner'

interface Task {
  id: string
  title: string
  description: string
  status: string
  requirements: Record<string, unknown> | null
  styleReferences: string[]
  chatHistory: {
    role: string
    content: string
    timestamp: string
    attachments?: { fileName: string; fileUrl: string; fileType: string }[]
  }[]
  estimatedHours: string | null
  creditsUsed: number
  maxRevisions: number
  revisionsUsed: number
  priority: number
  deadline: string | null
  assignedAt: string | null
  completedAt: string | null
  createdAt: string
  clientId: string
  category: {
    id: string
    name: string
    slug: string
  } | null
  freelancer: {
    id: string
    name: string
    image: string | null
  } | null
  files: {
    id: string
    fileName: string
    fileUrl: string
    fileType: string
    fileSize: number
    isDeliverable: boolean
    createdAt: string
  }[]
  messages: {
    id: string
    content: string
    attachments: string[]
    createdAt: string
    senderId: string
    senderName: string
    senderImage: string | null
  }[]
}

const statusConfig: Record<
  string,
  {
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    label: string
    icon: React.ReactNode
  }
> = {
  PENDING: {
    variant: 'secondary',
    label: 'Pending',
    icon: <Clock className="h-4 w-4" />,
  },
  ASSIGNED: {
    variant: 'outline',
    label: 'Assigned',
    icon: <User className="h-4 w-4" />,
  },
  IN_PROGRESS: {
    variant: 'default',
    label: 'In Progress',
    icon: <RefreshCw className="h-4 w-4" />,
  },
  PENDING_ADMIN_REVIEW: {
    variant: 'destructive',
    label: 'Pending Admin Review',
    icon: <AlertCircle className="h-4 w-4" />,
  },
  IN_REVIEW: {
    variant: 'outline',
    label: 'In Review',
    icon: <FileText className="h-4 w-4" />,
  },
  REVISION_REQUESTED: {
    variant: 'destructive',
    label: 'Revision Requested',
    icon: <AlertCircle className="h-4 w-4" />,
  },
  COMPLETED: {
    variant: 'secondary',
    label: 'Completed',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  CANCELLED: {
    variant: 'destructive',
    label: 'Cancelled',
    icon: <AlertCircle className="h-4 w-4" />,
  },
}

interface Freelancer {
  userId: string
  name: string
  email: string
  image: string | null
  completedTasks: number
  rating: string | null
  availability: boolean
}

export default function AdminTaskDetailPage() {
  const params = useParams()
  const [task, setTask] = useState<Task | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [freelancers, setFreelancers] = useState<Freelancer[]>([])
  const [isLoadingFreelancers, setIsLoadingFreelancers] = useState(false)
  const [isReassigning, setIsReassigning] = useState(false)
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchTask(params.id as string)
    }
  }, [params.id])

  const fetchTask = async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}`)
      if (response.ok) {
        const data = await response.json()
        setTask(data.task)
      } else if (response.status === 404) {
        setError('Task not found')
      } else {
        setError('Failed to load task')
      }
    } catch (err) {
      console.error('Failed to fetch task:', err)
      setError('Failed to load task')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFreelancers = async () => {
    if (freelancers.length > 0) return // Already loaded
    setIsLoadingFreelancers(true)
    try {
      const response = await fetch(`/api/admin/tasks/${params.id}/reassign`)
      if (response.ok) {
        const data = await response.json()
        setFreelancers(data.data.freelancers)
      }
    } catch (err) {
      console.error('Failed to fetch freelancers:', err)
      toast.error('Failed to load freelancers')
    } finally {
      setIsLoadingFreelancers(false)
    }
  }

  const handleReassign = async (freelancerId: string) => {
    setIsReassigning(true)
    try {
      const response = await fetch(`/api/admin/tasks/${params.id}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freelancerId }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Task reassigned to ${data.data.assignedTo}`)
        setReassignDialogOpen(false)
        // Refresh task data
        fetchTask(params.id as string)
      } else {
        const error = await response.json()
        toast.error(error.error?.message || 'Failed to reassign task')
      }
    } catch (err) {
      console.error('Failed to reassign task:', err)
      toast.error('Failed to reassign task')
    } finally {
      setIsReassigning(false)
    }
  }

  const canReassign =
    task && ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'REVISION_REQUESTED'].includes(task.status)

  const isImage = (fileType: string) => fileType.startsWith('image/')

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/admin/tasks">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">{error || 'Task not found'}</h2>
            <p className="text-muted-foreground mb-4">
              The task you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission
              to view it.
            </p>
            <Button asChild>
              <Link href="/admin/tasks">View All Tasks</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const status = statusConfig[task.status] || statusConfig.PENDING

  // Separate client attachments from deliverables
  const clientAttachments = task.files.filter((f) => !f.isDeliverable)
  const deliverables = task.files.filter((f) => f.isDeliverable)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/tasks">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={status.variant} className="flex items-center gap-1">
                {status.icon}
                {status.label}
              </Badge>
              {task.category && <Badge variant="outline">{task.category.name}</Badge>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{task.description}</p>
            </CardContent>
          </Card>

          {/* Client Attachments */}
          {clientAttachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Client Attachments
                </CardTitle>
                <CardDescription>Reference files provided by the client</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {clientAttachments.map((file) => (
                    <div key={file.id} className="group relative border rounded-lg overflow-hidden">
                      {isImage(file.fileType) ? (
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block aspect-video relative bg-muted"
                        >
                          <Image
                            src={file.fileUrl}
                            alt={file.fileName}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ExternalLink className="h-6 w-6 text-white" />
                          </div>
                        </a>
                      ) : (
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center p-4 aspect-video bg-muted hover:bg-muted/80 transition-colors"
                        >
                          <FileIcon className="h-10 w-10 text-muted-foreground mb-2" />
                          <p className="text-xs text-center truncate w-full">{file.fileName}</p>
                        </a>
                      )}
                      <div className="p-2 bg-background">
                        <p className="text-xs truncate">{file.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.fileSize / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Chat History */}
          {task.chatHistory && task.chatHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Chat History
                </CardTitle>
                <CardDescription>Original conversation with the client</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {task.chatHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.attachments.map((att, attIdx) => (
                              <a
                                key={attIdx}
                                href={att.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs underline"
                              >
                                <FileIcon className="h-3 w-3" />
                                {att.fileName}
                              </a>
                            ))}
                          </div>
                        )}
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Deliverables */}
          {deliverables.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Deliverables
                </CardTitle>
                <CardDescription>Final files delivered by the freelancer</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {deliverables.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {isImage(file.fileType) ? (
                          <Image
                            src={file.fileUrl}
                            alt={file.fileName}
                            width={48}
                            height={48}
                            className="rounded object-cover"
                          />
                        ) : (
                          <FileText className="h-10 w-10 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium">{file.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.fileSize / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={file.fileUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Messages */}
          {task.messages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {task.messages.map((message) => (
                    <div key={message.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={message.senderImage || undefined} />
                        <AvatarFallback>
                          {message.senderName?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{message.senderName}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{message.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Progress & Timeline */}
          <TaskProgressCard
            status={task.status}
            assignedAt={task.assignedAt}
            deadline={task.deadline}
            createdAt={task.createdAt}
            completedAt={task.completedAt}
          />

          {/* Task Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Coins className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Credits Used</p>
                  <p className="font-medium">{task.creditsUsed} credits</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Revisions</p>
                  <p className="font-medium">
                    {task.revisionsUsed} / {task.maxRevisions} used
                  </p>
                </div>
              </div>

              {task.estimatedHours && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated Time</p>
                      <p className="font-medium">{task.estimatedHours} hours</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Assigned Freelancer */}
          {task.freelancer && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Assigned Artist
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={task.freelancer.image || undefined} />
                    <AvatarFallback>
                      {task.freelancer.name?.[0]?.toUpperCase() || 'F'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{task.freelancer.name}</p>
                    {task.assignedAt && (
                      <p className="text-xs text-muted-foreground">
                        Assigned {new Date(task.assignedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                {canReassign && (
                  <Dialog
                    open={reassignDialogOpen}
                    onOpenChange={(open) => {
                      setReassignDialogOpen(open)
                      if (open) fetchFreelancers()
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Reassign Task
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
                      <DialogHeader>
                        <DialogTitle>Reassign Task</DialogTitle>
                        <DialogDescription>
                          Select a freelancer to reassign this task to.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                        {isLoadingFreelancers ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : freelancers.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8">
                            No approved freelancers available
                          </p>
                        ) : (
                          freelancers.map((freelancer) => (
                            <button
                              key={freelancer.userId}
                              onClick={() => handleReassign(freelancer.userId)}
                              disabled={isReassigning || freelancer.userId === task.freelancer?.id}
                              className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                            >
                              <Avatar>
                                <AvatarImage src={freelancer.image || undefined} />
                                <AvatarFallback>
                                  {freelancer.name?.[0]?.toUpperCase() || 'F'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{freelancer.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {freelancer.email}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-muted-foreground">
                                    {freelancer.completedTasks} tasks
                                  </span>
                                  {freelancer.rating && (
                                    <span className="flex items-center gap-0.5 text-xs text-amber-500">
                                      <Star className="h-3 w-3 fill-current" />
                                      {parseFloat(freelancer.rating).toFixed(1)}
                                    </span>
                                  )}
                                  {!freelancer.availability && (
                                    <Badge variant="secondary" className="text-xs">
                                      Unavailable
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {freelancer.userId === task.freelancer?.id && (
                                <Badge variant="outline" className="text-xs">
                                  Current
                                </Badge>
                              )}
                              {isReassigning && <Loader2 className="h-4 w-4 animate-spin" />}
                            </button>
                          ))
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>
          )}

          {/* Waiting for Assignment */}
          {!task.freelancer && task.status === 'PENDING' && (
            <Card>
              <CardContent className="py-6 text-center">
                <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">Awaiting Assignment</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No artist has claimed this task yet
                </p>
                <Dialog
                  open={reassignDialogOpen}
                  onOpenChange={(open) => {
                    setReassignDialogOpen(open)
                    if (open) fetchFreelancers()
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="default" size="sm" className="mt-4">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Assign Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                      <DialogTitle>Assign Task</DialogTitle>
                      <DialogDescription>
                        Select a freelancer to assign this task to.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                      {isLoadingFreelancers ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : freelancers.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          No approved freelancers available
                        </p>
                      ) : (
                        freelancers.map((freelancer) => (
                          <button
                            key={freelancer.userId}
                            onClick={() => handleReassign(freelancer.userId)}
                            disabled={isReassigning}
                            className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                          >
                            <Avatar>
                              <AvatarImage src={freelancer.image || undefined} />
                              <AvatarFallback>
                                {freelancer.name?.[0]?.toUpperCase() || 'F'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{freelancer.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {freelancer.email}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  {freelancer.completedTasks} tasks
                                </span>
                                {freelancer.rating && (
                                  <span className="flex items-center gap-0.5 text-xs text-amber-500">
                                    <Star className="h-3 w-3 fill-current" />
                                    {parseFloat(freelancer.rating).toFixed(1)}
                                  </span>
                                )}
                                {!freelancer.availability && (
                                  <Badge variant="secondary" className="text-xs">
                                    Unavailable
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {isReassigning && <Loader2 className="h-4 w-4 animate-spin" />}
                          </button>
                        ))
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
