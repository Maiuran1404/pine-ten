import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock logger to avoid side effects
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { detectDeliverableType, autoDetectStyleMarker } from './style-filter'

describe('detectDeliverableType', () => {
  it('detects instagram_post from "instagram post"', () => {
    expect(detectDeliverableType('instagram post')).toBe('instagram_post')
  })

  it('detects instagram_post from "instagram carousel"', () => {
    expect(detectDeliverableType('instagram carousel')).toBe('instagram_post')
  })

  it('detects instagram_post from "instagram feed"', () => {
    expect(detectDeliverableType('instagram feed')).toBe('instagram_post')
  })

  it('detects instagram_story from "instagram story"', () => {
    expect(detectDeliverableType('instagram story')).toBe('instagram_story')
  })

  it('detects instagram_reel from "instagram reel"', () => {
    expect(detectDeliverableType('instagram reel')).toBe('instagram_reel')
  })

  it('detects linkedin_post from "linkedin post"', () => {
    expect(detectDeliverableType('linkedin post')).toBe('linkedin_post')
  })

  it('detects launch_video from "launch video"', () => {
    expect(detectDeliverableType('launch video')).toBe('launch_video')
  })

  it('detects launch_video from "product video"', () => {
    expect(detectDeliverableType('product video')).toBe('launch_video')
  })

  it('detects launch_video from generic video with product context', () => {
    expect(detectDeliverableType('video for our product')).toBe('launch_video')
  })

  it('detects launch_video from "demo video"', () => {
    expect(detectDeliverableType('demo video')).toBe('launch_video')
  })

  it('detects launch_video from "explainer video"', () => {
    expect(detectDeliverableType('explainer video')).toBe('launch_video')
  })

  it('detects launch_video from "walkthrough video"', () => {
    expect(detectDeliverableType('walkthrough video')).toBe('launch_video')
  })

  it('detects video_ad from "video ad"', () => {
    expect(detectDeliverableType('video ad')).toBe('video_ad')
  })

  it('detects video_ad from "video advertisement"', () => {
    expect(detectDeliverableType('video advertisement')).toBe('video_ad')
  })

  it('detects static_ad from "ad"', () => {
    expect(detectDeliverableType('ad')).toBe('static_ad')
  })

  it('detects static_ad from "banner"', () => {
    expect(detectDeliverableType('banner')).toBe('static_ad')
  })

  it('detects static_ad from "promotion"', () => {
    expect(detectDeliverableType('promotion')).toBe('static_ad')
  })

  it('returns null for unrecognized context', () => {
    expect(detectDeliverableType('something completely different')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(detectDeliverableType('')).toBeNull()
  })
})

describe('autoDetectStyleMarker', () => {
  it('returns initial marker when deliverable type is detected', () => {
    const result = autoDetectStyleMarker('Here is a design plan', 'I need an instagram post')
    expect(result).toEqual({
      type: 'initial',
      deliverableType: 'instagram_post',
    })
  })

  it('combines both response and user message for detection', () => {
    const result = autoDetectStyleMarker('Sure, for your instagram', 'I need a post design')
    expect(result).toEqual({
      type: 'initial',
      deliverableType: 'instagram_post',
    })
  })

  it('returns undefined when no deliverable type detected', () => {
    const result = autoDetectStyleMarker('Hello there', 'Hi, how are you?')
    expect(result).toBeUndefined()
  })

  it('is case-insensitive', () => {
    const result = autoDetectStyleMarker('INSTAGRAM POST', 'DESIGN')
    expect(result).toEqual({
      type: 'initial',
      deliverableType: 'instagram_post',
    })
  })
})
