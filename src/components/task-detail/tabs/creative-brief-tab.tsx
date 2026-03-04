'use client'

import type { TaskDetailData, StructureData } from '@/components/task-detail/types'
import { StructureView } from '../brief/structure-view'
import { AudienceBriefCard } from '../brief/audience-brief-card'
import { StrategicReviewCard } from '../brief/strategic-review-card'
import { RequirementsSection } from '../brief/requirements-section'

interface CreativeBriefTabProps {
  task: TaskDetailData
}

export function CreativeBriefTab({ task }: CreativeBriefTabProps) {
  // Structure can come from briefingState (via chatDraft) or directly from the task's structureData column
  const structure = task.briefingState?.structure ?? (task.structureData as StructureData | null)
  const hasStructure = !!structure
  const hasAudience = !!task.briefData?.audience?.value
  const hasStrategicReview = !!task.briefingState?.strategicReview
  const hasRequirements = !!task.requirements
  const hasBriefData = hasStructure || hasAudience || hasStrategicReview || hasRequirements

  if (!hasBriefData) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground text-sm">
          Creative brief data is not available for this task.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {hasStructure && <StructureView structure={structure!} />}

      {hasAudience && <AudienceBriefCard audience={task.briefData!.audience!.value!} />}

      {hasStrategicReview && (
        <StrategicReviewCard strategicReview={task.briefingState!.strategicReview!} />
      )}

      {hasRequirements && <RequirementsSection requirements={task.requirements!} />}
    </div>
  )
}
