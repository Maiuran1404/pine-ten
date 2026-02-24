'use client'

import { WebsiteCard } from './website-card'
import { Skeleton } from '@/components/ui/skeleton'

interface Inspiration {
  id: string
  name: string
  url: string
  screenshotUrl: string
  industry: string[]
  styleTags: string[]
}

interface InspirationGalleryProps {
  inspirations: Inspiration[]
  selectedIds: string[]
  onSelect: (inspiration: Inspiration) => void
  isLoading?: boolean
}

export function InspirationGallery({
  inspirations,
  selectedIds,
  onSelect,
  isLoading,
}: InspirationGalleryProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-[16/10] rounded-lg" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    )
  }

  if (inspirations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center px-4">
        <p className="text-sm text-muted-foreground">
          Our curated gallery is coming soon. Paste your favorite website URLs above to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {inspirations.map((insp) => (
        <WebsiteCard
          key={insp.id}
          id={insp.id}
          name={insp.name}
          screenshotUrl={insp.screenshotUrl}
          url={insp.url}
          industry={insp.industry}
          styleTags={insp.styleTags}
          selected={selectedIds.includes(insp.id)}
          onSelect={() => onSelect(insp)}
        />
      ))}
    </div>
  )
}
