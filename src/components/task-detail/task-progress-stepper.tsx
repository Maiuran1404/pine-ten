import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PROGRESS_STEPS, STATUS_CONFIG } from '@/components/task-detail/types'

interface TaskProgressStepperProps {
  status: string
}

export function TaskProgressStepper({ status }: TaskProgressStepperProps) {
  const currentStepIndex = PROGRESS_STEPS.findIndex((step) =>
    (step.statuses as readonly string[]).includes(status)
  )

  const statusConfig = STATUS_CONFIG[status]
  const statusColor = statusConfig?.color ?? 'text-muted-foreground'

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {PROGRESS_STEPS.map((step, index) => {
          const isCompleted = index < currentStepIndex
          const isCurrent = index === currentStepIndex
          const isUpcoming = index > currentStepIndex

          return (
            <div key={step.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-2">
                {/* Step circle */}
                <div className="relative">
                  <div
                    className={cn(
                      'flex size-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                      isCompleted && 'border-ds-success bg-ds-success text-white',
                      isCurrent && ['border-current bg-current text-white', statusColor],
                      isUpcoming &&
                        'border-muted-foreground/30 bg-transparent text-muted-foreground/50'
                    )}
                  >
                    {isCompleted ? <Check className="size-4" /> : <span>{index + 1}</span>}
                  </div>
                  {/* Pulsing ring for current step */}
                  {isCurrent && (
                    <div
                      className={cn(
                        'absolute inset-0 rounded-full border-2 animate-ping opacity-30',
                        statusColor.replace('text-', 'border-')
                      )}
                    />
                  )}
                </div>

                {/* Step label - hidden on mobile */}
                <span
                  className={cn(
                    'hidden text-xs font-medium sm:block',
                    isCompleted && 'text-ds-success',
                    isCurrent && statusColor,
                    isUpcoming && 'text-muted-foreground/50'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < PROGRESS_STEPS.length - 1 && (
                <div
                  className={cn(
                    'mx-2 h-0.5 flex-1 transition-colors',
                    index < currentStepIndex ? 'bg-ds-success' : 'bg-muted-foreground/20'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
