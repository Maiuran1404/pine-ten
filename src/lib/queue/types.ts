/**
 * Queue name constants and job data interfaces for BullMQ queues.
 */

export const QUEUE_NAMES = [
  'content-generation',
  'image-generation',
  'template-rendering',
  'social-publishing',
  'video-rendering',
  'competitor-scraping',
] as const

export type QueueName = (typeof QUEUE_NAMES)[number]

/** Base fields present on every job — per-tenant isolation via companyId */
interface BaseJobData {
  companyId: string
}

/** Content generation job (blog posts, captions, copy) */
export interface ContentGenerationJobData extends BaseJobData {
  taskId: string
  briefId: string
  contentType: string
  prompt: string
}

/** Image generation job (AI-generated visuals) */
export interface ImageGenerationJobData extends BaseJobData {
  taskId: string
  styleReferenceIds?: string[]
  prompt: string
  width?: number
  height?: number
}

/** Template rendering job (design template fill) */
export interface TemplateRenderingJobData extends BaseJobData {
  taskId: string
  templateId: string
  variables: Record<string, string>
}

/** Social media publishing job */
export interface SocialPublishingJobData extends BaseJobData {
  taskId: string
  platform: string
  content: string
  mediaUrls?: string[]
  scheduledAt?: string
}

/** Video rendering job */
export interface VideoRenderingJobData extends BaseJobData {
  taskId: string
  storyboardId: string
  scenes: Array<{ sceneId: string; duration: number }>
  outputFormat?: string
}

/** Competitor scraping job */
export interface CompetitorScrapingJobData extends BaseJobData {
  targetUrl: string
  scrapeType: 'social' | 'website' | 'brand'
}

/** Map queue names to their job data types */
export interface QueueJobDataMap {
  'content-generation': ContentGenerationJobData
  'image-generation': ImageGenerationJobData
  'template-rendering': TemplateRenderingJobData
  'social-publishing': SocialPublishingJobData
  'video-rendering': VideoRenderingJobData
  'competitor-scraping': CompetitorScrapingJobData
}

/** Metrics shape returned by the monitoring layer */
export interface QueueMetrics {
  name: QueueName
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  isPaused: boolean
}
