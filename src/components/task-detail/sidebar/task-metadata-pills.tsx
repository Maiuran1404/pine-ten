'use client'

import { Coins, RefreshCw, Calendar, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TaskDetailData } from '@/components/task-detail/types'

interface TaskMetadataPillsProps {
  task: TaskDetailData
}

interface PillProps {
  icon: React.ReactNode
  label: string
  className?: string
}

function Pill({ icon, label, className }: PillProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
        className
      )}
    >
      {icon}
      {label}
    </div>
  )
}

export function TaskMetadataPills({ task }: TaskMetadataPillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Pill
        icon={<Coins className="size-3.5 text-amber-500" />}
        label={`${task.creditsUsed} credits`}
        className="border-amber-200 bg-amber-50 text-amber-700"
      />
      <Pill
        icon={<RefreshCw className="size-3.5 text-blue-500" />}
        label={`${task.revisionsUsed}/${task.maxRevisions} revisions`}
        className="border-blue-200 bg-blue-50 text-blue-700"
      />
      {task.deadline && (
        <Pill
          icon={<Calendar className="size-3.5 text-red-500" />}
          label={new Date(task.deadline).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
          className="border-red-200 bg-red-50 text-red-700"
        />
      )}
      {task.estimatedHours && (
        <Pill
          icon={<Clock className="size-3.5 text-purple-500" />}
          label={`${task.estimatedHours}h est.`}
          className="border-purple-200 bg-purple-50 text-purple-700"
        />
      )}
    </div>
  )
}
