/**
 * Deliverable Config Registry — barrel export
 *
 * Usage:
 *   import { getDeliverableConfig } from '@/lib/deliverables'
 *   const config = getDeliverableConfig('video')
 */

export { getDeliverableConfig, hasDeliverableConfig, getAllDeliverableConfigs } from './registry'
export type {
  DeliverableConfig,
  DeliverableStructurePanelProps,
  StageContext,
  ElaborationProgress,
} from './types'
export { videoConfig } from './video'
export { websiteConfig } from './website'
export { contentConfig } from './content'
export { designConfig } from './design'
