'use client'

import { MilestoneCard } from './milestone-card'

interface Milestone {
  id: string
  title: string
  description: string
  daysFromStart: number
  status: 'pending' | 'in_progress' | 'completed'
}

interface TimelineViewProps {
  milestones: Milestone[]
  estimatedDays: number
}

export function TimelineView({ milestones, estimatedDays }: TimelineViewProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Delivery Timeline</h3>
        <span className="text-xs text-muted-foreground">~{estimatedDays} business days</span>
      </div>
      <div>
        {milestones.map((milestone, index) => (
          <MilestoneCard
            key={milestone.id}
            title={milestone.title}
            description={milestone.description}
            daysFromStart={milestone.daysFromStart}
            status={milestone.status}
            isLast={index === milestones.length - 1}
          />
        ))}
      </div>
    </div>
  )
}
