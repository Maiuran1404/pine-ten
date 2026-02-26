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
        icon={<Coins className="size-3.5 text-ds-warning" />}
        label={`${task.creditsUsed} credits`}
        className="border-ds-warning/30 bg-ds-warning/10 text-ds-warning"
      />
      <Pill
        icon={<RefreshCw className="size-3.5 text-ds-info" />}
        label={`${task.revisionsUsed}/${task.maxRevisions} revisions`}
        className="border-ds-info/30 bg-ds-info/10 text-ds-info"
      />
      {task.deadline && (
        <Pill
          icon={<Calendar className="size-3.5 text-ds-error" />}
          label={new Date(task.deadline).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
          className="border-ds-error/30 bg-ds-error/10 text-ds-error"
        />
      )}
      {task.estimatedHours && (
        <Pill
          icon={<Clock className="size-3.5 text-ds-status-review" />}
          label={`${task.estimatedHours}h est.`}
          className="border-ds-status-review/30 bg-ds-status-review/10 text-ds-status-review"
        />
      )}
    </div>
  )
}
