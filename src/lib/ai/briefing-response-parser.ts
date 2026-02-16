/**
 * Structured Output Parser for Briefing State Machine
 *
 * Parses AI responses containing structured markers:
 * [STORYBOARD]{json}[/STORYBOARD], [LAYOUT]{json}[/LAYOUT],
 * [CALENDAR]{json}[/CALENDAR], [DESIGN_SPEC]{json}[/DESIGN_SPEC],
 * [STRATEGIC_REVIEW]{json}[/STRATEGIC_REVIEW]
 *
 * Uses tiered fallback:
 * - Tier 1: Lenient parsing (trailing commas, single quotes, unquoted keys)
 * - Tier 2: Returns retry info so caller can re-prompt AI (no API call here)
 * - Tier 3: Text-only fallback (rawText + isPartial, never throws)
 *
 * All functions are pure — no side effects, no API calls.
 */

import type {
  StructureData,
  StrategicReviewData,
  StoryboardScene,
  LayoutSection,
  ContentCalendarOutline,
} from './briefing-state-machine'

// =============================================================================
// TYPES
// =============================================================================

export interface ParseResult<T> {
  success: boolean
  data: T | null
  isPartial: boolean
  rawText: string
  parseError?: string
}

export type StructureType = StructureData['type']

export type MarkerType = 'STORYBOARD' | 'LAYOUT' | 'CALENDAR' | 'DESIGN_SPEC' | 'STRATEGIC_REVIEW'

/** Maps StructureData['type'] to marker name */
const STRUCTURE_TO_MARKER: Record<StructureType, MarkerType> = {
  storyboard: 'STORYBOARD',
  layout: 'LAYOUT',
  calendar: 'CALENDAR',
  single_design: 'DESIGN_SPEC',
}

