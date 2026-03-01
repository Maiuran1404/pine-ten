'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Sparkles, AlertCircle, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GenerationStatus } from './types'

interface PresetCardImageProps {
  referenceUrl: string | null
  previewBlobUrl: string | null
  generationStatus: GenerationStatus
  error: string | null
  name: string
}

export function PresetCardImage({
  referenceUrl,
  previewBlobUrl,
  generationStatus,
  error,
  name,
}: PresetCardImageProps) {
  const [fullscreenSrc, setFullscreenSrc] = useState<string | null>(null)

  return (
    <>
      <div className="flex items-start gap-2 shrink-0">
        {/* Reference Image */}
        <div className="relative">
          <span className="absolute -top-2 left-1 text-[10px] text-muted-foreground bg-card px-1 z-10">
            Ref
          </span>
          {referenceUrl ? (
            <button
              type="button"
              className="block rounded-md overflow-hidden border border-border hover:ring-2 hover:ring-primary/30 transition-all"
              onClick={() => setFullscreenSrc(referenceUrl)}
            >
              <img
                src={referenceUrl}
                alt={`${name} reference`}
                className="h-[72px] w-[72px] object-cover"
              />
            </button>
          ) : (
            <div className="h-[72px] w-[72px] rounded-md bg-muted flex items-center justify-center border border-border">
              <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
            </div>
          )}
        </div>

        {/* Preview Image */}
        <div className="relative">
          <span className="absolute -top-2 left-1 text-[10px] text-muted-foreground bg-card px-1 z-10">
            Preview
          </span>
          {generationStatus === 'generating' ? (
            <div className="relative h-[120px] w-[120px] rounded-md overflow-hidden border border-border">
              <Skeleton className="h-full w-full" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-muted-foreground animate-pulse" />
              </div>
            </div>
          ) : generationStatus === 'success' && previewBlobUrl ? (
            <button
              type="button"
              className={cn(
                'block rounded-md overflow-hidden border border-border',
                'hover:ring-2 hover:ring-primary/30 transition-all',
                'animate-in fade-in duration-500'
              )}
              onClick={() => setFullscreenSrc(previewBlobUrl)}
            >
              <img
                src={previewBlobUrl}
                alt={`${name} preview`}
                className="h-[120px] w-[120px] object-cover"
              />
            </button>
          ) : generationStatus === 'error' ? (
            <div className="h-[120px] w-[120px] rounded-md bg-destructive/10 flex flex-col items-center justify-center border border-destructive/30 gap-1 p-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span className="text-[10px] text-destructive text-center leading-tight">
                {error || 'Failed'}
              </span>
            </div>
          ) : (
            <div className="h-[120px] w-[120px] rounded-md border border-dashed border-border flex flex-col items-center justify-center gap-1 p-2">
              <Sparkles className="h-5 w-5 text-muted-foreground/30" />
              <span className="text-[10px] text-muted-foreground/50 text-center leading-tight">
                Generate to preview
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={!!fullscreenSrc} onOpenChange={() => setFullscreenSrc(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogTitle className="sr-only">{name} — Full Size</DialogTitle>
          {fullscreenSrc && (
            <img
              src={fullscreenSrc}
              alt={`${name} full size`}
              className="w-full h-auto rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
