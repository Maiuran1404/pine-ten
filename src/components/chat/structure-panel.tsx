'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Film,
  Layout,
  Calendar,
  Palette,
  Sparkles,
  RefreshCw,
  Pencil,
  Clapperboard,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type {
  StructureData,
  StoryboardScene,
  LayoutSection,
  BriefingStage,
  WebsiteGlobalStyles,
  WebsiteInspiration,
  VideoNarrative,
} from '@/lib/ai/briefing-state-machine'
import type { SceneImageData } from '@/hooks/use-storyboard'
import type { DeliverableStyle } from './types'
import { RichStoryboardPanel } from './storyboard-view'
import { LayoutPreview } from './layout-preview'
import { ContentCalendar } from './brief-panel/content-calendar'
import { DesignSpecView } from './design-spec-view'
import { WebsiteStructurePanel } from './website-structure-panel'
import { NarrativePanel } from './narrative-panel'
import { StyleSelectionPanel } from './style-selection-panel'

// =============================================================================
// TYPES
// =============================================================================

export interface StructurePanelProps {
  structureType: StructureData['type'] | null
  structureData: StructureData | null
  briefingStage?: string
  sceneImageData?: Map<number, SceneImageData>
  isRegenerating?: boolean
  changedScenes?: Map<number, { field: string; oldValue: string; newValue: string }[]>
  // Undo/Redo (#20)
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
  onSceneClick?: (scene: StoryboardScene) => void
  onSelectionChange?: (scenes: StoryboardScene[]) => void
  onSceneEdit?: (sceneNumber: number, field: string, value: string) => void
  onSceneReorder?: (scenes: StoryboardScene[]) => void
  onRegenerateStoryboard?: () => void
  onRegenerateScene?: (scene: StoryboardScene) => void
  onRegenerateField?: (scene: StoryboardScene, field: string) => void
  // User-specified target duration for storyboard header
  targetDurationSeconds?: number | null
  onSectionReorder?: (sections: LayoutSection[]) => void
  onSectionEdit?: (sectionIndex: number, field: string, value: string) => void
  // Website-specific props
  websiteGlobalStyles?: WebsiteGlobalStyles | null
  websiteInspirations?: WebsiteInspiration[]
  websiteInspirationIds?: string[]
  inspirationGallery?: Array<{
    id: string
    name: string
    url: string
    screenshotUrl: string
    industry: string[]
    styleTags: string[]
  }>
  isGalleryLoading?: boolean
  isCapturingScreenshot?: boolean
  onInspirationSelect?: (item: {
    id: string
    name: string
    url: string
    screenshotUrl: string
  }) => void
  onRemoveInspiration?: (id: string) => void
  onCaptureScreenshot?: (url: string) => Promise<WebsiteInspiration>
  // Visual similarity & notes
  onFindSimilar?: () => void
  similarResults?: Array<{
    inspiration: {
      id: string
      name: string
      url: string
      screenshotUrl: string
      thumbnailUrl: string | null
      industry: string[]
      styleTags: string[]
    }
    score: number
  }>
  isFindingSimilar?: boolean
  canFindSimilar?: boolean
  onUpdateInspirationNotes?: (id: string, notes: string) => void
  // Video narrative props
  videoNarrative?: VideoNarrative | null
  narrativeApproved?: boolean
  onApproveNarrative?: () => void
  onNarrativeFieldEdit?: (field: 'concept' | 'narrative' | 'hook', value: string) => void
  // Error recovery for storyboard generation after narrative approval
  isChatLoading?: boolean
  lastSendError?: string | null
  onRetryGeneration?: () => void
  onEditNarrative?: () => void
  // Scene image generation
  imageGenerationProgress?: Map<number, 'pending' | 'generating' | 'done' | 'error'>
  isGeneratingImages?: boolean
  onRegenerateImage?: (scene: StoryboardScene) => void
  // Style selection props (shown during INSPIRATION stage)
  styleSelectionStyles?: DeliverableStyle[]
  onStyleConfirmSelection?: (selectedStyles: DeliverableStyle[]) => void
  onStyleShowMore?: (styleAxis: string) => void
  onStyleShowDifferent?: () => void
  className?: string
}

// =============================================================================
// TYPE CONFIG
// =============================================================================

const TYPE_CONFIG: Record<
  StructureData['type'],
  { icon: typeof Film; label: string; loadingMessage: string }
