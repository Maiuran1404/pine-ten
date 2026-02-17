'use client'

import { Layout, Calendar, Paintbrush, Hash, Megaphone, ListOrdered } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { StoryboardPanel } from '@/components/chat/storyboard-view'
import type { StructureData } from '@/components/task-detail/types'
import type {
  LayoutSection,
  ContentCalendarOutline,
  DesignSpec,
} from '@/lib/ai/briefing-state-machine'

interface StructureViewProps {
  structure: StructureData
  className?: string
}

export function StructureView({ structure, className }: StructureViewProps) {
  switch (structure.type) {
    case 'storyboard':
      return <StoryboardPanel scenes={structure.scenes} className={className} />

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
