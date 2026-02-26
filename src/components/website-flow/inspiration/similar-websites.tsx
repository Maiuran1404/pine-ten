'use client'

import { Button } from '@/components/ui/button'
import { Sparkles, Loader2 } from 'lucide-react'
import { WebsiteCard } from './website-card'
import { Skeleton } from '@/components/ui/skeleton'

interface SimilarInspiration {
  id: string
  name: string
  url: string
  screenshotUrl: string
  industry: string[]
  styleTags: string[]
}

interface SimilarWebsitesProps {
  similar: Array<{ inspiration: SimilarInspiration; score: number }>
  selectedIds: string[]
  onSelect: (inspiration: SimilarInspiration) => void
  onFindSimilar: () => void
  isLoading?: boolean
  canSearch: boolean
}

export function SimilarWebsites({
  similar,
  selectedIds,
  onSelect,
  onFindSimilar,
  isLoading,
  canSearch,
}: SimilarWebsitesProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-ds-success" />
          Similar Websites
        </h3>
        <Button
          onClick={onFindSimilar}
          disabled={!canSearch || isLoading}
          variant="outline"
          size="sm"
          className="text-xs"
        >
          {isLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
          Find Similar
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[16/10] rounded-lg" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      ) : similar.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {similar.map(({ inspiration, score }) => (
            <div key={inspiration.id} className="relative">
              <WebsiteCard
                id={inspiration.id}
                name={inspiration.name}
                screenshotUrl={inspiration.screenshotUrl}
                url={inspiration.url}
                industry={inspiration.industry}
                styleTags={inspiration.styleTags}
                selected={selectedIds.includes(inspiration.id)}
                onSelect={() => onSelect(inspiration)}
              />
              <span className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded-full bg-ds-success/90 text-white font-medium">
                {Math.round(score * 100)}% match
              </span>
            </div>
          ))}
        </div>
      ) : canSearch ? (
        <p className="text-sm text-muted-foreground">
          Select inspirations above, then click &quot;Find Similar&quot; to discover more.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Select from the gallery to find similar websites. Custom URLs can&apos;t be matched yet.
        </p>
      )}
    </div>
  )
}