> = {
  storyboard: {
    icon: Film,
    label: 'Storyboard',
    loadingMessage: 'Building your storyboard...',
  },
  layout: {
    icon: Layout,
    label: 'Page Layout',
    loadingMessage: 'Designing the page layout...',
  },
  calendar: {
    icon: Calendar,
    label: 'Content Calendar',
    loadingMessage: 'Planning your content calendar...',
  },
  single_design: {
    icon: Palette,
    label: 'Design Spec',
    loadingMessage: 'Creating design specifications...',
  },
}

// =============================================================================
// LOADING MESSAGES — stage-specific flavor text
// =============================================================================

const LOADING_MESSAGES: Record<StructureData['type'], string[]> = {
  storyboard: [
    'Scripting your scenes...',
    'Setting the stage...',
    'Composing visual flow...',
    'Mapping the narrative arc...',
    'Timing each beat...',
    'Polishing transitions...',
  ],
  layout: [
    'Wireframing sections...',
    'Arranging the layout...',
    'Positioning content blocks...',
    'Optimizing visual hierarchy...',
    'Refining spacing...',
    'Finalizing the grid...',
  ],
  calendar: [
    'Mapping content pillars...',
    'Scheduling your posts...',
    'Balancing the mix...',
    'Adding variety...',
    'Spacing for impact...',
    'Finalizing the rhythm...',
  ],
  single_design: [
    'Defining the composition...',
    'Setting type hierarchy...',
    'Choosing the palette...',
    'Applying your style...',
    'Refining details...',
    'Finishing touches...',
  ],
}

// =============================================================================
// PLACEHOLDER STATE — animated cinematic loading
// =============================================================================

