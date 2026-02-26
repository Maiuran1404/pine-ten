import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseWithRetry, type ParseWithRetryInput } from './parse-with-retry'
import { createInitialBriefingState } from '@/lib/ai/briefing-state-machine'
import type { ChatContext } from '@/lib/ai/chat'

// Mock the chat function
vi.mock('@/lib/ai/chat', () => ({
  chat: vi.fn(),
}))

// Mock the briefing prompts
vi.mock('@/lib/ai/briefing-prompts', () => ({
  buildSystemPrompt: vi.fn().mockReturnValue('mock system prompt'),
}))

// Mock the response parsers
vi.mock('@/lib/ai/briefing-response-parser', () => ({
  parseStructuredOutput: vi
    .fn()
    .mockReturnValue({ success: false, data: null, isPartial: false, rawText: '' }),
  parseStrategicReview: vi
    .fn()
    .mockReturnValue({ success: false, data: null, isPartial: false, rawText: '' }),
  parseVideoNarrative: vi
    .fn()
    .mockReturnValue({ success: false, data: null, isPartial: false, rawText: '' }),
  getFormatReinforcement: vi.fn().mockReturnValue('format reinforcement'),
  getStrategicReviewReinforcement: vi.fn().mockReturnValue('strategic review reinforcement'),
  getVideoNarrativeReinforcement: vi.fn().mockReturnValue('narrative reinforcement'),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

const { chat } = await import('@/lib/ai/chat')
const { parseStructuredOutput, parseStrategicReview, parseVideoNarrative } =
  await import('@/lib/ai/briefing-response-parser')

const mockChat = vi.mocked(chat)
const mockParseStructuredOutput = vi.mocked(parseStructuredOutput)
const mockParseStrategicReview = vi.mocked(parseStrategicReview)
const mockParseVideoNarrative = vi.mocked(parseVideoNarrative)

function createTestInput(overrides: Partial<ParseWithRetryInput> = {}): ParseWithRetryInput {
  return {
    briefingState: createInitialBriefingState(),
    brandContext: undefined,
    messages: [{ role: 'user' as const, content: 'hello' }],
    responseContent: 'AI response content',
    userId: 'user-123',
    chatContext: {} as ChatContext,
    stageBeforePhaseA: 'STRUCTURE',
    structureData: undefined,
    strategicReviewData: undefined,
    videoNarrativeData: undefined,
    structureType: 'storyboard',
    isSceneFeedback: false,
    isRegenerationRequest: false,
    narrativeApproved: false,
    clientLatestStoryboard: null,
    ...overrides,
  }
}

describe('parseWithRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChat.mockResolvedValue({ content: 'retry response' })
  })

  it('should not retry when budget is 0', async () => {
    const input = createTestInput()

    const result = await parseWithRetry(input, { maxRetries: 0 })

    expect(mockChat).not.toHaveBeenCalled()
    expect(result.retried).toBe(false)
    expect(result.retriedMarkers).toEqual([])
  })

  it('should not retry when no candidates are eligible', async () => {
    const input = createTestInput({
      stageBeforePhaseA: 'EXTRACT',
      structureType: undefined,
      isSceneFeedback: false,
      isRegenerationRequest: false,
    })

    const result = await parseWithRetry(input, { maxRetries: 1 })

    expect(mockChat).not.toHaveBeenCalled()
    expect(result.retried).toBe(false)
  })

  it('should retry structure at STRUCTURE stage when structure data is missing', async () => {
    const mockStoryboard = {
      type: 'storyboard' as const,
      scenes: [
        {
          sceneNumber: 1,
          title: 'Scene 1',
          description: 'desc',
          duration: '5s',
          visualNote: 'note',
        },
      ],
    }
    mockParseStructuredOutput.mockReturnValueOnce({
      success: true,
      data: mockStoryboard,
      isPartial: false,
      rawText: '',
    })

    const input = createTestInput({ stageBeforePhaseA: 'STRUCTURE' })
    const result = await parseWithRetry(input, { maxRetries: 1 })

    expect(mockChat).toHaveBeenCalledTimes(1)
    expect(result.retried).toBe(true)
    expect(result.retriedMarkers).toContain('STRUCTURE')
    expect(result.structureData).toEqual(mockStoryboard)
    expect(result.failures).toEqual([])
  })

  it('should retry structure at ELABORATE stage', async () => {
    const mockStoryboard = { type: 'storyboard' as const, scenes: [] }
    mockParseStructuredOutput.mockReturnValueOnce({
      success: true,
      data: mockStoryboard,
      isPartial: false,
      rawText: '',
    })

    const input = createTestInput({ stageBeforePhaseA: 'ELABORATE' })
    const result = await parseWithRetry(input, { maxRetries: 1 })

    expect(result.retried).toBe(true)
    expect(result.retriedMarkers).toContain('ELABORATE')
    expect(result.structureData).toEqual(mockStoryboard)
  })

  it('should prioritize scene feedback over structure retry', async () => {
    const mockStoryboard = { type: 'storyboard' as const, scenes: [] }
    mockParseStructuredOutput.mockReturnValueOnce({
      success: true,
      data: mockStoryboard,
      isPartial: false,
      rawText: '',
    })

    const input = createTestInput({
      stageBeforePhaseA: 'STRUCTURE',
      isSceneFeedback: true,
    })

    const result = await parseWithRetry(input, { maxRetries: 1 })

    // Should retry SCENE_FEEDBACK (priority 1) instead of STRUCTURE (priority 4)
    expect(result.retriedMarkers).toContain('SCENE_FEEDBACK')
    expect(result.retriedMarkers).not.toContain('STRUCTURE')
    // STRUCTURE should be in failures since budget was exhausted
    expect(result.budgetExhausted).toBe(true)
  })

  it('should prioritize regeneration over structure retry', async () => {
    mockParseStructuredOutput.mockReturnValueOnce({
      success: false,
      data: null,
      isPartial: false,
      rawText: '',
    })

    const input = createTestInput({
      stageBeforePhaseA: 'STRUCTURE',
      isRegenerationRequest: true,
    })

    const result = await parseWithRetry(input, { maxRetries: 1 })

    // REGENERATION (priority 2) should be tried before STRUCTURE (priority 4)
    expect(result.retriedMarkers).toContain('REGENERATION')
  })

  it('should retry video narrative when video category and no narrative/storyboard', async () => {
    const mockNarrative = { concept: 'test', narrative: 'story', hook: 'hook' }
    mockParseVideoNarrative.mockReturnValueOnce({
      success: true,
      data: mockNarrative,
      isPartial: false,
      rawText: '',
    })

    const briefingState = createInitialBriefingState()
    briefingState.deliverableCategory = 'video'

    const input = createTestInput({
      briefingState,
      stageBeforePhaseA: 'EXTRACT',
      structureType: undefined,
    })

    const result = await parseWithRetry(input, { maxRetries: 1 })

    expect(result.retried).toBe(true)
    expect(result.retriedMarkers).toContain('VIDEO_NARRATIVE')
    expect(result.videoNarrativeData).toEqual(mockNarrative)
  })

  it('should not retry video narrative when narrative is approved', async () => {
    const briefingState = createInitialBriefingState()
    briefingState.deliverableCategory = 'video'

    const input = createTestInput({
      briefingState,
      stageBeforePhaseA: 'EXTRACT',
      structureType: undefined,
      narrativeApproved: true,
    })

    const result = await parseWithRetry(input, { maxRetries: 1 })

    expect(result.retried).toBe(false)
  })

  it('should retry strategic review when review text exists without marker', async () => {
    const mockReview = {
      strengths: ['good'],
      risks: ['bad'],
      optimizationSuggestion: 'improve',
      inspirationFitScore: 'aligned' as const,
      inspirationFitNote: null,
      userOverride: false,
    }
    mockParseStrategicReview.mockReturnValueOnce({
      success: true,
      data: mockReview,
      isPartial: false,
      rawText: '',
    })

    const input = createTestInput({
      stageBeforePhaseA: 'STRATEGIC_REVIEW',
      structureType: undefined,
      responseContent: 'Here is a strategic assessment with strengths and risks.',
    })

    const result = await parseWithRetry(input, { maxRetries: 1 })

    expect(result.retried).toBe(true)
    expect(result.retriedMarkers).toContain('STRATEGIC_REVIEW')
    expect(result.strategicReviewData).toEqual(mockReview)
  })

  it('should track failures when retry does not capture primary target', async () => {
    // Chat succeeds but parsing still fails
    mockParseStructuredOutput.mockReturnValue({
      success: false,
      data: null,
      isPartial: false,
      rawText: '',
    })

    const input = createTestInput({ stageBeforePhaseA: 'STRUCTURE' })
    const result = await parseWithRetry(input, { maxRetries: 1 })

    expect(result.retried).toBe(true)
    expect(result.failures).toContain('STRUCTURE')
  })

  it('should track failures when chat() throws', async () => {
    mockChat.mockRejectedValueOnce(new Error('API error'))

    const input = createTestInput({ stageBeforePhaseA: 'STRUCTURE' })
    const result = await parseWithRetry(input, { maxRetries: 1 })

    expect(result.retried).toBe(true)
    expect(result.failures).toContain('STRUCTURE')
  })

  it('should capture bonus markers from retry response', async () => {
    const mockStoryboard = { type: 'storyboard' as const, scenes: [] }
    const mockReview = {
      strengths: ['good'],
      risks: ['bad'],
      optimizationSuggestion: 'improve',
      inspirationFitScore: 'aligned' as const,
      inspirationFitNote: null,
      userOverride: false,
    }

    // First call for candidate parsing succeeds for structure
    mockParseStructuredOutput.mockReturnValueOnce({
      success: true,
      data: mockStoryboard,
      isPartial: false,
      rawText: '',
    })

    // Bonus parsing also finds strategic review
    mockParseStrategicReview.mockReturnValueOnce({
      success: true,
      data: mockReview,
      isPartial: false,
      rawText: '',
    })

    const input = createTestInput({ stageBeforePhaseA: 'STRUCTURE' })
    const result = await parseWithRetry(input, { maxRetries: 1 })

    expect(result.structureData).toEqual(mockStoryboard)
    expect(result.strategicReviewData).toEqual(mockReview)
  })

  it('should mutate briefingState in place', async () => {
    const mockStoryboard = { type: 'storyboard' as const, scenes: [] }
    mockParseStructuredOutput.mockReturnValueOnce({
      success: true,
      data: mockStoryboard,
      isPartial: false,
      rawText: '',
    })

    const briefingState = createInitialBriefingState()
    const input = createTestInput({ briefingState, stageBeforePhaseA: 'STRUCTURE' })

    await parseWithRetry(input, { maxRetries: 1 })

    // briefingState should be mutated in place
    expect(briefingState.structure).toEqual(mockStoryboard)
  })

  it('should respect budget and report budgetExhausted', async () => {
    // Multiple candidates eligible but only 1 retry allowed
    mockParseStructuredOutput.mockReturnValue({
      success: false,
      data: null,
      isPartial: false,
      rawText: '',
    })

    const input = createTestInput({
      stageBeforePhaseA: 'STRUCTURE',
      isSceneFeedback: true, // Makes SCENE_FEEDBACK + STRUCTURE both eligible
    })

    const result = await parseWithRetry(input, { maxRetries: 1 })

    expect(mockChat).toHaveBeenCalledTimes(1) // Only 1 retry despite 2 candidates
    expect(result.budgetExhausted).toBe(true)
  })

  it('should preserve existing data when no retry is needed', async () => {
    const existingStructure = { type: 'storyboard' as const, scenes: [] }
    const input = createTestInput({
      stageBeforePhaseA: 'STRUCTURE',
      structureData: existingStructure, // Already has data
    })

    const result = await parseWithRetry(input, { maxRetries: 1 })

    // No retry needed — STRUCTURE candidate should not be eligible
    expect(result.structureData).toEqual(existingStructure)
  })
})
