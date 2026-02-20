/**
 * Tone Calibration for Briefing State Machine
 *
 * Computes a ToneProfile from audience, industry, platform, and intent.
 * Computed once at EXTRACT/INTENT, recalibrates if audience/industry changes.
 * All functions are pure — no side effects, no API calls.
 */

import type { ToneProfile } from './briefing-state-machine'
import type { StyleContext } from './brand-style-scoring'

// =============================================================================
// TONE MAPPING RULES
// =============================================================================

interface ToneRule {
  match: (ctx: ToneContext) => boolean
  profile: Omit<ToneProfile, 'toneDescription' | 'vocabularyRegister'>
  vocabularyHints: string[]
  antiPatterns: string[]
}

interface ToneContext {
  audience: string | null
  industry: string | null
  platform: string | null
  intent: string | null
}

const GLOBAL_ANTI_PATTERNS: string[] = [
  'heartbeat of the campaign',
  'trust-forward',
  'conversion-focused',
  'elevates the narrative',
  'positions you as',
  'creates a sense of',
  'speaks to the audience',
  'resonates deeply',
  'drives home the message',
  'leans into',
]

const TONE_RULES: ToneRule[] = [
  // Enterprise CTO
  {
    match: (ctx) =>
      hasAny(ctx.audience, [
        'cto',
        'c-suite',
        'executive',
        'vp engineering',
        'head of engineering',
      ]) ||
      (hasAny(ctx.industry, ['saas', 'b2b', 'enterprise']) &&
        hasAny(ctx.audience, ['technical', 'engineer', 'developer'])),
    profile: {
      languageSharpness: 'direct',
      technicalDepth: 'high',
      emotionalIntensity: 'low',
      directnessLevel: 'high',
    },
    vocabularyHints: [
      'infrastructure',
      'deployment',
      'scalable',
      'pipeline',
      'integration',
      'MTTR',
      'latency',
    ],
    antiPatterns: ['game-changer', 'revolutionary', 'exciting', 'amazing', 'synergy', 'empower'],
  },
  // Fintech / Banking
  {
    match: (ctx) => hasAny(ctx.industry, ['fintech', 'banking', 'finance', 'financial']),
    profile: {
      languageSharpness: 'formal',
      technicalDepth: 'high',
      emotionalIntensity: 'low',
      directnessLevel: 'high',
    },
    vocabularyHints: [
      'compliance',
      'regulatory',
      'trust',
      'security',
      'risk mitigation',
      'audit trail',
    ],
    antiPatterns: ['disrupt', 'move fast', 'hack', 'crush it', 'killing it'],
  },
  // B2B SaaS Marketing
  {
    match: (ctx) =>
      hasAny(ctx.industry, ['saas', 'b2b']) &&
      hasAny(ctx.intent, ['signups', 'sales', 'awareness']),
    profile: {
      languageSharpness: 'direct',
      technicalDepth: 'medium',
      emotionalIntensity: 'low',
      directnessLevel: 'high',
    },
    vocabularyHints: ['pipeline', 'conversion', 'positioning', 'ICP', 'onboarding', 'churn'],
    antiPatterns: ['journey', 'authentic self', 'vibe', 'manifesting'],
  },
  // Sustainable fashion / consumer
  {
    match: (ctx) =>
      hasAny(ctx.industry, ['fashion', 'sustainable', 'eco', 'sustainability', 'clothing']),
    profile: {
      languageSharpness: 'conversational',
      technicalDepth: 'low',
      emotionalIntensity: 'high',
      directnessLevel: 'medium',
    },
    vocabularyHints: ['story', 'values', 'community', 'transparency', 'impact', 'authentic'],
    antiPatterns: ['leverage', 'optimize', 'ROI', 'KPI', 'scalable'],
  },
  // Lifestyle / Wellness
  {
    match: (ctx) =>
      hasAny(ctx.industry, ['wellness', 'health', 'yoga', 'fitness', 'beauty', 'skincare']),
    profile: {
      languageSharpness: 'conversational',
      technicalDepth: 'low',
      emotionalIntensity: 'high',
      directnessLevel: 'low',
    },
    vocabularyHints: ['authentic', 'community', 'mindful', 'intentional', 'nourish', 'ritual'],
    antiPatterns: ['hustle', 'grind', 'aggressive', 'dominate', 'crush'],
  },
  // Travel startup
  {
    match: (ctx) => hasAny(ctx.industry, ['travel', 'hospitality', 'tourism']),
    profile: {
      languageSharpness: 'conversational',
      technicalDepth: 'low',
      emotionalIntensity: 'medium',
      directnessLevel: 'high',
    },
    vocabularyHints: ['discover', 'experience', 'explore', 'seamless', 'curated'],
    antiPatterns: ['synergy', 'leverage', 'paradigm', 'disruptive'],
  },
  // Startup founders / investors
  {
    match: (ctx) =>
      hasAny(ctx.audience, ['investor', 'founder', 'startup']) ||
      (hasAny(ctx.intent, ['announcement']) && hasAny(ctx.industry, ['startup', 'tech', 'ai'])),
    profile: {
      languageSharpness: 'formal',
      technicalDepth: 'high',
      emotionalIntensity: 'low',
      directnessLevel: 'high',
    },
    vocabularyHints: ['traction', 'market fit', 'unit economics', 'TAM', 'runway', 'cap table'],
    antiPatterns: ['vibes', 'aesthetic', 'manifesting', 'energy'],
  },
  // Gen Z consumer
  {
    match: (ctx) =>
      hasAny(ctx.audience, ['gen z', 'gen-z', 'genz', 'young', 'student', 'college']) ||
      hasAny(ctx.platform, ['tiktok']),
    profile: {
      languageSharpness: 'conversational',
      technicalDepth: 'low',
      emotionalIntensity: 'medium',
      directnessLevel: 'high',
    },
    vocabularyHints: ['native', 'organic', 'raw', 'unfiltered', 'real'],
    antiPatterns: ['leverage', 'synergy', 'optimize', 'corporate', 'stakeholder'],
  },
  // Executive / thought leadership
  {
    match: (ctx) =>
      hasAny(ctx.audience, ['ceo', 'executive', 'c-suite', 'leadership']) &&
      hasAny(ctx.intent, ['authority']),
    profile: {
      languageSharpness: 'direct',
      technicalDepth: 'medium',
      emotionalIntensity: 'low',
      directnessLevel: 'high',
    },
    vocabularyHints: ['perspective', 'insight', 'position', 'signal', 'conviction'],
    antiPatterns: ['hack', 'tip', 'trick', 'viral', 'trending'],
  },
]