/** Maps marker name to StructureData['type'] */
const _MARKER_TO_STRUCTURE: Record<MarkerType, StructureType | 'strategic_review'> = {
  STORYBOARD: 'storyboard',
  LAYOUT: 'layout',
  CALENDAR: 'calendar',
  DESIGN_SPEC: 'single_design',
  STRATEGIC_REVIEW: 'strategic_review',
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Parse structured output from AI response.
 * Returns ParseResult with tiered fallback — never throws.
 *
 * @param aiResponse - Full AI response text
 * @param expectedType - Expected structure type ('storyboard', 'layout', 'calendar', 'single_design')
 */
export function parseStructuredOutput(
  aiResponse: string,
  expectedType: StructureType
): ParseResult<StructureData> {
  const marker = STRUCTURE_TO_MARKER[expectedType]
  if (!marker) {
    return {
      success: false,
      data: null,
      isPartial: false,
      rawText: aiResponse,
      parseError: `Unknown structure type: ${expectedType}`,
    }
  }

  return parseMarker(aiResponse, marker, expectedType)
}

/**
 * Parse a strategic review from AI response.
 */
export function parseStrategicReview(aiResponse: string): ParseResult<StrategicReviewData> {
  const extracted = extractMarkerContent(aiResponse, 'STRATEGIC_REVIEW')

  if (!extracted) {
    return {
      success: false,
      data: null,
      isPartial: false,
      rawText: aiResponse,
      parseError: 'No [STRATEGIC_REVIEW] marker found',
    }
  }

  // Tier 1: Lenient parse
  const parsed = lenientJsonParse(extracted)
  if (parsed !== null) {
    const validated = validateStrategicReview(parsed)
    if (validated) {
      return { success: true, data: validated, isPartial: false, rawText: aiResponse }
    }

    // Partial extraction
    const partial = partialStrategicReview(parsed)
    if (partial) {
      return {
        success: false,
        data: null,
        isPartial: true,
        rawText: aiResponse,
        parseError: 'Strategic review data is incomplete',
      }
    }
  }

  return {
    success: false,
    data: null,
    isPartial: false,
    rawText: aiResponse,
    parseError: 'Failed to parse strategic review JSON',
  }
}

// =============================================================================
// CORE PARSING
// =============================================================================

function parseMarker(
  aiResponse: string,
  marker: MarkerType,
  expectedType: StructureType
): ParseResult<StructureData> {
  const extracted = extractMarkerContent(aiResponse, marker)

  if (!extracted) {
    // No marker found — Tier 3 fallback
    return {
      success: false,
      data: null,
      isPartial: false,
      rawText: aiResponse,
      parseError: `No [${marker}] marker found in response`,
    }
  }

  // Tier 1: Lenient parse
  const parsed = lenientJsonParse(extracted)
  if (parsed !== null) {
    const validated = validateAndBuildStructure(parsed, expectedType)
    if (validated) {
      return { success: true, data: validated, isPartial: false, rawText: aiResponse }
    }

    // Partial extraction — something parsed but didn't validate fully
    const partial = partialExtract(parsed, expectedType)
    if (partial) {
      return {
        success: true,
        data: partial,
        isPartial: true,
        rawText: aiResponse,
        parseError: 'Partial data extracted — some fields missing or invalid',
      }
    }
  }

  // Tier 2: Return retry info (caller decides whether to make another AI call)
  return {
    success: false,
    data: null,
    isPartial: false,
    rawText: aiResponse,
    parseError: `Failed to parse [${marker}] content. Retry with format reinforcement recommended.`,
  }
}

// =============================================================================
// MARKER EXTRACTION
// =============================================================================

/**
 * Extract content between [MARKER] and [/MARKER] tags.
 * Handles whitespace, newlines, and optional surrounding text.
 */
export function extractMarkerContent(text: string, marker: MarkerType): string | null {
  const openTag = `[${marker}]`
  const closeTag = `[/${marker}]`

  const openIdx = text.indexOf(openTag)
  if (openIdx === -1) return null

  const contentStart = openIdx + openTag.length
  const closeIdx = text.indexOf(closeTag, contentStart)

  if (closeIdx === -1) {
    // Marker opened but never closed — try to extract anyway
    const remaining = text.slice(contentStart).trim()
    return remaining.length > 0 ? remaining : null
  }

  const content = text.slice(contentStart, closeIdx).trim()
  return content.length > 0 ? content : null
}

// =============================================================================
// LENIENT JSON PARSING (Tier 1)
// =============================================================================

/**
 * Parse JSON with lenient error recovery:
 * - Strip trailing commas before } and ]
 * - Convert single quotes to double quotes (outside of already double-quoted strings)
 * - Handle unquoted keys
 * - Remove comments
 *
 * Returns parsed object or null on failure.
 */
export function lenientJsonParse(input: string): Record<string, unknown> | unknown[] | null {
  // Try strict parse first
  try {
    const result = JSON.parse(input)
    if (typeof result === 'object' && result !== null) {
      return result as Record<string, unknown> | unknown[]
    }
    return null
  } catch {
    // Continue to lenient parsing
  }

  let cleaned = input

  // Remove single-line comments
  cleaned = cleaned.replace(/\/\/[^\n]*/g, '')

  // Remove multi-line comments
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '')

  // Strip trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1')

  // Replace single quotes with double quotes (simple approach)
  // Only replace when it looks like JSON string boundaries
  cleaned = replaceSingleQuotes(cleaned)

  // Handle unquoted keys: { key: value } → { "key": value }
  cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')

  try {
    const result = JSON.parse(cleaned)
    if (typeof result === 'object' && result !== null) {
      return result as Record<string, unknown> | unknown[]
    }
    return null
  } catch {
    return null
  }
}

/**
 * Replace single quotes used as JSON string delimiters with double quotes.
 * Preserves single quotes inside double-quoted strings and apostrophes in values.
 */
function replaceSingleQuotes(input: string): string {
  const chars = input.split('')
  const result: string[] = []
  let inDoubleQuote = false
  let inSingleQuote = false

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]
    const prevChar = i > 0 ? chars[i - 1] : ''

    if (char === '"' && prevChar !== '\\' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      result.push(char)
    } else if (char === "'" && prevChar !== '\\' && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote
      result.push('"')
    } else {
      result.push(char)
    }
  }

  return result.join('')
}

// =============================================================================
// STRUCTURE VALIDATION
// =============================================================================

function validateAndBuildStructure(
  parsed: Record<string, unknown> | unknown[],
  expectedType: StructureType
): StructureData | null {
  switch (expectedType) {
    case 'storyboard':
      return validateStoryboard(parsed)
    case 'layout':
      return validateLayout(parsed)
    case 'calendar':
      return validateCalendar(parsed)
    case 'single_design':
      return validateDesignSpec(parsed)
    default:
      return null
  }
}

