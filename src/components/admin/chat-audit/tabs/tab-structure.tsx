'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Film, Type, Camera } from 'lucide-react'

interface StoryboardScene {
  sceneNumber: number
  title: string
  description: string
  duration: string
  visualNote?: string
  voiceover?: string
  transition?: string
  cameraNote?: string
  fullScript?: string
  resolvedImageUrl?: string
  resolvedImageSource?: string
  [key: string]: unknown
}

interface LayoutSection {
  sectionType: string
  headline?: string
  subheadline?: string
  cta?: string
  content?: string
  [key: string]: unknown
}

interface CalendarEntry {
  day?: string
  pillar?: string
  topic?: string
  cta?: string
  [key: string]: unknown
}

interface TabStructureProps {
  structureData: Record<string, unknown> | null
}

export function TabStructure({ structureData }: TabStructureProps) {
  if (!structureData) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No structure data available.
      </div>
    )
  }

  const type = structureData.type as string

  if (type === 'storyboard') {
    return <StoryboardView scenes={(structureData.scenes as StoryboardScene[]) || []} />
  }

  if (type === 'layout') {
    return <LayoutView sections={(structureData.sections as LayoutSection[]) || []} />
  }

  if (type === 'calendar') {
    const outline = structureData.outline as Record<string, unknown> | undefined
    const entries = (outline?.entries as CalendarEntry[]) || []
    return <CalendarView entries={entries} />
  }

  if (type === 'single_design') {
    const spec = structureData.specification as Record<string, unknown> | undefined
    return <DesignSpecView spec={spec || {}} />
  }

  return (
    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
      Unknown structure type: {type}
    </div>
  )
}

function StoryboardView({ scenes }: { scenes: StoryboardScene[] }) {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 grid grid-cols-2 gap-3">
        {scenes.map((scene) => (
          <Card key={scene.sceneNumber} className="overflow-hidden">
            {/* Image */}
            {scene.resolvedImageUrl && (
              <div className="aspect-video bg-muted relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={scene.resolvedImageUrl}
                  alt={scene.title}
                  className="w-full h-full object-cover"
                />
                {scene.resolvedImageSource && (
                  <Badge
                    variant="secondary"
                    className="absolute bottom-1 right-1 text-[9px] px-1 py-0"
                  >
                    {scene.resolvedImageSource}
                  </Badge>
                )}
              </div>
            )}
            <CardContent className="p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">Scene {scene.sceneNumber}</span>
                {scene.duration && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {scene.duration}
                  </Badge>
                )}
              </div>
              <p className="text-sm font-medium">{scene.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{scene.description}</p>

              {scene.voiceover && (
                <div className="flex gap-1.5 items-start mt-1">
                  <Type className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground italic line-clamp-2">
                    {scene.voiceover}
                  </p>
                </div>
              )}

              {scene.cameraNote && (
                <div className="flex gap-1.5 items-start">
                  <Camera className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {scene.cameraNote}
                  </p>
                </div>
              )}

              {scene.transition && (
                <div className="flex gap-1.5 items-start">
                  <Film className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground">{scene.transition}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  )
}

function LayoutView({ sections }: { sections: LayoutSection[] }) {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        {sections.map((section, i) => (
          <Card key={i}>
            <CardContent className="p-3 space-y-1.5">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {section.sectionType}
              </Badge>
              {section.headline && <p className="text-sm font-semibold">{section.headline}</p>}
              {section.subheadline && (
                <p className="text-xs text-muted-foreground">{section.subheadline}</p>
              )}
              {section.content && (
                <p className="text-xs text-muted-foreground line-clamp-3">{section.content}</p>
              )}
              {section.cta && (
                <Badge
                  className="text-[10px] px-1.5 py-0 bg-crafted-green/10 text-crafted-green border-crafted-green/30"
                  variant="outline"
                >
                  CTA: {section.cta}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
        {sections.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No layout sections.</p>
        )}
      </div>
    </ScrollArea>
  )
}

function CalendarView({ entries }: { entries: CalendarEntry[] }) {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-2">
        {entries.map((entry, i) => (
          <Card key={i}>
            <CardContent className="p-3 flex items-start gap-3">
              {entry.day && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                  {entry.day}
                </Badge>
              )}
              <div className="flex-1 min-w-0">
                {entry.pillar && <p className="text-xs text-muted-foreground">{entry.pillar}</p>}
                {entry.topic && <p className="text-sm font-medium">{entry.topic}</p>}
                {entry.cta && <p className="text-xs text-crafted-sage mt-1">CTA: {entry.cta}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No calendar entries.</p>
        )}
      </div>
    </ScrollArea>
  )
}

function DesignSpecView({ spec }: { spec: Record<string, unknown> }) {
  const entries = Object.entries(spec).filter(([, v]) => v != null && v !== '')

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            {entries.map(([key, value]) => (
              <div key={key}>
                <p className="text-xs text-muted-foreground capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </p>
                <p className="text-sm">{String(value)}</p>
              </div>
            ))}
            {entries.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                No design specification data.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}
