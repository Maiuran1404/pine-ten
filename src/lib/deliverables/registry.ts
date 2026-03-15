/**
 * Deliverable Config Registry
 *
 * Central registry mapping DeliverableCategory to its config.
 * To add a new deliverable type: create a config file, import it here, add to REGISTRY.
 */

import type { DeliverableCategory } from '@/lib/ai/briefing-state-machine'
import type { DeliverableConfig } from './types'
import { videoConfig } from './video'
import { websiteConfig } from './website'
import { contentConfig } from './content'
import { designConfig } from './design'

// =============================================================================
// REGISTRY
// =============================================================================

const REGISTRY: Record<string, DeliverableConfig> = {
  video: videoConfig,
  website: websiteConfig,
  content: contentConfig,
  design: designConfig,
  // 'brand' uses the same config as 'design'
  brand: designConfig,
}

/**
 * Get the config for a deliverable category.
 * Returns the design config as a fallback for unknown categories.
 */
export function getDeliverableConfig(
  category: DeliverableCategory | string | null | undefined
): DeliverableConfig {
  if (!category || category === 'unknown') return designConfig
  return REGISTRY[category] ?? designConfig
}

/**
 * Check if a category has a registered config.
 */
export function hasDeliverableConfig(
  category: DeliverableCategory | string | null | undefined
): boolean {
  if (!category || category === 'unknown') return false
  return category in REGISTRY
}

/**
 * Get all registered configs.
 */
export function getAllDeliverableConfigs(): DeliverableConfig[] {
  // Deduplicate (brand → design)
  const seen = new Set<DeliverableConfig>()
  return Object.values(REGISTRY).filter((c) => {
    if (seen.has(c)) return false
    seen.add(c)
    return true
  })
}

// Re-export types for convenience
export type { DeliverableConfig } from './types'
export type { DeliverableStructurePanelProps, StageContext, ElaborationProgress } from './types'
