'use client'

import {
  Layout,
  Calendar,
  Paintbrush,
  Hash,
  Megaphone,
  ListOrdered,
  Film,
  Clock,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import {
  parseDurationSeconds,
  formatTimestamp,
  computeTimestampRanges,
} from '@/components/chat/storyboard-view'
import type { StructureData } from '@/components/task-detail/types'
import type {
  LayoutSection,
  ContentCalendarOutline,
  DesignSpec,
  StoryboardScene,
} from '@/lib/ai/briefing-state-machine'

interface StructureViewProps {
  structure: StructureData
  className?: string
}

export function StructureView({ structure, className }: StructureViewProps) {
  switch (structure.type) {
    case 'storyboard':
      return <CompactStoryboardGrid scenes={structure.scenes} className={className} />

    case 'layout':
      return <LayoutView sections={structure.sections} className={className} />

    case 'calendar':
      return <CalendarView outline={structure.outline} className={className} />

    case 'single_design':
      return <SingleDesignView specification={structure.specification} className={className} />

    default:
      return null
  }
}

// =============================================================================
// COMPACT STORYBOARD GRID — 3-column grid for task detail view
// =============================================================================

function CompactStoryboardGrid({
  scenes,
  className,
}: {
  scenes: StoryboardScene[]
  className?: string
}) {
  if (scenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Film className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Storyboard will appear here</p>
      </div>
    )
  }

  const totalDuration = scenes.reduce((acc, scene) => acc + parseDurationSeconds(scene.duration), 0)
  const timestampRanges = computeTimestampRanges(scenes)

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-crafted-green" />
          <span className="text-sm font-semibold text-foreground">Storyboard</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {scenes.length} {scenes.length === 1 ? 'scene' : 'scenes'}
          </span>
          {totalDuration > 0 && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatTimestamp(totalDuration)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-3 gap-2.5">
        {scenes.map((scene, index) => (
          <CompactSceneCard
            key={scene.sceneNumber}
            scene={scene}
            index={index}
            isFirst={index === 0}
            timestamp={timestampRanges[index]}
          />
        ))}
      </div>
    </div>
  )
}

function CompactSceneCard({
  scene,
  index,
  isFirst,
  timestamp,
}: {
  scene: StoryboardScene
  index: number
  isFirst: boolean
  timestamp: { start: string; end: string }
}) {
  return (
    <div
      className={cn(
        'rounded-lg border overflow-hidden',
        isFirst ? 'border-ds-role-hook/30' : 'border-border/40'
      )}
    >
      {/* Thumbnail */}
      {scene.resolvedImageUrl ? (
        <div className="aspect-video w-full overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={scene.resolvedImageUrl}
            alt={scene.title}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-video w-full bg-muted/50" />
      )}

      {/* Info */}
      <div className="p-2 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-muted-foreground">
            Scene {scene.sceneNumber}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-mono text-muted-foreground/60">{timestamp.start}</span>
            {isFirst && (
              <Badge
                variant="outline"
                className="text-[8px] h-3.5 px-1 border-ds-role-hook/40 bg-ds-role-hook/10 text-ds-role-hook uppercase tracking-wide"
              >
                Hook
              </Badge>
            )}
          </div>
        </div>

        <h4 className="text-xs font-medium text-foreground leading-snug line-clamp-1">
          {scene.title}
        </h4>

        <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
          {scene.description}
        </p>

        {scene.visualNote && (
          <div className="flex items-start gap-1 text-muted-foreground/70">
            <Eye className="h-2.5 w-2.5 mt-0.5 shrink-0" />
            <span className="text-[9px] italic leading-relaxed line-clamp-1">
              {scene.visualNote}
            </span>
          </div>
        )}

        <div className="text-[9px] text-muted-foreground pt-0.5">{scene.duration}</div>
      </div>
    </div>
  )
}

// =============================================================================
// LAYOUT VIEW
// =============================================================================

function LayoutView({ sections, className }: { sections: LayoutSection[]; className?: string }) {
  const sorted = [...sections].sort((a, b) => a.order - b.order)

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <Layout className="h-5 w-5 text-muted-foreground" />
        <span className="font-semibold">Layout Structure</span>
      </div>
      <ol className="space-y-3">
        {sorted.map((section, index) => (
          <li
            key={section.sectionName}
            className="rounded-lg border border-border/60 p-3 space-y-1"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {index + 1}
              </span>
              <span className="font-medium text-sm">{section.sectionName}</span>
            </div>
            <p className="text-sm text-muted-foreground pl-8">{section.purpose}</p>
            <p className="text-sm text-foreground/80 pl-8">{section.contentGuidance}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

// =============================================================================
// CALENDAR VIEW
// =============================================================================

function CalendarView({
  outline,
  className,
}: {
  outline: ContentCalendarOutline
  className?: string
}) {
  const defaultOpenWeeks = outline.weeks.map((w) => `week-${w.weekNumber}`)

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <span className="font-semibold">Content Calendar</span>
      </div>

      {/* Header metadata */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <ListOrdered className="h-3.5 w-3.5" />
          <span>{outline.postingCadence}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Megaphone className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex flex-wrap gap-1">
            {outline.platforms.map((platform) => (
              <Badge key={platform} variant="secondary" className="text-xs">
                {platform}
              </Badge>
            ))}
          </div>
        </div>
        {outline.contentPillars.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="flex flex-wrap gap-1">
              {outline.contentPillars.map((pillar) => (
                <Badge key={pillar.name} variant="outline" className="text-xs">
                  {pillar.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Week groups */}
      <Accordion type="multiple" defaultValue={defaultOpenWeeks}>
        {outline.weeks.map((week) => (
          <AccordionItem key={week.weekNumber} value={`week-${week.weekNumber}`}>
            <AccordionTrigger className="text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">Week {week.weekNumber}</span>
                <span className="text-xs text-muted-foreground">{week.theme}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-2">
              {week.narrativeArc && (
                <p className="text-xs text-muted-foreground italic mb-2">{week.narrativeArc}</p>
              )}
              {week.posts.map((post, postIndex) => (
                <div key={postIndex} className="rounded-md border border-border/40 p-2.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {post.dayOfWeek}
                    </Badge>
                    <span className="text-sm font-medium">{post.topic}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Format: {post.format}</span>
                    <span className="text-border">|</span>
                    <span>CTA: {post.cta}</span>
                  </div>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}

// =============================================================================
// SINGLE DESIGN VIEW
// =============================================================================

function SingleDesignView({
  specification,
  className,
}: {
  specification: DesignSpec
  className?: string
}) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <Paintbrush className="h-5 w-5 text-muted-foreground" />
        <span className="font-semibold">Design Specification</span>
      </div>

      <div className="space-y-3">
        {/* Format */}
        <div className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Format
          </span>
          <p className="text-sm font-medium">{specification.format}</p>
        </div>

        {/* Dimensions */}
        {specification.dimensions.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Dimensions
            </span>
            <div className="flex flex-wrap gap-1.5">
              {specification.dimensions.map((dim) => (
                <Badge key={dim.label} variant="secondary" className="text-xs">
                  {dim.label} ({dim.width}x{dim.height})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Key Elements */}
        {specification.keyElements.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Key Elements
            </span>
            <div className="flex flex-wrap gap-1.5">
              {specification.keyElements.map((element) => (
                <Badge key={element} variant="outline" className="text-xs">
                  {element}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Copy Guidance */}
        {specification.copyGuidance && (
          <div className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Copy Guidance
            </span>
            <p className="text-sm text-foreground/80">{specification.copyGuidance}</p>
          </div>
        )}
      </div>
    </div>
  )
}
