import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { logger } from '@/lib/logger'
import type { ChatTestScores } from '@/db/schema'
import type { SerializedBriefingState, DeliverableCategory } from './briefing-state-machine'
import type { ChatTestScenario } from './chat-test-scenarios'

// =============================================================================
// CONSTANTS
// =============================================================================

const SCORING_WEIGHTS = {
  efficiency: 0.25,
  extraction: 0.25,
  quality: 0.3,
  completeness: 0.2,
}

/** Ideal turn counts by deliverable category (best-case scenario) */
const IDEAL_TURNS: Record<DeliverableCategory, number> = {
  video: 8,
  website: 8,
  content: 9,
  design: 7,
  brand: 8,
  unknown: 9,
}

const STALL_THRESHOLD = 3
const STALL_PENALTY_PER = 5
const FORCE_ADVANCE_PENALTY = 10
const QUALITY_JUDGE_TIMEOUT_MS = 15_000
const QUALITY_JUDGE_MODEL = 'claude-haiku-4-5-20251001'
const TRANSCRIPT_CHAR_LIMIT = 6000

// =============================================================================
// MESSAGE TYPE (mirrors step route)
// =============================================================================

interface TestMessage {
  turn: number
  role: 'user' | 'assistant'
  content: string
  stage: string
  generatedBy?: 'quick_option' | 'template' | 'haiku'
  durationMs?: number
}

// =============================================================================
// EFFICIENCY SCORING
// =============================================================================

export function calculateEfficiencyScore(
  messages: TestMessage[],
  deliverableCategory: DeliverableCategory | null,
  forceAdvanceCount: number
): ChatTestScores['efficiency'] {
  const userMessages = messages.filter((m) => m.role === 'user')
  const totalTurns = userMessages.length

  // Detect stalls (3+ user turns in same stage)
  const stageTurnCounts: Record<string, number> = {}
  for (const msg of userMessages) {
    stageTurnCounts[msg.stage] = (stageTurnCounts[msg.stage] ?? 0) + 1
  }
  const stalls = Object.entries(stageTurnCounts)
    .filter(([, turns]) => turns >= STALL_THRESHOLD)
    .map(([stage, turns]) => ({ stage, turns }))

  const category = deliverableCategory ?? 'unknown'
  const idealTurns = IDEAL_TURNS[category]

  // Base score: how close to ideal
  const baseScore = Math.round(100 * (idealTurns / Math.max(totalTurns, idealTurns)))

  // Penalties
  const stallPenalty = stalls.reduce(
    (sum, s) => sum + (s.turns - STALL_THRESHOLD + 1) * STALL_PENALTY_PER,
    0
  )
  const forceAdvancePenalty = forceAdvanceCount * FORCE_ADVANCE_PENALTY

  const score = Math.max(0, Math.min(100, baseScore - stallPenalty - forceAdvancePenalty))

  return {
    score,
    totalTurns,
    stalls,
    forceAdvances: forceAdvanceCount,
    idealTurns,
  }
}

// =============================================================================
// EXTRACTION SCORING
// =============================================================================

export function calculateExtractionScore(
  briefingState: SerializedBriefingState | null,
  scenarioConfig: ChatTestScenario,
  forceSeededFields: string[]
): ChatTestScores['extraction'] {
  if (!briefingState) {
    return {
      score: 0,
      fields: [],
      organicAccuracy: 0,
      totalAccuracy: 0,
    }
  }

  const brief = briefingState.brief
  const forceSeededSet = new Set(forceSeededFields)

  // Define fields to check: { field, expected from scenario, actual from brief }
  const fields: ChatTestScores['extraction']['fields'] = []

  // Platform
  if (scenarioConfig.platform) {
    const actual = brief.platform?.value ?? null
    const expected = scenarioConfig.platform.toLowerCase()
    fields.push({
      field: 'platform',
      expected,
      actual,
      organic: !forceSeededSet.has('platform'),
    })
  }

  // Intent
  if (scenarioConfig.intent) {
    const actual = brief.intent?.value ?? null
    fields.push({
      field: 'intent',
      expected: scenarioConfig.intent,
      actual,
      organic: !forceSeededSet.has('intent'),
    })
  }

  // Task type (content type maps loosely)
  if (scenarioConfig.contentType) {
    const actual = brief.taskType?.value ?? null
    fields.push({
      field: 'taskType',
      expected: scenarioConfig.contentType,
      actual,
      organic: !forceSeededSet.has('taskType'),
    })
  }

  // Deliverable category
  if (scenarioConfig.contentType) {
    const actual = briefingState.deliverableCategory
    const expectedCategory = mapContentTypeToCategory(scenarioConfig.contentType)
    fields.push({
      field: 'deliverableCategory',
      expected: expectedCategory,
      actual,
      organic: !forceSeededSet.has('deliverableCategory'),
    })
  }

  // Calculate accuracy
  const totalFields = fields.length
  if (totalFields === 0) {
    return { score: 50, fields, organicAccuracy: 50, totalAccuracy: 50 }
  }

  const matchedTotal = fields.filter((f) => fieldMatches(f.expected, f.actual)).length
  const organicFields = fields.filter((f) => f.organic)
  const matchedOrganic = organicFields.filter((f) => fieldMatches(f.expected, f.actual)).length

  const totalAccuracy = Math.round((matchedTotal / totalFields) * 100)
  const organicAccuracy =
    organicFields.length > 0 ? Math.round((matchedOrganic / organicFields.length) * 100) : 100

  // Score weights organic accuracy more heavily (70/30)
  const score = Math.round(organicAccuracy * 0.7 + totalAccuracy * 0.3)

  return { score, fields, organicAccuracy, totalAccuracy }
}

