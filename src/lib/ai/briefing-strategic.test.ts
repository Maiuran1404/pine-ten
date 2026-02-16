import { describe, it, expect } from 'vitest'
import { inspirationFitCheck } from './briefing-strategic'

// =============================================================================
// INSPIRATION FIT CHECK (test #5 from plan)
// =============================================================================

describe('inspirationFitCheck', () => {
  // Aligned cases
  it('Stripe + B2B SaaS + CTOs → aligned', () => {
    const result = inspirationFitCheck(
      ['Stripe'],
      [{ styleAxis: 'tech', name: 'Dark Tech' }],
      'CTOs',
      'SaaS',
      'announcement',
      'video'
    )
    expect(result.fitScore).toBe('aligned')
    expect(result.note).toBeNull()
  })

  it('Patagonia + sustainable fashion → aligned', () => {
    const result = inspirationFitCheck(
      ['Patagonia'],
      [],
      'consumer',
      'sustainable fashion',
      'awareness',
      'content'
    )
    expect(result.fitScore).toBe('aligned')
  })

  // Minor mismatch
  it('Gymshark + generic audience → minor_mismatch', () => {
    const result = inspirationFitCheck(['Gymshark'], [], null, 'technology', 'signups', 'video')
    expect(result.fitScore).toBe('minor_mismatch')
    expect(result.note).not.toBeNull()
  })

  // Significant mismatch
  it('Gymshark + enterprise CTO → significant_mismatch', () => {
    const result = inspirationFitCheck(
      ['Gymshark'],
      [],
      'enterprise CTO',
      'B2B',
      'announcement',
      'video'
    )
    expect(result.fitScore).toBe('significant_mismatch')
    expect(result.note).toContain('consumer')
  })

  it('Brutalist style + wellness audience → significant_mismatch', () => {
    const result = inspirationFitCheck(
      [],
      [{ styleAxis: 'brutalist', name: 'Brutalist Raw' }],
      null,
      'wellness',
      null,
      'design'
    )
    expect(result.fitScore).toBe('significant_mismatch')
    expect(result.note).toContain('confrontational')
  })

  it('Goldman Sachs + consumer Gen Z → significant_mismatch', () => {
    const result = inspirationFitCheck(
      ['Goldman Sachs'],
      [],
      'gen z consumer',
      null,
      null,
      'website'
    )
    expect(result.fitScore).toBe('significant_mismatch')
    expect(result.note).toContain('enterprise')
  })

  // No refs → aligned by default
  it('no refs and no styles → aligned', () => {
    const result = inspirationFitCheck([], [], null, null, null, null)
    expect(result.fitScore).toBe('aligned')
    expect(result.note).toBeNull()
  })

  // Style axis without friction
  it('tech style + saas industry → aligned', () => {
    const result = inspirationFitCheck(
      [],
      [{ styleAxis: 'tech', name: 'Dark Tech' }],
      'developers',
      'saas',
      null,
      'website'
    )
    expect(result.fitScore).toBe('aligned')
  })

  // Corporate style + enterprise → no mismatch
  it('corporate style + enterprise → aligned', () => {
    const result = inspirationFitCheck(
      [],
      [{ styleAxis: 'corporate', name: 'Corporate Clean' }],
      'enterprise',
      'b2b',
      null,
      'website'
    )
    expect(result.fitScore).toBe('aligned')
  })

  // Playful style + enterprise → significant mismatch
  it('playful style + enterprise → significant_mismatch', () => {
    const result = inspirationFitCheck(
      [],
      [{ styleAxis: 'playful', name: 'Playful Pop' }],
      null,
      'enterprise finance',
      null,
      'design'
    )
    expect(result.fitScore).toBe('significant_mismatch')
  })
})
