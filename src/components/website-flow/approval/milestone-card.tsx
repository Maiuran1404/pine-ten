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
              ? 'bg-green-500 text-white'
              : status === 'in_progress'
                ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 ring-2 ring-green-500'
                : 'bg-gray-100 dark:bg-zinc-800 text-muted-foreground'
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
              status === 'completed' ? 'bg-green-500' : 'bg-gray-200 dark:bg-zinc-700'
            )}
          />
        )}
      </div>

      {/* Content */}
      <div className="pb-6">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-muted-foreground">
            Day {daysFromStart}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  )
}
