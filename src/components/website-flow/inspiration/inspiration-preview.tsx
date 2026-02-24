'use client'

import { ComparisonView } from './comparison-view'

interface SelectedInspiration {
  id: string
  url: string
  screenshotUrl: string
  name: string
  notes?: string
}

interface InspirationPreviewProps {
  selectedInspirations: SelectedInspiration[]
  onRemove: (id: string) => void
  onUpdateNotes: (id: string, notes: string) => void
}

export function InspirationPreview({
  selectedInspirations,
  onRemove,
  onUpdateNotes,
}: InspirationPreviewProps) {
  if (selectedInspirations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-4">
          <span className="text-2xl">&#127760;</span>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Your Selections</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Paste URLs or browse the gallery to select websites you love. They&apos;ll appear here for
          comparison.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 overflow-auto h-full">
      <ComparisonView
        inspirations={selectedInspirations}
        onRemove={onRemove}
        onUpdateNotes={onUpdateNotes}
      />
    </div>
  )
}
