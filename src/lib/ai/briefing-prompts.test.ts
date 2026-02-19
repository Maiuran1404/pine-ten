import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from './briefing-prompts'
import { createInitialBriefingState } from './briefing-state-machine'
import type { BriefingState, ToneProfile } from './briefing-state-machine'

// =============================================================================
// HELPERS
// =============================================================================

function makeState(overrides: Partial<BriefingState> = {}): BriefingState {
  return { ...createInitialBriefingState(), ...overrides }
}

function makeToneProfile(overrides: Partial<ToneProfile> = {}): ToneProfile {
  return {
    languageSharpness: 'direct',
    technicalDepth: 'high',
    emotionalIntensity: 'low',
    directnessLevel: 'high',
    vocabularyRegister: ['infrastructure'],
    toneDescription: 'Direct technical tone for CTOs.',
    ...overrides,
  }
}

// =============================================================================
// STAGE-SPECIFIC PROMPTS (test #6 from plan)
// =============================================================================

describe('buildSystemPrompt', () => {
  it('EXTRACT stage includes first message processing instructions', () => {
    const state = makeState({ stage: 'EXTRACT' })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('EXTRACT')
    expect(prompt).toContain('first message')
  })

  it('TASK_TYPE stage asks what they are making', () => {
    const state = makeState({ stage: 'TASK_TYPE' })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain("what they're making")
  })

  it('INTENT stage asks about business goal', () => {
    const state = makeState({
      stage: 'INTENT',
      brief: {
        ...createInitialBriefingState().brief,
        taskType: { value: 'single_asset', confidence: 0.9, source: 'inferred' },
      },
    })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('WHY')
  })

  it('INSPIRATION stage shows style references', () => {
    const state = makeState({ stage: 'INSPIRATION' })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('style references')
  })

  it('STRUCTURE stage for video includes storyboard instructions', () => {
    const state = makeState({
      stage: 'STRUCTURE',
      deliverableCategory: 'video',
    })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('storyboard')
    expect(prompt).toContain('[STORYBOARD]')
  })

  it('STRUCTURE stage for website includes layout instructions', () => {
    const state = makeState({
      stage: 'STRUCTURE',
      deliverableCategory: 'website',
    })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('layout')
    expect(prompt).toContain('[LAYOUT]')
  })

  it('STRUCTURE stage for content includes calendar instructions', () => {
    const state = makeState({
      stage: 'STRUCTURE',
      deliverableCategory: 'content',
    })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('calendar')
    expect(prompt).toContain('[CALENDAR]')
  })

  it('STRUCTURE stage for design includes spec instructions', () => {
    const state = makeState({
      stage: 'STRUCTURE',
      deliverableCategory: 'design',
    })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('specification')
    expect(prompt).toContain('[DESIGN_SPEC]')
  })

  it('STRATEGIC_REVIEW stage includes assessment instructions', () => {
    const state = makeState({ stage: 'STRATEGIC_REVIEW' })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('strategic assessment')
    expect(prompt).toContain('[STRATEGIC_REVIEW]')
  })

  it('MOODBOARD stage includes visual direction instructions', () => {
    const state = makeState({ stage: 'MOODBOARD' })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('visual direction')
  })

  it('REVIEW stage includes expert consultation instructions', () => {
    const state = makeState({ stage: 'REVIEW' })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('strongest element')
  })

  it('DEEPEN stage includes depth escalation', () => {
    const state = makeState({ stage: 'DEEPEN', deliverableCategory: 'video' })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('depth escalation')
  })

  it('SUBMIT stage includes task submission', () => {
    const state = makeState({ stage: 'SUBMIT' })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('[TASK_READY]')
  })

  // Tone injection
  it('injects calibrated tone when toneProfile is set', () => {
    const state = makeState({
      stage: 'INSPIRATION',
      toneProfile: makeToneProfile(),
    })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('Direct technical tone for CTOs.')
  })

  // Authority mode
  it('injects authority mode at STRATEGIC_REVIEW', () => {
    const state = makeState({ stage: 'STRATEGIC_REVIEW' })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('AUTHORITY MODE')
    expect(prompt).toContain('NEVER use')
    expect(prompt).toContain('What do you think?')
  })

  it('injects authority mode at REVIEW', () => {
    const state = makeState({ stage: 'REVIEW' })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('AUTHORITY MODE')
  })

  it('injects authority mode at DEEPEN', () => {
    const state = makeState({ stage: 'DEEPEN' })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('AUTHORITY MODE')
  })

  it('injects authority mode at SUBMIT', () => {
    const state = makeState({ stage: 'SUBMIT' })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('AUTHORITY MODE')
  })

  it('does NOT inject authority mode at EXTRACT', () => {
    const state = makeState({ stage: 'EXTRACT' })
    const prompt = buildSystemPrompt(state)
    expect(prompt).not.toContain('AUTHORITY MODE')
  })

  // Video hook guidance
  it('injects video hook guidance at STRUCTURE for video', () => {
    const state = makeState({
      stage: 'STRUCTURE',
      deliverableCategory: 'video',
    })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('HOOK GENERATION')
    expect(prompt).toContain('Target persona')
    expect(prompt).toContain('Pain metric')
    expect(prompt).toContain('Quantifiable impact')
  })

  // Content calendar guidance
  it('injects content calendar guidance at STRUCTURE for content', () => {
    const state = makeState({
      stage: 'STRUCTURE',
      deliverableCategory: 'content',
    })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('CONTENT CALENDAR REQUIREMENTS')
    expect(prompt).toContain('POSTING CADENCE')
    expect(prompt).toContain('CONTENT PILLARS')
    expect(prompt).toContain('CTA ESCALATION')
  })

  // Stall escalation
  it('injects narrow prompt at TASK_TYPE turn 1', () => {
    const state = makeState({
      stage: 'TASK_TYPE',
      turnsInCurrentStage: 1,
    })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('NARROW')
  })

  it('injects recommend prompt at TASK_TYPE turn 2', () => {
    const state = makeState({
      stage: 'TASK_TYPE',
      turnsInCurrentStage: 2,
    })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('RECOMMEND')
  })

  it('injects soft nudge at STRUCTURE turn 4', () => {
    const state = makeState({
      stage: 'STRUCTURE',
      turnsInCurrentStage: 4,
    })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('SOFT NUDGE')
  })

  it('no stall injection at INSPIRATION', () => {
    const state = makeState({
      stage: 'INSPIRATION',
      turnsInCurrentStage: 10,
    })
    const prompt = buildSystemPrompt(state)
    expect(prompt).not.toContain('STALL')
    expect(prompt).not.toContain('NUDGE')
  })

  // Competitive differentiation prompt
  it('injects competitive prompt at INTENT for website', () => {
    const state = makeState({
      stage: 'INTENT',
      deliverableCategory: 'website',
    })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('COMPETITIVE DIFFERENTIATION')
  })

  it('does not inject competitive prompt when already captured', () => {
    const state = makeState({
      stage: 'INTENT',
      deliverableCategory: 'website',
      competitiveDifferentiation: 'Better than X',
    })
    const prompt = buildSystemPrompt(state)
    expect(prompt).not.toContain('COMPETITIVE DIFFERENTIATION (OPTIONAL)')
  })

  // Platform context and never-deflect rules
  it('EXTRACT prompt contains platform context and NEVER DEFLECT rule', () => {
    const state = makeState({ stage: 'EXTRACT' })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('freelance designers build deliverables')
    expect(prompt).toContain('NEVER DEFLECT')
  })

  it('REVIEW prompt contains Crafted designer reference and no-deflect rule', () => {
    const state = makeState({ stage: 'REVIEW' })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('Crafted designer')
    expect(prompt).toContain('NEVER suggest they hire someone else')
  })

  it('SUBMIT prompt contains Crafted designer who will build the deliverable', () => {
    const state = makeState({ stage: 'SUBMIT' })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('Crafted designer who will build the deliverable')
  })

  // BRIEF_META in closing instruction (moved from preamble for recency)
  it('includes BRIEF_META format instruction in closing section', () => {
    const state = makeState({ stage: 'EXTRACT' })
    const prompt = buildSystemPrompt(state)
    // Full BRIEF_META instruction should be in the closing, not just a reference
    expect(prompt).toContain('STAGE DECLARATION (DO NOT SKIP)')
    expect(prompt).toContain('[BRIEF_META]{"stage":"STAGE_NAME"')
    expect(prompt).toContain('fieldsExtracted')
  })

  it('includes legal transitions in closing instruction', () => {
    const state = makeState({ stage: 'STRUCTURE' })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('Legal stages from STRUCTURE: STRUCTURE, INSPIRATION')
  })

  it('includes per-stage BRIEF_META reminder for STRUCTURE', () => {
    const state = makeState({ stage: 'STRUCTURE', deliverableCategory: 'video' })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('After the structure block, include [BRIEF_META] and [QUICK_OPTIONS]')
  })

  it('includes per-stage BRIEF_META reminder for STRATEGIC_REVIEW', () => {
    const state = makeState({ stage: 'STRATEGIC_REVIEW' })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain(
      'After the [STRATEGIC_REVIEW] block, include [BRIEF_META] and [QUICK_OPTIONS]'
    )
  })

  it('includes per-stage BRIEF_META reminder for REVIEW', () => {
    const state = makeState({ stage: 'REVIEW' })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('After your review, include [BRIEF_META] and [QUICK_OPTIONS]')
  })

  it('preamble has only a short BRIEF_META reference (not the full instruction)', () => {
    const state = makeState({ stage: 'EXTRACT' })
    const prompt = buildSystemPrompt(state)
    // The preamble should NOT contain the full format block anymore
    const preambleEnd = prompt.indexOf('== CURRENT STATE ==')
    const preamble = prompt.slice(0, preambleEnd)
    expect(preamble).not.toContain('Format: [BRIEF_META]')
    expect(preamble).toContain('STAGE DECLARATION')
  })

  // Brand context
  it('injects brand context when provided', () => {
    const state = makeState({ stage: 'EXTRACT' })
    const prompt = buildSystemPrompt(state, {
      companyName: 'Acme Corp',
      industry: 'SaaS',
    })
    expect(prompt).toContain('Acme Corp')
    expect(prompt).toContain('SaaS')
  })

  // Closing instruction — stage-specific
  it('uses conversational closing for EXTRACT stage', () => {
    const state = makeState({ stage: 'EXTRACT' })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('clear question or a confident direction')
  })

  it('uses authority closing for STRUCTURE stage', () => {
    const state = makeState({ stage: 'STRUCTURE' })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('Do NOT end with a question like')
  })

  // Current state section
  it('includes what we know in current state', () => {
    const state = makeState({
      stage: 'STRUCTURE',
      brief: {
        ...createInitialBriefingState().brief,
        taskType: { value: 'single_asset', confidence: 0.9, source: 'inferred' },
        intent: { value: 'signups', confidence: 0.85, source: 'inferred' },
      },
      styleKeywords: ['minimal', 'clean'],
      inspirationRefs: ['Stripe'],
    })
    const prompt = buildSystemPrompt(state)
    expect(prompt).toContain('single_asset')
    expect(prompt).toContain('signups')
    expect(prompt).toContain('minimal, clean')
    expect(prompt).toContain('Stripe')
  })
})
