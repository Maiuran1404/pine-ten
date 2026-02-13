import 'server-only'

import { db } from '@/db'
import { platformSettings } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'

/**
 * Default platform settings values.
 * Used as fallback when a setting hasn't been configured in the DB.
 */
const DEFAULTS: Record<string, unknown> = {
  creditPrice: 49,
  maxRevisions: 2,
  platformFeePercent: 20,
  maintenanceMode: false,
  newUserCredits: 0,
  minWithdrawal: 100,
}

/** In-memory cache for settings with TTL */
const cache = new Map<string, { value: unknown; expiresAt: number }>()
const CACHE_TTL_MS = 60_000 // 60 seconds

/**
 * Get a platform setting by key.
 * Uses an in-memory cache with a short TTL to avoid hitting the DB on every request.
 */
export async function getSetting<T = unknown>(key: string): Promise<T> {
  // Check cache first
  const cached = cache.get(key)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value as T
  }

  try {
    const [row] = await db
      .select({ value: platformSettings.value })
      .from(platformSettings)
      .where(eq(platformSettings.key, key))
      .limit(1)

    const value = row?.value ?? DEFAULTS[key] ?? null
    cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
    return value as T
  } catch (err) {
    logger.error({ err, key }, 'Failed to get setting')
    const fallback = DEFAULTS[key] ?? null
    return fallback as T
  }
}

/**
 * Set a platform setting by key.
 * Upserts the value in the DB and invalidates the cache.
 */
export async function setSetting(key: string, value: unknown, userId?: string): Promise<void> {
  const existing = await db
    .select({ id: platformSettings.id })
    .from(platformSettings)
    .where(eq(platformSettings.key, key))
    .limit(1)

  if (existing.length > 0) {
    await db
      .update(platformSettings)
      .set({ value, updatedBy: userId ?? null, updatedAt: new Date() })
      .where(eq(platformSettings.key, key))
  } else {
    await db.insert(platformSettings).values({
      key,
      value,
      updatedBy: userId ?? null,
    })
  }

  // Invalidate cache for this key
  cache.delete(key)
}

/**
 * Get all platform settings as a key-value map.
 * Merges DB values with defaults so all expected keys are always present.
 */
export async function getAllSettings(): Promise<Record<string, unknown>> {
  try {
    const rows = await db.select().from(platformSettings)
    const settingsMap: Record<string, unknown> = { ...DEFAULTS }
    for (const row of rows) {
      settingsMap[row.key] = row.value
    }
    return settingsMap
  } catch (err) {
    logger.error({ err }, 'Failed to get all settings')
    return { ...DEFAULTS }
  }
}

/**
 * Clear the in-memory cache for all settings.
 * Useful after bulk updates.
 */
export function clearSettingsCache(): void {
  cache.clear()
}
