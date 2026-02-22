import { describe, it, expect } from 'vitest'
import { generateQuickOptions } from './briefing-quick-options'
import { createInitialBriefingState } from './briefing-state-machine'
import type { BriefingState } from './briefing-state-machine'
import type { QuickOptionItem } from '@/components/chat/types'

// =============================================================================
// HELPERS
// =============================================================================

function makeState(overrides: Partial<BriefingState> = {}): BriefingState {
  return { ...createInitialBriefingState(), ...overrides }
}

function getLabel(option: string | QuickOptionItem): string {
  return typeof option === 'string' ? option : option.label
}

// =============================================================================
// QUICK OPTIONS BY STAGE
// =============================================================================

describe('generateQuickOptions', () => {
  // EXTRACT — single-pass, no options
  it('returns null for EXTRACT', () => {
    expect(generateQuickOptions(makeState({ stage: 'EXTRACT' }))).toBeNull()
  })

  // SUBMIT — single-pass, no options
  it('returns null for SUBMIT', () => {
    expect(generateQuickOptions(makeState({ stage: 'SUBMIT' }))).toBeNull()
  })

  // TASK_TYPE — turn 1: full options
  it('TASK_TYPE turn 1: shows full options', () => {
    const opts = generateQuickOptions(makeState({ stage: 'TASK_TYPE', turnsInCurrentStage: 0 }))
    expect(opts).not.toBeNull()
    expect(opts!.options).toContain('Video')
    expect(opts!.options).toContain('Social content')
    expect(opts!.options).toContain('Website design')
    expect(opts!.options).toContain('Branding')
    expect(opts!.options).toContain('Something else')
  })

  // TASK_TYPE — turn 1: narrowed (stall threshold lowered to 1)
  it('TASK_TYPE turn 1: narrowed options', () => {
    const opts = generateQuickOptions(makeState({ stage: 'TASK_TYPE', turnsInCurrentStage: 1 }))
    expect(opts).not.toBeNull()
    expect(opts!.options.length).toBeLessThanOrEqual(3)
    expect(opts!.options).toContain('Something else')
  })

  // TASK_TYPE — turn 2: recommendation (stall threshold lowered to 2)
  it('TASK_TYPE turn 2: recommendation options', () => {
    const opts = generateQuickOptions(makeState({ stage: 'TASK_TYPE', turnsInCurrentStage: 2 }))
    expect(opts).not.toBeNull()
    expect(opts!.options).toContain('Sounds good')
    expect(opts!.options.some((o) => getLabel(o).includes('think'))).toBe(true)
  })

  // INTENT — turn 1: full options
  it('INTENT turn 1: shows full options', () => {
    const opts = generateQuickOptions(makeState({ stage: 'INTENT', turnsInCurrentStage: 0 }))
    expect(opts).not.toBeNull()
    expect(opts!.options).toContain('Drive signups')
    expect(opts!.options).toContain('Build authority')
    expect(opts!.options).toContain('Increase awareness')
    expect(opts!.options).toContain('Boost sales')
  })

  // INTENT — turn 2: narrowed
  it('INTENT turn 2: narrowed options', () => {
    const opts = generateQuickOptions(makeState({ stage: 'INTENT', turnsInCurrentStage: 2 }))
    expect(opts).not.toBeNull()
    expect(opts!.options.length).toBeLessThanOrEqual(3)
  })

  // INTENT — turn 3: recommendation
  it('INTENT turn 3: recommendation options', () => {
    const opts = generateQuickOptions(makeState({ stage: 'INTENT', turnsInCurrentStage: 3 }))
    expect(opts).not.toBeNull()
    expect(opts!.options).toContain('Sounds good')
  })

  // INSPIRATION
  it('INSPIRATION: direction options', () => {
    const opts = generateQuickOptions(makeState({ stage: 'INSPIRATION' }))
    expect(opts).not.toBeNull()
    expect(opts!.options).toContain('I like this direction')
    expect(opts!.options).toContain('Show me more')
    expect(opts!.options).toContain('Something different')
  })

  // STRUCTURE
  it('STRUCTURE: progression options', () => {
    const opts = generateQuickOptions(makeState({ stage: 'STRUCTURE' }))
    expect(opts).not.toBeNull()
    expect(opts!.options).toContain('Looks good, continue')
  })

  // STRATEGIC_REVIEW
  it('STRATEGIC_REVIEW: accept/override/keep options', () => {
    const opts = generateQuickOptions(makeState({ stage: 'STRATEGIC_REVIEW' }))
    expect(opts).not.toBeNull()
    expect(opts!.options).toContain('Looks good, continue')
    expect(opts!.options.some((o) => getLabel(o).includes('adjust'))).toBe(true)
    expect(opts!.options.some((o) => getLabel(o).includes('keep it as-is'))).toBe(true)
  })

  // MOODBOARD
  it('MOODBOARD: visual direction options', () => {
    const opts = generateQuickOptions(makeState({ stage: 'MOODBOARD' }))
    expect(opts).not.toBeNull()
    expect(opts!.options).toContain('Ready to review')
    expect(opts!.options).toContain('Tweak visuals')
  })

  // REVIEW
  it('REVIEW: submit/deepen/changes', () => {
    const opts = generateQuickOptions(makeState({ stage: 'REVIEW' }))
    expect(opts).not.toBeNull()
    expect(opts!.options).toContain('Submit as-is')
    expect(opts!.options).toContain('Go deeper first')
    expect(opts!.options).toContain('Make changes')
  })

  // DEEPEN — video
  it('DEEPEN for video: context-dependent + submit', () => {
    const opts = generateQuickOptions(makeState({ stage: 'DEEPEN', deliverableCategory: 'video' }))
    expect(opts).not.toBeNull()
    expect(opts!.options).toContain('Done, submit now')
    expect(opts!.options.some((o) => getLabel(o).toLowerCase().includes('script'))).toBe(true)
  })

  // DEEPEN — website
  it('DEEPEN for website: context-dependent + submit', () => {
    const opts = generateQuickOptions(
      makeState({ stage: 'DEEPEN', deliverableCategory: 'website' })
    )
    expect(opts).not.toBeNull()
    expect(opts!.options).toContain('Done, submit now')
    expect(opts!.options.some((o) => getLabel(o).toLowerCase().includes('copy'))).toBe(true)
  })

  // DEEPEN — content
  it('DEEPEN for content: context-dependent + submit', () => {
    const opts = generateQuickOptions(
      makeState({ stage: 'DEEPEN', deliverableCategory: 'content' })
    )
    expect(opts).not.toBeNull()
    expect(opts!.options).toContain('Done, submit now')
    expect(opts!.options.some((o) => getLabel(o).toLowerCase().includes('messaging'))).toBe(true)
  })

  // DEEPEN — design
  it('DEEPEN for design: context-dependent + submit', () => {
    const opts = generateQuickOptions(makeState({ stage: 'DEEPEN', deliverableCategory: 'design' }))
    expect(opts).not.toBeNull()
    expect(opts!.options).toContain('Done, submit now')
  })

  // No stall limits at INSPIRATION/MOODBOARD/REVIEW/DEEPEN (test #19)
  it('INSPIRATION returns same options regardless of turn count', () => {
    const opts1 = generateQuickOptions(makeState({ stage: 'INSPIRATION', turnsInCurrentStage: 0 }))
    const opts10 = generateQuickOptions(
      makeState({ stage: 'INSPIRATION', turnsInCurrentStage: 10 })
    )
    expect(opts1!.options).toEqual(opts10!.options)
  })

  it('REVIEW returns same options regardless of turn count', () => {
    const opts1 = generateQuickOptions(makeState({ stage: 'REVIEW', turnsInCurrentStage: 0 }))
    const opts10 = generateQuickOptions(makeState({ stage: 'REVIEW', turnsInCurrentStage: 10 }))
    expect(opts1!.options).toEqual(opts10!.options)
  })
})
