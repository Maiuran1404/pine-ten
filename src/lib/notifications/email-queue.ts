import 'server-only'
import { config } from '@/lib/config'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QueuedEmail {
  to: string
  subject: string
  html: string
  text?: string
  /** Used for per-user rate limiting. Omit for system/admin emails. */
  userId?: string
  /** 'high' bypasses queue entirely (auth-critical emails like password reset) */
  priority?: 'normal' | 'high'
}

interface QueueEntry {
  email: QueuedEmail
  queuedAt: number
}

// ---------------------------------------------------------------------------
// State (module-level singletons — one per Node process)
// ---------------------------------------------------------------------------

const queue: QueueEntry[] = []
let draining = false

/** per-user send counts: Map<userId, { count, windowStart }> */
const userSendCounts = new Map<string, { count: number; windowStart: number }>()

/** global send count */
let globalSendCount = { count: 0, windowStart: Date.now() }

/** dedup: Map<"to|subject", timestamp> */
const recentSends = new Map<string, number>()

// ---------------------------------------------------------------------------
// Injected sender — set by email.ts to avoid circular imports
// ---------------------------------------------------------------------------

type RawSender = (params: {
  to: string
  subject: string
  html: string
  text?: string
}) => Promise<{ success: boolean; error?: unknown }>

type BatchSender = (
  emails: Array<{ to: string; subject: string; html: string; text?: string }>
) => Promise<{ success: boolean; error?: unknown }>

let _sendRaw: RawSender | null = null
let _sendBatch: BatchSender | null = null

