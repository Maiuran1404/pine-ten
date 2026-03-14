/**
 * Adapter: LayoutSection[] <-> SkeletonSection[]
 *
 * Converts between the chat briefing flow's LayoutSection type and the
 * website-flow skeleton renderer's SkeletonSection type.
 * Also maps briefing stage to fidelity level.
 */

import type { LayoutSection, BriefingStage } from '@/lib/ai/briefing-state-machine'

// SkeletonSection matches the shape expected by SkeletonRenderer
export interface SkeletonSection {
  id: string
  type: string
  title: string
  description: string
  order: number
  fidelity: 'low' | 'mid' | 'high'
  content?: Record<string, unknown>
}

// Section type detection (extracted from layout-preview.tsx for reuse)
export type SectionType =
  | 'hero'
  | 'features'
  | 'testimonials'
  | 'cta'
  | 'footer'
  | 'pricing'
  | 'faq'
  | 'gallery'
  | 'navigation'
  | 'about'
  | 'stats'
  | 'team'
  | 'contact'
  | 'fallback'

export function detectSectionType(sectionName: string): SectionType {
  const name = sectionName.toLowerCase()

  if (/nav(igation)?|menu/.test(name)) return 'navigation'
  if (/hero|header|banner/.test(name)) return 'hero'
  if (/features?|benefits?|capabilities|why\s*choose/.test(name)) return 'features'
  if (/about|problem|solution|pain[\s-]*point|challenge|overview|intro(duction)?/.test(name))
    return 'about'
  if (/social\s*proof|testimonials?|reviews?|clients?|logos?/.test(name)) return 'testimonials'
  if (/stats?|metrics?|numbers?|results?|impact/.test(name)) return 'stats'
  if (/gallery|portfolio|showcase|work/.test(name)) return 'gallery'
  if (/pricing|plans?/.test(name)) return 'pricing'
  if (/team|people/.test(name)) return 'team'
  if (/faq|questions?/.test(name)) return 'faq'
  if (/cta|call[\s-]*to[\s-]*action|sign[\s-]*up|get[\s-]*started|final/.test(name)) return 'cta'
  if (/contact|reach/.test(name)) return 'contact'
  if (/footer/.test(name)) return 'footer'

  return 'fallback'
}

/**
 * Map briefing stage to skeleton fidelity level.
 * Earlier stages show wireframes, later stages show styled content.
 *
 * For websites with a confirmed style, INSPIRATION returns 'mid' (styled wireframe).
 * ELABORATE returns 'high' for websites (content + style in section studio).
 */
export function getFidelityForStage(
  stage: BriefingStage,
  options?: { websiteStyleConfirmed?: boolean; deliverableCategory?: string | null }
): 'low' | 'mid' | 'high' {
  const isWebsite = options?.deliverableCategory === 'website'

  switch (stage) {
    case 'EXTRACT':
    case 'TASK_TYPE':
    case 'INTENT':
    case 'STRUCTURE':
      return 'low'
    case 'INSPIRATION':
      // Website with confirmed style: show styled wireframe (mid fidelity)
      if (isWebsite && options?.websiteStyleConfirmed) return 'mid'
      return 'low'
    case 'ELABORATE':
      // Website section studio: full fidelity with content + style
      if (isWebsite) return 'high'
      return 'mid'
    case 'STRATEGIC_REVIEW':
    case 'MOODBOARD':
    case 'REVIEW':
    case 'DEEPEN':
    case 'SUBMIT':
      return 'high'
    default:
      return 'low'
  }
}

/**
 * Convert LayoutSection[] to SkeletonSection[] for the SkeletonRenderer.
 * Optionally override fidelity for all sections.
 */
export function toSkeletonSections(
  sections: LayoutSection[],
  fidelityOverride?: 'low' | 'mid' | 'high'
): SkeletonSection[] {
  return sections.map((section, index) => {
    const sectionType = detectSectionType(section.sectionName)

    return {
      id: `layout-${index}-${section.sectionName.toLowerCase().replace(/\s+/g, '-')}`,
      type: sectionType === 'fallback' ? section.sectionName.toLowerCase() : sectionType,
      title: section.sectionName,
      description: section.purpose || section.contentGuidance || '',
      order: section.order ?? index,
      fidelity: fidelityOverride ?? section.fidelity ?? 'low',
      content: buildContent(section),
    }
  })
}

/**
 * Convert SkeletonSection[] back to LayoutSection[] for editing operations.
 */
export function toLayoutSections(sections: SkeletonSection[]): LayoutSection[] {
  return sections.map((section) => ({
    sectionName: section.title,
    purpose: section.description,
    contentGuidance: '',
    order: section.order,
    fidelity: section.fidelity,
  }))
}

/** Build content record from elaboration fields, with fallbacks from section metadata */
function buildContent(section: LayoutSection): Record<string, unknown> {
  const content: Record<string, unknown> = {}

  // Use elaboration fields when available, fall back to section metadata
  content.headline = section.headline || section.sectionName
  content.subheadline = section.subheadline || section.purpose || ''
  content.draftContent = section.draftContent || section.contentGuidance || ''

  if (section.ctaText) content.ctaText = section.ctaText
  if (section.referenceDescription) content.referenceDescription = section.referenceDescription

  return content
}
