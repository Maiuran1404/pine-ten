'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  ChevronRight,
  Copy,
  AlertCircle,
  FileText,
  Palette,
  MessageSquare,
  Globe,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TaskDetailData } from '@/components/task-detail/types'
import { STATUS_CONFIG } from '@/components/task-detail/types'
import { TaskProgressStepper } from '@/components/task-detail/task-progress-stepper'
import { BriefSummaryCard } from '@/components/task-detail/brief-summary-card'
import { ReviewActionBanner } from '@/components/task-detail/review-action-banner'
import { CreativeBriefTab } from '@/components/task-detail/tabs/creative-brief-tab'
import { VisualDirectionTab } from '@/components/task-detail/tabs/visual-direction-tab'
import { ConversationTab } from '@/components/task-detail/tabs/conversation-tab'
import { DesignerCard } from '@/components/task-detail/sidebar/designer-card'
import { TaskMetadataPills } from '@/components/task-detail/sidebar/task-metadata-pills'
import { ActivityTimeline } from '@/components/task-detail/sidebar/activity-timeline'
import { AttachmentsList } from '@/components/task-detail/sidebar/attachments-list'
import { WebsiteDeliveryTab } from '@/components/task-detail/tabs/website-delivery-tab'
import { FreshTaskHero } from '@/components/task-detail/fresh-task-hero'

