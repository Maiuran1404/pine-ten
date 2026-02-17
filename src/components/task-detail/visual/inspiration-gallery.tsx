'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ImageIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { MoodboardItem } from '@/components/task-detail/types'

interface InspirationGalleryProps {
  items: MoodboardItem[]
  styleReferences: string[]
}

export function InspirationGallery({ items, styleReferences }: InspirationGalleryProps) {
  const [selectedItem, setSelectedItem] = useState<MoodboardItem | null>(null)

  if (items.length === 0 && styleReferences.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ImageIcon className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No inspiration items yet</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="group relative aspect-square overflow-hidden rounded-lg border border-border/60 bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setSelectedItem(item)}
          >
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              className="object-cover transition-transform duration-200 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
            <div className="absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/40" />
            <div className="absolute inset-x-0 bottom-0 translate-y-full p-2 transition-transform duration-200 group-hover:translate-y-0">
              <span className="text-xs font-medium text-white drop-shadow-sm line-clamp-2">
                {item.name}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={selectedItem !== null} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-2xl">
          {selectedItem && (
            <div className="space-y-4">
              <DialogTitle>{selectedItem.name}</DialogTitle>
              <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                <Image
                  src={selectedItem.imageUrl}
                  alt={selectedItem.name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 672px"
                />
              </div>
              {selectedItem.metadata?.styleAxis && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {selectedItem.metadata.styleAxis}
                  </Badge>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
