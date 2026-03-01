'use client'

import { Badge } from '@/components/ui/badge'
import { ImageIcon } from 'lucide-react'
import { DELIVERABLE_TYPES } from '@/lib/constants/reference-libraries'
import { cn } from '@/lib/utils'
import type { DeliverableStyleReference, CardEditState, CardGenerationState } from './types'

interface PresetListTableProps {
  presets: DeliverableStyleReference[]
  selectedId: string | null
  onSelect: (id: string) => void
  editStates: Record<string, CardEditState>
  generationStates: Record<string, CardGenerationState>
}

export function PresetListTable({
  presets,
  selectedId,
  onSelect,
  editStates,
  generationStates,
}: PresetListTableProps) {
  if (presets.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        No presets match your filters.
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {presets.map((style) => {
        const isSelected = style.id === selectedId
        const edit = editStates[style.id]
        const isDirty =
          edit != null &&
          (edit.name !== style.name ||
            edit.promptGuide !== (style.promptGuide || '') ||
            edit.isActive !== style.isActive)
        const genState = generationStates[style.id]
        const isGenerating = genState?.status === 'generating'
        const refCount = style.styleReferenceImages?.length ?? 0
        const displayName = edit?.name ?? style.name

        return (
          <button
            key={style.id}
            type="button"
            onClick={() => onSelect(style.id)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-border/50 last:border-b-0',
              'hover:bg-accent/50',
              isSelected && 'bg-accent',
              !style.isActive && !isSelected && 'opacity-50'
            )}
          >
            {/* Thumbnail */}
            <div className="relative shrink-0">
              {style.imageUrl ? (
                <img
                  src={style.imageUrl}
                  alt={style.name}
                  className="h-9 w-9 rounded object-cover border border-border"
                />
              ) : (
                <div className="h-9 w-9 rounded bg-muted flex items-center justify-center border border-border">
                  <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                </div>
              )}
              {/* Active indicator */}
              <div
                className={cn(
                  'absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border border-background',
                  style.isActive ? 'bg-ds-success' : 'bg-muted-foreground/30'
                )}
              />
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium truncate">{displayName}</span>
                {isDirty && (
                  <div
                    className="h-1.5 w-1.5 rounded-full bg-primary shrink-0"
                    title="Unsaved changes"
                  />
                )}
                {isGenerating && (
                  <div
                    className="h-1.5 w-1.5 rounded-full bg-ds-warning animate-pulse shrink-0"
                    title="Generating..."
                  />
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 leading-none">
                  {DELIVERABLE_TYPES.find((t) => t.value === style.deliverableType)?.label ??
                    style.deliverableType}
                </Badge>
                {refCount > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {refCount} ref{refCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
