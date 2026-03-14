import 'server-only'
import { Queue } from 'bullmq'
import { getRedisConnection } from './connection'
import { craftedBackoff, DEFAULT_JOB_OPTIONS } from './retry-strategy'
import type { QueueName, QueueJobDataMap } from './types'

/** Global Redis key prefix — isolates Crafted keys in shared Redis */
const GLOBAL_PREFIX = 'crafted'

/** Cache for tenant-scoped queue instances (avoids creating duplicate Queue objects) */
const tenantQueueCache = new Map<string, Queue>()

/** Cache for global (non-tenant) queue instances */
const globalQueueCache = new Map<string, Queue>()

/**
 * Register the custom "crafted" backoff strategy on a Queue instance.
 */
function registerBackoff(queue: Queue): void {
  // BullMQ uses a settings object on the queue to register custom backoff
  // The backoff function is called by the worker, but we need it registered
  // on the Queue for job options validation
  Object.defineProperty(queue, 'backoffStrategies', {
    value: { crafted: craftedBackoff },
    writable: false,
  })
}

/**
 * Get a tenant-scoped queue instance.
 * Queue name becomes `{companyId}:{queueName}` for per-tenant isolation.
 * Returns null if Redis is not configured.
 */
export function getTenantQueue<N extends QueueName>(
  name: N,
  companyId: string
): Queue<QueueJobDataMap[N]> | null {
  const connection = getRedisConnection()
  if (!connection) return null

  const cacheKey = `${companyId}:${name}`

  let queue = tenantQueueCache.get(cacheKey) as Queue<QueueJobDataMap[N]> | undefined
  if (!queue) {
    queue = new Queue<QueueJobDataMap[N]>(cacheKey, {
      connection,
      prefix: GLOBAL_PREFIX,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    })
    registerBackoff(queue)
    tenantQueueCache.set(cacheKey, queue as Queue)
  }

  return queue
}

/**
 * Get a global (non-tenant) queue instance.
 * Used for admin monitoring across all tenants.
 * Returns null if Redis is not configured.
 */
export function getGlobalQueue(name: QueueName): Queue | null {
  const connection = getRedisConnection()
  if (!connection) return null

  let queue = globalQueueCache.get(name)
  if (!queue) {
    queue = new Queue(name, {
      connection,
      prefix: GLOBAL_PREFIX,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    })
    registerBackoff(queue)
    globalQueueCache.set(name, queue)
  }

  return queue
}