function validateStoryboard(parsed: Record<string, unknown> | unknown[]): StructureData | null {
  // Accept array directly or object with scenes array
  const scenes = Array.isArray(parsed) ? parsed : getArray(parsed, 'scenes')
  if (!scenes || scenes.length === 0) return null

  const validScenes: StoryboardScene[] = []
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i] as Record<string, unknown>
    if (typeof scene !== 'object' || scene === null) continue

    const title = getString(scene, 'title')
    const description = getString(scene, 'description')

    if (!title && !description) continue

    validScenes.push({
      sceneNumber: getNumber(scene, 'sceneNumber') ?? i + 1,
      title: title ?? `Scene ${i + 1}`,
      description: description ?? '',
      duration: getString(scene, 'duration') ?? '',
      visualNote: getString(scene, 'visualNote') ?? getString(scene, 'visual_note') ?? '',
      ...(scene.hookData
        ? { hookData: validateHookData(scene.hookData as Record<string, unknown>) }
        : {}),
      ...(typeof scene.referenceVideoId === 'string'
        ? { referenceVideoId: scene.referenceVideoId }
        : {}),
    })
  }

  if (validScenes.length === 0) return null
  return { type: 'storyboard', scenes: validScenes }
}

function validateHookData(data: Record<string, unknown>):
  | {
      targetPersona: string
      painMetric: string
      quantifiableImpact: string
    }
  | undefined {
  const persona = getString(data, 'targetPersona') ?? getString(data, 'target_persona')
  const pain = getString(data, 'painMetric') ?? getString(data, 'pain_metric')
  const impact = getString(data, 'quantifiableImpact') ?? getString(data, 'quantifiable_impact')

  if (!persona && !pain && !impact) return undefined
  return {
    targetPersona: persona ?? '',
    painMetric: pain ?? '',
    quantifiableImpact: impact ?? '',
  }
}

function validateLayout(parsed: Record<string, unknown> | unknown[]): StructureData | null {
  const sections = Array.isArray(parsed) ? parsed : getArray(parsed, 'sections')
  if (!sections || sections.length === 0) return null

  const validSections: LayoutSection[] = []
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i] as Record<string, unknown>
    if (typeof section !== 'object' || section === null) continue

    const name =
      getString(section, 'sectionName') ??
      getString(section, 'section_name') ??
      getString(section, 'name')
    if (!name) continue

    validSections.push({
      sectionName: name,
      purpose: getString(section, 'purpose') ?? '',
      contentGuidance:
        getString(section, 'contentGuidance') ?? getString(section, 'content_guidance') ?? '',
      order: getNumber(section, 'order') ?? i + 1,
    })
  }

  if (validSections.length === 0) return null
  return { type: 'layout', sections: validSections }
}

