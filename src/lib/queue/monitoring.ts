import 'server-only'
import { Queue } from 'bullmq'
import { getRedisConnection } from './connection'
import { QUEUE_NAMES } from './types'
import type { QueueName, QueueMetrics } from './types'

/** Global Redis key prefix — must match queues.ts */
const GLOBAL_PREFIX = 'crafted'

/**
 * Get a Queue instance for monitoring purposes.
 * Creates a fresh queue object pointing to the given name.
 */
function getMonitoringQueue(name: QueueName): Queue | null {
  const connection = getRedisConnection()
  if (!connection) return null

  return new Queue(name, {
    connection,
    prefix: GLOBAL_PREFIX,
  })
}

/**
 * Get metrics for a single queue.
 */
export async function getQueueMetrics(name: QueueName): Promise<QueueMetrics | null> {
  const queue = getMonitoringQueue(name)
  if (!queue) return null

  try {
    const [waiting, active, completed, failed, delayed, isPaused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.isPaused(),
    ])

    return { name, waiting, active, completed, failed, delayed, isPaused }
  } finally {
    await queue.close()
  }
}

/**
 * Get metrics for all 6 queues.
 */
export async function getAllQueueMetrics(): Promise<QueueMetrics[]> {
  const results = await Promise.all(QUEUE_NAMES.map((name) => getQueueMetrics(name)))

  return results.filter((m): m is QueueMetrics => m !== null)
}

/** Shape of a failed job for DLQ inspection */
export interface FailedJobInfo {
  id: string
  name: string
  data: Record<string, unknown>
  failedReason: string
  attemptsMade: number
  timestamp: number
  processedOn: number | null
  finishedOn: number | null
}

/**
 * Get failed jobs (dead letter queue) for a specific queue.
 */
export async function getFailedJobs(
  name: QueueName,
  start = 0,
  end = 50
): Promise<FailedJobInfo[]> {
  const queue = getMonitoringQueue(name)
  if (!queue) return []

  try {
    const jobs = await queue.getFailed(start, end)

    return jobs.map((job) => ({
      id: job.id ?? '',
      name: job.name,
      data: job.data as Record<string, unknown>,
      failedReason: job.failedReason ?? 'Unknown',
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn ?? null,
      finishedOn: job.finishedOn ?? null,
    }))
  } finally {
    await queue.close()
  }
}

/**
 * Retry a specific failed job.
 */
export async function retryFailedJob(name: QueueName, jobId: string): Promise<boolean> {
  const queue = getMonitoringQueue(name)
  if (!queue) return false

  try {
    const job = await queue.getJob(jobId)
    if (!job) return false

    await job.retry()
    return true
  } finally {
    await queue.close()
  }
}

/**
 * Remove a specific failed job from the DLQ.
 */
export async function removeFailedJob(name: QueueName, jobId: string): Promise<boolean> {
  const queue = getMonitoringQueue(name)
  if (!queue) return false

  try {
    const job = await queue.getJob(jobId)
    if (!job) return false

    await job.remove()
    return true
  } finally {
    await queue.close()
  }
}
