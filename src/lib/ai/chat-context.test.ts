import { describe, it, expect, vi } from 'vitest'

// Mock the style-keywords constants to keep tests deterministic
vi.mock('@/lib/constants/style-keywords', () => ({
  INDUSTRY_KEYWORDS: {
    technology: ['tech', 'software', 'app', 'saas', 'startup'],
    food_beverage: ['coffee', 'restaurant', 'food'],
    fitness: ['gym', 'fitness', 'workout'],
  },
  CONTEXT_INDUSTRY_KEYWORDS: ['tech', 'saas', 'fitness', 'food', 'startup'],
  CONTEXT_STYLE_KEYWORDS: ['minimal', 'bold', 'vibrant', 'elegant', 'playful'],
}))

vi.mock('@/lib/ai/brand-style-scoring', () => ({}))

import { detectIndustryFromMessage, extractStyleContext } from './chat-context'

describe('detectIndustryFromMessage', () => {
  it('detects technology industry from keywords', () => {
    const messages = [{ role: 'user', content: 'We are a tech startup building a SaaS app' }]
    expect(detectIndustryFromMessage(messages)).toBe('technology')
  })

  it('detects food_beverage industry', () => {
    const messages = [{ role: 'user', content: 'We run a coffee restaurant' }]
    expect(detectIndustryFromMessage(messages)).toBe('food_beverage')
  })

  it('returns null when no industry detected', () => {
    const messages = [{ role: 'user', content: 'Hello how are you' }]
    expect(detectIndustryFromMessage(messages)).toBeNull()
  })

  it('returns the industry with the highest keyword count', () => {
    const messages = [
      { role: 'user', content: 'We are a tech startup building a saas software app' },
    ]
    // technology has more matches: tech, startup, saas, app, software
    expect(detectIndustryFromMessage(messages)).toBe('technology')
  })

  it('only considers user messages', () => {
    const messages = [
      { role: 'assistant', content: 'I can help with your tech startup' },
      { role: 'user', content: 'We need a gym logo' },
    ]
    expect(detectIndustryFromMessage(messages)).toBe('fitness')
  })

  it('only considers last 3 user messages', () => {
    const messages = [
      { role: 'user', content: 'tech startup' },
      { role: 'user', content: 'hello' },
      { role: 'user', content: 'hello again' },
      { role: 'user', content: 'We run a gym' },
    ]
    // First message about tech should be dropped (only last 3 user msgs)
    expect(detectIndustryFromMessage(messages)).toBe('fitness')
  })
})

describe('extractStyleContext', () => {
  it('extracts industry keywords from messages', () => {
    const messages = [{ role: 'user', content: 'We are a tech saas company' }]
    const context = extractStyleContext(messages)
    expect(context.keywords).toContain('tech')
    expect(context.keywords).toContain('saas')
  })

  it('extracts style keywords from messages', () => {
    const messages = [{ role: 'user', content: 'I want a minimal and bold design' }]
    const context = extractStyleContext(messages)
    expect(context.keywords).toContain('minimal')
    expect(context.keywords).toContain('bold')
  })

  it('detects youtube platform', () => {
    const messages = [{ role: 'user', content: 'We need a youtube thumbnail' }]
    const context = extractStyleContext(messages)
    expect(context.platform).toBe('youtube')
  })

  it('detects instagram platform', () => {
    const messages = [{ role: 'user', content: 'This is for instagram' }]
    const context = extractStyleContext(messages)
    expect(context.platform).toBe('instagram')
  })

  it('detects linkedin platform', () => {
    const messages = [{ role: 'user', content: 'Post for linkedin' }]
    const context = extractStyleContext(messages)
    expect(context.platform).toBe('linkedin')
  })

  it('detects tiktok platform', () => {
    const messages = [{ role: 'user', content: 'tiktok video needed' }]
    const context = extractStyleContext(messages)
    expect(context.platform).toBe('tiktok')
  })

  it('returns undefined for keywords when none found', () => {
    const messages = [{ role: 'user', content: 'hello there' }]
    const context = extractStyleContext(messages)
    expect(context.keywords).toBeUndefined()
  })

  it('returns undefined for platform when none found', () => {
    const messages = [{ role: 'user', content: 'design something' }]
    const context = extractStyleContext(messages)
    expect(context.platform).toBeUndefined()
  })

  it('sets industry from detectIndustryFromMessage', () => {
    const messages = [{ role: 'user', content: 'We are a tech startup' }]
    const context = extractStyleContext(messages)
    expect(context.industry).toBe('technology')
  })
})
