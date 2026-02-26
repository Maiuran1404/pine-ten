/**
 * Server-side PostHog client singleton.
 * Uses posthog-node for reliable server-side event capture.
 */
import 'server-only'

import { PostHog } from 'posthog-node'
import { logger } from '@/lib/logger'

// =============================================================================
// SINGLETON CLIENT
// =============================================================================

let posthogClient: PostHog | null = null

function getPostHogClient(): PostHog | null {
  const apiKey = process.env.POSTHOG_API_KEY
  if (!apiKey) {
    return null
  }

  if (!posthogClient) {
    posthogClient = new PostHog(apiKey, {
      host: 'https://eu.i.posthog.com',
      flushAt: 20,
      flushInterval: 10000,
    })
  }

  return posthogClient
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Capture a server-side event. No-ops gracefully if PostHog is not configured.
 */
export function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
): void {
  const client = getPostHogClient()
  if (!client) return

  try {
    client.capture({
      distinctId,
      event,
      properties: {
        ...properties,
        $source: 'server',
      },
    })
  } catch (error) {
    logger.error({ err: error, event }, 'Failed to capture PostHog server event')
  }
}

/**
 * Identify a user server-side with properties.
 */
export function identifyUser(distinctId: string, properties?: Record<string, unknown>): void {
  const client = getPostHogClient()
  if (!client) return

  try {
    client.identify({
      distinctId,
      properties,
    })
  } catch (error) {
    logger.error({ err: error }, 'Failed to identify user in PostHog')
  }
}

/**
 * Associate a user with a group (e.g., company).
 */
export function groupIdentify(
  groupType: string,
  groupKey: string,
  properties?: Record<string, unknown>
): void {
  const client = getPostHogClient()
  if (!client) return

  try {
    client.groupIdentify({
      groupType,
      groupKey,
      properties,
    })
  } catch (error) {
    logger.error({ err: error }, 'Failed to identify group in PostHog')
  }
}

/**
 * Evaluate a feature flag for a user.
 */
export async function getFeatureFlag(
  flagKey: string,
  distinctId: string,
  options?: { groups?: Record<string, string> }
): Promise<boolean | string | undefined> {
  const client = getPostHogClient()
  if (!client) return undefined

  try {
    return await client.getFeatureFlag(flagKey, distinctId, options)
  } catch (error) {
    logger.error({ err: error, flagKey }, 'Failed to evaluate PostHog feature flag')
    return undefined
  }
}

/**
 * Flush pending events. Call during graceful shutdown.
 */
export async function shutdownPostHog(): Promise<void> {
  if (posthogClient) {
    await posthogClient.shutdown()
    posthogClient = null
  }
}
