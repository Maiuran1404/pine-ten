'use client'

import { motion } from 'framer-motion'
import {
  Check,
  Circle,
  Sparkles,
  MessageSquare,
  Film,
  Palette,
  LayoutGrid,
  Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type ChatStage } from '@/components/chat/types'
import {
  BRIEFING_CHAT_STAGES,
  STAGE_DESCRIPTIONS,
  isStageCompleted,
  isCurrentStage,
} from '@/lib/chat-progress'

// Icons for each stage
const STAGE_ICONS: Record<string, typeof MessageSquare> = {
  brief: MessageSquare,
  narrative: Film,
  style: Palette,
  storyboard: LayoutGrid,
  review: Send,
}

// Short labels for the stepper (fits single row)
const STAGE_LABELS: Record<string, string> = {
  brief: 'Brief',
  narrative: 'Narrative',
  style: 'Style',
  storyboard: 'Storyboard',
  review: 'Review',
}

// =============================================================================
// LABELED PROGRESS BAR (#4) — horizontal circles + labels
// =============================================================================

interface LabeledProgressBarProps {
  currentStage: ChatStage
  completedStages: ChatStage[]
  progressPercentage: number
  stageDescription?: string
  /** Override per-stage labels (e.g. website-specific "Blueprint", "Studio") */
  stageLabels?: Record<string, string>
  /** Override the stages list (e.g. WEBSITE_CHAT_STAGES for website flows) */
  stages?: ChatStage[]
  className?: string
}

export function LabeledProgressBar({
  currentStage,
  completedStages,
  stageDescription,
  stageLabels,
  stages,
  className,
}: LabeledProgressBarProps) {
  const effectiveStages = stages ?? BRIEFING_CHAT_STAGES
  const effectiveLabels = stageLabels ?? STAGE_LABELS
  const rawIndex = effectiveStages.indexOf(currentStage)
  const currentIndex = Math.max(0, rawIndex)
  const progress = (currentIndex / Math.max(effectiveStages.length - 1, 1)) * 100

  return (
    <div className={cn('w-full', className)}>
      {/* Thin progress track */}
      <div className="h-[3px] bg-muted-foreground/10 w-full relative">
        <motion.div
          className="h-full bg-crafted-green"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Horizontal labeled stepper — desktop */}
      <div className="hidden sm:flex items-center justify-between px-4 py-1.5 border-b border-border/30">
        {effectiveStages.map((stage, index) => {
          const completed = isStageCompleted(stage, completedStages)
          const current = isCurrentStage(stage, currentStage)
          const Icon = STAGE_ICONS[stage] ?? Circle
          const isLast = index === effectiveStages.length - 1

          return (
            <div key={stage} className="flex items-center">
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors',
                    completed && 'bg-crafted-green text-white',
                    current && !completed && 'bg-crafted-green/15 text-crafted-green',
                    !completed && !current && 'bg-muted text-muted-foreground/40'
                  )}
                >
                  {completed ? <Check className="h-3 w-3" /> : <Icon className="h-2.5 w-2.5" />}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium transition-colors',
                    completed && 'text-foreground',
                    current && !completed && 'text-foreground',
                    !completed && !current && 'text-muted-foreground/50'
                  )}
                >
                  {effectiveLabels[stage] ?? stage}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'mx-2 h-px flex-1 min-w-[12px]',
                    index < currentIndex ? 'bg-crafted-green/40' : 'bg-muted-foreground/10'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile: compact label + dots */}
      <div className="flex sm:hidden items-center gap-2 px-4 py-1 border-b border-border/30">
        <span className="text-[10px] text-muted-foreground/60 font-medium">
          {stageDescription ?? STAGE_DESCRIPTIONS[currentStage]}
        </span>
        <div className="flex items-center gap-1 ml-auto">
          {effectiveStages.map((stage) => {
            const completed = isStageCompleted(stage, completedStages)
            const current = isCurrentStage(stage, currentStage)
            return (
              <div
                key={stage}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-colors',
                  completed && 'bg-crafted-green',
                  current && !completed && 'bg-crafted-green/40',
                  !completed && !current && 'bg-muted-foreground/15'
                )}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface ProgressStepperProps {
  currentStage: ChatStage
  completedStages: ChatStage[]
  progressPercentage: number
  className?: string
}

export function ProgressStepper({
  currentStage,
  completedStages,
  progressPercentage,
  className,
}: ProgressStepperProps) {
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Progress</h3>
            <p className="text-xs text-muted-foreground">{progressPercentage}% complete</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-3">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="flex-1 px-4 py-2">
        <div className="space-y-0">
          {BRIEFING_CHAT_STAGES.map((stage, index) => {
            const isCompleted = isStageCompleted(stage, completedStages)
            const isCurrent = isCurrentStage(stage, currentStage)
            const isLast = index === BRIEFING_CHAT_STAGES.length - 1

            return (
              <div key={stage} className="flex items-start gap-3">
                {/* Timeline connector */}
                <div className="flex flex-col items-center">
                  {/* Dot/Check */}
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isCurrent ? 1.1 : 1,
                      backgroundColor: isCompleted
                        ? 'var(--primary)'
                        : isCurrent
                          ? 'var(--primary)'
                          : 'transparent',
                      borderColor:
                        isCompleted || isCurrent ? 'var(--primary)' : 'var(--muted-foreground)',
                    }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0',
                      isCompleted && 'bg-primary border-primary',
                      isCurrent && !isCompleted && 'border-primary bg-primary/10',
                      !isCompleted && !isCurrent && 'border-muted-foreground/30'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-3.5 w-3.5 text-primary-foreground" />
                    ) : isCurrent ? (
                      <motion.div
                        className="w-2 h-2 rounded-full bg-primary"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    ) : (
                      <Circle className="h-2 w-2 text-muted-foreground/50" />
                    )}
                  </motion.div>

                  {/* Connecting line */}
                  {!isLast && (
                    <div
                      className={cn(
                        'w-0.5 h-8',
                        isCompleted ? 'bg-primary' : 'bg-muted-foreground/20'
                      )}
                    />
                  )}
                </div>

                {/* Label */}
                <div className="pt-0.5 pb-6">
                  <motion.p
                    initial={false}
                    animate={{
                      color:
                        isCurrent || isCompleted ? 'var(--foreground)' : 'var(--muted-foreground)',
                    }}
                    className={cn(
                      'text-sm font-medium',
                      isCurrent && 'text-foreground',
                      isCompleted && 'text-foreground',
                      !isCurrent && !isCompleted && 'text-muted-foreground'
                    )}
                  >
                    {STAGE_DESCRIPTIONS[stage]}
                  </motion.p>
                  {isCurrent && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-primary mt-0.5"
                    >
                      Current step
                    </motion.p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom section */}
      <div className="mt-auto px-4 py-3 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          {progressPercentage === 100 ? 'Ready to create!' : 'Complete all steps to submit'}
        </p>
      </div>
    </div>
  )
}

/**
 * Compact horizontal progress indicator for mobile
 */
interface CompactProgressProps {
  currentStage: ChatStage
  completedStages: ChatStage[]
  progressPercentage: number
  className?: string
}

export function CompactProgress({
  currentStage,
  completedStages,
  progressPercentage,
  className,
}: CompactProgressProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Progress dots */}
      <div className="flex items-center gap-1.5">
        {BRIEFING_CHAT_STAGES.map((stage) => {
          const isCompleted = isStageCompleted(stage, completedStages)
          const isCurrent = isCurrentStage(stage, currentStage)

          return (
            <motion.div
              key={stage}
              initial={false}
              animate={{
                scale: isCurrent ? 1.2 : 1,
              }}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                isCompleted && 'bg-primary',
                isCurrent && !isCompleted && 'bg-primary/50',
                !isCompleted && !isCurrent && 'bg-muted'
              )}
              title={STAGE_DESCRIPTIONS[stage]}
            />
          )
        })}
      </div>

      {/* Percentage */}
      <span className="text-xs text-muted-foreground">{progressPercentage}%</span>
    </div>
  )
}

