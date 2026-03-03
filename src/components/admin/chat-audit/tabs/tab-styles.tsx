'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import type { StyleDetail } from '@/types/admin-chat-logs'

interface TabStylesProps {
  styleDetails: StyleDetail[]
}

export function TabStyles({ styleDetails }: TabStylesProps) {
  if (styleDetails.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No styles selected.
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 grid grid-cols-3 gap-3">
        {styleDetails.map((style) => (
          <div
            key={style.id}
            className="rounded-lg border border-border/50 overflow-hidden bg-card"
          >
            {/* Thumbnail */}
            <div className="aspect-square bg-muted overflow-hidden">
              {style.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={style.imageUrl} alt={style.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                  No image
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-2 space-y-1">
              <p className="text-xs font-medium truncate">{style.name}</p>
              <div className="flex flex-wrap gap-1">
                {style.deliverableType && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                    {style.deliverableType.replace(/_/g, ' ')}
                  </Badge>
                )}
                {style.styleAxis && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0">
                    {style.styleAxis}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
