import 'server-only'
import { logger } from '@/lib/logger'
import type {
  WebsiteBuilderConnection,
  SkeletonData,
  GlobalStylesData,
  PushResult,
  DeployResult,
} from './website-builder.interface'

/**
 * Framer-specific website builder implementation.
 * Uses fetch-based REST API calls against the Framer Server API (beta).
 * Creates per-request connections — no persistent WebSocket needed.
 */
export class FramerBuilder implements WebsiteBuilderConnection {
  readonly type = 'framer'
  private apiKey: string
  private projectUrl: string

  constructor(apiKey: string, projectUrl: string) {
    this.apiKey = apiKey
    this.projectUrl = projectUrl
  }

  async pushSkeleton(skeleton: SkeletonData): Promise<PushResult> {
    try {
      const framerPages = skeleton.sections.map((section) => ({
        name: section.title,
        type: this.mapSectionToFramerType(section.type),
        properties: {
          content: section.description,
          ...section.content,
        },
        order: section.order,
      }))

      const response = await this.apiRequest('/pages', 'POST', { pages: framerPages })

      return {
        success: true,
        projectUrl: this.projectUrl,
        previewUrl: response.previewUrl as string | undefined,
      }
    } catch (error) {
      logger.error({ err: error }, 'Failed to push skeleton to Framer')
      return {
        success: false,
        projectUrl: this.projectUrl,
        error: error instanceof Error ? error.message : 'Unknown error pushing skeleton',
      }
    }
  }

  async applyStyles(styles: GlobalStylesData): Promise<void> {
    await this.apiRequest('/styles', 'PUT', {
      colors: {
        primary: styles.primaryColor,
        secondary: styles.secondaryColor,
      },
      typography: {
        heading: styles.fontPrimary,
        body: styles.fontSecondary,
      },
      spacing: styles.layoutDensity,
    })
  }

  async publishPreview(): Promise<{ previewUrl: string }> {
    const response = await this.apiRequest('/publish/preview', 'POST', {})
    return { previewUrl: response.url as string }
  }

  async deployToProduction(): Promise<DeployResult> {
    try {
      const response = await this.apiRequest('/publish/production', 'POST', {})
      return {
        success: true,
        deployedUrl: response.url as string,
      }
    } catch (error) {
      logger.error({ err: error }, 'Failed to deploy Framer project to production')
      return {
        success: false,
        deployedUrl: '',
        error: error instanceof Error ? error.message : 'Deploy failed',
      }
    }
  }

  async disconnect(): Promise<void> {
    // No persistent connection to clean up with REST API
  }

  private mapSectionToFramerType(sectionType: string): string {
    const mapping: Record<string, string> = {
      navigation: 'Navbar',
      hero: 'Hero',
      features: 'Features',
      about: 'About',
      testimonials: 'Testimonials',
      stats: 'Stats',
      gallery: 'Gallery',
      pricing: 'Pricing',
      team: 'Team',
      faq: 'FAQ',
      cta: 'CTA',
      contact: 'Contact',
      footer: 'Footer',
    }
    return mapping[sectionType] || 'Section'
  }

  private async apiRequest(
    path: string,
    method: string,
    body: unknown
  ): Promise<Record<string, unknown>> {
    const url = `${this.projectUrl}/api${path}`

    logger.debug({ url, method }, 'Framer API request')

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Framer API error (${response.status}): ${errorText}`)
    }

    return (await response.json()) as Record<string, unknown>
  }
}
