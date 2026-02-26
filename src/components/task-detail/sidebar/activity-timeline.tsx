'use client'

import { useState } from 'react'
import {
  Circle,
  User,
  Play,
  Eye,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ActivityLogEntry } from '@/components/task-detail/types'

interface ActivityTimelineProps {
  activityLog: ActivityLogEntry[]
}

const ACTION_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  created: { icon: Circle, color: 'text-muted-foreground bg-muted' },
  assigned: { icon: User, color: 'text-ds-info bg-ds-info/10' },
  started: { icon: Play, color: 'text-ds-status-review bg-ds-status-review/10' },
  submitted: { icon: Eye, color: 'text-ds-status-revision bg-ds-status-revision/10' },
  revision_requested: { icon: RotateCcw, color: 'text-ds-warning bg-ds-warning/10' },
  completed: { icon: CheckCircle2, color: 'text-ds-success bg-ds-success/10' },
}

function getActionConfig(action: string) {
  return (
    ACTION_ICONS[action] ?? {
      icon: Circle,
      color: 'text-muted-foreground bg-muted',
    }
  )
}

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ActivityTimeline({ activityLog }: ActivityTimelineProps) {
  const [expanded, setExpanded] = useState(false)

  if (activityLog.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
  }

  const visibleEntries = expanded ? activityLog : activityLog.slice(0, 5)
  const hasMore = activityLog.length > 5

  return (
    <div className="space-y-0">
      <div className="relative">
        {visibleEntries.map((entry, index) => {
          const config = getActionConfig(entry.action)
          const Icon = config.icon
          const isLast = index === visibleEntries.length - 1

          return (
            <div key={entry.id} className="relative flex gap-3 pb-4">
              {/* Vertical connector line */}
              {!isLast && (
                <div className="absolute left-4 top-8 h-[calc(100%-16px)] w-px bg-border" />
              )}

              {/* Icon circle */}
              <div
                className={cn(
                  'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full',
                  config.color
                )}
              >
                <Icon className="size-4" />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-medium capitalize">{entry.action.replace(/_/g, ' ')}</p>
                <p className="text-xs text-muted-foreground">{formatTimestamp(entry.createdAt)}</p>
              </div>
            </div>
          )
        })}
      </div>

      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="size-3.5" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="size-3.5" />
              Show all ({activityLog.length})
            </>
          )}
        </Button>
      )}
    </div>
  )
}
