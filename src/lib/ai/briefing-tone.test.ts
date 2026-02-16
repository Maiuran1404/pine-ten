import { describe, it, expect } from 'vitest'
import { calibrateTone, toneToStylePreference } from './briefing-tone'

// =============================================================================
// TONE CALIBRATION (test #3 from plan)
// =============================================================================

describe('calibrateTone', () => {
  it('Enterprise CTO → direct, high-tech, low-emotion', () => {
    const tone = calibrateTone('CTOs', 'SaaS', null, 'announcement')
    expect(tone.languageSharpness).toBe('direct')
    expect(tone.technicalDepth).toBe('high')
    expect(tone.emotionalIntensity).toBe('low')
    expect(tone.directnessLevel).toBe('high')
  })

  it('Sustainable fashion consumer → conversational, low-tech, high-emotion', () => {
    const tone = calibrateTone(null, 'sustainable fashion', 'instagram', null)
    expect(tone.languageSharpness).toBe('conversational')
    expect(tone.technicalDepth).toBe('low')
    expect(tone.emotionalIntensity).toBe('high')
    expect(tone.directnessLevel).toBe('medium')
  })

  it('Travel startup → conversational, low-tech, medium-emotion, high-directness', () => {
    const tone = calibrateTone(null, 'travel', null, null)
    expect(tone.languageSharpness).toBe('conversational')
    expect(tone.technicalDepth).toBe('low')
    expect(tone.emotionalIntensity).toBe('medium')
    expect(tone.directnessLevel).toBe('high')
  })

  it('B2B SaaS marketing → direct, medium-tech, low-emotion', () => {
    const tone = calibrateTone(null, 'B2B SaaS', null, 'signups')
    expect(tone.languageSharpness).toBe('direct')
    expect(tone.technicalDepth).toBe('medium')
    expect(tone.emotionalIntensity).toBe('low')
  })

  it('Lifestyle/wellness brand → conversational, low-tech, high-emotion, low-directness', () => {
    const tone = calibrateTone(null, 'wellness', null, null)
    expect(tone.languageSharpness).toBe('conversational')
    expect(tone.technicalDepth).toBe('low')
    expect(tone.emotionalIntensity).toBe('high')
    expect(tone.directnessLevel).toBe('low')
  })

  it('Fintech/banking → formal, high-tech, low-emotion', () => {
    const tone = calibrateTone(null, 'fintech', null, null)
    expect(tone.languageSharpness).toBe('formal')
    expect(tone.technicalDepth).toBe('high')
    expect(tone.emotionalIntensity).toBe('low')
  })

  it('returns default tone when no rules match', () => {
    const tone = calibrateTone(null, null, null, null)
    expect(tone.languageSharpness).toBe('conversational')
    expect(tone.technicalDepth).toBe('medium')
    expect(tone.emotionalIntensity).toBe('medium')
    expect(tone.directnessLevel).toBe('medium')
  })

  it('generates a toneDescription string', () => {
    const tone = calibrateTone('CTOs', 'SaaS', null, 'announcement')
    expect(tone.toneDescription).toContain('CTOs')
    expect(tone.toneDescription).toContain('direct')
  })

  it('includes vocabulary register', () => {
    const tone = calibrateTone('CTOs', 'SaaS', null, null)
    expect(tone.vocabularyRegister.length).toBeGreaterThan(0)
    expect(tone.vocabularyRegister).toContain('infrastructure')
  })

  it('includes anti-patterns in toneDescription', () => {
    const tone = calibrateTone('CTOs', 'SaaS', null, null)
    expect(tone.toneDescription).toContain('Do NOT use')
  })

  // Platform-based matching
  it('TikTok platform → Gen Z conversational tone', () => {
    const tone = calibrateTone(null, null, 'tiktok', null)
    expect(tone.languageSharpness).toBe('conversational')
    expect(tone.technicalDepth).toBe('low')
  })

  // Investor audience
  it('investor audience → formal, high-tech', () => {
    const tone = calibrateTone('investors', null, null, null)
    expect(tone.languageSharpness).toBe('formal')
    expect(tone.technicalDepth).toBe('high')
  })
})

// =============================================================================
// TONE TO STYLE PREFERENCE (test #4 from plan)
// =============================================================================

describe('toneToStylePreference', () => {
  it('produces valid StyleContext (test #4)', () => {
    const tone = calibrateTone('CTOs', 'SaaS', null, 'announcement')
    const pref = toneToStylePreference(tone)

    expect(pref).toHaveProperty('keywords')
    expect(Array.isArray(pref.keywords)).toBe(true)
    expect(pref.keywords!.length).toBeGreaterThan(0)
  })

  it('direct sharpness → clean/sharp/minimal keywords', () => {
    const tone = calibrateTone('CTOs', 'SaaS', null, null)
    const pref = toneToStylePreference(tone)
    expect(pref.keywords).toContain('clean')
    expect(pref.keywords).toContain('sharp')
    expect(pref.keywords).toContain('minimal')
  })

  it('conversational sharpness → warm/organic/approachable keywords', () => {
    const tone = calibrateTone(null, 'wellness', null, null)
    const pref = toneToStylePreference(tone)
    expect(pref.keywords).toContain('warm')
    expect(pref.keywords).toContain('organic')
    expect(pref.keywords).toContain('approachable')
  })

  it('formal sharpness → premium/sophisticated/refined keywords', () => {
    const tone = calibrateTone(null, 'fintech', null, null)
    const pref = toneToStylePreference(tone)
    expect(pref.keywords).toContain('premium')
    expect(pref.keywords).toContain('sophisticated')
  })

  it('high technical depth → technical/precise keywords', () => {
    const tone = calibrateTone('CTOs', 'SaaS', null, null)
    const pref = toneToStylePreference(tone)
    expect(pref.keywords).toContain('technical')
    expect(pref.keywords).toContain('precise')
  })

  it('high emotional intensity → expressive/bold keywords', () => {
    const tone = calibrateTone(null, 'sustainable fashion', null, null)
    const pref = toneToStylePreference(tone)
    expect(pref.keywords).toContain('expressive')
    expect(pref.keywords).toContain('bold')
  })

  it('low emotional intensity → restrained/professional keywords', () => {
    const tone = calibrateTone('CTOs', 'SaaS', null, null)
    const pref = toneToStylePreference(tone)
    expect(pref.keywords).toContain('restrained')
    expect(pref.keywords).toContain('professional')
  })
})