function fieldMatches(expected: string, actual: string | null): boolean {
  if (!actual) return false
  const e = expected.toLowerCase().trim()
  const a = actual.toLowerCase().trim()
  return a === e || a.includes(e) || e.includes(a)
}

function mapContentTypeToCategory(contentType: string): string {
  const ct = contentType.toLowerCase()
  if (['video', 'reel'].includes(ct)) return 'video'
  if (['banner', 'thumbnail', 'flyer', 'post', 'carousel'].includes(ct)) return 'design'
  if (ct === 'website') return 'website'
  return 'content'
}

// =============================================================================
// QUALITY SCORING (LLM-as-Judge)
// =============================================================================

export async function calculateQualityScore(
  messages: TestMessage[],
  scenarioConfig: ChatTestScenario
): Promise<ChatTestScores['quality']> {
  try {
    // Build transcript, truncated to limit
    const transcript = messages
      .map((m) => `[${m.role.toUpperCase()}] (${m.stage}): ${m.content}`)
      .join('\n')
      .slice(0, TRANSCRIPT_CHAR_LIMIT)

    const anthropic = new Anthropic()

    const response = await Promise.race([
      anthropic.messages.create({
        model: QUALITY_JUDGE_MODEL,
        max_tokens: 150,
        messages: [
          {
            role: 'user',
            content: `You are evaluating an AI design briefing conversation. The client is from ${scenarioConfig.industry}, building ${scenarioConfig.contentType || 'content'} for ${scenarioConfig.platform || 'unknown platform'}.

Rate each dimension 1-5 (5 = best):
- coherence: Logical flow, relevant questions, no confusion
- redundancy: Avoids re-asking known info (5 = no redundancy)
- helpfulness: Efficiently extracts info, moves brief forward
- tone: Professional, warm, appropriate for design consultation

Transcript:
${transcript}

Reply with ONLY a JSON object: {"coherence":N,"redundancy":N,"helpfulness":N,"tone":N}`,
          },
        ],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Quality judge timeout')), QUALITY_JUDGE_TIMEOUT_MS)
      ),
    ])

    const block = response.content[0]
    if (block.type !== 'text') {
      throw new Error('No text response from quality judge')
    }

    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = block.text.match(/\{[\s\S]*?\}/)
    if (!jsonMatch) {
      throw new Error(`Could not parse quality scores from: ${block.text}`)
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      coherence: number
      redundancy: number
      helpfulness: number
      tone: number
    }

    // Validate ranges
    const clamp = (n: number) => Math.max(1, Math.min(5, Math.round(n)))
    const coherence = clamp(parsed.coherence)
    const redundancy = clamp(parsed.redundancy)
    const helpfulness = clamp(parsed.helpfulness)
    const tone = clamp(parsed.tone)

    // Map 4-20 raw total to 0-100
    const rawTotal = coherence + redundancy + helpfulness + tone
    const score = Math.round(((rawTotal - 4) / 16) * 100)

    return {
      score,
      coherence,
      redundancy,
      helpfulness,
      tone,
      evaluatedAt: new Date().toISOString(),
      model: QUALITY_JUDGE_MODEL,
    }
  } catch (err) {
    logger.error({ err }, 'Quality scoring failed')
    return {
      score: 0,
      coherence: 0,
      redundancy: 0,
      helpfulness: 0,
      tone: 0,
      evaluatedAt: new Date().toISOString(),
      model: QUALITY_JUDGE_MODEL,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// =============================================================================
// COMPLETENESS SCORING
// =============================================================================

export function calculateCompletenessScore(
  briefingState: SerializedBriefingState | null,
  forceSeededFields: string[]
): ChatTestScores['completeness'] {
  if (!briefingState) {
    return {
      score: 0,
      organicCompletion: 0,
      totalCompletion: 0,
      fieldStatus: [],
    }
  }

  const brief = briefingState.brief
  const forceSeededSet = new Set(forceSeededFields)

  // Check core brief fields (mirrors calculateBriefCompletion in brief-panel/types.ts)
  const coreFields: Array<{ field: string; filled: boolean }> = [
    { field: 'taskSummary', filled: !!brief.taskSummary?.value },
    { field: 'taskType', filled: !!brief.taskType?.value },
    { field: 'intent', filled: !!brief.intent?.value },
    { field: 'platform', filled: !!brief.platform?.value },
    { field: 'audience', filled: !!brief.audience?.value },
    { field: 'topic', filled: !!brief.topic?.value },
  ]

  // Check structure
  coreFields.push({
    field: 'structure',
    filled: !!briefingState.structure,
  })

  // Check visual direction
  coreFields.push({
    field: 'visualDirection',
    filled: !!(brief.visualDirection && brief.visualDirection.selectedStyles.length > 0),
  })

  // Check strategic review
  coreFields.push({
    field: 'strategicReview',
    filled: !!briefingState.strategicReview,
  })

  const fieldStatus = coreFields.map((f) => ({
    ...f,
    organic: !forceSeededSet.has(f.field),
  }))

  const totalFilled = fieldStatus.filter((f) => f.filled).length
  const totalFields = fieldStatus.length
  const organicFilled = fieldStatus.filter((f) => f.filled && f.organic).length
  const organicTotal = fieldStatus.filter((f) => f.organic).length

  const totalCompletion = totalFields > 0 ? Math.round((totalFilled / totalFields) * 100) : 0
  const organicCompletion =
    organicTotal > 0 ? Math.round((organicFilled / organicTotal) * 100) : totalCompletion

  // Score weights organic completion more heavily
  const score = Math.round(organicCompletion * 0.6 + totalCompletion * 0.4)

  return { score, organicCompletion, totalCompletion, fieldStatus }
}

// =============================================================================
// COMPOSITE SCORING
// =============================================================================

export function calculateCompositeScore(scores: ChatTestScores): number {
  const qualityAvailable = scores.quality && !scores.quality.error

  if (qualityAvailable) {
    return Math.round(
      scores.efficiency.score * SCORING_WEIGHTS.efficiency +
        scores.extraction.score * SCORING_WEIGHTS.extraction +
        scores.quality!.score * SCORING_WEIGHTS.quality +
        scores.completeness.score * SCORING_WEIGHTS.completeness
    )
  }

  // Redistribute quality's 30% across other dimensions
  const redistributed = SCORING_WEIGHTS.quality / 3
  return Math.round(
    scores.efficiency.score * (SCORING_WEIGHTS.efficiency + redistributed) +
      scores.extraction.score * (SCORING_WEIGHTS.extraction + redistributed) +
      scores.completeness.score * (SCORING_WEIGHTS.completeness + redistributed)
  )
}

// =============================================================================
// ORCHESTRATOR
// =============================================================================

export async function scoreCompletedRun(
  messages: TestMessage[],
  briefingState: SerializedBriefingState | null,
  scenarioConfig: ChatTestScenario,
  deliverableCategory: DeliverableCategory | null,
  forceAdvanceCount: number,
  forceSeededFields: string[]
): Promise<{ compositeScore: number; scores: ChatTestScores }> {
  const efficiency = calculateEfficiencyScore(messages, deliverableCategory, forceAdvanceCount)
  const extraction = calculateExtractionScore(briefingState, scenarioConfig, forceSeededFields)
  const completeness = calculateCompletenessScore(briefingState, forceSeededFields)

  // Quality scoring has a timeout — if it fails, quality is null
  let quality: ChatTestScores['quality'] = null
  try {
    quality = await calculateQualityScore(messages, scenarioConfig)
    // If the judge returned an error, treat it as null for composite
    if (quality?.error) {
      logger.warn(
        { error: quality.error },
        'Quality scoring returned error, using null for composite'
      )
    }
  } catch (err) {
    logger.error({ err }, 'Quality scoring threw, proceeding without it')
  }

  const scores: ChatTestScores = { efficiency, extraction, quality, completeness }
  const compositeScore = calculateCompositeScore(scores)

  return { compositeScore, scores }
}
