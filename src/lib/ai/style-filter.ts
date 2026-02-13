/**
 * Deliverable type auto-detection from conversation context
 */

import { logger } from '@/lib/logger'

/**
 * Auto-detect the deliverable type from combined user message + AI response context.
 * Returns a deliverable type string if detected, or null if no match.
 */
export function detectDeliverableType(combinedContext: string): string | null {
  if (
    combinedContext.includes('instagram') &&
    (combinedContext.includes('post') ||
      combinedContext.includes('carousel') ||
      combinedContext.includes('feed'))
  ) {
    return 'instagram_post'
  } else if (combinedContext.includes('instagram') && combinedContext.includes('story')) {
    return 'instagram_story'
  } else if (combinedContext.includes('instagram') && combinedContext.includes('reel')) {
    return 'instagram_reel'
  } else if (combinedContext.includes('linkedin') && combinedContext.includes('post')) {
    return 'linkedin_post'
  } else if (
    combinedContext.includes('launch video') ||
    combinedContext.includes('product video') ||
    combinedContext.includes('promo video') ||
    combinedContext.includes('promotional video') ||
    combinedContext.includes('marketing video') ||
    combinedContext.includes('brand video') ||
    combinedContext.includes('commercial') ||
    combinedContext.includes('cinematic video') ||
    combinedContext.includes('intro video') ||
    combinedContext.includes('introduction video') ||
    combinedContext.includes('explainer video') ||
    combinedContext.includes('teaser video') ||
    combinedContext.includes('announcement video') ||
    combinedContext.includes('brand film') ||
    combinedContext.includes('company video') ||
    combinedContext.includes('startup video') ||
    combinedContext.includes('saas video') ||
    combinedContext.includes('walkthrough video') ||
    combinedContext.includes('app walkthrough') ||
    combinedContext.includes('demo video') ||
    combinedContext.includes('tutorial video') ||
    combinedContext.includes('onboarding video') ||
    combinedContext.includes('showcase video') ||
    combinedContext.includes('overview video') ||
    combinedContext.includes('guided tour') ||
    // Generic video requests with product/brand context
    (combinedContext.includes('video') &&
      (combinedContext.includes('product') ||
        combinedContext.includes('introduces') ||
        combinedContext.includes('launch') ||
        combinedContext.includes('brand') ||
        combinedContext.includes('company') ||
        combinedContext.includes('startup') ||
        combinedContext.includes('saas') ||
        combinedContext.includes('cinematic') ||
        combinedContext.includes('professional') ||
        combinedContext.includes('polished') ||
        combinedContext.includes('walkthrough') ||
        combinedContext.includes('demo') ||
        combinedContext.includes('tutorial') ||
        combinedContext.includes('onboarding') ||
        combinedContext.includes('showcase') ||
        combinedContext.includes('app') ||
        combinedContext.includes('software') ||
        combinedContext.includes('platform') ||
        combinedContext.includes('guided') ||
        combinedContext.includes('tour') ||
        combinedContext.includes('overview')))
  ) {
    return 'launch_video'
  } else if (
    combinedContext.includes('video ad') ||
    combinedContext.includes('video advertisement')
  ) {
    return 'video_ad'
  } else if (
    combinedContext.includes('ad') ||
    combinedContext.includes('banner') ||
    combinedContext.includes('promotion')
  ) {
    return 'static_ad'
  }

  return null
}

/**
 * Auto-detect deliverable type and create a style marker if AI didn't include one.
 * Returns the marker object or undefined.
 */
export function autoDetectStyleMarker(
  responseContent: string,
  lastUserMessage: string
): { type: 'initial'; deliverableType: string } | undefined {
  const contentLower = responseContent.toLowerCase()
  const lastUserMessageLower = lastUserMessage.toLowerCase()
  const combinedContext = `${lastUserMessageLower} ${contentLower}`

  const detectedType = detectDeliverableType(combinedContext)

  if (detectedType) {
    logger.debug({ detectedType }, 'Auto-detected deliverable type')
    return {
      type: 'initial',
      deliverableType: detectedType,
    }
  }

  return undefined
}
