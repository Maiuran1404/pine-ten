import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ChatTestScores } from '@/db/schema'
import type { ChatTestScenario } from './chat-test-scenarios'

// Mock server-only (no-op)
vi.mock('server-only', () => ({}))

// Mock Anthropic
const mockCreate = vi.fn().mockResolvedValue({
  content: [
    {
      type: 'text',
      text: '{"coherence":4,"redundancy":3,"helpfulness":4,"tone":5}',
    },
  ],
})

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate }
    },
  }
})

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

// Import after mocks
const {
  calculateEfficiencyScore,
  calculateExtractionScore,
  calculateCompletenessScore,
  calculateCompositeScore,
  calculateQualityScore,
} = await import('./chat-test-scoring')

// =============================================================================
// FIXTURES
// =============================================================================

const baseScenario: ChatTestScenario = {
  name: 'Test Scenario',
  industry: 'SaaS',
  companyName: 'TestCo',
  platform: 'Instagram',
  contentType: 'carousel',
  intent: 'sales',
  openingMessage: 'I need some designs',
}

function makeMessages(
  stages: string[],
  turnsPerStage: number = 1
): Array<{
  turn: number
  role: 'user' | 'assistant'
  content: string
  stage: string
}> {
  const messages: Array<{
    turn: number
    role: 'user' | 'assistant'
    content: string
    stage: string
  }> = []
  let turn = 1
  for (const stage of stages) {
    for (let i = 0; i < turnsPerStage; i++) {
      messages.push({ turn, role: 'user', content: `User message ${turn}`, stage })
      messages.push({ turn, role: 'assistant', content: `Assistant message ${turn}`, stage })
      turn++
    }
  }
  return messages
}

function makeBriefingState(overrides: Record<string, unknown> = {}) {
  return {
    stage: 'REVIEW' as const,
    deliverableCategory: 'design' as const,
    brief: {
      id: 'test-id',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      taskSummary: { value: 'Test task', confidence: 0.9, source: 'inferred' as const },
      taskType: { value: 'single_asset' as const, confidence: 0.9, source: 'inferred' as const },
      intent: { value: 'sales' as const, confidence: 0.9, source: 'inferred' as const },
      platform: { value: 'instagram' as const, confidence: 0.9, source: 'inferred' as const },
      dimensions: [],
      audience: { value: { name: 'Test audience' }, confidence: 0.8, source: 'inferred' as const },
      topic: { value: 'Test topic', confidence: 0.8, source: 'inferred' as const },
      contentOutline: null,
      visualDirection: {
        selectedStyles: [
          {
            id: '1',
            name: 'Bold',
            description: null,
            imageUrl: '',
            deliverableType: 'design',
            styleAxis: 'bold',
            subStyle: null,
            semanticTags: [],
          },
        ],
        moodKeywords: [],
        colorPalette: [],
        typography: { primary: '', secondary: '' },
        avoidElements: [],
      },
      completionPercentage: 80,
      isReadyForDesigner: true,
      clarifyingQuestionsAsked: [],
    },
    industry: null,
    styleKeywords: [],
    inspirationRefs: [],
    videoReferenceIds: [],
    structure: {
      type: 'single_design' as const,
      specification: { format: 'Digital', dimensions: [], keyElements: [], copyGuidance: '' },
    },
    strategicReview: {
      strengths: ['Good'],
      risks: [],
      optimizationSuggestion: '',
      inspirationFitScore: 'aligned' as const,
      inspirationFitNote: null,
      userOverride: false,
    },
    sectionMoodboards: {},
    competitiveDifferentiation: null,
    deepenSelections: null,
    toneProfile: null,
    turnsInCurrentStage: 0,
    messageCount: 10,
    ...overrides,
  }
}

// =============================================================================
// EFFICIENCY SCORING
// =============================================================================

