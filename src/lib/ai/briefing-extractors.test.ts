import { describe, it, expect } from 'vitest'
import {
  extractStyleKeywords,
  extractInspirationReferences,
  resolveDeliverableCategory,
  resolveStructureType,
  extractAudienceSignals,
  extractIndustrySignals,
} from './briefing-extractors'
import type {
  InferenceResult,
  InferredField,
  TaskType,
  Intent,
  Platform,
  ContentType,
} from '@/components/chat/brief-panel/types'

// =============================================================================
// HELPERS
// =============================================================================

function makeInferredField<T>(
  value: T | null,
  confidence: number,
  source: 'pending' | 'inferred' | 'confirmed' = 'inferred'
): InferredField<T> {
  return { value, confidence, source }
}

function makeInference(overrides: Partial<InferenceResult> = {}): InferenceResult {
  return {
    taskType: makeInferredField<TaskType>(null, 0, 'pending'),
    intent: makeInferredField<Intent>(null, 0, 'pending'),
    platform: makeInferredField<Platform>(null, 0, 'pending'),
    contentType: makeInferredField<ContentType>(null, 0, 'pending'),
    quantity: makeInferredField<number>(null, 0, 'pending'),
    duration: makeInferredField<string>(null, 0, 'pending'),
    topic: makeInferredField<string>(null, 0, 'pending'),
    audienceId: makeInferredField<string>(null, 0, 'pending'),
    ...overrides,
  }
}

// =============================================================================
// STYLE KEYWORD EXTRACTION
// =============================================================================

describe('extractStyleKeywords', () => {
  it('extracts "light" from "light and airy" (example #1)', () => {
    expect(extractStyleKeywords('I want a design that is light and airy')).toContain('light')
  })

  it('extracts "minimal" from "clean minimal" (example #2)', () => {
    const keywords = extractStyleKeywords('Stripe launch videos, clean minimal')
    expect(keywords).toContain('minimal')
  })

  it('extracts "bold" from "bold, conversion-focused" (example #5)', () => {
    expect(extractStyleKeywords('Website landing page, bold, conversion-focused')).toContain('bold')
  })

  it('extracts nothing from "30-day Instagram content plan" (example #3)', () => {
    expect(extractStyleKeywords('30-day Instagram content plan, sustainable fashion')).toEqual([])
  })

  it('extracts multiple keywords', () => {
    const keywords = extractStyleKeywords('Something dark and cinematic with bold colors')
    expect(keywords).toContain('dark')
    expect(keywords).toContain('cinematic')
    expect(keywords).toContain('bold')
  })

  it('deduplicates keywords', () => {
    const keywords = extractStyleKeywords('Clean and clean and simple minimal')
    const uniqueCount = new Set(keywords).size
    expect(keywords.length).toBe(uniqueCount)
  })
})

// =============================================================================
// INSPIRATION REFERENCE EXTRACTION
// =============================================================================

describe('extractInspirationReferences', () => {
  it('extracts "legora" from "similar to legora" (example #1)', () => {
    // Note: "legora" is not a known brand, but the pattern "similar to X" captures it
    const refs = extractInspirationReferences('I want a design similar to Legora')
    expect(refs).toContain('Legora')
  })

  it('extracts "Stripe" from known brand (example #2)', () => {
    const refs = extractInspirationReferences('Stripe launch videos for B2B SaaS')
    expect(refs).toContain('Stripe')
  })

  it('extracts "Gymshark" from known brand (example #7)', () => {
    const refs = extractInspirationReferences('3 Instagram reels, Gymshark style')
    expect(refs).toContain('Gymshark')
  })

  it('extracts @handle references', () => {
    const refs = extractInspirationReferences('Something like @designstudio on Instagram')
    expect(refs).toContain('@designstudio')
  })

  it('extracts URL references', () => {
    const refs = extractInspirationReferences('Check out https://example.com/inspiration')
    expect(refs).toContain('https://example.com/inspiration')
  })

  it('returns empty for vague messages (example #10)', () => {
    expect(extractInspirationReferences('Something cool for our new product')).toEqual([])
  })
})

// =============================================================================
// DELIVERABLE CATEGORY RESOLUTION
// =============================================================================