function validateCalendar(parsed: Record<string, unknown> | unknown[]): StructureData | null {
  if (Array.isArray(parsed)) return null

  const outline: Partial<ContentCalendarOutline> = {}

  outline.totalDuration =
    getString(parsed, 'totalDuration') ?? getString(parsed, 'total_duration') ?? ''
  outline.postingCadence =
    getString(parsed, 'postingCadence') ?? getString(parsed, 'posting_cadence') ?? ''
  outline.platforms = getStringArray(parsed, 'platforms') ?? []
  outline.distributionLogic =
    getString(parsed, 'distributionLogic') ?? getString(parsed, 'distribution_logic') ?? ''

  // Content pillars
  const pillarsRaw = getArray(parsed, 'contentPillars') ?? getArray(parsed, 'content_pillars')
  if (!pillarsRaw || pillarsRaw.length === 0) return null

  outline.contentPillars = pillarsRaw
    .map((p) => {
      const pillar = p as Record<string, unknown>
      if (typeof pillar !== 'object' || pillar === null) return null
      const name = getString(pillar, 'name')
      if (!name) return null
      return {
        name,
        description: getString(pillar, 'description') ?? '',
        percentage: getNumber(pillar, 'percentage') ?? 0,
      }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)

  if (outline.contentPillars.length === 0) return null

  // Weeks
  const weeksRaw = getArray(parsed, 'weeks')
  outline.weeks = (weeksRaw ?? [])
    .map((w, idx) => {
      const week = w as Record<string, unknown>
      if (typeof week !== 'object' || week === null) return null
      return {
        weekNumber: getNumber(week, 'weekNumber') ?? getNumber(week, 'week_number') ?? idx + 1,
        narrativeArc: getString(week, 'narrativeArc') ?? getString(week, 'narrative_arc') ?? '',
        theme: getString(week, 'theme') ?? '',
        posts: validatePosts(getArray(week, 'posts') ?? []),
      }
    })
    .filter((w): w is NonNullable<typeof w> => w !== null)

  // CTA escalation
  const ctaRaw = (parsed.ctaEscalation ?? parsed.cta_escalation) as
    | Record<string, unknown>
    | undefined
  outline.ctaEscalation = ctaRaw
    ? validateCtaEscalation(ctaRaw)
    : {
        awarenessPhase: { weeks: [], ctaStyle: '' },
        engagementPhase: { weeks: [], ctaStyle: '' },
        conversionPhase: { weeks: [], ctaStyle: '' },
      }

  return { type: 'calendar', outline: outline as ContentCalendarOutline }
}

function validatePosts(posts: unknown[]): Array<{
  dayOfWeek: string
  pillarType: 'pillar' | 'support'
  topic: string
  format: string
  cta: string
  engagementTrigger: string
}> {
  return posts
    .map((p) => {
      const post = p as Record<string, unknown>
      if (typeof post !== 'object' || post === null) return null
      return {
        dayOfWeek:
          getString(post, 'dayOfWeek') ??
          getString(post, 'day_of_week') ??
          getString(post, 'day') ??
          '',
        pillarType: (getString(post, 'pillarType') ??
          getString(post, 'pillar_type') ??
          'support') as 'pillar' | 'support',
        topic: getString(post, 'topic') ?? '',
        format: getString(post, 'format') ?? '',
        cta: getString(post, 'cta') ?? '',
        engagementTrigger:
          getString(post, 'engagementTrigger') ?? getString(post, 'engagement_trigger') ?? '',
      }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
}

function validateCtaEscalation(raw: Record<string, unknown>): {
  awarenessPhase: { weeks: number[]; ctaStyle: string }
  engagementPhase: { weeks: number[]; ctaStyle: string }
  conversionPhase: { weeks: number[]; ctaStyle: string }
} {
  const parsePhase = (key: string, altKey: string) => {
    const phase = (raw[key] ?? raw[altKey]) as Record<string, unknown> | undefined
    if (!phase || typeof phase !== 'object') return { weeks: [], ctaStyle: '' }
    return {
      weeks: getNumberArray(phase, 'weeks') ?? [],
      ctaStyle: getString(phase, 'ctaStyle') ?? getString(phase, 'cta_style') ?? '',
    }
  }

  return {
    awarenessPhase: parsePhase('awarenessPhase', 'awareness_phase'),
    engagementPhase: parsePhase('engagementPhase', 'engagement_phase'),
    conversionPhase: parsePhase('conversionPhase', 'conversion_phase'),
  }
}

function validateDesignSpec(parsed: Record<string, unknown> | unknown[]): StructureData | null {
  if (Array.isArray(parsed)) return null

  const format = getString(parsed, 'format')
  if (!format) return null

  const dimensionsRaw = getArray(parsed, 'dimensions')
  const dimensions = (dimensionsRaw ?? [])
    .map((d) => {
      const dim = d as Record<string, unknown>
      if (typeof dim !== 'object' || dim === null) return null
      const width = getNumber(dim, 'width') ?? 0
      const height = getNumber(dim, 'height') ?? 0
      return {
        width,
        height,
        label: getString(dim, 'label') ?? '',
        aspectRatio:
          getString(dim, 'aspectRatio') ??
          getString(dim, 'aspect_ratio') ??
          computeAspectRatio(width, height),
      }
    })
    .filter((d): d is NonNullable<typeof d> => d !== null)

  return {
    type: 'single_design',
    specification: {
      format,
      dimensions,
      keyElements:
        getStringArray(parsed, 'keyElements') ?? getStringArray(parsed, 'key_elements') ?? [],
      copyGuidance: getString(parsed, 'copyGuidance') ?? getString(parsed, 'copy_guidance') ?? '',
    },
  }
}

function validateStrategicReview(
  parsed: Record<string, unknown> | unknown[]
): StrategicReviewData | null {
  if (Array.isArray(parsed)) return null

  const strengths = getStringArray(parsed, 'strengths')
  const risks = getStringArray(parsed, 'risks')
  const suggestion =
    getString(parsed, 'optimizationSuggestion') ?? getString(parsed, 'optimization_suggestion')

  if (!strengths || strengths.length === 0) return null
  if (!risks || risks.length === 0) return null
  if (!suggestion) return null

  const fitScore =
    getString(parsed, 'inspirationFitScore') ?? getString(parsed, 'inspiration_fit_score')
  const validFitScores = ['aligned', 'minor_mismatch', 'significant_mismatch']

  return {
    strengths,
    risks,
    optimizationSuggestion: suggestion,
    inspirationFitScore: validFitScores.includes(fitScore ?? '')
      ? (fitScore as StrategicReviewData['inspirationFitScore'])
      : 'aligned',
    inspirationFitNote:
      getString(parsed, 'inspirationFitNote') ?? getString(parsed, 'inspiration_fit_note') ?? null,
    userOverride: false,
  }
}

// =============================================================================
// PARTIAL EXTRACTION
// =============================================================================

function partialExtract(
  parsed: Record<string, unknown> | unknown[],
  expectedType: StructureType
): StructureData | null {
  switch (expectedType) {
    case 'storyboard':
      return partialStoryboard(parsed)
    case 'layout':
      return partialLayout(parsed)
    case 'calendar':
      return partialCalendar(parsed)
    case 'single_design':
      return partialDesignSpec(parsed)
    default:
      return null
  }
}

function partialStoryboard(parsed: Record<string, unknown> | unknown[]): StructureData | null {
  const scenes = Array.isArray(parsed) ? parsed : getArray(parsed, 'scenes')
  if (!scenes) return null

  const validScenes: StoryboardScene[] = []
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]
    if (typeof scene === 'object' && scene !== null) {
      const s = scene as Record<string, unknown>
      validScenes.push({
        sceneNumber: getNumber(s, 'sceneNumber') ?? i + 1,
        title: getString(s, 'title') ?? `Scene ${i + 1}`,
        description: getString(s, 'description') ?? '',
        duration: getString(s, 'duration') ?? '',
        visualNote: getString(s, 'visualNote') ?? '',
      })
    }
  }

  if (validScenes.length === 0) return null
  return { type: 'storyboard', scenes: validScenes }
}

function partialLayout(parsed: Record<string, unknown> | unknown[]): StructureData | null {
  const sections = Array.isArray(parsed) ? parsed : getArray(parsed, 'sections')
  if (!sections) return null

  const validSections: LayoutSection[] = []
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]
    if (typeof section === 'object' && section !== null) {
      const s = section as Record<string, unknown>
      validSections.push({
        sectionName: getString(s, 'sectionName') ?? getString(s, 'name') ?? `Section ${i + 1}`,
        purpose: getString(s, 'purpose') ?? '',
        contentGuidance: getString(s, 'contentGuidance') ?? '',
        order: getNumber(s, 'order') ?? i + 1,
      })
    }
  }

  if (validSections.length === 0) return null
  return { type: 'layout', sections: validSections }
}

