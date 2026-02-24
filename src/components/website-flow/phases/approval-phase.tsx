'use client'

import { TimelineView } from '../approval/timeline-view'
import { ApproveButton } from '../approval/approve-button'

interface Milestone {
  id: string
  title: string
  description: string
  daysFromStart: number
  status: 'pending' | 'in_progress' | 'completed'
}

interface ApprovalPhaseProps {
  milestones: Milestone[]
  estimatedDays: number
  creditsCost: number
  userCredits: number
  onApprove: () => void
  isApproving?: boolean
  sectionCount: number
}

export function ApprovalPhase({
  milestones,
  estimatedDays,
  creditsCost,
  userCredits,
  onApprove,
  isApproving,
  sectionCount,
}: ApprovalPhaseProps) {
  return (
    <div className="flex flex-col h-full overflow-auto p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Review & Approve</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your website design has {sectionCount} sections. Review the timeline and approve to start
          production.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{sectionCount}</p>
          <p className="text-xs text-muted-foreground">Sections</p>
        </div>
        <div className="rounded-lg border border-border p-3 text-center">
          <p className="text-2xl font-bold text-foreground">~{estimatedDays}</p>
          <p className="text-xs text-muted-foreground">Days</p>
        </div>
        <div className="rounded-lg border border-border p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{creditsCost}</p>
          <p className="text-xs text-muted-foreground">Credits</p>
        </div>
      </div>

      {/* Timeline */}
      <TimelineView milestones={milestones} estimatedDays={estimatedDays} />

      {/* Approve */}
      <div className="sticky bottom-0 bg-background pt-4 border-t border-border">
        <ApproveButton
          creditsCost={creditsCost}
          userCredits={userCredits}
          onApprove={onApprove}
          isApproving={isApproving}
        />
      </div>
    </div>
  )
}
