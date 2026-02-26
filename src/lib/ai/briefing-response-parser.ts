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
  BriefingStage,
  StructureData,
  StrategicReviewData,
  StoryboardScene,
  LayoutSection,
  ContentCalendarOutline,
  VideoNarrative,
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

export type MarkerType =
  | 'STORYBOARD'
  | 'LAYOUT'
  | 'CALENDAR'
  | 'DESIGN_SPEC'
  | 'STRATEGIC_REVIEW'
  | 'BRIEF_META'
  | 'GLOBAL_STYLES'
  | 'VIDEO_NARRATIVE'

/** Maps StructureData['type'] to marker name */
const STRUCTURE_TO_MARKER: Record<StructureType, MarkerType> = {
  storyboard: 'STORYBOARD',
  layout: 'LAYOUT',
  calendar: 'CALENDAR',
  single_design: 'DESIGN_SPEC',
}

/** Maps marker name to StructureData['type'] (excludes BRIEF_META which is not a structure) */
const _MARKER_TO_STRUCTURE: Partial<Record<MarkerType, StructureType | 'strategic_review'>> = {
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
// BRIEF_META PARSING
// =============================================================================

const VALID_STAGES: Set<string> = new Set([
  'EXTRACT',
  'TASK_TYPE',
  'INTENT',
  'INSPIRATION',
  'STRUCTURE',
  'ELABORATE',
  'STRATEGIC_REVIEW',
  'MOODBOARD',
  'REVIEW',
  'DEEPEN',
  'SUBMIT',
])

export interface BriefMetaData {
  stage: BriefingStage
  fieldsExtracted: {
    taskType?: string
    intent?: string
    deliverableCategory?: string
    platform?: string
    topic?: string
  }
}

/**
 * Parse [BRIEF_META] block from AI response.
 * Returns stage declaration and any extracted fields.
 * Never throws — returns ParseResult with success=false on failure.
 */
export function parseBriefMeta(aiResponse: string): ParseResult<BriefMetaData> {
  const extracted = extractMarkerContent(aiResponse, 'BRIEF_META')

  if (!extracted) {
    return {
      success: false,
      data: null,
      isPartial: false,
      rawText: aiResponse,
      parseError: 'No [BRIEF_META] marker found',
    }
  }

  const parsed = lenientJsonParse(extracted)
  if (!parsed || Array.isArray(parsed)) {
    return {
      success: false,
      data: null,
      isPartial: false,
      rawText: aiResponse,
      parseError: 'Failed to parse BRIEF_META JSON',
    }
  }

  const stage = typeof parsed.stage === 'string' ? parsed.stage : null
  if (!stage || !VALID_STAGES.has(stage)) {
    return {
      success: false,
      data: null,
      isPartial: false,
      rawText: aiResponse,
      parseError: `Invalid stage in BRIEF_META: ${stage}`,
    }
  }

  const fieldsRaw =
    typeof parsed.fieldsExtracted === 'object' && parsed.fieldsExtracted !== null
      ? (parsed.fieldsExtracted as Record<string, unknown>)
      : {}

  return {
    success: true,
    data: {
      stage: stage as BriefingStage,
      fieldsExtracted: {
        ...(typeof fieldsRaw.taskType === 'string' ? { taskType: fieldsRaw.taskType } : {}),
        ...(typeof fieldsRaw.intent === 'string' ? { intent: fieldsRaw.intent } : {}),
        ...(typeof fieldsRaw.deliverableCategory === 'string'
          ? { deliverableCategory: fieldsRaw.deliverableCategory }
          : {}),
        ...(typeof fieldsRaw.platform === 'string' ? { platform: fieldsRaw.platform } : {}),
        ...(typeof fieldsRaw.topic === 'string' ? { topic: fieldsRaw.topic } : {}),
      },
    },
    isPartial: false,
    rawText: aiResponse,
  }
}

// =============================================================================
// GLOBAL_STYLES PARSING (Website flow)
// =============================================================================

import type { WebsiteGlobalStyles } from './briefing-state-machine'

/**
 * Parse [GLOBAL_STYLES] block from AI response.
 * Returns website global styles (colors, fonts, density) or null.
 */
export function parseGlobalStyles(aiResponse: string): WebsiteGlobalStyles | null {
  const extracted = extractMarkerContent(aiResponse, 'GLOBAL_STYLES')
  if (!extracted) return null

  const parsed = lenientJsonParse(extracted)
  if (!parsed || Array.isArray(parsed)) return null

  const styles: WebsiteGlobalStyles = {}

  const primaryColor = typeof parsed.primaryColor === 'string' ? parsed.primaryColor : undefined
  const secondaryColor =
    typeof parsed.secondaryColor === 'string' ? parsed.secondaryColor : undefined
  const fontPrimary = typeof parsed.fontPrimary === 'string' ? parsed.fontPrimary : undefined
  const fontSecondary = typeof parsed.fontSecondary === 'string' ? parsed.fontSecondary : undefined
  const layoutDensity = typeof parsed.layoutDensity === 'string' ? parsed.layoutDensity : undefined

  if (primaryColor) styles.primaryColor = primaryColor
  if (secondaryColor) styles.secondaryColor = secondaryColor
  if (fontPrimary) styles.fontPrimary = fontPrimary
  if (fontSecondary) styles.fontSecondary = fontSecondary
  if (layoutDensity && ['compact', 'balanced', 'spacious'].includes(layoutDensity)) {
    styles.layoutDensity = layoutDensity as 'compact' | 'balanced' | 'spacious'
  }

  return Object.keys(styles).length > 0 ? styles : null
}

// =============================================================================
// VIDEO_NARRATIVE PARSING
// =============================================================================

/**
 * Parse [VIDEO_NARRATIVE] block from AI response.
 * Returns the story narrative (concept, plot, audience, emotional arc, etc.) or null.
 */
export function parseVideoNarrative(aiResponse: string): ParseResult<VideoNarrative> {
  const extracted = extractMarkerContent(aiResponse, 'VIDEO_NARRATIVE')

  if (!extracted) {
    return {
      success: false,
      data: null,
      isPartial: false,
      rawText: aiResponse,
      parseError: 'No [VIDEO_NARRATIVE] marker found',
    }
  }

  const parsed = lenientJsonParse(extracted)
  if (!parsed || Array.isArray(parsed)) {
    return {
      success: false,
      data: null,
      isPartial: false,
      rawText: aiResponse,
      parseError: 'Failed to parse VIDEO_NARRATIVE JSON',
    }
  }

  const concept = getString(parsed, 'concept')
  const narrative = getString(parsed, 'narrative')
  const hook = getString(parsed, 'hook')

  // Require at least concept and narrative
  if (!concept || !narrative) {
    return {
      success: false,
      data: null,
      isPartial: true,
      rawText: aiResponse,
      parseError: 'VIDEO_NARRATIVE missing required fields (concept, narrative)',
    }
  }

  return {
    success: true,
    data: {
      concept,
      narrative,
      hook: hook ?? '',
      tags: [],
    },
    isPartial: false,
    rawText: aiResponse,
  }
}

/**
 * Generate a format reinforcement prompt for video narrative retry.
 */
export function getVideoNarrativeReinforcement(): string {
  return `IMPORTANT: Your response MUST include the story narrative wrapped in [VIDEO_NARRATIVE] markers with valid JSON. Example format:
[VIDEO_NARRATIVE]{"concept":"One-line idea for the video","narrative":"2-3 sentences covering the story arc, audience, and emotional journey. Wrap key phrases in <<double angle brackets>> to highlight them.","hook":"The opening hook that grabs attention in the first 3 seconds"}[/VIDEO_NARRATIVE]
Ensure the JSON is valid — no trailing commas, use double quotes for strings.`
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

/**
 * Extract all scene fields from a raw object, supporting multiple field name aliases.
 * The AI sometimes uses alternate names (e.g. "name" for "title", "script" for "voiceover").
 */
function extractSceneFields(s: Record<string, unknown>, index: number) {
  const title =
    getString(s, 'title') ??
    getString(s, 'name') ??
    getString(s, 'sceneTitle') ??
    getString(s, 'scene_title')
  const description =
    getString(s, 'description') ??
    getString(s, 'desc') ??
    getString(s, 'sceneDescription') ??
    getString(s, 'scene_description')
  const visualNote =
    getString(s, 'visualNote') ??
    getString(s, 'visual_note') ??
    getString(s, 'visual') ??
    getString(s, 'visualDescription') ??
    getString(s, 'visual_description')
  const voiceover =
    getString(s, 'voiceover') ??
    getString(s, 'vo') ??
    getString(s, 'script') ??
    getString(s, 'narration') ??
    undefined
  const transition = getString(s, 'transition') ?? undefined
  const cameraNote = getString(s, 'cameraNote') ?? getString(s, 'camera_note') ?? undefined
  const sceneStyleRefs =
    getStringArray(s, 'styleReferences') ?? getStringArray(s, 'style_references') ?? undefined
  const fullScript = getString(s, 'fullScript') ?? getString(s, 'full_script') ?? undefined
  const directorNotes = getString(s, 'directorNotes') ?? getString(s, 'director_notes') ?? undefined
  const referenceDescription =
    getString(s, 'referenceDescription') ?? getString(s, 'reference_description') ?? undefined
  const referenceImageIds =
    getStringArray(s, 'referenceImageIds') ?? getStringArray(s, 'reference_image_ids') ?? undefined
  const imageSearchTerms =
    getStringArray(s, 'imageSearchTerms') ?? getStringArray(s, 'image_search_terms') ?? undefined
  const filmTitleSuggestions =
    getStringArray(s, 'filmTitleSuggestions') ??
    getStringArray(s, 'film_title_suggestions') ??
    undefined
  const visualTechniques =
    getStringArray(s, 'visualTechniques') ?? getStringArray(s, 'visual_techniques') ?? undefined

  return {
    sceneNumber: getNumber(s, 'sceneNumber') ?? getNumber(s, 'scene_number') ?? index + 1,
    title: title ?? `Scene ${index + 1}`,
    description: description ?? '',
    duration: getString(s, 'duration') ?? '',
    visualNote: visualNote ?? '',
    voiceover,
    transition,
    cameraNote,
    sceneStyleRefs,
    fullScript,
    directorNotes,
    referenceDescription,
    referenceImageIds,
    imageSearchTerms,
    filmTitleSuggestions,
    visualTechniques,
    hookData: s.hookData ? validateHookData(s.hookData as Record<string, unknown>) : undefined,
    referenceVideoId: typeof s.referenceVideoId === 'string' ? s.referenceVideoId : undefined,
    hasContent: !!(title || description),
  }
}

/** Build a StoryboardScene from extracted fields */
function buildScene(f: ReturnType<typeof extractSceneFields>): StoryboardScene {
  return {
    sceneNumber: f.sceneNumber,
    title: f.title,
    description: f.description,
    duration: f.duration,
    visualNote: f.visualNote,
    ...(f.hookData ? { hookData: f.hookData } : {}),
    ...(f.referenceVideoId ? { referenceVideoId: f.referenceVideoId } : {}),
    ...(f.voiceover ? { voiceover: f.voiceover } : {}),
    ...(f.transition ? { transition: f.transition } : {}),
    ...(f.cameraNote ? { cameraNote: f.cameraNote } : {}),
    ...(f.sceneStyleRefs ? { styleReferences: f.sceneStyleRefs } : {}),
    ...(f.fullScript ? { fullScript: f.fullScript } : {}),
    ...(f.directorNotes ? { directorNotes: f.directorNotes } : {}),
    ...(f.referenceDescription ? { referenceDescription: f.referenceDescription } : {}),
    ...(f.referenceImageIds ? { referenceImageIds: f.referenceImageIds } : {}),
    ...(f.imageSearchTerms ? { imageSearchTerms: f.imageSearchTerms } : {}),
    ...(f.filmTitleSuggestions ? { filmTitleSuggestions: f.filmTitleSuggestions } : {}),
    ...(f.visualTechniques ? { visualTechniques: f.visualTechniques } : {}),
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

    const fields = extractSceneFields(scene, i)
    if (!fields.hasContent) continue

    validScenes.push(buildScene(fields))
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
      getString(section, 'name') ??
      getString(section, 'title') ??
      getString(section, 'section')
    if (!name) continue

    const draftContent =
      getString(section, 'draftContent') ?? getString(section, 'draft_content') ?? undefined
    const headline = getString(section, 'headline') ?? undefined
    const subheadline = getString(section, 'subheadline') ?? undefined
    const ctaText = getString(section, 'ctaText') ?? getString(section, 'cta_text') ?? undefined
    const sectionRefDescription =
      getString(section, 'referenceDescription') ??
      getString(section, 'reference_description') ??
      undefined

    const fidelityStr = getString(section, 'fidelity')
    const validFidelities = ['low', 'mid', 'high']
    const fidelity =
      fidelityStr && validFidelities.includes(fidelityStr)
        ? (fidelityStr as 'low' | 'mid' | 'high')
        : undefined

    validSections.push({
      sectionName: name,
      purpose: getString(section, 'purpose') ?? '',
      contentGuidance:
        getString(section, 'contentGuidance') ?? getString(section, 'content_guidance') ?? '',
      order: getNumber(section, 'order') ?? i + 1,
      ...(fidelity ? { fidelity } : {}),
      ...(draftContent ? { draftContent } : {}),
      ...(headline ? { headline } : {}),
      ...(subheadline ? { subheadline } : {}),
      ...(ctaText ? { ctaText } : {}),
      ...(sectionRefDescription ? { referenceDescription: sectionRefDescription } : {}),
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
      const visualIdentity =
        getString(pillar, 'visualIdentity') ?? getString(pillar, 'visual_identity') ?? undefined
      const colorAccent =
        getString(pillar, 'colorAccent') ?? getString(pillar, 'color_accent') ?? undefined
      const toneNote = getString(pillar, 'toneNote') ?? getString(pillar, 'tone_note') ?? undefined

      return {
        name,
        description: getString(pillar, 'description') ?? '',
        percentage: getNumber(pillar, 'percentage') ?? 0,
        ...(visualIdentity ? { visualIdentity } : {}),
        ...(colorAccent ? { colorAccent } : {}),
        ...(toneNote ? { toneNote } : {}),
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
      const sampleCopy =
        getString(post, 'sampleCopy') ?? getString(post, 'sample_copy') ?? undefined
      const captionHook =
        getString(post, 'captionHook') ?? getString(post, 'caption_hook') ?? undefined
      const visualDescription =
        getString(post, 'visualDescription') ?? getString(post, 'visual_description') ?? undefined
      const hashtagStrategy =
        getString(post, 'hashtagStrategy') ?? getString(post, 'hashtag_strategy') ?? undefined

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
        ...(sampleCopy ? { sampleCopy } : {}),
        ...(captionHook ? { captionHook } : {}),
        ...(visualDescription ? { visualDescription } : {}),
        ...(hashtagStrategy ? { hashtagStrategy } : {}),
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

  const exactCopy =
    getStringArray(parsed, 'exactCopy') ?? getStringArray(parsed, 'exact_copy') ?? undefined
  const layoutNotes =
    getString(parsed, 'layoutNotes') ?? getString(parsed, 'layout_notes') ?? undefined
  const designSpecRefDescription =
    getString(parsed, 'referenceDescription') ??
    getString(parsed, 'reference_description') ??
    undefined

  return {
    type: 'single_design',
    specification: {
      format,
      dimensions,
      keyElements:
        getStringArray(parsed, 'keyElements') ?? getStringArray(parsed, 'key_elements') ?? [],
      copyGuidance: getString(parsed, 'copyGuidance') ?? getString(parsed, 'copy_guidance') ?? '',
      ...(exactCopy ? { exactCopy } : {}),
      ...(layoutNotes ? { layoutNotes } : {}),
      ...(designSpecRefDescription ? { referenceDescription: designSpecRefDescription } : {}),
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
      const fields = extractSceneFields(scene as Record<string, unknown>, i)
      validScenes.push(buildScene(fields))
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
      const draftContent =
        getString(s, 'draftContent') ?? getString(s, 'draft_content') ?? undefined
      const headline = getString(s, 'headline') ?? undefined
      const subheadline = getString(s, 'subheadline') ?? undefined
      const ctaText = getString(s, 'ctaText') ?? getString(s, 'cta_text') ?? undefined
      const referenceDescription =
        getString(s, 'referenceDescription') ?? getString(s, 'reference_description') ?? undefined

      validSections.push({
        sectionName:
          getString(s, 'sectionName') ??
          getString(s, 'section_name') ??
          getString(s, 'name') ??
          getString(s, 'title') ??
          getString(s, 'section') ??
          `Section ${i + 1}`,
        purpose: getString(s, 'purpose') ?? '',
        contentGuidance: getString(s, 'contentGuidance') ?? '',
        order: getNumber(s, 'order') ?? i + 1,
        ...(draftContent ? { draftContent } : {}),
        ...(headline ? { headline } : {}),
        ...(subheadline ? { subheadline } : {}),
        ...(ctaText ? { ctaText } : {}),
        ...(referenceDescription ? { referenceDescription } : {}),
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

  const exactCopy =
    getStringArray(parsed, 'exactCopy') ?? getStringArray(parsed, 'exact_copy') ?? undefined
  const layoutNotes =
    getString(parsed, 'layoutNotes') ?? getString(parsed, 'layout_notes') ?? undefined
  const referenceDescription =
    getString(parsed, 'referenceDescription') ??
    getString(parsed, 'reference_description') ??
    undefined

  return {
    type: 'single_design',
    specification: {
      format,
      dimensions: [],
      keyElements: getStringArray(parsed, 'keyElements') ?? [],
      copyGuidance: getString(parsed, 'copyGuidance') ?? '',
      ...(exactCopy ? { exactCopy } : {}),
      ...(layoutNotes ? { layoutNotes } : {}),
      ...(referenceDescription ? { referenceDescription } : {}),
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
    storyboard: `[STORYBOARD]{"scenes":[{"sceneNumber":1,"title":"Hook","description":"Opening impact scene","duration":"5s","visualNote":"Close-up of frustrated founder at desk","voiceover":"Every decision feels critical...","transition":"cut","cameraNote":"close-up, handheld","imageSearchTerms":["frustrated business executive","office stress late night","entrepreneur overwhelmed"]}]}[/STORYBOARD]`,
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
