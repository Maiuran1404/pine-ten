'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Calendar, Clock, CheckCircle2, Target } from 'lucide-react'
import {
  calculateWorkingDeadline,
  getTaskProgressPercent,
  getTimeProgressPercent,
  getDeadlineUrgency,
  formatTimeRemaining,
} from '@/lib/utils'

interface TaskProgressCardProps {
  status: string
  assignedAt: string | null
  deadline: string | null
  createdAt: string
  completedAt?: string | null
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  REVISION_REQUESTED: 'Revision Requested',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export function TaskProgressCard({
  status,
  assignedAt,
  deadline,
  createdAt,
  completedAt,
}: TaskProgressCardProps) {
  const workingDeadline = calculateWorkingDeadline(assignedAt, deadline)
  const taskProgress = getTaskProgressPercent(status)
  const timeProgress = getTimeProgressPercent(assignedAt, deadline)
  const urgency = getDeadlineUrgency(deadline, workingDeadline)

  const urgencyConfig = {
    overdue: {
      color: 'text-destructive',
      bgColor: 'bg-destructive',
      label: 'Overdue',
    },
    urgent: {
      color: 'text-orange-500',
      bgColor: 'bg-orange-500',
      label: 'Past Artist Deadline',
    },
    warning: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-500',
      label: 'Due Soon',
    },
    safe: {
      color: 'text-green-600',
      bgColor: 'bg-green-500',
      label: 'On Track',
    },
  }

  const isActiveTask = ['ASSIGNED', 'IN_PROGRESS', 'REVISION_REQUESTED', 'IN_REVIEW'].includes(
    status
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Progress & Timeline
          </span>
          {urgency && isActiveTask && (
            <Badge
              variant={urgency === 'safe' ? 'outline' : 'destructive'}
              className={urgency === 'safe' ? 'border-green-500 text-green-600' : ''}
            >
              {urgencyConfig[urgency].label}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Task Status</span>
            <span className="font-medium">{statusLabels[status] || status}</span>
          </div>
          <Progress value={taskProgress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Start</span>
            <span>In Progress</span>
            <span>Review</span>
            <span>Done</span>
          </div>
        </div>

        {/* Timeline Progress - Only show if we have assigned and deadline */}
        {assignedAt && deadline && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Time Elapsed</span>
                <span className={`font-medium ${urgency ? urgencyConfig[urgency].color : ''}`}>
                  {Math.round(timeProgress)}%
                </span>
              </div>
              <div className="relative">
                <Progress
                  value={timeProgress}
                  className={`h-3 ${timeProgress > 100 ? '[&>div]:bg-destructive' : ''}`}
                />
                {/* Working deadline marker at 70% */}
                <div
                  className="absolute top-0 h-3 w-0.5 bg-orange-500"
                  style={{ left: '70%' }}
                  title="Artist Deadline (70%)"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Assigned</span>
                <span className="text-orange-500">Artist Deadline</span>
                <span>Client Deadline</span>
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Deadline Details */}
        <div className="grid grid-cols-2 gap-4">
          {/* Artist Deadline */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Artist Deadline
            </div>
            {workingDeadline ? (
              <div>
                <p
                  className={`font-medium ${urgency === 'urgent' || urgency === 'overdue' ? 'text-orange-500' : ''}`}
                >
                  {workingDeadline.toLocaleDateString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatTimeRemaining(workingDeadline)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not set</p>
            )}
          </div>

          {/* Client Deadline */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Client Deadline
            </div>
            {deadline ? (
              <div>
                <p className={`font-medium ${urgency === 'overdue' ? 'text-destructive' : ''}`}>
                  {new Date(deadline).toLocaleDateString()}
                </p>
                <p className="text-xs text-muted-foreground">{formatTimeRemaining(deadline)}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not set</p>
            )}
          </div>
        </div>

        {/* Additional dates */}
        <Separator />
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Created</p>
            <p className="font-medium">{new Date(createdAt).toLocaleDateString()}</p>
          </div>
          {assignedAt && (
            <div>
              <p className="text-muted-foreground">Assigned</p>
              <p className="font-medium">{new Date(assignedAt).toLocaleDateString()}</p>
            </div>
          )}
          {completedAt && (
            <div className="col-span-2">
              <p className="text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Completed
              </p>
              <p className="font-medium text-green-600">
                {new Date(completedAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
