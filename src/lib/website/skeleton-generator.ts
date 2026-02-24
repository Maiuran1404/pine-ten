import 'server-only'

import { getDefaultSections, getSectionTemplate } from './section-templates'

interface SkeletonSection {
  id: string
  type: string
  title: string
  description: string
  order: number
  fidelity: 'low' | 'mid' | 'high'
  content?: Record<string, unknown>
  aiRecommendation?: string
}

interface SkeletonGlobalStyles {
  primaryColor?: string
  secondaryColor?: string
  fontPrimary?: string
  fontSecondary?: string
  layoutDensity?: 'compact' | 'balanced' | 'spacious'
}

interface Skeleton {
  sections: SkeletonSection[]
  globalStyles?: SkeletonGlobalStyles
}

interface TemplateHints {
  primaryColor?: string
  fontPrimary?: string
}

/**
 * Generate a website skeleton from an industry template without AI.
 * Maps the industry to default sections via getDefaultSections() and
 * hydrates each section type with its template metadata.
 */
export function generateSkeletonFromTemplate(industry: string, hints?: TemplateHints): Skeleton {
  const sectionTypes = getDefaultSections(industry)

  const sections: SkeletonSection[] = sectionTypes.map((type, index) => {
    const template = getSectionTemplate(type)

    return {
      id: `section-${crypto.randomUUID()}`,
      type,
      title: template?.label ?? type.charAt(0).toUpperCase() + type.slice(1),
      description: template?.description ?? `${type} section`,
      order: index,
      fidelity: 'low' as const,
    }
  })

  const globalStyles: SkeletonGlobalStyles = {
    layoutDensity: 'balanced',
    ...(hints?.primaryColor ? { primaryColor: hints.primaryColor } : {}),
    ...(hints?.fontPrimary ? { fontPrimary: hints.fontPrimary } : {}),
  }

  return {
    sections,
    globalStyles,
  }
}
