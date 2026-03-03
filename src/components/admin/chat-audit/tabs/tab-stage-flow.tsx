'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

const STAGE_ORDER = [
  'EXTRACT',
  'TASK_TYPE',
  'INTENT',
  'INSPIRATION',
  'STRUCTURE',
  'ELABORATE',
  'STRATEGIC_REVIEW',
  'MOODBOARD',
  'REVIEW',
  'DEEPEN',
  'SUBMIT',
] as const

const STAGE_LABELS: Record<string, { label: string; description: string }> = {
  EXTRACT: {
    label: 'Extract',
    description: 'Initial project understanding and requirements gathering',
  },
  TASK_TYPE: { label: 'Task Type', description: 'Identifying the type of deliverable needed' },
  INTENT: { label: 'Intent', description: 'Clarifying project goals and desired outcomes' },
  INSPIRATION: {
    label: 'Inspiration',
    description: 'Exploring visual references and style direction',
  },
  STRUCTURE: {
    label: 'Structure',
    description: 'Building the content structure (storyboard, layout, etc.)',
  },
  ELABORATE: { label: 'Elaborate', description: 'Adding detail and depth to the brief' },
  STRATEGIC_REVIEW: {
    label: 'Strategic Review',
    description: 'Reviewing strategy and competitive positioning',
  },
  MOODBOARD: { label: 'Moodboard', description: 'Collecting visual references and mood direction' },
  REVIEW: { label: 'Review', description: 'Final review of the complete brief' },
  DEEPEN: { label: 'Deepen', description: 'Further refining specific aspects of the brief' },
  SUBMIT: { label: 'Submit', description: 'Brief submitted and task created' },
}

interface TabStageFlowProps {
  briefingState: Record<string, unknown> | null
  currentStage: string | null
  stagesReached: string[]
}

export function TabStageFlow({ briefingState, currentStage, stagesReached }: TabStageFlowProps) {
  const reachedSet = new Set(stagesReached)

  // Derive stages from briefing state if available, otherwise from stagesReached
  const deriveStages = () => {
    if (stagesReached.length === 0 && !currentStage) {
      return STAGE_ORDER.map((stage) => ({
        stage,
        reached: false,
        isCurrent: false,
      }))
    }

    return STAGE_ORDER.map((stage) => ({
      stage,
      reached: reachedSet.has(stage),
      isCurrent: stage === currentStage,
    }))
  }

  const stages = deriveStages()
  const turnsInCurrentStage = (briefingState?.turnsInCurrentStage as number) ?? null
  const messageCount = (briefingState?.messageCount as number) ?? null

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        {/* Summary stats */}
        {briefingState && (
          <div className="flex gap-4 mb-6 text-xs text-muted-foreground">
            {currentStage && (
              <span>
                Current:{' '}
                <span className="text-foreground font-medium">
                  {STAGE_LABELS[currentStage]?.label}
                </span>
              </span>
            )}
            {turnsInCurrentStage !== null && <span>Turns in stage: {turnsInCurrentStage}</span>}
            {messageCount !== null && <span>Total messages: {messageCount}</span>}
          </div>
        )}

        {/* Vertical Timeline */}
        <div className="relative">
          {stages.map(({ stage, reached, isCurrent }, i) => {
            const info = STAGE_LABELS[stage] || { label: stage, description: '' }
            const isLast = i === stages.length - 1

            return (
              <div key={stage} className="flex gap-3 relative">
                {/* Connector line */}
                {!isLast && (
                  <div
                    className={cn(
                      'absolute left-[9px] top-5 w-0.5 h-full',
                      reached ? 'bg-ds-success/40' : 'bg-border'
                    )}
                  />
                )}

                {/* Dot */}
                <div className="relative z-10 flex-shrink-0 mt-0.5">
                  <div
                    className={cn(
                      'h-[18px] w-[18px] rounded-full border-2 flex items-center justify-center',
                      isCurrent
                        ? 'border-ds-accent bg-ds-accent/20'
                        : reached
                          ? 'border-ds-success bg-ds-success'
                          : 'border-border bg-muted'
                    )}
                  >
                    {reached && !isCurrent && (
                      <svg className="h-2.5 w-2.5 text-background" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2.5 6L5 8.5L9.5 4"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                    {isCurrent && <div className="h-2 w-2 rounded-full bg-ds-accent" />}
                  </div>
                </div>

                {/* Content */}
                <div className={cn('pb-6 flex-1 min-w-0', !reached && !isCurrent && 'opacity-40')}>
                  <p className={cn('text-sm font-medium', isCurrent && 'text-ds-accent')}>
                    {info.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{info.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </ScrollArea>
  )
}
