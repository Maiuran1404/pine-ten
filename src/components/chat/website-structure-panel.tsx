/**
 * Bridge component for website projects in the structure panel.
 *
 * - BEFORE structure data exists: Shows InspirationPanel (gallery + URL input)
 * - AFTER structure data exists: Shows SkeletonRenderer with multi-fidelity
 *   rendering that evolves as the chat progresses.
 *
 * Reuses components from website-flow without modification.
 */
'use client'

import { useMemo } from 'react'
import { SkeletonRenderer } from '@/components/website-flow/skeleton/skeleton-renderer'
import { InspirationPanel } from './inspiration-panel'
import { toSkeletonSections, getFidelityForStage } from '@/lib/adapters/layout-skeleton-adapter'
import type {
  LayoutSection,
  BriefingStage,
  WebsiteGlobalStyles,
} from '@/lib/ai/briefing-state-machine'
import type { WebsiteInspiration } from '@/lib/ai/briefing-state-machine'

interface WebsiteStructurePanelProps {
  // Layout sections (null if not yet generated)
  sections: LayoutSection[] | null
  briefingStage?: BriefingStage | null
  globalStyles?: WebsiteGlobalStyles | null

  // Section editing
  onSectionReorder?: (sections: LayoutSection[]) => void
  onSectionEdit?: (sectionIndex: number, field: string, value: string) => void

  // Inspiration props (for pre-structure state)
  websiteInspirations: WebsiteInspiration[]
  websiteInspirationIds: string[]
  inspirationGallery: Array<{
    id: string
    name: string
    url: string
    screenshotUrl: string
    industry: string[]
    styleTags: string[]
  }>
  isGalleryLoading?: boolean
  isCapturingScreenshot?: boolean
  onInspirationSelect: (item: {
    id: string
    name: string
    url: string
    screenshotUrl: string
  }) => void
  onRemoveInspiration: (id: string) => void
  onCaptureScreenshot?: (url: string) => Promise<WebsiteInspiration>

  className?: string
}

export function WebsiteStructurePanel({
  sections,
  briefingStage,
  globalStyles,
  websiteInspirations,
  websiteInspirationIds,
  inspirationGallery,
  isGalleryLoading,
  isCapturingScreenshot,
  onInspirationSelect,
  onRemoveInspiration,
  onCaptureScreenshot,
  className,
}: WebsiteStructurePanelProps) {
  const fidelity = briefingStage ? getFidelityForStage(briefingStage) : 'low'

  // Convert LayoutSection[] to SkeletonSection[] for the renderer
  const skeletonSections = useMemo(() => {
    if (!sections || sections.length === 0) return []
    return toSkeletonSections(sections, fidelity)
  }, [sections, fidelity])

  // Map WebsiteGlobalStyles to the GlobalStyles shape expected by SkeletonRenderer
  const rendererGlobalStyles = useMemo(() => {
    if (!globalStyles) return undefined
    return {
      primaryColor: globalStyles.primaryColor,
      secondaryColor: globalStyles.secondaryColor,
      fontPrimary: globalStyles.fontPrimary,
      fontSecondary: globalStyles.fontSecondary,
      layoutDensity: globalStyles.layoutDensity,
    }
  }, [globalStyles])

  // No structure data yet — show inspiration panel
  if (!sections || sections.length === 0) {
    return (
      <InspirationPanel
        selectedInspirations={websiteInspirations}
        inspirationGallery={inspirationGallery}
        selectedIds={websiteInspirationIds}
        isGalleryLoading={isGalleryLoading}
        isCapturingScreenshot={isCapturingScreenshot}
        onSelectGalleryItem={onInspirationSelect}
        onRemoveInspiration={onRemoveInspiration}
        onCaptureScreenshot={onCaptureScreenshot}
        className={className}
      />
    )
  }

  // Structure exists — show skeleton renderer with fidelity
  return (
    <SkeletonRenderer
      sections={skeletonSections}
      globalStyles={rendererGlobalStyles}
      className={className}
    />
  )
}
