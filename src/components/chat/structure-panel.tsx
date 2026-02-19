'use client'

import { Film, Layout, Calendar, Palette, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { StructureData, StoryboardScene, LayoutSection } from '@/lib/ai/briefing-state-machine'
import { RichStoryboardPanel } from './storyboard-view'
import { LayoutPreview } from './layout-preview'
import { ContentCalendar } from './brief-panel/content-calendar'
import { DesignSpecView } from './design-spec-view'

// =============================================================================
// TYPES
// =============================================================================

interface StructurePanelProps {
  structureType: StructureData['type'] | null
  structureData: StructureData | null
  briefingStage?: string
  onSceneClick?: (scene: StoryboardScene) => void
  onSelectionChange?: (scenes: StoryboardScene[]) => void
  onSceneEdit?: (sceneNumber: number, field: string, value: string) => void
  onRegenerateStoryboard?: () => void
  onRegenerateScene?: (scene: StoryboardScene) => void
  onRegenerateField?: (scene: StoryboardScene, field: string) => void
  onSectionReorder?: (sections: LayoutSection[]) => void
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
          <Icon className="h-4 w-4 text-emerald-600" />
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
  onSceneClick,
  onSelectionChange,
  onSceneEdit,
  onRegenerateStoryboard,
  onRegenerateScene,
  onRegenerateField,
  onSectionReorder,
  className,
}: StructurePanelProps) {
  // No type known — shouldn't render, but handle gracefully
  if (!structureType) return null

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
              <Sparkles className="h-3 w-3 text-blue-500" />
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
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )
        })()}

      {structureData.type === 'storyboard' && (
        <RichStoryboardPanel
          scenes={structureData.scenes}
          onSceneClick={onSceneClick}
          onSelectionChange={onSelectionChange}
          onSceneEdit={onSceneEdit}
          onRegenerateStoryboard={onRegenerateStoryboard}
          onRegenerateScene={onRegenerateScene}
          onRegenerateField={onRegenerateField}
        />
      )}
      {structureData.type === 'layout' && (
        <ScrollArea className="flex-1">
          <div className="p-4">
            <LayoutPreview
              sections={structureData.sections}
              mode="interactive"
              onSectionReorder={onSectionReorder}
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
