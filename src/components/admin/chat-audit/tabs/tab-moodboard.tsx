'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import type { MoodboardItemData } from '@/types/admin-chat-logs'

interface TabMoodboardProps {
  moodboardItems: MoodboardItemData[]
}

const TYPE_LABELS: Record<string, string> = {
  style: 'Style References',
  color: 'Color Palette',
  image: 'Inspiration Images',
  upload: 'User Uploads',
}

export function TabMoodboard({ moodboardItems }: TabMoodboardProps) {
  if (moodboardItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No moodboard items collected.
      </div>
    )
  }

  // Group by type
  const grouped = moodboardItems.reduce<Record<string, MoodboardItemData[]>>((acc, item) => {
    const key = item.type || 'other'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {Object.entries(grouped).map(([type, items]) => (
          <div key={type}>
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {TYPE_LABELS[type] || type}
              </h4>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {items.length}
              </Badge>
            </div>

            {type === 'color' ? (
              <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                  <div key={item.id} className="space-y-1">
                    <div className="flex gap-1">
                      {item.metadata?.colorSamples?.map((color, i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded border border-border/50"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                      {(!item.metadata?.colorSamples ||
                        item.metadata.colorSamples.length === 0) && (
                        <div className="w-8 h-8 rounded border border-border/50 bg-muted flex items-center justify-center text-[9px] text-muted-foreground">
                          ?
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate max-w-20">
                      {item.name}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border/50 overflow-hidden bg-card"
                  >
                    <div className="aspect-square bg-muted overflow-hidden">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">
                          No preview
                        </div>
                      )}
                    </div>
                    <div className="p-1.5">
                      <p className="text-[10px] font-medium truncate">{item.name}</p>
                      {item.metadata?.styleAxis && (
                        <p className="text-[9px] text-muted-foreground truncate">
                          {item.metadata.styleAxis}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