export function registerSenders(raw: RawSender, batch: BatchSender) {
  _sendRaw = raw
  _sendBatch = batch
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Queue a single email for throttled delivery.
 * Returns immediately — the email is sent asynchronously.
 */
export function queueEmail(params: QueuedEmail): void {
  // High-priority emails bypass the queue entirely
  if (params.priority === 'high') {
    void sendImmediate(params)
    return
  }

  if (!passesRateLimits(params)) return
  if (isDuplicate(params)) return

  queue.push({ email: params, queuedAt: Date.now() })
  logger.debug({ to: params.to, subject: params.subject }, 'Email queued')

  scheduleDrain()
}

/**
 * Queue multiple emails. They will be batch-coalesced if queued within the
 * batch window.
 */
export function queueEmails(params: QueuedEmail[]): void {
  for (const p of params) {
    queueEmail(p)
  }
}

/**
 * Send an email immediately, bypassing the queue.
 * Use for auth-critical emails (password reset, verification).
 */
export async function sendEmailImmediate(params: QueuedEmail): Promise<{
  success: boolean
  error?: unknown
}> {
  return sendImmediate(params)
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

function passesRateLimits(email: QueuedEmail): boolean {
  const now = Date.now()
  const { perUserLimit, globalLimit } = config.email

  // Global rate limit
  if (now - globalSendCount.windowStart > globalLimit.window * 1000) {
    globalSendCount = { count: 0, windowStart: now }
  }
  if (globalSendCount.count >= globalLimit.max) {
    logger.warn('Global email rate limit reached, dropping email')
    return false
  }

  // Per-user rate limit (skip for admin emails or emails without userId)
  if (email.userId) {
    const adminEmail = config.notifications.email.adminEmail
    if (email.to !== adminEmail) {
      const entry = userSendCounts.get(email.userId)
      if (entry && now - entry.windowStart <= perUserLimit.window * 1000) {
        if (entry.count >= perUserLimit.max) {
          logger.warn(
            { userId: email.userId, limit: perUserLimit.max },
            'Per-user email rate limit reached, dropping email'
          )
          return false
        }
      }
    }
  }

  return true
}

function recordSend(email: QueuedEmail): void {
  const now = Date.now()
  const { perUserLimit } = config.email

  // Increment global
  globalSendCount.count++

  // Increment per-user
  if (email.userId) {
    const entry = userSendCounts.get(email.userId)
    if (entry && now - entry.windowStart <= perUserLimit.window * 1000) {
      entry.count++
    } else {
      userSendCounts.set(email.userId, { count: 1, windowStart: now })
    }
  }

  // Record for dedup
  const dedupKey = `${email.to}|${email.subject}`
  recentSends.set(dedupKey, now)
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

function isDuplicate(email: QueuedEmail): boolean {
  const dedupKey = `${email.to}|${email.subject}`
  const lastSent = recentSends.get(dedupKey)
  if (lastSent && Date.now() - lastSent < config.email.deduplicationTtlMs) {
    logger.debug(
      { to: email.to, subject: email.subject },
      'Duplicate email skipped (same to+subject within dedup window)'
    )
    return true
  }
  return false
}

// ---------------------------------------------------------------------------
// Queue drain
// ---------------------------------------------------------------------------

function scheduleDrain(): void {
  if (draining) return
  // Wait for the batch window to collect more emails before draining
  setTimeout(() => void drain(), config.email.batchWindowMs)
}

async function drain(): Promise<void> {
  if (draining) return
  draining = true

  try {
    while (queue.length > 0) {
      // Grab all currently queued entries as a batch
      const batch = queue.splice(0, queue.length)

      if (batch.length === 0) break

      if (batch.length === 1) {
        // Single email — send directly
        const entry = batch[0]
        await sendSingle(entry.email)
      } else {
        // Multiple emails — use batch API
        await sendBatch(batch.map((e) => e.email))
      }

      // Respect minimum delay between Resend API calls
      if (queue.length > 0) {
        await sleep(config.email.minDelayBetweenSendsMs)
      }
    }
  } catch (error) {
    logger.error({ err: error }, 'Email queue drain error')
  } finally {
    draining = false
    // If new items were added during drain, schedule another
    if (queue.length > 0) {
      scheduleDrain()
    }
  }
}

// ---------------------------------------------------------------------------
// Senders
// ---------------------------------------------------------------------------

async function sendSingle(email: QueuedEmail): Promise<void> {
  if (!_sendRaw) {
    logger.error('Email sender not registered — call registerSenders() first')
    return
  }
  try {
    const result = await _sendRaw({
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    })
    if (result.success) {
      recordSend(email)
      logger.debug({ to: email.to }, 'Queued email sent')
    } else {
      logger.error({ to: email.to, error: result.error }, 'Queued email send failed')
    }
  } catch (error) {
    logger.error({ err: error, to: email.to }, 'Queued email exception')
  }
}

async function sendBatch(emails: QueuedEmail[]): Promise<void> {
  if (!_sendBatch) {
    // Fallback: send one-by-one with delays
    for (const email of emails) {
      await sendSingle(email)
      if (emails.indexOf(email) < emails.length - 1) {
        await sleep(config.email.minDelayBetweenSendsMs)
      }
    }
    return
  }

  try {
    logger.info({ count: emails.length }, 'Batch sending emails')
    const result = await _sendBatch(
      emails.map((e) => ({
        to: e.to,
        subject: e.subject,
        html: e.html,
        text: e.text,
      }))
    )
    if (result.success) {
      for (const email of emails) {
        recordSend(email)
      }
      logger.info({ count: emails.length }, 'Batch email sent successfully')
    } else {
      logger.error({ error: result.error, count: emails.length }, 'Batch email send failed')
    }
  } catch (error) {
    logger.error({ err: error, count: emails.length }, 'Batch email exception')
  }
}

async function sendImmediate(params: QueuedEmail): Promise<{
  success: boolean
  error?: unknown
}> {
  if (!_sendRaw) {
    logger.error('Email sender not registered — call registerSenders() first')
    return { success: false, error: 'Sender not registered' }
  }
  try {
    const result = await _sendRaw({
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    })
    if (result.success) {
      recordSend(params)
    }
    return result
  } catch (error) {
    logger.error({ err: error, to: params.to }, 'Immediate email exception')
    return { success: false, error }
  }
}

// ---------------------------------------------------------------------------
// Cleanup — prune stale dedup/rate-limit entries periodically
// ---------------------------------------------------------------------------

const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes

setInterval(() => {
  const now = Date.now()

  // Prune dedup entries
  for (const [key, timestamp] of recentSends) {
    if (now - timestamp > config.email.deduplicationTtlMs) {
      recentSends.delete(key)
    }
  }

  // Prune expired user rate limit windows
  const userWindow = config.email.perUserLimit.window * 1000
  for (const [userId, entry] of userSendCounts) {
    if (now - entry.windowStart > userWindow) {
      userSendCounts.delete(userId)
    }
  }
}, CLEANUP_INTERVAL).unref()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