describe('calculateEfficiencyScore', () => {
  it('returns 100 for ideal number of turns with no stalls or force-advances', () => {
    // Design ideal = 7 turns, so 7 user messages
    const messages = makeMessages(
      ['EXTRACT', 'TASK_TYPE', 'INTENT', 'STRUCTURE', 'INSPIRATION', 'STRATEGIC_REVIEW', 'REVIEW'],
      1
    )
    const result = calculateEfficiencyScore(messages, 'design', 0)
    expect(result.score).toBe(100)
    expect(result.totalTurns).toBe(7)
    expect(result.stalls).toHaveLength(0)
    expect(result.forceAdvances).toBe(0)
  })

  it('reduces score for more turns than ideal', () => {
    // 14 user turns for design (ideal 7) = ~50% base
    const messages = makeMessages(
      ['EXTRACT', 'TASK_TYPE', 'INTENT', 'STRUCTURE', 'INSPIRATION', 'STRATEGIC_REVIEW', 'REVIEW'],
      2
    )
    const result = calculateEfficiencyScore(messages, 'design', 0)
    expect(result.score).toBe(50)
    expect(result.totalTurns).toBe(14)
  })

  it('applies stall penalty for 3+ turns in same stage', () => {
    // 3 turns in EXTRACT = stall detected
    const messages = makeMessages(['EXTRACT', 'EXTRACT', 'EXTRACT', 'TASK_TYPE', 'INTENT'], 1)
    const result = calculateEfficiencyScore(messages, 'design', 0)
    expect(result.stalls).toHaveLength(1)
    expect(result.stalls[0].stage).toBe('EXTRACT')
    expect(result.stalls[0].turns).toBe(3)
    // Score should be less than without stall
    const noStall = calculateEfficiencyScore(
      makeMessages(['EXTRACT', 'TASK_TYPE', 'INTENT', 'STRUCTURE', 'INSPIRATION'], 1),
      'design',
      0
    )
    expect(result.score).toBeLessThan(noStall.score)
  })

  it('applies force advance penalty', () => {
    const messages = makeMessages(
      ['EXTRACT', 'TASK_TYPE', 'INTENT', 'STRUCTURE', 'INSPIRATION', 'STRATEGIC_REVIEW', 'REVIEW'],
      1
    )
    const noForce = calculateEfficiencyScore(messages, 'design', 0)
    const withForce = calculateEfficiencyScore(messages, 'design', 2)
    expect(withForce.score).toBe(noForce.score - 20)
    expect(withForce.forceAdvances).toBe(2)
  })

  it('clamps score to 0-100 range', () => {
    const messages = makeMessages(Array(20).fill('EXTRACT'), 1)
    const result = calculateEfficiencyScore(messages, 'design', 5)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('uses unknown ideal turns when category is null', () => {
    const messages = makeMessages(['EXTRACT'], 1)
    const result = calculateEfficiencyScore(messages, null, 0)
    expect(result.idealTurns).toBe(9) // unknown = 9
  })
})

// =============================================================================
// EXTRACTION SCORING
// =============================================================================

describe('calculateExtractionScore', () => {
  it('returns 0 for null briefing state', () => {
    const result = calculateExtractionScore(null, baseScenario, [])
    expect(result.score).toBe(0)
    expect(result.fields).toHaveLength(0)
  })

  it('returns high score when all fields match organically', () => {
    const state = makeBriefingState()
    const result = calculateExtractionScore(state as never, baseScenario, [])
    expect(result.score).toBeGreaterThan(70)
    expect(result.organicAccuracy).toBeGreaterThan(0)
    expect(result.fields.length).toBeGreaterThan(0)
    // All should be organic
    expect(result.fields.every((f) => f.organic)).toBe(true)
  })

  it('distinguishes organic vs force-seeded fields', () => {
    const state = makeBriefingState()
    const forceSeeded = ['platform', 'intent']
    const result = calculateExtractionScore(state as never, baseScenario, forceSeeded)

    const organicFields = result.fields.filter((f) => f.organic)
    const seededFields = result.fields.filter((f) => !f.organic)
    expect(seededFields.length).toBe(2)
    expect(organicFields.length).toBeGreaterThan(0)
  })

  it('weighs organic accuracy higher than total', () => {
    const state = makeBriefingState({
      brief: {
        ...makeBriefingState().brief,
        platform: { value: null, confidence: 0, source: 'pending' as const },
        intent: { value: 'sales' as const, confidence: 0.9, source: 'inferred' as const },
      },
    })
    // Force-seeded platform (missing organically), but intent is organic
    const result = calculateExtractionScore(state as never, baseScenario, ['platform'])
    // Organic accuracy should reflect that platform wasn't organically extracted
    expect(result.totalAccuracy).toBeGreaterThan(0)
  })

  it('handles scenario with missing fields gracefully', () => {
    const emptyScenario: ChatTestScenario = {
      name: 'Vague',
      industry: 'Unknown',
      companyName: 'Test',
      platform: '',
      contentType: '',
      intent: '',
      openingMessage: 'Help me',
    }
    const state = makeBriefingState()
    const result = calculateExtractionScore(state as never, emptyScenario, [])
    // With no expected fields, should return neutral score
    expect(result.score).toBe(50)
  })
})

// =============================================================================
// COMPLETENESS SCORING
// =============================================================================

describe('calculateCompletenessScore', () => {
  it('returns 0 for null state', () => {
    const result = calculateCompletenessScore(null, [])
    expect(result.score).toBe(0)
    expect(result.fieldStatus).toHaveLength(0)
  })

  it('returns high score for fully filled state', () => {
    const state = makeBriefingState()
    const result = calculateCompletenessScore(state as never, [])
    expect(result.score).toBeGreaterThan(80)
    expect(result.totalCompletion).toBeGreaterThan(80)
    expect(result.fieldStatus.length).toBeGreaterThan(0)
  })

  it('tracks organic vs force-seeded fields', () => {
    const state = makeBriefingState()
    const result = calculateCompletenessScore(state as never, ['taskType', 'intent'])
    const organic = result.fieldStatus.filter((f) => f.organic)
    const seeded = result.fieldStatus.filter((f) => !f.organic)
    expect(seeded.length).toBe(2)
    expect(organic.length).toBeGreaterThan(0)
  })

  it('returns lower score when fields are missing', () => {
    const state = makeBriefingState({
      brief: {
        ...makeBriefingState().brief,
        taskSummary: { value: null, confidence: 0, source: 'pending' as const },
        topic: { value: null, confidence: 0, source: 'pending' as const },
        audience: { value: null, confidence: 0, source: 'pending' as const },
      },
      structure: null,
      strategicReview: null,
    })
    const full = calculateCompletenessScore(makeBriefingState() as never, [])
    const partial = calculateCompletenessScore(state as never, [])
    expect(partial.score).toBeLessThan(full.score)
    expect(partial.totalCompletion).toBeLessThan(full.totalCompletion)
  })
})

// =============================================================================
// COMPOSITE SCORING
// =============================================================================

describe('calculateCompositeScore', () => {
  it('calculates weighted average with all dimensions', () => {
    const scores: ChatTestScores = {
      efficiency: { score: 80, totalTurns: 8, stalls: [], forceAdvances: 0, idealTurns: 7 },
      extraction: { score: 90, fields: [], organicAccuracy: 90, totalAccuracy: 90 },
      quality: {
        score: 70,
        coherence: 4,
        redundancy: 3,
        helpfulness: 4,
        tone: 3,
        evaluatedAt: '',
        model: '',
      },
      completeness: { score: 60, organicCompletion: 60, totalCompletion: 70, fieldStatus: [] },
    }
    const composite = calculateCompositeScore(scores)
    // 80*0.25 + 90*0.25 + 70*0.30 + 60*0.20 = 20 + 22.5 + 21 + 12 = 75.5 -> 76
    expect(composite).toBe(76)
  })

  it('redistributes quality weight when quality has error', () => {
    const scores: ChatTestScores = {
      efficiency: { score: 80, totalTurns: 8, stalls: [], forceAdvances: 0, idealTurns: 7 },
      extraction: { score: 90, fields: [], organicAccuracy: 90, totalAccuracy: 90 },
      quality: {
        score: 0,
        coherence: 0,
        redundancy: 0,
        helpfulness: 0,
        tone: 0,
        evaluatedAt: '',
        model: '',
        error: 'timeout',
      },
      completeness: { score: 60, organicCompletion: 60, totalCompletion: 70, fieldStatus: [] },
    }
    const composite = calculateCompositeScore(scores)
    // Quality weight (0.30) redistributed evenly: +0.10 each
    // 80*0.35 + 90*0.35 + 60*0.30 = 28 + 31.5 + 18 = 77.5 -> 78
    expect(composite).toBe(78)
  })

  it('redistributes quality weight when quality is null', () => {
    const scores: ChatTestScores = {
      efficiency: { score: 100, totalTurns: 7, stalls: [], forceAdvances: 0, idealTurns: 7 },
      extraction: { score: 100, fields: [], organicAccuracy: 100, totalAccuracy: 100 },
      quality: null,
      completeness: { score: 100, organicCompletion: 100, totalCompletion: 100, fieldStatus: [] },
    }
    const composite = calculateCompositeScore(scores)
    expect(composite).toBe(100)
  })

  it('returns 0 for all-zero scores', () => {
    const scores: ChatTestScores = {
      efficiency: { score: 0, totalTurns: 50, stalls: [], forceAdvances: 5, idealTurns: 7 },
      extraction: { score: 0, fields: [], organicAccuracy: 0, totalAccuracy: 0 },
      quality: null,
      completeness: { score: 0, organicCompletion: 0, totalCompletion: 0, fieldStatus: [] },
    }
    const composite = calculateCompositeScore(scores)
    expect(composite).toBe(0)
  })
})

// =============================================================================
// QUALITY SCORING (with mocked Anthropic)
// =============================================================================

describe('calculateQualityScore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('parses LLM judge response and maps to 0-100', async () => {
    const messages = makeMessages(['EXTRACT', 'TASK_TYPE', 'INTENT'], 1)
    const result = await calculateQualityScore(messages, baseScenario)

    expect(result).not.toBeNull()
    expect(result!.coherence).toBe(4)
    expect(result!.redundancy).toBe(3)
    expect(result!.helpfulness).toBe(4)
    expect(result!.tone).toBe(5)
    // (4+3+4+5) = 16, mapped: ((16-4)/16)*100 = 75
    expect(result!.score).toBe(75)
    expect(result!.model).toBe('claude-haiku-4-5-20251001')
    expect(result!.error).toBeUndefined()
  })

  it('returns error result when LLM fails', async () => {
    mockCreate.mockRejectedValueOnce(new Error('API down'))

    const messages = makeMessages(['EXTRACT'], 1)
    const result = await calculateQualityScore(messages, baseScenario)
    expect(result!.error).toBeDefined()
    expect(result!.score).toBe(0)
  })
})
