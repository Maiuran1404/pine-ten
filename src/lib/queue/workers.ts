import 'server-only'
import { Worker } from 'bullmq'
import type IORedis from 'ioredis'
import { logger } from '@/lib/logger'
import { craftedBackoff } from './retry-strategy'
import { QUEUE_NAMES } from './types'
import type {
  ContentGenerationJobData,
  ImageGenerationJobData,
  TemplateRenderingJobData,
  SocialPublishingJobData,
  VideoRenderingJobData,
  CompetitorScrapingJobData,
} from './types'

/** Global Redis key prefix — must match queues.ts */
const GLOBAL_PREFIX = 'crafted'

/**
 * Create a content generation worker.
 * Handler is a placeholder — real implementation will be added when the processing logic is built.
 */
export function createContentGenerationWorker(
  connection: IORedis
): Worker<ContentGenerationJobData> {
  const worker = new Worker<ContentGenerationJobData>(
    'content-generation',
    async (job) => {
      logger.info(
        { jobId: job.id, companyId: job.data.companyId },
        'Processing content generation job'
      )
      // TODO: Implement content generation processing
      throw new Error('Content generation worker not yet implemented')
    },
    {
      connection,
      prefix: GLOBAL_PREFIX,
      settings: {
        backoffStrategy: craftedBackoff,
      },
    }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Content generation job failed')
  })

  return worker
}

/**
 * Create an image generation worker.
 */
export function createImageGenerationWorker(connection: IORedis): Worker<ImageGenerationJobData> {
  const worker = new Worker<ImageGenerationJobData>(
    'image-generation',
    async (job) => {
      logger.info(
        { jobId: job.id, companyId: job.data.companyId },
        'Processing image generation job'
      )
      throw new Error('Image generation worker not yet implemented')
    },
    {
      connection,
      prefix: GLOBAL_PREFIX,
      settings: {
        backoffStrategy: craftedBackoff,
      },
    }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Image generation job failed')
  })

  return worker
}

/**
 * Create a template rendering worker.
 */
export function createTemplateRenderingWorker(
  connection: IORedis
): Worker<TemplateRenderingJobData> {
  const worker = new Worker<TemplateRenderingJobData>(
    'template-rendering',
    async (job) => {
      logger.info(
        { jobId: job.id, companyId: job.data.companyId },
        'Processing template rendering job'
      )
      throw new Error('Template rendering worker not yet implemented')
    },
    {
      connection,
      prefix: GLOBAL_PREFIX,
      settings: {
        backoffStrategy: craftedBackoff,
      },
    }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Template rendering job failed')
  })

  return worker
}

/**
 * Create a social publishing worker.
 */
export function createSocialPublishingWorker(connection: IORedis): Worker<SocialPublishingJobData> {
  const worker = new Worker<SocialPublishingJobData>(
    'social-publishing',
    async (job) => {
      logger.info(
        { jobId: job.id, companyId: job.data.companyId },
        'Processing social publishing job'
      )
      throw new Error('Social publishing worker not yet implemented')
    },
    {
      connection,
      prefix: GLOBAL_PREFIX,
      settings: {
        backoffStrategy: craftedBackoff,
      },
    }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Social publishing job failed')
  })

  return worker
}

/**
 * Create a video rendering worker.
 */
export function createVideoRenderingWorker(connection: IORedis): Worker<VideoRenderingJobData> {
  const worker = new Worker<VideoRenderingJobData>(
    'video-rendering',
    async (job) => {
      logger.info(
        { jobId: job.id, companyId: job.data.companyId },
        'Processing video rendering job'
      )
      throw new Error('Video rendering worker not yet implemented')
    },
    {
      connection,
      prefix: GLOBAL_PREFIX,
      settings: {
        backoffStrategy: craftedBackoff,
      },
    }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Video rendering job failed')
  })

  return worker
}

/**
 * Create a competitor scraping worker.
 */
export function createCompetitorScrapingWorker(
  connection: IORedis
): Worker<CompetitorScrapingJobData> {
  const worker = new Worker<CompetitorScrapingJobData>(
    'competitor-scraping',
    async (job) => {
      logger.info(
        { jobId: job.id, companyId: job.data.companyId },
        'Processing competitor scraping job'
      )
      throw new Error('Competitor scraping worker not yet implemented')
    },
    {
      connection,
      prefix: GLOBAL_PREFIX,
      settings: {
        backoffStrategy: craftedBackoff,
      },
    }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Competitor scraping job failed')
  })

  return worker
}

/**
 * Start all workers. Call this from a separate long-running process (not serverless).
 * Returns array of Worker instances for graceful shutdown.
 */
export function startAllWorkers(connection: IORedis): Worker[] {
  logger.info({ queues: QUEUE_NAMES }, 'Starting all queue workers')

  return [
    createContentGenerationWorker(connection),
    createImageGenerationWorker(connection),
    createTemplateRenderingWorker(connection),
    createSocialPublishingWorker(connection),
    createVideoRenderingWorker(connection),
    createCompetitorScrapingWorker(connection),
  ]
}
