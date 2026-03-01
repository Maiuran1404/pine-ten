'use client'

import { Film, Layout, Calendar, Palette, Loader2, Sparkles, RefreshCw, Pencil } from 'lucide-react'
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

interface StructurePanelProps {
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
  // DALL-E image generation
  imageGenerationProgress?: Map<number, 'pending' | 'generating' | 'done' | 'error'>
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
// PLACEHOLDER STATE — skeleton cards with pulse animation
// =============================================================================

function PlaceholderState({ structureType }: { structureType: StructureData['type'] }) {
  const config = TYPE_CONFIG[structureType]
  const Icon = config.icon

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-crafted-green" />
          <span className="text-sm font-semibold text-foreground">{config.label}</span>
        </div>
      </div>

      {/* Skeleton cards */}
      <div className="flex-1 p-4 space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground/60 mb-4">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span className="text-xs">{config.loadingMessage}</span>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-border/30 p-4 space-y-3 animate-pulse">
            <div className="flex items-center gap-2">
              <div className="h-3 w-16 bg-muted-foreground/10 rounded" />
              <div className="h-3 w-24 bg-muted-foreground/10 rounded" />
            </div>
            <div className="h-3 w-full bg-muted-foreground/10 rounded" />
            <div className="h-3 w-3/4 bg-muted-foreground/10 rounded" />
            <div className="h-8 w-full bg-muted-foreground/5 rounded" />
          </div>
        ))}
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
  onRegenerateImage,
  styleSelectionStyles,
  onStyleConfirmSelection,
  onStyleShowMore,
  onStyleShowDifferent,
  className,
}: StructurePanelProps) {
  // INSPIRATION stage: show StyleSelectionPanel instead of structure
  if (briefingStage === 'INSPIRATION') {
    return (
      <StyleSelectionPanel
        styles={styleSelectionStyles ?? []}
        onConfirmSelection={onStyleConfirmSelection}
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
