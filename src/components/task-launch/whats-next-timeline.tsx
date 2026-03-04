'use client'

import { motion } from 'framer-motion'
import { UserCheck, Paintbrush, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WhatsNextTimelineProps {
  hasDesigner: boolean
  estimatedHours: number | null
}

export function WhatsNextTimeline({ hasDesigner, estimatedHours }: WhatsNextTimelineProps) {
  const steps = [
    {
      icon: UserCheck,
      title: hasDesigner ? 'Designer Assigned' : 'Finding Designer',
      subtitle: hasDesigner
        ? 'Your designer is ready to begin'
        : 'Matching you with the perfect fit',
      completed: hasDesigner,
    },
    {
      icon: Paintbrush,
      title: 'Work Begins',
      subtitle: '1-2 business days',
      completed: false,
    },
    {
      icon: CheckCircle2,
      title: 'Review & Approve',
      subtitle: estimatedHours
        ? `Estimated ${estimatedHours}h total`
        : "You'll review the final deliverables",
      completed: false,
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.8 }}
      className="space-y-0"
    >
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        What happens next
      </p>
      <div className="relative">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isLast = index === steps.length - 1

          return (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.9 + index * 0.15 }}
              className="relative flex gap-3 pb-4 last:pb-0"
            >
              {/* Vertical line */}
              {!isLast && (
                <div
                  className="absolute left-[13px] top-[28px] h-[calc(100%-20px)] w-px"
                  style={{
                    backgroundColor: step.completed ? 'var(--crafted-green)' : 'var(--border)',
                  }}
                />
              )}

              {/* Dot */}
              <div
                className={cn(
                  'relative z-10 flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full border',
                  step.completed
                    ? 'border-crafted-green bg-crafted-green/10'
                    : 'border-border bg-card'
                )}
              >
                <Icon
                  className={cn(
                    'h-3.5 w-3.5',
                    step.completed ? 'text-crafted-green' : 'text-muted-foreground'
                  )}
                />
              </div>

              {/* Content */}
              <div className="pt-0.5">
                <p
                  className={cn(
                    'text-sm font-medium',
                    step.completed ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground">{step.subtitle}</p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
