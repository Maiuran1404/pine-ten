'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScreenshotFrame } from '../shared/screenshot-frame'

interface SelectedInspiration {
  id: string
  url: string
  screenshotUrl: string
  name: string
  notes?: string
}

interface ComparisonViewProps {
  inspirations: SelectedInspiration[]
  onRemove: (id: string) => void
  onUpdateNotes: (id: string, notes: string) => void
}

export function ComparisonView({ inspirations, onRemove, onUpdateNotes }: ComparisonViewProps) {
  if (inspirations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Select websites to compare them here
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Selected ({inspirations.length}/5)</h3>
      <div className={`grid gap-4 ${inspirations.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {inspirations.map((insp) => (
          <div key={insp.id} className="space-y-2">
            <div className="relative">
              <ScreenshotFrame src={insp.screenshotUrl} alt={insp.name} selected />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 w-6 h-6 rounded-full"
                onClick={() => onRemove(insp.id)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-xs font-medium truncate">{insp.name}</p>
            <div>
              <textarea
                value={insp.notes || ''}
                onChange={(e) => onUpdateNotes(insp.id, e.target.value)}
                placeholder="What do you like about this site?"
                className="w-full text-xs p-2 rounded border border-border bg-background resize-none h-16 focus:outline-none focus:ring-1 focus:ring-green-500"
                maxLength={500}
              />
              {(insp.notes?.length ?? 0) > 0 && (
                <p className="text-[10px] text-muted-foreground text-right mt-0.5">
                  {insp.notes?.length ?? 0}/500
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
