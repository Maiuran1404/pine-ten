import 'server-only'
import { logger } from '@/lib/logger'
import { getTenantQueue } from './queues'
import type {
  ContentGenerationJobData,
  ImageGenerationJobData,
  TemplateRenderingJobData,
  SocialPublishingJobData,
  VideoRenderingJobData,
  CompetitorScrapingJobData,
} from './types'

/**
 * Enqueue a content generation job.
 * Returns the job ID, or null if Redis is not configured.
 */
export async function enqueueContentGeneration(
  data: ContentGenerationJobData
): Promise<string | null> {
  const queue = getTenantQueue('content-generation', data.companyId)
  if (!queue) return null

  try {
    const job = await queue.add('generate', data)
    logger.info(
      { jobId: job.id, companyId: data.companyId, taskId: data.taskId },
      'Enqueued content generation job'
    )
    return job.id ?? null
  } catch (err) {
    logger.error({ err, companyId: data.companyId }, 'Failed to enqueue content generation job')
    return null
  }
}

/**
 * Enqueue an image generation job.
 */
export async function enqueueImageGeneration(data: ImageGenerationJobData): Promise<string | null> {
  const queue = getTenantQueue('image-generation', data.companyId)
  if (!queue) return null

  try {
    const job = await queue.add('generate', data)
    logger.info(
      { jobId: job.id, companyId: data.companyId, taskId: data.taskId },
      'Enqueued image generation job'
    )
    return job.id ?? null
  } catch (err) {
    logger.error({ err, companyId: data.companyId }, 'Failed to enqueue image generation job')
    return null
  }
}

/**
 * Enqueue a template rendering job.
 */
export async function enqueueTemplateRendering(
  data: TemplateRenderingJobData
): Promise<string | null> {
  const queue = getTenantQueue('template-rendering', data.companyId)
  if (!queue) return null

  try {
    const job = await queue.add('render', data)
    logger.info(
      { jobId: job.id, companyId: data.companyId, taskId: data.taskId },
      'Enqueued template rendering job'
    )
    return job.id ?? null
  } catch (err) {
    logger.error({ err, companyId: data.companyId }, 'Failed to enqueue template rendering job')
    return null
  }
}

/**
 * Enqueue a social publishing job.
 */
export async function enqueueSocialPublishing(
  data: SocialPublishingJobData
): Promise<string | null> {
  const queue = getTenantQueue('social-publishing', data.companyId)
  if (!queue) return null

  try {
    const job = await queue.add('publish', data)
    logger.info(
      { jobId: job.id, companyId: data.companyId, taskId: data.taskId },
      'Enqueued social publishing job'
    )
    return job.id ?? null
  } catch (err) {
    logger.error({ err, companyId: data.companyId }, 'Failed to enqueue social publishing job')
    return null
  }
}

/**
 * Enqueue a video rendering job.
 */
export async function enqueueVideoRendering(data: VideoRenderingJobData): Promise<string | null> {
  const queue = getTenantQueue('video-rendering', data.companyId)
  if (!queue) return null

  try {
    const job = await queue.add('render', data)
    logger.info(
      { jobId: job.id, companyId: data.companyId, taskId: data.taskId },
      'Enqueued video rendering job'
    )
    return job.id ?? null
  } catch (err) {
    logger.error({ err, companyId: data.companyId }, 'Failed to enqueue video rendering job')
    return null
  }
}

/**
 * Enqueue a competitor scraping job.
 */
export async function enqueueCompetitorScraping(
  data: CompetitorScrapingJobData
): Promise<string | null> {
  const queue = getTenantQueue('competitor-scraping', data.companyId)
  if (!queue) return null

  try {
    const job = await queue.add('scrape', data)
    logger.info(
      { jobId: job.id, companyId: data.companyId, targetUrl: data.targetUrl },
      'Enqueued competitor scraping job'
    )
    return job.id ?? null
  } catch (err) {
    logger.error({ err, companyId: data.companyId }, 'Failed to enqueue competitor scraping job')
    return null
  }
}
