import 'server-only'
import IORedis from 'ioredis'
import { logger } from '@/lib/logger'

let connectionInstance: IORedis | null = null

/**
 * Get a shared ioredis connection for BullMQ queues (producers).
 * Returns null when UPSTASH_REDIS_URL is not configured (graceful degradation).
 * Uses lazy singleton — connection is created once and reused.
 */
export function getRedisConnection(): IORedis | null {
  const url = process.env.UPSTASH_REDIS_URL
  if (!url) {
    logger.debug('UPSTASH_REDIS_URL not set — queue system disabled')
    return null
  }

  if (!connectionInstance) {
    connectionInstance = new IORedis(url, {
      maxRetriesPerRequest: null, // Required by BullMQ
      lazyConnect: true, // Don't connect until first command — good for serverless cold starts
      enableReadyCheck: false,
      tls: url.startsWith('rediss://') ? {} : undefined,
    })

    connectionInstance.on('error', (err) => {
      logger.error({ err }, 'Redis connection error')
    })

    connectionInstance.on('connect', () => {
      logger.info('Redis connection established')
    })
  }

  return connectionInstance
}

/**
 * Create a new ioredis connection for BullMQ workers.
 * Workers need their own connection (BullMQ requirement — workers block on BRPOPLPUSH).
 * Returns null when UPSTASH_REDIS_URL is not configured.
 */
export function createWorkerConnection(): IORedis | null {
  const url = process.env.UPSTASH_REDIS_URL
  if (!url) {
    return null
  }

  const conn = new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: url.startsWith('rediss://') ? {} : undefined,
  })

  conn.on('error', (err) => {
    logger.error({ err }, 'Redis worker connection error')
  })

  return conn
}
