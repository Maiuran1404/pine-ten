/**
 * Bridge component for website projects in the structure panel.
 *
 * Renders different layouts depending on `websitePhase`:
 * - blueprint: SkeletonRenderer with low fidelity
 * - inspiration: Dual-zone — wireframe (top 60%) + InspirationPanel compact (bottom 40%)
 * - style: SkeletonRenderer + style variants placeholder below
 * - studio: LayoutPreview in interactive mode
 * - review: SkeletonRenderer in high fidelity (read-only)
 * - null/undefined: Legacy behavior (InspirationPanel -> SkeletonRenderer)
 *
 * Includes a fidelity meter at the top showing phase progression.
 */
'use client'

import { useMemo, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { SkeletonRenderer } from '@/components/website-flow/skeleton/skeleton-renderer'
import { InspirationPanel } from './inspiration-panel'
import { LayoutPreview } from './layout-preview'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toSkeletonSections, getFidelityForStage } from '@/lib/adapters/layout-skeleton-adapter'
import type {
  LayoutSection,
  BriefingStage,
  WebsiteGlobalStyles,
  WebsitePhase,
} from '@/lib/ai/briefing-state-machine'
import type { WebsiteInspiration } from '@/lib/ai/briefing-state-machine'

// =============================================================================
// FIDELITY METER
// =============================================================================

const FIDELITY_STAGES = [
  { label: 'Layout', key: 'layout' },
  { label: 'Styled', key: 'styled' },
  { label: 'Content', key: 'content' },
] as const

function getFidelityLevel(phase: WebsitePhase | null | undefined): number {
  switch (phase) {
    case 'blueprint':
      return 0
    case 'inspiration':
      return 1
    case 'style':
      return 2
    case 'studio':
    case 'review':
      return 3
    default:
      return 0
  }
}

