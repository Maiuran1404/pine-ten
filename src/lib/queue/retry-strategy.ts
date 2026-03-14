import type { DefaultJobOptions } from 'bullmq'

/**
 * Custom backoff delays (in ms):
 *   attempt 1 → 5 minutes
 *   attempt 2 → 30 minutes
 *   attempt 3 → 120 minutes
 */
const BACKOFF_DELAYS_MS = [
  5 * 60 * 1000, //   5 min
  30 * 60 * 1000, //  30 min
  120 * 60 * 1000, // 120 min
]

/**
 * Calculate backoff delay for a given attempt number.
 * Used as BullMQ custom backoff strategy.
 */
export function craftedBackoff(attemptsMade: number): number {
  const index = Math.min(attemptsMade - 1, BACKOFF_DELAYS_MS.length - 1)
  return BACKOFF_DELAYS_MS[index]
}

/**
 * Default job options applied to every queue.
 * - 3 retry attempts with custom backoff
 * - Completed jobs kept 24h or max 1000
 * - Failed jobs kept indefinitely for DLQ inspection
 */
export const DEFAULT_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'crafted',
  },
  removeOnComplete: {
    age: 24 * 60 * 60, // 24 hours in seconds
    count: 1000,
  },
  removeOnFail: false, // Keep failed jobs for DLQ inspection
}
