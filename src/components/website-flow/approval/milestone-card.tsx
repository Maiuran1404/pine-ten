'use client'

import { cn } from '@/lib/utils'
import { Check, Clock, Circle } from 'lucide-react'

interface MilestoneCardProps {
  title: string
  description: string
  daysFromStart: number
  status: 'pending' | 'in_progress' | 'completed'
  isLast?: boolean
}

function formatEstimatedDate(daysFromNow: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function MilestoneCard({
  title,
  description,
  daysFromStart,
  status,
  isLast,
}: MilestoneCardProps) {
  return (
    <div className="flex gap-3">
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
            status === 'completed'
              ? 'bg-ds-success text-white'
              : status === 'in_progress'
                ? 'bg-ds-success/10 text-ds-success ring-2 ring-ds-success'
                : 'bg-muted text-muted-foreground'
          )}
        >
          {status === 'completed' ? (
            <Check className="w-4 h-4" />
          ) : status === 'in_progress' ? (
            <Clock className="w-4 h-4" />
          ) : (
            <Circle className="w-4 h-4" />
          )}
        </div>
        {!isLast && (
          <div
            className={cn(
              'w-0.5 flex-1 min-h-[32px]',
              status === 'completed' ? 'bg-ds-success' : 'bg-muted'
            )}
          />
        )}
      </div>

      {/* Content */}
      <div className="pb-6">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            {daysFromStart === 0 ? 'Today' : `Day ${daysFromStart}`}
            {' \u00b7 '}
            {formatEstimatedDate(daysFromStart)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  )
}
