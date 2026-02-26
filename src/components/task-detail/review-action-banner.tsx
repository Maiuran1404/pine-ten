'use client'

import Image from 'next/image'
import { CheckCircle2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { TaskDetailData, TaskFile } from '@/components/task-detail/types'

interface ReviewActionBannerProps {
  task: TaskDetailData
  deliverables: TaskFile[]
  onApprove: () => void
  onRequestRevision: () => void
  isApproving: boolean
}

export function ReviewActionBanner({
  task,
  deliverables,
  onApprove,
  onRequestRevision,
  isApproving,
}: ReviewActionBannerProps) {
  if (task.status === 'REVISION_REQUESTED') {
    return (
      <div className="rounded-lg border border-ds-warning/30 bg-ds-warning/5 p-4">
        <div className="flex items-center gap-3">
          <RotateCcw className="size-5 text-ds-warning shrink-0" />
          <div>
            <p className="text-sm font-medium text-ds-warning">Revision requested</p>
            <p className="text-sm text-ds-warning/80">Designer is working on it</p>
          </div>
        </div>
      </div>
    )
  }

  if (task.status !== 'IN_REVIEW' || deliverables.length === 0) {
    return null
  }

  const visibleDeliverables = deliverables.slice(0, 3)
  const remainingCount = deliverables.length - 3
  const revisionsRemaining = task.maxRevisions - task.revisionsUsed

  return (
    <div className="rounded-lg border border-ds-status-revision/30 bg-ds-status-revision/5 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          {/* Deliverable thumbnails */}
          <div className="flex -space-x-2">
            {visibleDeliverables.map((file) => (
              <div
                key={file.id}
                className={cn(
                  'relative size-12 overflow-hidden rounded-md border-2 border-white shadow-sm',
                  file.fileType.startsWith('image/') ? '' : 'bg-muted'
                )}
              >
                {file.fileType.startsWith('image/') ? (
                  <Image
                    src={file.fileUrl}
                    alt={file.fileName}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                    {file.fileName.split('.').pop()?.toUpperCase()}
                  </div>
                )}
              </div>
            ))}
            {remainingCount > 0 && (
              <div className="flex size-12 items-center justify-center rounded-md border-2 border-white bg-ds-status-revision/10 text-xs font-medium text-ds-status-revision shadow-sm">
                +{remainingCount}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-ds-status-revision">
              {deliverables.length} deliverable{deliverables.length !== 1 ? 's' : ''} ready for
              review
            </p>
            <p className="text-xs text-ds-status-revision/80">
              {revisionsRemaining} revision{revisionsRemaining !== 1 ? 's' : ''} remaining
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRequestRevision}
            disabled={isApproving}
            className="border-ds-status-revision/30 text-ds-status-revision hover:bg-ds-status-revision/10"
          >
            <RotateCcw className="size-4" />
            Request Revision
          </Button>
          <Button
            size="sm"
            onClick={onApprove}
            disabled={isApproving}
            className="bg-crafted-green text-white hover:bg-crafted-forest"
          >
            <CheckCircle2 className="size-4" />
            {isApproving ? 'Approving...' : 'Approve'}
          </Button>
        </div>
      </div>
    </div>
  )
}
