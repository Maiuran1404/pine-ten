'use client'

import { motion } from 'framer-motion'
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lightbulb,
  ThumbsUp,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { StrategicReviewData } from '@/lib/ai/briefing-state-machine'

// =============================================================================
// PROPS
// =============================================================================

interface StrategicReviewCardProps {
  review: StrategicReviewData
  onAction: (response: 'accept' | 'override') => void
  disabled?: boolean
  className?: string
}

// =============================================================================
// FIT INDICATOR
// =============================================================================

const FIT_CONFIG = {
  aligned: {
    label: 'Aligned',
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800/40',
  },
  minor_mismatch: {
    label: 'Minor Mismatch',
    icon: AlertCircle,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800/40',
  },
  significant_mismatch: {
    label: 'Significant Mismatch',
    icon: XCircle,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    border: 'border-rose-200 dark:border-rose-800/40',
  },
} as const

function FitIndicator({
  score,
  note,
}: {
  score: StrategicReviewData['inspirationFitScore']
  note: string | null
}) {
  const config = FIT_CONFIG[score]
  const Icon = config.icon

  return (
    <div className={cn('rounded-lg border p-3 space-y-1.5', config.bg, config.border)}>
      <div className={cn('flex items-center gap-1.5', config.color)}>
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs font-semibold">Inspiration Fit: {config.label}</span>
      </div>
      {note && <p className="text-xs text-foreground leading-relaxed">{note}</p>}
    </div>
  )
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function ReviewEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Shield className="h-8 w-8 text-muted-foreground/50 mb-3" />
      <p className="text-sm text-muted-foreground">Strategic review will appear here</p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        Strengths, risks, and inspiration alignment assessment
      </p>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function StrategicReviewCard({
  review,
  onAction,
  disabled = false,
  className,
}: StrategicReviewCardProps) {
  const isEmpty =
    review.strengths.length === 0 && review.risks.length === 0 && !review.optimizationSuggestion

  if (isEmpty) {
    return <ReviewEmpty />
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Strategic Review</span>
        {review.userOverride && (
          <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground">
            User Override
          </Badge>
        )}
      </div>

      {/* Strengths */}
      {review.strengths.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-1.5"
        >
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">Strengths</span>
          </div>
          <ul className="space-y-1 ml-5">
            {review.strengths.map((strength, i) => (
              <li key={i} className="text-xs text-foreground leading-relaxed list-disc">
                {strength}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Risks */}
      {review.risks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="space-y-1.5"
        >
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">Risks</span>
          </div>
          <ul className="space-y-1 ml-5">
            {review.risks.map((risk, i) => (
              <li key={i} className="text-xs text-foreground leading-relaxed list-disc">
                {risk}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Optimization suggestion */}
      {review.optimizationSuggestion && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="flex items-start gap-2 rounded-lg border border-border/40 bg-white/60 dark:bg-card/60 p-3"
        >
          <Lightbulb className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-foreground leading-relaxed">{review.optimizationSuggestion}</p>
        </motion.div>
      )}

      {/* Inspiration fit */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.15 }}
      >
        <FitIndicator score={review.inspirationFitScore} note={review.inspirationFitNote} />
      </motion.div>

      {/* Action buttons */}
      {!review.userOverride && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.2 }}
          className="flex items-center gap-2 pt-1"
        >
          <Button
            size="sm"
            onClick={() => onAction('accept')}
            disabled={disabled}
            className="gap-1.5"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            Looks good, continue
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction('override')}
            disabled={disabled}
            className="gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Keep as-is
          </Button>
        </motion.div>
      )}
    </div>
  )
}
