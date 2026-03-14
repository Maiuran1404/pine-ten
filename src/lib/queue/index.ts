// Queue infrastructure — BullMQ + Upstash Redis
export { QUEUE_NAMES } from './types'
export type {
  QueueName,
  QueueMetrics,
  QueueJobDataMap,
  ContentGenerationJobData,
  ImageGenerationJobData,
  TemplateRenderingJobData,
  SocialPublishingJobData,
  VideoRenderingJobData,
  CompetitorScrapingJobData,
} from './types'

export { getRedisConnection, createWorkerConnection } from './connection'
export { getTenantQueue, getGlobalQueue } from './queues'
export { craftedBackoff, DEFAULT_JOB_OPTIONS } from './retry-strategy'

export {
  enqueueContentGeneration,
  enqueueImageGeneration,
  enqueueTemplateRendering,
  enqueueSocialPublishing,
  enqueueVideoRendering,
  enqueueCompetitorScraping,
} from './producers'

export {
  createContentGenerationWorker,
  createImageGenerationWorker,
  createTemplateRenderingWorker,
  createSocialPublishingWorker,
  createVideoRenderingWorker,
  createCompetitorScrapingWorker,
  startAllWorkers,
} from './workers'

export {
  getQueueMetrics,
  getAllQueueMetrics,
  getFailedJobs,
  retryFailedJob,
  removeFailedJob,
} from './monitoring'
export type { FailedJobInfo } from './monitoring'
