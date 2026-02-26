import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { BriefingState, SerializedBriefingState } from '@/lib/ai/briefing-state-machine'
import type { LiveBrief } from '@/components/chat/brief-panel/types'

// ---- Mock dependencies ------------------------------------------------------

const mockCreateInitialBriefingState = vi.fn()
const mockGoBackTo = vi.fn()
const mockPivotCategory = vi.fn()
const mockSerialize = vi.fn()
const mockDeserialize = vi.fn()

vi.mock('@/lib/ai/briefing-state-machine', () => ({
  createInitialBriefingState: (...args: unknown[]) => mockCreateInitialBriefingState(...args),
  goBackTo: (...args: unknown[]) => mockGoBackTo(...args),
  pivotCategory: (...args: unknown[]) => mockPivotCategory(...args),
  serialize: (...args: unknown[]) => mockSerialize(...args),
  deserialize: (...args: unknown[]) => mockDeserialize(...args),
}))

const mockBuildSystemPrompt = vi.fn()
vi.mock('@/lib/ai/briefing-prompts', () => ({
  buildSystemPrompt: (...args: unknown[]) => mockBuildSystemPrompt(...args),
}))

const mockGenerateQuickOptions = vi.fn()
vi.mock('@/lib/ai/briefing-quick-options', () => ({
  generateQuickOptions: (...args: unknown[]) => mockGenerateQuickOptions(...args),
}))

const mockSaveDraft = vi.fn()
const mockGetDraft = vi.fn()
vi.mock('@/lib/chat-drafts', () => ({
  saveDraft: (...args: unknown[]) => mockSaveDraft(...args),
  getDraft: (...args: unknown[]) => mockGetDraft(...args),
}))

// ---- Helpers ----------------------------------------------------------------

function createMockBrief(overrides: Partial<LiveBrief> = {}): LiveBrief {
  return {
    id: 'brief-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    taskSummary: { value: null, confidence: 0, source: 'pending' },
    taskType: { value: null, confidence: 0, source: 'pending' },
    intent: { value: null, confidence: 0, source: 'pending' },
    platform: { value: null, confidence: 0, source: 'pending' },
    dimensions: [],
    audience: { value: null, confidence: 0, source: 'pending' },
    topic: { value: null, confidence: 0, source: 'pending' },
    contentOutline: null,
    visualDirection: null,
    completionPercentage: 0,
    isReadyForDesigner: false,
    clarifyingQuestionsAsked: [],
    ...overrides,
  }
}

function createMockState(overrides: Partial<BriefingState> = {}): BriefingState {
  return {
    stage: 'EXTRACT',
    deliverableCategory: null,
    brief: createMockBrief(),
    industry: null,
    styleKeywords: [],
    inspirationRefs: [],
    videoReferenceIds: [],
    structure: null,
    strategicReview: null,
    sectionMoodboards: {},
    competitiveDifferentiation: null,
    deepenSelections: null,
    toneProfile: null,
    turnsInCurrentStage: 0,
    messageCount: 0,
    videoNarrative: null,
    narrativeApproved: false,
    ...overrides,
  }
}

// ---- Import hook after mocks ------------------------------------------------
const { useBriefingStateMachine } = await import('./use-briefing-state-machine')