function FidelityMeter({ phase }: { phase: WebsitePhase | null | undefined }) {
  const level = getFidelityLevel(phase)

  return (
    <div className="shrink-0 flex items-center gap-3 px-3 py-1.5 border-b border-border/30">
      <div className="flex items-center gap-2">
        {FIDELITY_STAGES.map((stage, i) => {
          const filled = i < level
          return (
            <div key={stage.key} className="flex items-center gap-1">
              <div
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  filled ? 'bg-crafted-green' : 'bg-muted-foreground/20'
                )}
              />
              <span
                className={cn(
                  'text-[9px] font-medium transition-colors',
                  filled ? 'text-foreground' : 'text-muted-foreground/40'
                )}
              >
                {stage.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// =============================================================================
// TYPES
// =============================================================================

interface WebsiteStructurePanelProps {
  // Layout sections (null if not yet generated)
  sections: LayoutSection[] | null
  briefingStage?: BriefingStage | null
  globalStyles?: WebsiteGlobalStyles | null
  websitePhase?: WebsitePhase | null
  websiteStyleConfirmed?: boolean

  // Section editing
  onSectionReorder?: (sections: LayoutSection[]) => void
  onSectionEdit?: (sectionIndex: number, field: string, value: string) => void

  // Style variant props (for style phase)
  styleVariantsContent?: ReactNode

  // Generate section content (for studio phase)
  onGenerateSectionContent?: (sectionIndex: number) => void

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

  className?: string
}

export function WebsiteStructurePanel({
  sections,
  briefingStage,
  globalStyles,
  websitePhase,
  websiteStyleConfirmed,
  onSectionReorder,
  onSectionEdit,
  styleVariantsContent,
  onGenerateSectionContent,
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
  className,
}: WebsiteStructurePanelProps) {
  const fidelity = briefingStage
    ? getFidelityForStage(briefingStage, {
        websiteStyleConfirmed,
        deliverableCategory: 'website',
      })
    : 'low'

  // Convert LayoutSection[] to SkeletonSection[] for the renderer
  const skeletonSections = useMemo(() => {
    if (!sections || sections.length === 0) return []
    return toSkeletonSections(sections, fidelity)
  }, [sections, fidelity])

  // High-fidelity skeleton sections for review mode
  const highFidelitySections = useMemo(() => {
    if (!sections || sections.length === 0) return []
    return toSkeletonSections(sections, 'high')
  }, [sections])

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

  // Shared InspirationPanel element for reuse
  const inspirationPanelElement = (compact?: boolean) => (
    <InspirationPanel
      selectedInspirations={websiteInspirations}
      inspirationGallery={inspirationGallery}
      selectedIds={websiteInspirationIds}
      isGalleryLoading={isGalleryLoading}
      isCapturingScreenshot={isCapturingScreenshot}
      onSelectGalleryItem={onInspirationSelect}
      onRemoveInspiration={onRemoveInspiration}
      onCaptureScreenshot={onCaptureScreenshot}
      onFindSimilar={onFindSimilar}
      similarResults={similarResults}
      isFindingSimilar={isFindingSimilar}
      canFindSimilar={canFindSimilar}
      onUpdateInspirationNotes={onUpdateInspirationNotes}
      compact={compact}
    />
  )

  // --- Phase-based rendering ---

  // When websitePhase is provided, use phase-based layout
  if (websitePhase) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <FidelityMeter phase={websitePhase} />

        {websitePhase === 'blueprint' && (
          <ScrollArea className="flex-1">
            <div className="p-2">
              {skeletonSections.length > 0 ? (
                <SkeletonRenderer sections={skeletonSections} globalStyles={rendererGlobalStyles} />
              ) : (
                // No sections yet during blueprint — show inspiration panel
                inspirationPanelElement()
              )}
            </div>
          </ScrollArea>
        )}

        {websitePhase === 'inspiration' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Top 60%: Wireframe */}
            <div className="flex-[6] min-h-0 overflow-y-auto border-b border-border/30">
              <div className="p-2">
                {skeletonSections.length > 0 ? (
                  <SkeletonRenderer
                    sections={skeletonSections}
                    globalStyles={rendererGlobalStyles}
                  />
                ) : (
                  <div className="flex items-center justify-center h-32 text-xs text-muted-foreground/50">
                    Wireframe will appear here
                  </div>
                )}
              </div>
            </div>
            {/* Bottom 40%: Inspiration panel in compact mode */}
            <div className="flex-[4] min-h-0 overflow-hidden">{inspirationPanelElement(true)}</div>
          </div>
        )}

        {websitePhase === 'style' && (
          <div className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1">
              <div className="p-2">
                {skeletonSections.length > 0 && (
                  <SkeletonRenderer
                    sections={skeletonSections}
                    globalStyles={rendererGlobalStyles}
                  />
                )}
              </div>
              {/* Style variants area */}
              {styleVariantsContent ? (
                <div className="p-2 border-t border-border/30">{styleVariantsContent}</div>
              ) : (
                <div className="p-3 border-t border-border/30">
                  <div className="rounded-lg border border-dashed border-border/40 bg-muted/20 p-4 text-center">
                    <p className="text-[11px] text-muted-foreground/50">
                      Style variants will appear here once inspirations are confirmed
                    </p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {websitePhase === 'studio' && (
          <ScrollArea className="flex-1">
            <div className="p-4">
              <LayoutPreview
                sections={sections ?? []}
                mode="interactive"
                onSectionReorder={onSectionReorder}
                onSectionEdit={onSectionEdit}
                onGenerateSectionContent={onGenerateSectionContent}
              />
            </div>
          </ScrollArea>
        )}

        {websitePhase === 'review' && (
          <ScrollArea className="flex-1">
            <div className="p-2">
              <SkeletonRenderer
                sections={highFidelitySections}
                globalStyles={rendererGlobalStyles}
              />
            </div>
          </ScrollArea>
        )}
      </div>
    )
  }

  // --- Legacy behavior (no websitePhase) ---

  // No structure data yet — show inspiration panel
  if (!sections || sections.length === 0) {
    return inspirationPanelElement()
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