describe('resolveDeliverableCategory', () => {
  it('video contentType → video', () => {
    const inf = makeInference({ contentType: makeInferredField('video', 0.9) })
    expect(resolveDeliverableCategory(inf)).toBe('video')
  })

  it('reel contentType → video', () => {
    const inf = makeInference({ contentType: makeInferredField('reel', 0.9) })
    expect(resolveDeliverableCategory(inf)).toBe('video')
  })

  it('web platform + single_asset → website', () => {
    const inf = makeInference({
      platform: makeInferredField('web', 0.9),
      taskType: makeInferredField('single_asset', 0.85),
    })
    expect(resolveDeliverableCategory(inf)).toBe('website')
  })

  it('multi_asset_plan → content', () => {
    const inf = makeInference({
      taskType: makeInferredField('multi_asset_plan', 0.95),
    })
    expect(resolveDeliverableCategory(inf)).toBe('content')
  })

  it('presentation platform → design', () => {
    const inf = makeInference({
      platform: makeInferredField('presentation', 0.9),
    })
    expect(resolveDeliverableCategory(inf)).toBe('design')
  })

  it('slide contentType → design', () => {
    const inf = makeInference({
      contentType: makeInferredField('slide', 0.9),
    })
    expect(resolveDeliverableCategory(inf)).toBe('design')
  })

  it('single_asset with poster → design', () => {
    const inf = makeInference({
      taskType: makeInferredField('single_asset', 0.85),
      contentType: makeInferredField('poster', 0.9),
    })
    expect(resolveDeliverableCategory(inf)).toBe('design')
  })

  it('null everything → unknown', () => {
    expect(resolveDeliverableCategory(makeInference())).toBe('unknown')
  })
})

// =============================================================================
// RESOLVE STRUCTURE TYPE
// =============================================================================

describe('resolveStructureType', () => {
  it('video → storyboard', () => expect(resolveStructureType('video')).toBe('storyboard'))
  it('website → layout', () => expect(resolveStructureType('website')).toBe('layout'))
  it('content → calendar', () => expect(resolveStructureType('content')).toBe('calendar'))
  it('design → single_design', () => expect(resolveStructureType('design')).toBe('single_design'))
  it('brand → single_design', () => expect(resolveStructureType('brand')).toBe('single_design'))
  it('unknown → null', () => expect(resolveStructureType('unknown')).toBeNull())
})

// =============================================================================
// AUDIENCE SIGNAL EXTRACTION (test #2 from plan)
// =============================================================================

describe('extractAudienceSignals', () => {
  it('detects CTO audience from "CTOs"', () => {
    const signals = extractAudienceSignals('Stripe launch videos for B2B SaaS, CTOs')
    expect(signals.some((s) => s.label.includes('CTO'))).toBe(true)
    expect(signals[0].segment).toBe('enterprise')
  })

  it('detects Gen Z audience', () => {
    const signals = extractAudienceSignals('Travel app for Gen Z')
    expect(signals.some((s) => s.label.includes('Gen Z'))).toBe(true)
    expect(signals.find((s) => s.label.includes('Gen Z'))?.segment).toBe('consumer')
  })

  it('detects investor audience', () => {
    const signals = extractAudienceSignals('Pitch deck for investor meeting')
    expect(signals.some((s) => s.label.includes('Investor'))).toBe(true)
    expect(signals.find((s) => s.label.includes('Investor'))?.segment).toBe('startup')
  })

  it('detects developer audience', () => {
    const signals = extractAudienceSignals('Targeting developers')
    expect(signals.some((s) => s.label.includes('Developer'))).toBe(true)
  })

  it('returns empty for messages without audience signals', () => {
    expect(extractAudienceSignals('Something cool')).toEqual([])
  })

  it('sorts by confidence descending', () => {
    const signals = extractAudienceSignals('CTOs and developers at enterprise startups')
    for (let i = 1; i < signals.length; i++) {
      expect(signals[i - 1].confidence).toBeGreaterThanOrEqual(signals[i].confidence)
    }
  })
})

// =============================================================================
// INDUSTRY SIGNAL EXTRACTION
// =============================================================================

describe('extractIndustrySignals', () => {
  it('detects SaaS industry', () => {
    expect(extractIndustrySignals('B2B SaaS product')).toContain('SaaS')
  })

  it('detects fashion industry', () => {
    expect(extractIndustrySignals('sustainable fashion brand')).toContain('fashion')
    expect(extractIndustrySignals('sustainable fashion brand')).toContain('sustainable')
  })

  it('detects fintech industry', () => {
    expect(extractIndustrySignals('fintech startup')).toContain('fintech')
  })

  it('detects wellness industry', () => {
    expect(extractIndustrySignals('yoga studio logo')).toContain('yoga')
  })

  it('detects fitness industry', () => {
    expect(extractIndustrySignals('fitness app, Gymshark style')).toContain('fitness')
  })

  it('returns empty for vague messages', () => {
    expect(extractIndustrySignals('Something cool for our product')).toEqual([])
  })

  it('detects multiple industries', () => {
    const industries = extractIndustrySignals('AI SaaS startup for enterprise')
    expect(industries).toContain('AI')
    expect(industries).toContain('SaaS')
    expect(industries).toContain('startup')
    expect(industries).toContain('enterprise')
  })
})
