'use client'

import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { StagePipeline } from '@/components/admin/chat-tests/stage-pipeline'
import { Camera } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import type { ChatLogListItem } from '@/types/admin-chat-logs'

interface ChatAuditListItemProps {
  log: ChatLogListItem
  isSelected: boolean
  onClick: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  video: 'Video',
  website: 'Website',
  content: 'Content',
  design: 'Design',
  brand: 'Brand',
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getStatusBadge(log: ChatLogListItem) {
  if (log.type === 'draft') {
    if (log.pendingTask) {
      return (
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0 border-ds-warning text-ds-warning"
        >
          Ready
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
        Draft
      </Badge>
    )
  }

  const statusStyles: Record<string, string> = {
    PENDING: 'border-ds-warning text-ds-warning',
    ASSIGNED: 'border-ds-accent text-ds-accent',
    IN_PROGRESS: 'border-ds-accent text-ds-accent',
    IN_REVIEW: 'border-crafted-sage text-crafted-sage',
    COMPLETED: 'border-ds-success text-ds-success',
  }

  return (
    <Badge
      variant="outline"
      className={cn('text-[10px] px-1.5 py-0', statusStyles[log.taskStatus || ''])}
    >
      {log.taskStatus?.replace(/_/g, ' ') || 'Task'}
    </Badge>
  )
}

export function ChatAuditListItem({ log, isSelected, onClick }: ChatAuditListItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 border-b border-border/50 transition-colors hover:bg-accent/50',
        isSelected && 'bg-accent'
      )}
    >
      {/* Row 1: Avatar + Name + Timestamp */}
      <div className="flex items-start gap-2.5 mb-1.5">
        <Avatar className="h-7 w-7 flex-shrink-0">
          <AvatarImage src={log.userImage || undefined} />
          <AvatarFallback className="text-[10px]">{getInitials(log.userName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium truncate">{log.userName}</span>
            <span className="text-[10px] text-muted-foreground flex-shrink-0">
              {formatDistanceToNow(new Date(log.updatedAt), { addSuffix: true })}
            </span>
          </div>
          <p className="text-xs text-foreground/80 truncate mt-0.5">{log.title}</p>
        </div>
      </div>

      {/* Row 2: Badges + Pipeline */}
      <div className="flex items-center gap-1.5 ml-9">
        {getStatusBadge(log)}

        {log.deliverableCategory && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 border-crafted-green/30 text-crafted-green"
          >
            {CATEGORY_LABELS[log.deliverableCategory] || log.deliverableCategory}
          </Badge>
        )}

        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {log.messageCount} msg
        </Badge>

        {log.imageCount > 0 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
            <Camera className="h-2.5 w-2.5" />
            {log.imageCount}
          </Badge>
        )}
      </div>

      {/* Row 3: Stage Pipeline */}
      {log.stagesReached.length > 0 && (
        <div className="mt-1.5 ml-9">
          <StagePipeline
            stagesReached={log.stagesReached}
            status={log.type === 'task' ? 'passed' : 'active'}
            reachedReview={log.stagesReached.includes('REVIEW')}
            compact
          />
        </div>
      )}
    </button>
  )
}
