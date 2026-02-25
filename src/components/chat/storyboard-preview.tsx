'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Play, Pause, SkipForward, SkipBack, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { OptimizedImage } from '@/components/ui/optimized-image'
import type { StoryboardScene } from '@/lib/ai/briefing-state-machine'
import type { SceneImageData } from '@/hooks/use-storyboard'
import { parseDurationSeconds, formatTimestamp } from './storyboard-view'
import { getSceneRole, type SceneRole } from './timeline-bar'

// =============================================================================
// ROLE COLORS
// =============================================================================

const ROLE_COLORS: Record<SceneRole, string> = {
  hook: 'bg-amber-500',
  cta: 'bg-emerald-500',
  transition: 'bg-purple-500',
  feature: 'bg-neutral-500',
}

// =============================================================================
// STORYBOARD PREVIEW DIALOG
// =============================================================================

interface StoryboardPreviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scenes: StoryboardScene[]
  sceneImageData?: Map<number, SceneImageData>
}

export function StoryboardPreview({
  open,
  onOpenChange,
  scenes,
  sceneImageData,
}: StoryboardPreviewProps) {
  // Render content only when open so state resets naturally on each open
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-black border-0">
        {open && (
          <StoryboardPreviewContent
            scenes={scenes}
            sceneImageData={sceneImageData}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

// =============================================================================
// INNER CONTENT (remounts on each dialog open → fresh state)
// =============================================================================

interface StoryboardPreviewContentProps {
  scenes: StoryboardScene[]
  sceneImageData?: Map<number, SceneImageData>
  onClose: () => void
}

function StoryboardPreviewContent({
  scenes,
  sceneImageData,
  onClose,
}: StoryboardPreviewContentProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const scene = scenes[currentIndex]
  const totalScenes = scenes.length
  const imageData = scene ? sceneImageData?.get(scene.sceneNumber) : undefined
  const imageUrl = imageData?.primaryUrl || scene?.resolvedImageUrl

  // Auto-advance when playing
  useEffect(() => {
    if (!isPlaying || !scene) return

    // Minimum 100ms per scene to avoid infinite loops on 0-duration scenes
    const durMs = Math.max(parseDurationSeconds(scene.duration) * 1000, 100)

    timerRef.current = setTimeout(() => {
      if (currentIndex < totalScenes - 1) {
        setCurrentIndex((i) => i + 1)
      } else {
        setIsPlaying(false)
        setCurrentIndex(0)
      }
    }, durMs)

    return () => clearTimeout(timerRef.current)
  }, [isPlaying, currentIndex, scene, totalScenes])

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, totalScenes - 1))
  }, [totalScenes])

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0))
  }, [])

  const togglePlay = useCallback(() => {
    setIsPlaying((p) => !p)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault()
        togglePlay()
      } else if (e.key === 'ArrowRight') {
        goNext()
      } else if (e.key === 'ArrowLeft') {
        goPrev()
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePlay, goNext, goPrev, onClose])

  if (!scene) return null

  // Compute cumulative progress
  let cumulativeBefore = 0
  for (let i = 0; i < currentIndex; i++) {
    cumulativeBefore += parseDurationSeconds(scenes[i].duration)
  }
  const currentDur = parseDurationSeconds(scene.duration)
  const totalDuration = scenes.reduce((acc, s) => acc + parseDurationSeconds(s.duration), 0)

  return (
    <>
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 text-white/80 hover:text-white hover:bg-black/70 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Scene title */}
      <div className="absolute top-4 left-4 z-20">
        <span className="text-sm font-medium text-white bg-black/50 px-3 py-1.5 rounded-lg backdrop-blur-sm">
          Scene {scene.sceneNumber}: {scene.title}
        </span>
      </div>

      {/* Main image area */}
      <div className="relative aspect-video w-full bg-black">
        {imageUrl ? (
          <OptimizedImage
            src={imageUrl}
            alt={`Scene ${scene.sceneNumber}`}
            fill
            className="object-contain"
            containerClassName="absolute inset-0"
            sizes="(max-width: 1024px) 100vw, 896px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/40">
            <span className="text-lg">No image</span>
          </div>
        )}

        {/* Voiceover/script as subtitles */}
        {scene.voiceover && (
          <div className="absolute bottom-16 left-0 right-0 flex justify-center px-8">
            <p className="text-sm text-white bg-black/70 px-4 py-2 rounded-lg backdrop-blur-sm max-w-2xl text-center leading-relaxed">
              {scene.voiceover}
            </p>
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="bg-zinc-900 px-4 py-3 space-y-2">
        {/* Timeline segments */}
        <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5">
          {scenes.map((s, i) => {
            const dur = parseDurationSeconds(s.duration)
            const widthPct = totalDuration > 0 ? (dur / totalDuration) * 100 : 0
            const role = getSceneRole(s, i, totalScenes)
            return (
              <button
                key={s.sceneNumber}
                type="button"
                onClick={() => setCurrentIndex(i)}
                className={cn(
                  'h-full rounded-sm transition-opacity',
                  i === currentIndex ? 'opacity-100' : 'opacity-40 hover:opacity-70',
                  ROLE_COLORS[role]
                )}
                style={{ width: `${widthPct}%`, minWidth: '4px' }}
              />
            )
          })}
        </div>

        {/* Play controls */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50 font-mono">
            {formatTimestamp(cumulativeBefore)} / {formatTimestamp(totalDuration)}
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              className="h-10 w-10 text-white hover:bg-white/10"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goNext}
              disabled={currentIndex === totalScenes - 1}
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          <span className="text-xs text-white/50">
            {currentIndex + 1} / {totalScenes} &middot; {currentDur}s
          </span>
        </div>
      </div>
    </>
  )
}