function PlaceholderState({
  structureType,
  progress,
  scenes,
}: {
  structureType: StructureData['type']
  progress?: { done: number; total: number; message?: string }
  scenes?: Array<{ sceneNumber: number; title: string }>
}) {
  const config = TYPE_CONFIG[structureType]
  const Icon = config.icon
  const messages = LOADING_MESSAGES[structureType]

  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length)
    }, 3500)
    return () => clearInterval(interval)
  }, [messages.length])

  const progressPercent = progress
    ? Math.round((progress.done / Math.max(progress.total, 1)) * 100)
    : null

  // Determine which scene is currently being generated
  const currentGeneratingScene = progress ? Math.min(progress.done + 1, progress.total) : null

  // Build dynamic message with scene title when available
  const dynamicMessage = (() => {
    if (progress?.message) return progress.message
    if (currentGeneratingScene && scenes && scenes.length > 0) {
      const scene = scenes.find((s) => s.sceneNumber === currentGeneratingScene)
      if (scene) return `Creating Scene ${scene.sceneNumber}: ${scene.title}...`
    }
    return messages[messageIndex]
  })()

  // Scene slots to show — use actual scene count if available
  const sceneSlots = scenes?.length ?? progress?.total ?? 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-crafted-green" />
          <span className="text-sm font-semibold text-foreground">{config.label}</span>
        </div>
      </div>

      {/* Animated loading content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
        {/* Clapperboard animation */}
        <div className="relative">
          {/* Outer rotating ring */}
          <motion.div
            className="absolute rounded-full border-2 border-dashed border-crafted-green/20"
            style={{ width: 96, height: 96, top: -8, left: -8 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          />
          {/* Inner pulsing glow */}
          <motion.div
            className="absolute rounded-full bg-crafted-green/5"
            style={{ width: 80, height: 80, top: 0, left: 0 }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Center icon with clapperboard snap animation for storyboard */}
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-crafted-green/10 to-crafted-forest/10 flex items-center justify-center">
            <motion.div
              animate={
                structureType === 'storyboard'
                  ? { rotateX: [0, -15, 0], y: [0, -2, 0] }
                  : { y: [0, -3, 0] }
              }
              transition={{
                duration: structureType === 'storyboard' ? 1.5 : 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {structureType === 'storyboard' ? (
                <Clapperboard className="h-8 w-8 text-crafted-green" />
              ) : (
                <Icon className="h-8 w-8 text-crafted-green" />
              )}
            </motion.div>
          </div>
        </div>

        {/* Cycling message with dynamic scene info */}
        <div className="text-center space-y-2 min-h-[56px]">
          <AnimatePresence mode="wait">
            <motion.p
              key={dynamicMessage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="text-sm font-medium text-foreground"
            >
              {dynamicMessage}
            </motion.p>
          </AnimatePresence>
          {progressPercent !== null ? (
            <p className="text-xs text-muted-foreground">
              {progress!.done} of {progress!.total} ready
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">This usually takes a few moments</p>
          )}
        </div>

        {/* Progress bar with glowing leading edge */}
        <div className="w-full max-w-[260px]">
          {progressPercent !== null ? (
            <div className="h-2 bg-muted rounded-full overflow-hidden relative">
              <motion.div
                className="h-full bg-gradient-to-r from-crafted-green to-crafted-green-light rounded-full relative"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                {/* Glowing leading edge */}
                <motion.div
                  className="absolute right-0 top-0 h-full w-3 bg-crafted-mint/80 rounded-full blur-sm"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                />
              </motion.div>
            </div>
          ) : (
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full w-1/3 bg-gradient-to-r from-crafted-green/40 to-crafted-green rounded-full"
                animate={{ x: ['-100%', '400%'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          )}
        </div>

        {/* Film strip scene slots (storyboard only) — shows actual scene count */}
        {structureType === 'storyboard' && sceneSlots > 0 && (
          <div className="flex justify-center gap-2 mt-2">
            {Array.from({ length: sceneSlots }, (_, i) => {
              const sceneNum = i + 1
              const isDone = progress ? sceneNum <= progress.done : false
              const isActive = progress ? sceneNum === progress.done + 1 : false
              const sceneTitle = scenes?.[i]?.title

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
                  className={cn(
                    'w-[52px] h-[34px] rounded-md border overflow-hidden relative flex flex-col items-center justify-center',
                    isDone
                      ? 'border-crafted-green/40 bg-crafted-green/10'
                      : isActive
                        ? 'border-crafted-green/30 bg-muted/60'
                        : 'border-border/30 bg-muted/40'
                  )}
                >
                  {/* Active scene shimmer */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-crafted-green/10 to-transparent"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                  {/* Done glow */}
                  {isDone && (
                    <motion.div
                      className="absolute inset-0 bg-crafted-green/5"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4 }}
                    />
                  )}
                  <span
                    className={cn(
                      'text-[9px] font-medium relative z-10',
                      isDone ? 'text-crafted-green' : 'text-muted-foreground'
                    )}
                  >
                    {sceneNum}
                  </span>
                  {sceneTitle && (
                    <span className="text-[7px] text-muted-foreground/60 truncate max-w-[44px] relative z-10">
                      {sceneTitle}
                    </span>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Fallback cards for non-storyboard or when no scene data */}
        {structureType === 'storyboard' && sceneSlots === 0 && (
          <div className="flex gap-2 mt-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.15, duration: 0.4 }}
                className="w-16 h-10 rounded-md bg-muted/60 border border-border/30 overflow-hidden"
              >
                <motion.div
                  className="w-full h-full bg-gradient-to-br from-crafted-green/5 to-crafted-forest/5"
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.4,
                    ease: 'easeInOut',
                  }}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// ELABORATION PROGRESS HELPER
// =============================================================================

function getElaborationProgress(data: StructureData): { done: number; total: number } {
  switch (data.type) {
    case 'storyboard': {
      const total = data.scenes.length
      const done = data.scenes.filter((s) => s.fullScript || s.directorNotes).length
      return { done, total }
    }
    case 'layout': {
      const total = data.sections.length
      const done = data.sections.filter((s) => s.headline || s.draftContent).length
      return { done, total }
    }
    case 'calendar': {
      const total = data.outline.contentPillars.length
      const done = data.outline.contentPillars.filter((p) => p.visualIdentity).length
      return { done, total }
    }
    case 'single_design': {
      const spec = data.specification
      const hasExactCopy = spec.exactCopy && spec.exactCopy.length > 0
      const hasLayoutNotes = !!spec.layoutNotes
      return { done: (hasExactCopy ? 1 : 0) + (hasLayoutNotes ? 1 : 0), total: 2 }
    }
    default:
      return { done: 0, total: 0 }
  }
}

// =============================================================================
// MAIN STRUCTURE PANEL
// =============================================================================

export function StructurePanel({
  structureType,
  structureData,
  briefingStage,
  sceneImageData,
  isRegenerating,
  changedScenes,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onSceneClick,
  onSelectionChange,
  onSceneEdit,
  onSceneReorder,
  onRegenerateStoryboard,
  onRegenerateScene,
  onRegenerateField,
  targetDurationSeconds,
  onSectionReorder,
  onSectionEdit,
  websiteGlobalStyles,
  websiteInspirations,
  websiteInspirationIds,
  inspirationGallery,
  isGalleryLoading,
  isCapturingScreenshot,
  onInspirationSelect,
  onRemoveInspiration,
  onCaptureScreenshot,
  onFindSimilar,
  similarResults,
  isFindingSimilar,
  canFindSimilar,
  onUpdateInspirationNotes,
  videoNarrative,
  narrativeApproved,
  onApproveNarrative,
  onNarrativeFieldEdit,
  isChatLoading,
  lastSendError,
  onRetryGeneration,
  onEditNarrative,
  imageGenerationProgress,
  isGeneratingImages,
  onRegenerateImage,
  styleSelectionStyles,
  onStyleConfirmSelection,
  onStyleShowMore,
  onStyleShowDifferent,
  className,
}: StructurePanelProps) {
  // Track when user confirms a style — used to show cinematic loading instead of skeleton cards.
  // Derived from state + stage: auto-clears when stage advances past INSPIRATION.
  const [styleConfirmingRaw, setStyleConfirming] = useState(false)
  const styleConfirming = styleConfirmingRaw && briefingStage === 'INSPIRATION'

  const wrappedStyleConfirm = useCallback(
    (selectedStyles: DeliverableStyle[]) => {
      setStyleConfirming(true)
      onStyleConfirmSelection?.(selectedStyles)
    },
    [onStyleConfirmSelection]
  )

  // INSPIRATION stage: show StyleSelectionPanel or cinematic loading
  if (briefingStage === 'INSPIRATION') {
    // After style confirmation, show cinematic loading while AI generates structure
    if (styleConfirming && isChatLoading && structureType) {
      return (
        <div className={cn('flex flex-col h-full bg-background', className)}>
          <PlaceholderState structureType={structureType} />
        </div>
      )
    }

    return (
      <StyleSelectionPanel
        styles={styleSelectionStyles ?? []}
        onConfirmSelection={wrappedStyleConfirm}
        onShowMore={onStyleShowMore}
        onShowDifferent={onStyleShowDifferent}
        isLoading={isRegenerating}
        className={className}
      />
    )
  }

  // No type known — shouldn't render, but handle gracefully
  if (!structureType) return null

  // Website projects: use WebsiteStructurePanel for both placeholder and data states
  if (structureType === 'layout') {
    return (
      <div className={cn('flex flex-col h-full bg-background', className)}>
        <WebsiteStructurePanel
          sections={structureData?.type === 'layout' ? structureData.sections : null}
          briefingStage={(briefingStage as BriefingStage) ?? undefined}
          globalStyles={websiteGlobalStyles}
          onSectionReorder={onSectionReorder}
          onSectionEdit={onSectionEdit}
          websiteInspirations={websiteInspirations ?? []}
          websiteInspirationIds={websiteInspirationIds ?? []}
          inspirationGallery={inspirationGallery ?? []}
          isGalleryLoading={isGalleryLoading}
          isCapturingScreenshot={isCapturingScreenshot}
          onInspirationSelect={onInspirationSelect ?? (() => {})}
          onRemoveInspiration={onRemoveInspiration ?? (() => {})}
          onCaptureScreenshot={onCaptureScreenshot}
          onFindSimilar={onFindSimilar}
          similarResults={similarResults}
          isFindingSimilar={isFindingSimilar}
          canFindSimilar={canFindSimilar}
          onUpdateInspirationNotes={onUpdateInspirationNotes}
        />
      </div>
    )
  }

  // Video narrative phase: show NarrativePanel until narrative is approved,
  // then show loading skeleton while storyboard is being generated
  if (structureType === 'storyboard' && videoNarrative && !structureData) {
    // Once narrative is approved, show storyboard loading skeleton (or error recovery)
    if (narrativeApproved) {
      // If storyboard generation failed, show error + retry UI
      if (lastSendError && onRetryGeneration) {
        return (
          <div className={cn('flex flex-col h-full bg-background', className)}>
            <div className="shrink-0 px-4 py-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Film className="h-4 w-4 text-crafted-green" />
                <span className="text-sm font-semibold text-foreground">Storyboard</span>
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Film className="h-6 w-6 text-destructive" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Storyboard generation failed</p>
                <p className="text-xs text-muted-foreground">{lastSendError}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEditNarrative}
                  disabled={!onEditNarrative}
                  className="gap-1.5"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Narrative
                </Button>
                <Button size="sm" onClick={onRetryGeneration} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </Button>
              </div>
            </div>
          </div>
        )
      }
      // If chat is not loading and no error, the auto-trigger may have failed silently
      // Show a generate button so the user can manually kick off storyboard generation
      if (!isChatLoading && !isRegenerating && onRetryGeneration) {
        return (
          <div className={cn('flex flex-col h-full bg-background', className)}>
            <div className="shrink-0 px-4 py-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Film className="h-4 w-4 text-crafted-green" />
                <span className="text-sm font-semibold text-foreground">Storyboard</span>
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-crafted-green/10 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-crafted-green" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Ready to build your storyboard
                </p>
                <p className="text-xs text-muted-foreground">
                  Your narrative is approved. Generate the storyboard to continue.
                </p>
              </div>
              <Button size="sm" onClick={onRetryGeneration} className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Generate Storyboard
              </Button>
            </div>
          </div>
        )
      }
      return (
        <div className={cn('flex flex-col h-full bg-background', className)}>
          <PlaceholderState structureType="storyboard" />
        </div>
      )
    }
    // Narrative not yet approved — show the narrative panel for review
    if (onApproveNarrative && onNarrativeFieldEdit) {
      return (
        <div className={cn('flex flex-col h-full bg-background', className)}>
          <NarrativePanel
            narrative={videoNarrative}
            onApprove={onApproveNarrative}
            onFieldEdit={onNarrativeFieldEdit}
            isApproved={narrativeApproved}
          />
        </div>
      )
    }
  }

  // Placeholder — type known but no data yet
  if (!structureData) {
    return (
      <div className={cn('flex flex-col h-full bg-background', className)}>
        <PlaceholderState structureType={structureType} />
      </div>
    )
  }

  // Storyboard: show loading screen only during batch generation (not single-scene regen)
  // isGeneratingImages is true only during generateSceneImages (batch), not regenerateSceneImage
  if (
    structureData?.type === 'storyboard' &&
    isGeneratingImages &&
    imageGenerationProgress &&
    imageGenerationProgress.size > 0
  ) {
    const entries = Array.from(imageGenerationProgress.values())
    const allDone = entries.every((s) => s === 'done' || s === 'error')
    if (!allDone) {
      const doneCount = entries.filter((s) => s === 'done').length
      const generatingCount = entries.filter((s) => s === 'generating').length
      const total = entries.length
      const message =
        generatingCount > 0
          ? `Generating scene visuals (${doneCount}/${total})...`
          : `Preparing scene images...`
      const sceneInfo =
        structureData.type === 'storyboard'
          ? structureData.scenes.map((s) => ({
              sceneNumber: s.sceneNumber,
              title: s.title,
            }))
          : undefined
      return (
        <div className={cn('flex flex-col h-full bg-background', className)}>
          <PlaceholderState
            structureType="storyboard"
            progress={{ done: doneCount, total, message }}
            scenes={sceneInfo}
          />
        </div>
      )
    }
  }

  // Active — render the appropriate view
  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Elaboration progress */}
      {briefingStage === 'ELABORATE' &&
        structureData &&
        (() => {
          const { done, total } = getElaborationProgress(structureData)
          if (total === 0) return null
          return (
            <div className="shrink-0 px-4 py-2 border-b border-border/40 flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 text-ds-info" />
              <span>
                {done}/{total}{' '}
                {structureData.type === 'storyboard'
                  ? 'scenes'
                  : structureData.type === 'layout'
                    ? 'sections'
                    : structureData.type === 'calendar'
                      ? 'pillars'
                      : 'specs'}{' '}
                detailed
              </span>
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-ds-info rounded-full transition-all"
                  style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )
        })()}

      {structureData.type === 'storyboard' && (
        <RichStoryboardPanel
          scenes={structureData.scenes}
          sceneImageData={sceneImageData}
          isRegenerating={isRegenerating}
          changedScenes={changedScenes}
          onSceneClick={onSceneClick}
          onSelectionChange={onSelectionChange}
          onSceneEdit={onSceneEdit}
          onSceneReorder={onSceneReorder}
          onRegenerateStoryboard={onRegenerateStoryboard}
          onRegenerateScene={onRegenerateScene}
          onRegenerateField={onRegenerateField}
          onUndo={onUndo}
          onRedo={onRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          imageGenerationProgress={imageGenerationProgress}
          onRegenerateImage={onRegenerateImage}
          targetDurationSeconds={targetDurationSeconds}
        />
      )}
      {structureData.type === 'layout' && (
        <ScrollArea className="flex-1">
          <div className="p-4">
            <LayoutPreview
              sections={structureData.sections}
              mode="interactive"
              onSectionReorder={onSectionReorder}
              onSectionEdit={onSectionEdit}
            />
          </div>
        </ScrollArea>
      )}
      {structureData.type === 'calendar' && (
        <ScrollArea className="flex-1">
          <div className="p-4">
            <ContentCalendar outline={structureData.outline} />
          </div>
        </ScrollArea>
      )}
      {structureData.type === 'single_design' && (
        <ScrollArea className="flex-1">
          <div className="p-4">
            <DesignSpecView specification={structureData.specification} />
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