function partialCalendar(parsed: Record<string, unknown> | unknown[]): StructureData | null {
  if (Array.isArray(parsed)) return null

  const pillarsRaw = getArray(parsed, 'contentPillars') ?? getArray(parsed, 'content_pillars')
  if (!pillarsRaw || pillarsRaw.length === 0) return null

  const pillars = pillarsRaw
    .map((p) => {
      const pillar = p as Record<string, unknown>
      if (typeof pillar !== 'object' || pillar === null) return null
      return {
        name: getString(pillar, 'name') ?? '',
        description: getString(pillar, 'description') ?? '',
        percentage: getNumber(pillar, 'percentage') ?? 0,
      }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)

  if (pillars.length === 0) return null

  return {
    type: 'calendar',
    outline: {
      totalDuration: getString(parsed, 'totalDuration') ?? '',
      postingCadence: getString(parsed, 'postingCadence') ?? '',
      platforms: getStringArray(parsed, 'platforms') ?? [],
      distributionLogic: getString(parsed, 'distributionLogic') ?? '',
      contentPillars: pillars,
      weeks: [],
      ctaEscalation: {
        awarenessPhase: { weeks: [], ctaStyle: '' },
        engagementPhase: { weeks: [], ctaStyle: '' },
        conversionPhase: { weeks: [], ctaStyle: '' },
      },
    },
  }
}

function partialDesignSpec(parsed: Record<string, unknown> | unknown[]): StructureData | null {
  if (Array.isArray(parsed)) return null

  const format = getString(parsed, 'format')
  if (!format) return null

  return {
    type: 'single_design',
    specification: {
      format,
      dimensions: [],
      keyElements: getStringArray(parsed, 'keyElements') ?? [],
      copyGuidance: getString(parsed, 'copyGuidance') ?? '',
    },
  }
}

function partialStrategicReview(parsed: Record<string, unknown> | unknown[]): boolean {
  if (Array.isArray(parsed)) return false
  // Return true if anything recognizable is present
  return !!(
    getStringArray(parsed, 'strengths')?.length ||
    getStringArray(parsed, 'risks')?.length ||
    getString(parsed, 'optimizationSuggestion')
  )
}

// =============================================================================
// FORMAT REINFORCEMENT (for Tier 2 retry)
// =============================================================================

/**
 * Generate a format reinforcement prompt for the caller to append
 * when retrying the AI call. Phase 1 is pure — this just produces the text.
 */
export function getFormatReinforcement(expectedType: StructureType): string {
  const marker = STRUCTURE_TO_MARKER[expectedType]
  const exampleMap: Record<StructureType, string> = {
    storyboard: `[STORYBOARD]{"scenes":[{"sceneNumber":1,"title":"Hook","description":"...","duration":"5s","visualNote":"..."}]}[/STORYBOARD]`,
    layout: `[LAYOUT]{"sections":[{"sectionName":"Hero","purpose":"...","contentGuidance":"...","order":1}]}[/LAYOUT]`,
    calendar: `[CALENDAR]{"totalDuration":"4 weeks","postingCadence":"3x/week","platforms":["Instagram"],"contentPillars":[{"name":"...","description":"...","percentage":40}],"weeks":[],"ctaEscalation":{"awarenessPhase":{"weeks":[1,2],"ctaStyle":"soft"},"engagementPhase":{"weeks":[3],"ctaStyle":"engage"},"conversionPhase":{"weeks":[4],"ctaStyle":"direct"}}}[/CALENDAR]`,
    single_design: `[DESIGN_SPEC]{"format":"Social post","dimensions":[{"width":1080,"height":1080,"label":"Instagram square"}],"keyElements":["Logo","CTA"],"copyGuidance":"..."}[/DESIGN_SPEC]`,
  }

  return `IMPORTANT: Your response MUST include the structured data wrapped in [${marker}] markers with valid JSON. Example format:\n${exampleMap[expectedType]}\nEnsure the JSON is valid — no trailing commas, use double quotes for strings.`
}

/**
 * Generate a format reinforcement prompt for strategic review retry.
 */
export function getStrategicReviewReinforcement(): string {
  return `IMPORTANT: Your response MUST include strategic review data wrapped in [STRATEGIC_REVIEW] markers with valid JSON. Example format:
[STRATEGIC_REVIEW]{"strengths":["..."],"risks":["..."],"optimizationSuggestion":"...","inspirationFitScore":"aligned","inspirationFitNote":null}[/STRATEGIC_REVIEW]
Ensure the JSON is valid — no trailing commas, use double quotes for strings.`
}

// =============================================================================
// UTILITY HELPERS
// =============================================================================

function getString(obj: Record<string, unknown>, key: string): string | null {
  const val = obj[key]
  return typeof val === 'string' && val.length > 0 ? val : null
}

function getNumber(obj: Record<string, unknown>, key: string): number | null {
  const val = obj[key]
  return typeof val === 'number' && !isNaN(val) ? val : null
}

function getArray(obj: Record<string, unknown>, key: string): unknown[] | null {
  const val = obj[key]
  return Array.isArray(val) && val.length > 0 ? val : null
}

function getStringArray(obj: Record<string, unknown>, key: string): string[] | null {
  const arr = getArray(obj, key)
  if (!arr) return null
  const strings = arr.filter((item): item is string => typeof item === 'string')
  return strings.length > 0 ? strings : null
}

function getNumberArray(obj: Record<string, unknown>, key: string): number[] | null {
  const arr = getArray(obj, key)
  if (!arr) return null
  const numbers = arr.filter((item): item is number => typeof item === 'number')
  return numbers.length > 0 ? numbers : null
}

function computeAspectRatio(width: number, height: number): string {
  if (width <= 0 || height <= 0) return ''
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const d = gcd(width, height)
  return `${width / d}:${height / d}`
}