export default function TaskDetailPage() {
  const params = useParams()
  const [task, setTask] = useState<TaskDetailData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Chat and action states
  const [message, setMessage] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

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
        setTask(data.data?.task)
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

  const handleSendMessage = async () => {
    if (!message.trim() || !task) return

    setIsSendingMessage(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message.trim() }),
      })

      if (response.ok) {
        const data = await response.json()
        setTask({
          ...task,
          messages: [...task.messages, data.message],
        })
        setMessage('')
      } else {
        const err = await response.json()
        toast.error(err.error || 'Failed to send message')
      }
    } catch {
      toast.error('Failed to send message')
    } finally {
      setIsSendingMessage(false)
    }
  }

  const handleRequestRevision = async () => {
    if (!message.trim() || !task) return

    setIsAnalyzing(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}/revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: message.trim() }),
      })

      if (response.ok) {
        toast.success('Revision requested! The designer has been notified.')
        setMessage('')
        fetchTask(task.id)
      } else {
        const contentType = response.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          const err = await response.json()
          toast.error(err.error || 'Failed to request revision')
        } else {
          toast.error('Failed to request revision. Please try again.')
        }
      }
    } catch (err) {
      console.error('Revision request error:', err)
      toast.error('Failed to request revision')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleApprove = async () => {
    if (!task) return

    setIsApproving(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}/approve`, {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Task approved! Great work has been delivered.')
        fetchTask(task.id)
      } else {
        const err = await response.json()
        toast.error(err.error || 'Failed to approve task')
      }
    } catch {
      toast.error('Failed to approve task')
    } finally {
      setIsApproving(false)
    }
  }

  const copyTaskId = () => {
    navigator.clipboard.writeText(task?.id || '')
    toast.success('Task ID copied')
  }

  // --- Loading State ---
  if (isLoading) {
    return (
      <div className="min-h-full bg-background">
        <div className="border-b border-border bg-card px-6 py-4">
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="mx-auto max-w-7xl px-6 py-8">
          <Skeleton className="mb-6 h-12 w-full rounded-lg" />
          <Skeleton className="mb-6 h-24 w-full rounded-lg" />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <Skeleton className="h-10 w-64 rounded-lg" />
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- Error State ---
  if (error || !task) {
    return (
      <div className="min-h-full bg-background">
        <div className="border-b border-border bg-card px-6 py-4">
          <Link
            href="/dashboard/tasks"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Tasks
          </Link>
        </div>
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            {error || 'Task not found'}
          </h2>
          <p className="mb-6 text-muted-foreground">
            The task you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to
            view it.
          </p>
          <Button asChild>
            <Link href="/dashboard/tasks">View All Tasks</Link>
          </Button>
        </div>
      </div>
    )
  }

  const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING
  const deliverables = task.files.filter((f) => f.isDeliverable)
  const attachments = task.files.filter((f) => !f.isDeliverable)
  const canChat = ['ASSIGNED', 'IN_PROGRESS', 'IN_REVIEW', 'REVISION_REQUESTED'].includes(
    task.status
  )
  const isFreshTask =
    ['PENDING', 'OFFERED', 'ASSIGNED'].includes(task.status) &&
    task.messages.length === 0 &&
    deliverables.length === 0

  return (
    <div className="min-h-full bg-background">
      {/* ===== HEADER WITH BREADCRUMB ===== */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Link
                href="/dashboard/tasks"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Tasks
              </Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="max-w-[200px] truncate font-medium text-foreground sm:max-w-none">
                {task.title}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyTaskId}
                className="text-muted-foreground"
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">Copy ID</span>
              </Button>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                  status.bgColor,
                  status.color
                )}
              >
                {status.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* --- HERO ZONE --- */}
        <div className="mb-8 space-y-6">
          {/* Progress Stepper */}
          <TaskProgressStepper status={task.status} />

          {/* Review Action Banner (IN_REVIEW or REVISION_REQUESTED) */}
          <ReviewActionBanner
            task={task}
            deliverables={deliverables}
            onApprove={handleApprove}
            onRequestRevision={() => {
              const el = document.getElementById('conversation-tab-trigger')
              if (el) el.click()
            }}
            isApproving={isApproving}
          />

          {/* Brief Summary Card */}
          <BriefSummaryCard task={task} />

          {/* What to Expect (fresh tasks only) */}
          {isFreshTask && (
            <FreshTaskHero
              estimatedHours={task.estimatedHours}
              deadline={task.deadline}
              hasDesigner={!!task.freelancer}
            />
          )}
        </div>

        {/* --- TWO-COLUMN LAYOUT WITH TABS + SIDEBAR --- */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
          {/* Left: Tab Content */}
          <div>
            <Tabs defaultValue="brief">
              <TabsList className="mb-6 w-full">
                <TabsTrigger value="brief" className="flex-1 gap-1.5">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Creative Brief</span>
                  <span className="sm:hidden">Brief</span>
                </TabsTrigger>
                <TabsTrigger value="visual" className="flex-1 gap-1.5">
                  <Palette className="h-4 w-4" />
                  <span className="hidden sm:inline">Visual Direction</span>
                  <span className="sm:hidden">Visual</span>
                </TabsTrigger>
                <TabsTrigger
                  value="conversation"
                  id="conversation-tab-trigger"
                  className="flex-1 gap-1.5"
                >
                  <MessageSquare className="h-4 w-4" />
                  Conversation
                  {task.messages.length > 0 && (
                    <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs">
                      {task.messages.length}
                    </span>
                  )}
                </TabsTrigger>
                {task.websiteProject && (
                  <TabsTrigger value="website" className="flex-1 gap-1.5">
                    <Globe className="h-4 w-4" />
                    <span className="hidden sm:inline">Website</span>
                    <span className="sm:hidden">Web</span>
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="brief">
                <CreativeBriefTab task={task} />
              </TabsContent>

              <TabsContent value="visual">
                <VisualDirectionTab task={task} />
              </TabsContent>

              <TabsContent value="conversation">
                <ConversationTab
                  task={task}
                  message={message}
                  onMessageChange={setMessage}
                  onSendMessage={handleSendMessage}
                  onRequestRevision={handleRequestRevision}
                  isSendingMessage={isSendingMessage}
                  isAnalyzing={isAnalyzing}
                  canChat={canChat}
                />
              </TabsContent>

              {task.websiteProject && (
                <TabsContent value="website">
                  <WebsiteDeliveryTab projectId={task.websiteProject.id} taskId={task.id} />
                </TabsContent>
              )}
            </Tabs>
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-6">
            <DesignerCard
              freelancer={task.freelancer}
              assignedAt={task.assignedAt}
              status={task.status}
            />
            <TaskMetadataPills task={task} />
            {task.activityLog && task.activityLog.length > 0 && (
              <ActivityTimeline activityLog={task.activityLog} />
            )}
            {attachments.length > 0 && <AttachmentsList files={attachments} />}
          </div>
        </div>
      </div>
    </div>
  )
}
