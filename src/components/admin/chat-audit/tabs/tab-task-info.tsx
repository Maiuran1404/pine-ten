'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User, CreditCard, Clock, Target, Zap, Calendar, CheckCircle, FileText } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { TaskMetadata, PendingTaskInfo } from '@/types/admin-chat-logs'

interface TabTaskInfoProps {
  userName: string
  userEmail: string
  userImage: string | null
  taskMetadata: TaskMetadata | null
  pendingTask: PendingTaskInfo | null | undefined
  createdAt: string
  updatedAt: string
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-ds-warning/10 text-ds-warning border-ds-warning/30',
  OFFERED: 'bg-ds-accent/10 text-ds-accent border-ds-accent/30',
  ASSIGNED: 'bg-ds-accent/10 text-ds-accent border-ds-accent/30',
  IN_PROGRESS: 'bg-ds-accent/10 text-ds-accent border-ds-accent/30',
  PENDING_ADMIN_REVIEW: 'bg-crafted-sage/10 text-crafted-sage border-crafted-sage/30',
  IN_REVIEW: 'bg-crafted-sage/10 text-crafted-sage border-crafted-sage/30',
  COMPLETED: 'bg-ds-success/10 text-ds-success border-ds-success/30',
  REVISION_REQUESTED: 'bg-ds-warning/10 text-ds-warning border-ds-warning/30',
  CANCELLED: 'bg-ds-error/10 text-ds-error border-ds-error/30',
}

export function TabTaskInfo({
  userName,
  userEmail,
  userImage,
  taskMetadata,
  pendingTask,
  createdAt,
  updatedAt,
}: TabTaskInfoProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* User Card */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Client
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={userImage || undefined} />
                <AvatarFallback className="text-xs">{getInitials(userName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task Metadata */}
        {taskMetadata && (
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" />
                Task Details
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Status */}
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Status</p>
                  <Badge variant="outline" className={STATUS_STYLES[taskMetadata.status] || ''}>
                    {taskMetadata.status.replace(/_/g, ' ')}
                  </Badge>
                </div>

                {/* Credits */}
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Credits Used</p>
                  <div className="flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5 text-crafted-green" />
                    <span className="text-sm font-semibold">{taskMetadata.creditsUsed}</span>
                  </div>
                </div>

                {/* Complexity */}
                {taskMetadata.complexity && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Complexity</p>
                    <div className="flex items-center gap-1">
                      <Target className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{taskMetadata.complexity}</span>
                    </div>
                  </div>
                )}

                {/* Urgency */}
                {taskMetadata.urgency && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Urgency</p>
                    <div className="flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{taskMetadata.urgency}</span>
                    </div>
                  </div>
                )}

                {/* Category */}
                {taskMetadata.categoryName && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Category</p>
                    <Badge
                      variant="outline"
                      className="text-xs border-crafted-green/30 text-crafted-green"
                    >
                      {taskMetadata.categoryName}
                    </Badge>
                  </div>
                )}

                {/* Deadline */}
                {taskMetadata.deadline && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Deadline</p>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs">
                        {new Date(taskMetadata.deadline).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="pt-2 border-t border-border/50 space-y-1">
                {taskMetadata.assignedAt && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Assigned</span>
                    <span>
                      {formatDistanceToNow(new Date(taskMetadata.assignedAt), { addSuffix: true })}
                    </span>
                  </div>
                )}
                {taskMetadata.completedAt && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Completed</span>
                    <span>
                      {formatDistanceToNow(new Date(taskMetadata.completedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Task (for drafts) */}
        {pendingTask && (
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Pending Submission
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2">
              <p className="text-sm font-medium">{pendingTask.title}</p>
              <p className="text-xs text-muted-foreground">{pendingTask.description}</p>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">
                  {pendingTask.category}
                </Badge>
                <Badge
                  className="text-xs bg-crafted-green/10 text-crafted-green border-crafted-green/30"
                  variant="outline"
                >
                  {pendingTask.creditsRequired} credits
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timestamps */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Last updated</span>
              <span>{formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}
