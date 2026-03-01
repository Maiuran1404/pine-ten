'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  X,
  Sparkles,
  AlertCircle,
  ImageIcon,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DELIVERABLE_TYPES } from '@/lib/constants/reference-libraries'
import type { DeliverableStyleReference, CardGenerationState, GenerationStatus } from './types'

type StatusFilter = 'all' | 'success' | 'generating' | 'error' | 'idle'

interface GenerationGalleryProps {
  presets: DeliverableStyleReference[]
  subject: string
  cardStates: Record<string, CardGenerationState>
  getCardState: (id: string) => CardGenerationState
  onClose: () => void
  onViewDetails: (id: string) => void
  onSaveAsReference: (id: string) => void
}

const STATUS_ORDER: Record<GenerationStatus, number> = {
  generating: 0,
  success: 1,
  error: 2,
  idle: 3,
}

export function GenerationGallery({
  presets,
  subject,
  cardStates,
  getCardState,
  onClose,
  onViewDetails,
  onSaveAsReference,
}: GenerationGalleryProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [fullscreenSrc, setFullscreenSrc] = useState<string | null>(null)
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())

  // Compute counts per status
  const counts = useMemo(() => {
    const result = { all: presets.length, success: 0, generating: 0, error: 0, idle: 0 }
    for (const preset of presets) {
      const state = getCardState(preset.id)
      result[state.status]++
    }
    return result
  }, [presets, getCardState, cardStates])

  // Filter and sort presets
  const displayPresets = useMemo(() => {
    const filtered =
      statusFilter === 'all'
        ? presets
        : presets.filter((p) => getCardState(p.id).status === statusFilter)

    return [...filtered].sort((a, b) => {
      const statusA = getCardState(a.id).status
      const statusB = getCardState(b.id).status
      return STATUS_ORDER[statusA] - STATUS_ORDER[statusB]
    })
  }, [presets, statusFilter, getCardState, cardStates])

  const handleSave = async (id: string) => {
    setSavingIds((prev) => new Set(prev).add(id))
    try {
      await onSaveAsReference(id)
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">Generation Gallery</h2>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            Subject: <span className="text-foreground font-medium">{subject}</span>
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="shrink-0">
          <X className="h-4 w-4 mr-1.5" />
          Close
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="px-4 py-2 border-b border-border">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <TabsList className="h-8 gap-0.5">
            <TabsTrigger value="all" className="text-xs px-2.5 py-1 h-7">
              All ({counts.all})
            </TabsTrigger>
            {counts.success > 0 && (
              <TabsTrigger value="success" className="text-xs px-2.5 py-1 h-7">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Success ({counts.success})
              </TabsTrigger>
            )}
            {counts.generating > 0 && (
              <TabsTrigger value="generating" className="text-xs px-2.5 py-1 h-7">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Generating ({counts.generating})
              </TabsTrigger>
            )}
            {counts.error > 0 && (
              <TabsTrigger value="error" className="text-xs px-2.5 py-1 h-7">
                <AlertCircle className="h-3 w-3 mr-1" />
                Errors ({counts.error})
              </TabsTrigger>
            )}
            {counts.idle > 0 && (
              <TabsTrigger value="idle" className="text-xs px-2.5 py-1 h-7">
                <Clock className="h-3 w-3 mr-1" />
                Pending ({counts.idle})
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      </div>

      {/* Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
          {displayPresets.map((preset) => (
            <GalleryCard
              key={preset.id}
              preset={preset}
              genState={getCardState(preset.id)}
              isSaving={savingIds.has(preset.id)}
              onClickImage={(src) => setFullscreenSrc(src)}
              onSaveAsReference={() => handleSave(preset.id)}
              onViewDetails={() => onViewDetails(preset.id)}
            />
          ))}
        </div>

        {displayPresets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ImageIcon className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No presets match the selected filter.</p>
          </div>
        )}
      </div>

      {/* Fullscreen dialog */}
      <Dialog open={!!fullscreenSrc} onOpenChange={() => setFullscreenSrc(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogTitle className="sr-only">Full Size Preview</DialogTitle>
          {fullscreenSrc && (
            <img src={fullscreenSrc} alt="Full size preview" className="w-full h-auto rounded-md" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- Internal GalleryCard component ---

interface GalleryCardProps {
  preset: DeliverableStyleReference
  genState: CardGenerationState
  isSaving: boolean
  onClickImage: (src: string) => void
  onSaveAsReference: () => void
  onViewDetails: () => void
}

function GalleryCard({
  preset,
  genState,
  isSaving,
  onClickImage,
  onSaveAsReference,
  onViewDetails,
}: GalleryCardProps) {
  const typeLabel =
    DELIVERABLE_TYPES.find((t) => t.value === preset.deliverableType)?.label ??
    preset.deliverableType

  return (
    <div className="group rounded-lg border border-border bg-card overflow-hidden transition-colors hover:border-primary/30">
      {/* Image area */}
      <div className="aspect-square relative bg-muted">
        {genState.status === 'generating' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Skeleton className="absolute inset-0" />
            <Sparkles className="h-6 w-6 text-muted-foreground animate-pulse relative z-10" />
            <span className="text-xs text-muted-foreground relative z-10">Generating...</span>
          </div>
        ) : genState.status === 'success' && genState.previewBlobUrl ? (
          <button
            type="button"
            className="block w-full h-full"
            onClick={() => onClickImage(genState.previewBlobUrl!)}
          >
            <img
              src={genState.previewBlobUrl}
              alt={`${preset.name} preview`}
              className={cn('w-full h-full object-cover', 'animate-in fade-in duration-500')}
            />
          </button>
        ) : genState.status === 'error' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-destructive/5 p-4">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <span className="text-xs text-destructive text-center leading-tight line-clamp-2">
              {genState.error || 'Generation failed'}
            </span>
          </div>
        ) : (
          /* idle */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Clock className="h-6 w-6 text-muted-foreground/30" />
            <span className="text-xs text-muted-foreground/50">Pending</span>
          </div>
        )}

        {/* Hover overlay with actions (only for success state) */}
        {genState.status === 'success' && genState.previewBlobUrl && (
          <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={onSaveAsReference}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Download className="h-3 w-3" />
              )}
              {isSaving ? 'Saving...' : 'Save as Ref'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={onViewDetails}
            >
              <Eye className="h-3 w-3" />
              Details
            </Button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 space-y-1.5">
        <p className="text-sm font-medium truncate" title={preset.name}>
          {preset.name}
        </p>
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
            {typeLabel}
          </Badge>
          <StatusDot status={genState.status} />
        </div>
      </div>
    </div>
  )
}

function StatusDot({ status }: { status: GenerationStatus }) {
  if (status === 'idle') return null

  const config = {
    generating: { className: 'bg-ds-warning animate-pulse', label: 'Generating' },
    success: { className: 'bg-ds-success', label: 'Done' },
    error: { className: 'bg-destructive', label: 'Error' },
  } as const

  const { className, label } = config[status]

  return (
    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
      <span className={cn('h-1.5 w-1.5 rounded-full', className)} />
      {label}
    </span>
  )
}