describe('useBriefingStateMachine', () => {
  const defaultState = createMockState()

  beforeEach(() => {
    vi.clearAllMocks()

    mockCreateInitialBriefingState.mockReturnValue(defaultState)
    mockSerialize.mockImplementation((s: BriefingState) => ({
      ...s,
      brief: {
        ...s.brief,
        createdAt: s.brief.createdAt.toISOString(),
        updatedAt: s.brief.updatedAt.toISOString(),
      },
    }))
    mockDeserialize.mockImplementation((s: SerializedBriefingState) => ({
      ...s,
      brief: {
        ...s.brief,
        createdAt: new Date(s.brief.createdAt),
        updatedAt: new Date(s.brief.updatedAt),
      },
    }))
    mockBuildSystemPrompt.mockReturnValue('system prompt context')
    mockGenerateQuickOptions.mockReturnValue(null)
    mockGetDraft.mockReturnValue(null)
  })

  it('returns initial state from createInitialBriefingState', () => {
    const { result } = renderHook(() => useBriefingStateMachine(undefined, { draftId: 'draft-1' }))

    expect(mockCreateInitialBriefingState).toHaveBeenCalledWith('draft-1')
    expect(result.current.briefingState).toEqual(defaultState)
  })

  it('deserializes initial state when provided', () => {
    const serialized = {
      ...defaultState,
      brief: {
        ...defaultState.brief,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    } as unknown as SerializedBriefingState

    renderHook(() => useBriefingStateMachine(serialized))

    expect(mockDeserialize).toHaveBeenCalledWith(serialized)
    expect(mockCreateInitialBriefingState).not.toHaveBeenCalled()
  })

  it('computes serializedState from serialize', () => {
    const { result } = renderHook(() => useBriefingStateMachine(undefined, { draftId: 'draft-1' }))

    expect(mockSerialize).toHaveBeenCalledWith(defaultState)
    expect(result.current.serializedState).toBeDefined()
  })

  it('computes quickOptions from generateQuickOptions', () => {
    mockGenerateQuickOptions.mockReturnValue({ options: ['option1'] })

    const { result } = renderHook(() => useBriefingStateMachine(undefined, { draftId: 'draft-1' }))

    expect(mockGenerateQuickOptions).toHaveBeenCalledWith(defaultState)
    expect(result.current.quickOptions).toEqual({ options: ['option1'] })
  })

  it('computes systemPromptContext from buildSystemPrompt', () => {
    const brandContext = { brandName: 'TestBrand' }
    const { result } = renderHook(() =>
      useBriefingStateMachine(undefined, {
        draftId: 'draft-1',
        brandContext: brandContext as never,
      })
    )

    expect(mockBuildSystemPrompt).toHaveBeenCalledWith(defaultState, brandContext)
    expect(result.current.systemPromptContext).toBe('system prompt context')
  })

  // ---------- dispatch: GO_BACK -----------------------------------------------

  it('dispatches GO_BACK using goBackTo', () => {
    const goBackResult = createMockState({ stage: 'INTENT', turnsInCurrentStage: 0 })
    mockGoBackTo.mockReturnValue(goBackResult)

    const { result } = renderHook(() => useBriefingStateMachine(undefined, { draftId: 'draft-1' }))

    act(() => {
      result.current.dispatch({ type: 'GO_BACK', stage: 'INTENT' })
    })

    expect(mockGoBackTo).toHaveBeenCalledWith(defaultState, 'INTENT')
    expect(result.current.briefingState).toEqual(goBackResult)
  })

  // ---------- dispatch: PIVOT_CATEGORY ----------------------------------------

  it('dispatches PIVOT_CATEGORY using pivotCategory', () => {
    const pivotResult = createMockState({
      stage: 'STRUCTURE',
      deliverableCategory: 'video',
      turnsInCurrentStage: 0,
    })
    mockPivotCategory.mockReturnValue(pivotResult)

    const { result } = renderHook(() => useBriefingStateMachine(undefined, { draftId: 'draft-1' }))

    act(() => {
      result.current.dispatch({ type: 'PIVOT_CATEGORY', category: 'video' })
    })

    expect(mockPivotCategory).toHaveBeenCalledWith(defaultState, 'video')
    expect(result.current.briefingState.deliverableCategory).toBe('video')
  })

  // ---------- dispatch: STAGE_RESPONSE ----------------------------------------

  it('dispatches STAGE_RESPONSE to advance from STRATEGIC_REVIEW to MOODBOARD', () => {
    const reviewState = createMockState({
      stage: 'STRATEGIC_REVIEW',
      strategicReview: {
        strengths: ['good'],
        risks: [],
        optimizationSuggestion: '',
        inspirationFitScore: 'aligned',
        inspirationFitNote: null,
        userOverride: false,
      },
    })
    mockCreateInitialBriefingState.mockReturnValue(reviewState)

    const { result } = renderHook(() => useBriefingStateMachine(undefined, { draftId: 'draft-1' }))

    act(() => {
      result.current.dispatch({ type: 'STAGE_RESPONSE', response: 'accept' })
    })

    expect(result.current.briefingState.stage).toBe('MOODBOARD')
    expect(result.current.briefingState.turnsInCurrentStage).toBe(0)
  })

  it('dispatches STAGE_RESPONSE with override sets userOverride flag', () => {
    const reviewState = createMockState({
      stage: 'STRATEGIC_REVIEW',
      strategicReview: {
        strengths: ['good'],
        risks: [],
        optimizationSuggestion: '',
        inspirationFitScore: 'aligned',
        inspirationFitNote: null,
        userOverride: false,
      },
    })
    mockCreateInitialBriefingState.mockReturnValue(reviewState)

    const { result } = renderHook(() => useBriefingStateMachine(undefined, { draftId: 'draft-1' }))

    act(() => {
      result.current.dispatch({ type: 'STAGE_RESPONSE', response: 'override' })
    })

    expect(result.current.briefingState.stage).toBe('MOODBOARD')
    expect(result.current.briefingState.strategicReview?.userOverride).toBe(true)
  })

  // ---------- dispatch: SELECT_DEEPEN -----------------------------------------

  it('dispatches SELECT_DEEPEN to add a deepen option', () => {
    const { result } = renderHook(() => useBriefingStateMachine(undefined, { draftId: 'draft-1' }))

    act(() => {
      result.current.dispatch({ type: 'SELECT_DEEPEN', option: 'production_copy' })
    })

    expect(result.current.briefingState.deepenSelections).toEqual(['production_copy'])

    act(() => {
      result.current.dispatch({ type: 'SELECT_DEEPEN', option: 'ab_variant' })
    })

    expect(result.current.briefingState.deepenSelections).toEqual(['production_copy', 'ab_variant'])
  })

  // ---------- dispatch: CONFIRM_SUBMIT ----------------------------------------

  it('dispatches CONFIRM_SUBMIT to transition to SUBMIT stage', () => {
    const { result } = renderHook(() => useBriefingStateMachine(undefined, { draftId: 'draft-1' }))

    act(() => {
      result.current.dispatch({ type: 'CONFIRM_SUBMIT' })
    })

    expect(result.current.briefingState.stage).toBe('SUBMIT')
    expect(result.current.briefingState.turnsInCurrentStage).toBe(0)
  })

  // ---------- syncFromServer --------------------------------------------------

  it('updates state from server-returned serialized state', () => {
    const serverState = {
      stage: 'INSPIRATION',
      deliverableCategory: 'design',
      brief: {
        ...defaultState.brief,
        createdAt: '2024-06-01T00:00:00.000Z',
        updatedAt: '2024-06-01T00:00:00.000Z',
      },
      industry: null,
      styleKeywords: ['modern'],
      inspirationRefs: [],
      videoReferenceIds: [],
      structure: null,
      strategicReview: null,
      sectionMoodboards: {},
      competitiveDifferentiation: null,
      deepenSelections: null,
      toneProfile: null,
      turnsInCurrentStage: 1,
      messageCount: 3,
    } as unknown as SerializedBriefingState

    const deserialized = createMockState({
      stage: 'INSPIRATION',
      deliverableCategory: 'design',
      styleKeywords: ['modern'],
      turnsInCurrentStage: 1,
      messageCount: 3,
    })
    mockDeserialize.mockReturnValue(deserialized)

    const { result } = renderHook(() => useBriefingStateMachine(undefined, { draftId: 'draft-1' }))

    act(() => {
      result.current.syncFromServer(serverState)
    })

    expect(mockDeserialize).toHaveBeenCalledWith(serverState)
    expect(result.current.briefingState.stage).toBe('INSPIRATION')
    expect(result.current.briefingState.styleKeywords).toEqual(['modern'])
  })

  // ---------- Persistence -----------------------------------------------------

  it('persists state changes via saveDraft when draft exists', () => {
    const existingDraft = { id: 'draft-1', briefingState: null, updatedAt: '' }
    mockGetDraft.mockReturnValue(existingDraft)

    const goBackResult = createMockState({ stage: 'INTENT' })
    mockGoBackTo.mockReturnValue(goBackResult)

    const { result } = renderHook(() => useBriefingStateMachine(undefined, { draftId: 'draft-1' }))

    act(() => {
      result.current.dispatch({ type: 'GO_BACK', stage: 'INTENT' })
    })

    expect(mockGetDraft).toHaveBeenCalledWith('draft-1')
    expect(mockSaveDraft).toHaveBeenCalled()
  })

  it('does not persist when no draftId is provided', () => {
    const goBackResult = createMockState({ stage: 'INTENT' })
    mockGoBackTo.mockReturnValue(goBackResult)

    const { result } = renderHook(() => useBriefingStateMachine())

    act(() => {
      result.current.dispatch({ type: 'GO_BACK', stage: 'INTENT' })
    })

    expect(mockGetDraft).not.toHaveBeenCalled()
    expect(mockSaveDraft).not.toHaveBeenCalled()
  })
})
