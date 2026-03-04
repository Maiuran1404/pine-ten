'use client'

import Image from 'next/image'
import type { TaskDetailData } from '@/components/task-detail/types'

interface BriefRecapProps {
  task: TaskDetailData
}

export function BriefRecap({ task }: BriefRecapProps) {
  const brief = task.briefData
  const moodboardImages = [
    ...task.moodboardItems.map((m) => m.imageUrl),
    ...task.styleReferences,
  ].slice(0, 6)

  const fields: { label: string; value: string | null | undefined }[] = [
    { label: 'Topic', value: brief?.topic?.value },
    { label: 'Platform', value: brief?.platform?.value },
    { label: 'Content Type', value: brief?.contentType?.value },
    { label: 'Intent', value: brief?.intent?.value },
  ]

  const visibleFields = fields.filter((f): f is { label: string; value: string } => !!f.value)

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h3 className="text-base font-semibold text-foreground">{task.title}</h3>
        {task.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{task.description}</p>
        )}
      </div>

      {/* Category + brief fields */}
      <div className="flex flex-wrap items-center gap-2">
        {task.category && (
          <span className="rounded-full bg-crafted-green/10 px-2.5 py-0.5 text-xs font-medium text-crafted-green">
            {task.category.name}
          </span>
        )}
        {visibleFields.map((f) => (
          <span
            key={f.label}
            className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground"
          >
            {f.value}
          </span>
        ))}
      </div>

      {/* Moodboard strip */}
      {moodboardImages.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Moodboard</p>
          <div className="flex gap-2 overflow-x-auto">
            {moodboardImages.map((url, i) => (
              <div
                key={`${url}-${i}`}
                className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border"
              >
                <Image
                  src={url}
                  alt={`Moodboard reference ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
