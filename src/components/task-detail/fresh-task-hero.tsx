'use client'

import { User, Paintbrush, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface FreshTaskHeroProps {
  estimatedHours: string | null
  deadline: string | null
  hasDesigner: boolean
}

const steps = [
  {
    icon: User,
    title: 'Designer Review',
    getSubtitle: () => '2-4 hours',
  },
  {
    icon: Paintbrush,
    title: 'Work Begins',
    getSubtitle: () => '1-2 business days',
  },
  {
    icon: CheckCircle2,
    title: 'Review & Approve',
    getSubtitle: (deadline: string | null) => {
      if (deadline) {
        const d = new Date(deadline)
        return `by ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      }
      return '~3-5 days'
    },
  },
] as const

export function FreshTaskHero({ deadline }: FreshTaskHeroProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">What to Expect</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {steps.map((step, i) => {
          const Icon = step.icon
          return (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.1, ease: 'easeOut' }}
              className={cn(
                'flex items-center gap-3 rounded-xl border border-border bg-card p-4',
                'transition-colors hover:border-crafted-green/30'
              )}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-crafted-green/15">
                <Icon className="size-5 text-crafted-green" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{step.title}</p>
                <p className="text-xs text-muted-foreground">
                  {step.getSubtitle(i === 2 ? deadline : null)}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
