'use client'

import type { TaskDetailData, MoodboardItem } from '@/components/task-detail/types'
import { InspirationGallery } from '../visual/inspiration-gallery'
import { ColorPaletteRow } from '../visual/color-palette-row'
import { BrandDNACard } from '../visual/brand-dna-card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Ban } from 'lucide-react'

interface VisualDirectionTabProps {
  task: TaskDetailData
}

export function VisualDirectionTab({ task }: VisualDirectionTabProps) {
  const visualDirection = task.briefData?.visualDirection
  const hasSelectedStyles = (visualDirection?.selectedStyles?.length ?? 0) > 0
  const hasMoodboardItems = task.moodboardItems.length > 0
  const hasColors = (visualDirection?.colorPalette?.length ?? 0) > 0
  const hasMoodKeywords = (visualDirection?.moodKeywords?.length ?? 0) > 0
  const hasAvoidElements = (visualDirection?.avoidElements?.length ?? 0) > 0
  const hasStyleReferences = task.styleReferences.length > 0
  const hasBrandDNA = !!task.brandDNA

  const hasVisualData =
    hasSelectedStyles ||
    hasMoodboardItems ||
    hasColors ||
    hasMoodKeywords ||
    hasAvoidElements ||
    hasStyleReferences ||
    hasBrandDNA

  if (!hasVisualData) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground text-sm">
          Visual direction data is not available for this task.
        </p>
      </div>
    )
  }

  const styleMoodboardItems: MoodboardItem[] = (visualDirection?.selectedStyles ?? []).map(
    (style) => ({
      id: style.id,
      type: 'style' as const,
      imageUrl: style.imageUrl,
      name: style.name,
      metadata: {
        styleAxis: style.styleAxis,
        deliverableType: style.deliverableType,
        styleId: style.id,
      },
    })
  )

  const allMoodboardItems = [...styleMoodboardItems, ...task.moodboardItems]
  const colors = visualDirection?.colorPalette ?? []

  return (
    <div className="space-y-6">
      {(allMoodboardItems.length > 0 || hasStyleReferences) && (
        <InspirationGallery items={allMoodboardItems} styleReferences={task.styleReferences} />
      )}

      {hasColors && <ColorPaletteRow colors={colors} />}

      {hasMoodKeywords && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="text-muted-foreground h-4 w-4" />
            <h3 className="text-sm font-medium">Mood Keywords</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {visualDirection!.moodKeywords.map((keyword) => (
              <Badge key={keyword} variant="secondary">
                {keyword}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {hasAvoidElements && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Ban className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-medium">Avoid</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {visualDirection!.avoidElements.map((element) => (
              <Badge
                key={element}
                variant="outline"
                className="border-red-200 bg-red-50 text-red-700"
              >
                {element}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {hasBrandDNA && <BrandDNACard brandDNA={task.brandDNA!} />}
    </div>
  )
}