/**
 * Subtle top progress bar - minimal design that doesn't take much space
 */
interface TopProgressBarProps {
  currentStage: ChatStage
  completedStages: ChatStage[]
  progressPercentage: number
  className?: string
}

export function TopProgressBar({
  currentStage,
  completedStages,
  progressPercentage,
  className,
}: TopProgressBarProps) {
  const currentStageLabel = STAGE_DESCRIPTIONS[currentStage]

  return (
    <div className={cn('w-full', className)}>
      {/* Thin progress bar at very top */}
      <div className="h-1 bg-muted/50 w-full">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Compact info row */}
      <div className="px-4 py-1.5 flex items-center justify-between text-xs border-b border-border/50 bg-card/30">
        <div className="flex items-center gap-2">
          {/* Stage dots */}
          <div className="flex items-center gap-1">
            {BRIEFING_CHAT_STAGES.map((stage) => {
              const isCompleted = isStageCompleted(stage, completedStages)
              const isCurrent = isCurrentStage(stage, currentStage)

              return (
                <div
                  key={stage}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full transition-colors',
                    isCompleted && 'bg-primary',
                    isCurrent && !isCompleted && 'bg-primary/60',
                    !isCompleted && !isCurrent && 'bg-muted-foreground/30'
                  )}
                  title={STAGE_DESCRIPTIONS[stage]}
                />
              )
            })}
          </div>

          {/* Current step label */}
          <span className="text-muted-foreground">{currentStageLabel}</span>
        </div>

        {/* Percentage */}
        <span className="text-muted-foreground/70">{progressPercentage}%</span>
      </div>
    </div>
  )
}
