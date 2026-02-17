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
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
        <div className="flex items-center gap-3">
          <RotateCcw className="size-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Revision requested</p>
            <p className="text-sm text-amber-600">Designer is working on it</p>
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
    <div className="rounded-lg border border-orange-300 bg-orange-50 p-4">
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
              <div className="flex size-12 items-center justify-center rounded-md border-2 border-white bg-orange-100 text-xs font-medium text-orange-700 shadow-sm">
                +{remainingCount}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-orange-800">
              {deliverables.length} deliverable{deliverables.length !== 1 ? 's' : ''} ready for
              review
            </p>
            <p className="text-xs text-orange-600">
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
            className="border-orange-300 text-orange-700 hover:bg-orange-100"
          >
            <RotateCcw className="size-4" />
            Request Revision
          </Button>
          <Button
            size="sm"
            onClick={onApprove}
            disabled={isApproving}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <CheckCircle2 className="size-4" />
            {isApproving ? 'Approving...' : 'Approve'}
          </Button>
        </div>
      </div>
    </div>
  )
}
