import { MousePointerClick } from 'lucide-react'

export function PresetEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <MousePointerClick className="h-10 w-10 text-muted-foreground/30 mb-4" />
      <p className="text-sm text-muted-foreground">
        Select a preset from the list to view and edit its details.
      </p>
    </div>
  )
}