// =============================================================================
// CALIBRATE TONE
// =============================================================================

/**
 * Compute a ToneProfile from audience/industry/platform/intent context.
 * Returns a default conversational tone when no rules match.
 */
export function calibrateTone(
  audience: string | null,
  industry: string | null,
  platform: string | null,
  intent: string | null
): ToneProfile {
  const ctx: ToneContext = { audience, industry, platform, intent }

  // Find matching rule (first match wins, rules ordered by specificity)
  const matchedRule = TONE_RULES.find((rule) => rule.match(ctx))

  if (!matchedRule) {
    return buildDefaultTone()
  }

  const { profile, vocabularyHints, antiPatterns } = matchedRule
  const mergedAntiPatterns = [...new Set([...antiPatterns, ...GLOBAL_ANTI_PATTERNS])]

  return {
    ...profile,
    vocabularyRegister: vocabularyHints,
    toneDescription: buildToneDescription(profile, vocabularyHints, mergedAntiPatterns, ctx),
  }
}

function buildDefaultTone(): ToneProfile {
  return {
    languageSharpness: 'conversational',
    technicalDepth: 'medium',
    emotionalIntensity: 'medium',
    directnessLevel: 'medium',
    vocabularyRegister: [],
    toneDescription:
      'Use a clear, warm, conversational tone. ' +
      'Be direct without being cold. Show genuine engagement with their project. ' +
      'Vary sentence length. Match the energy of the user. ' +
      'Use simple, everyday words. If there is a simpler way to say something, use it. No jargon or consultant-speak. ' +
      `Do NOT use: ${GLOBAL_ANTI_PATTERNS.join(', ')}.`,
  }
}

function buildToneDescription(
  profile: Omit<ToneProfile, 'toneDescription' | 'vocabularyRegister'>,
  vocabularyHints: string[],
  antiPatterns: string[],
  ctx: ToneContext
): string {
  const parts: string[] = []

  // Audience line
  if (ctx.audience) {
    parts.push(`You are speaking to ${ctx.audience}.`)
  } else if (ctx.industry) {
    parts.push(`You are speaking to someone in ${ctx.industry}.`)
  }

  // Sharpness
  parts.push(`Use ${profile.languageSharpness} language.`)

  // Technical depth
  parts.push(`Technical depth: ${profile.technicalDepth}.`)

  // Emotional warmth
  parts.push(`Emotional warmth: ${profile.emotionalIntensity}.`)

  // Words to lean on
  if (vocabularyHints.length > 0) {
    parts.push(`Words to lean on: ${vocabularyHints.join(', ')}.`)
  }

  // Anti-patterns
  if (antiPatterns.length > 0) {
    parts.push(`Do NOT use: ${antiPatterns.join(', ')}.`)
  }

  // Simple language reminder for all tone profiles
  parts.push('Use simple, everyday words. If there is a simpler way to say something, use it.')

  return parts.join(' ')
}

// =============================================================================
// TONE TO STYLE PREFERENCE
// =============================================================================

/**
 * Convert a ToneProfile into a Partial<StyleContext> for brand-style-scoring.
 * This feeds into getBrandAwareStyles() to influence style recommendations.
 */
export function toneToStylePreference(tone: ToneProfile): Partial<StyleContext> {
  const keywords: string[] = []

  // Map sharpness to style keywords
  if (tone.languageSharpness === 'direct') {
    keywords.push('clean', 'sharp', 'minimal')
  } else if (tone.languageSharpness === 'conversational') {
    keywords.push('warm', 'organic', 'approachable')
  } else if (tone.languageSharpness === 'formal') {
    keywords.push('premium', 'sophisticated', 'refined')
  }

  // Map technical depth
  if (tone.technicalDepth === 'high') {
    keywords.push('technical', 'precise', 'structured')
  } else if (tone.technicalDepth === 'low') {
    keywords.push('simple', 'friendly', 'visual')
  }

  // Map emotional intensity
  if (tone.emotionalIntensity === 'high') {
    keywords.push('expressive', 'bold', 'dynamic')
  } else if (tone.emotionalIntensity === 'low') {
    keywords.push('restrained', 'subtle', 'professional')
  }

  return { keywords }
}

// =============================================================================
// HELPERS
// =============================================================================

function hasAny(value: string | null, targets: string[]): boolean {
  if (!value) return false
  const lower = value.toLowerCase()
  return targets.some((t) => lower.includes(t.toLowerCase()))
}
