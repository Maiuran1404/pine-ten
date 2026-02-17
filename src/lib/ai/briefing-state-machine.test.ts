import { describe, it, expect } from 'vitest'
import {
  createInitialBriefingState,
  evaluateTransitions,
  goBackTo,
  pivotCategory,
  serialize,
  deserialize,
  STALL_CONFIG,
  type BriefingState,
  type BriefingStage,
} from './briefing-state-machine'
import type {
  InferenceResult,
  InferredField,
  TaskType,
  Intent,
  Platform,
  ContentType,
} from '@/components/chat/brief-panel/types'

// =============================================================================
// HELPERS
// =============================================================================

function makeInferredField<T>(
  value: T | null,
  confidence: number,
  source: 'pending' | 'inferred' | 'confirmed' = 'inferred'
): InferredField<T> {
  return { value, confidence, source }
}

function makeInference(overrides: Partial<InferenceResult> = {}): InferenceResult {
  return {
    taskType: makeInferredField<TaskType>(null, 0, 'pending'),
    intent: makeInferredField<Intent>(null, 0, 'pending'),
    platform: makeInferredField<Platform>(null, 0, 'pending'),
    contentType: makeInferredField<ContentType>(null, 0, 'pending'),
    quantity: makeInferredField<number>(null, 0, 'pending'),
    duration: makeInferredField<string>(null, 0, 'pending'),
    topic: makeInferredField<string>(null, 0, 'pending'),
    audienceId: makeInferredField<string>(null, 0, 'pending'),
    ...overrides,
  }
}

// =============================================================================
// PLAN EXAMPLE #1: "I want a design that is light and airy similar to legora"
// taskType=null, intent=null => TASK_TYPE
// =============================================================================

describe('evaluateTransitions', () => {
  it('lands on TASK_TYPE when taskType and intent are unknown (example #1)', () => {
    const state = createInitialBriefingState()
    const inference = makeInference()
    expect(evaluateTransitions(state, inference)).toBe('TASK_TYPE')
  })

  // Plan example #2: "Stripe launch videos for B2B SaaS, CTOs, clean minimal"
  // taskType=video(0.85), intent=announcement(0.85) => INSPIRATION
  it('lands on INSPIRATION when both taskType and intent are high-confidence (example #2)', () => {
    const state = createInitialBriefingState()
    const inference = makeInference({
      taskType: makeInferredField('single_asset', 0.85),
      intent: makeInferredField('announcement', 0.85),
    })
    expect(evaluateTransitions(state, inference)).toBe('INSPIRATION')
  })

  // Plan example #3: "30-day Instagram content plan, sustainable fashion"
  // taskType=multi_asset(0.95), intent=null => INTENT
  it('lands on INTENT when taskType known but intent unknown (example #3)', () => {
    const state = createInitialBriefingState()
    const inference = makeInference({
      taskType: makeInferredField('multi_asset_plan', 0.95),
      intent: makeInferredField<Intent>(null, 0, 'pending'),
    })
    expect(evaluateTransitions(state, inference)).toBe('INTENT')
  })

  // Plan example #4: "We're launching a new AI tool next month"
  // taskType=null, intent=announcement(0.7) => TASK_TYPE (intent known but no taskType)
  it('lands on TASK_TYPE when taskType null even with intent at 0.7 (example #4)', () => {
    const state = createInitialBriefingState()
    const inference = makeInference({
      intent: makeInferredField('announcement', 0.7),
    })
    expect(evaluateTransitions(state, inference)).toBe('TASK_TYPE')
  })

  // With 0.4 threshold: intent at 0.4+ with taskType at 0.4+ should land on INSPIRATION
  it('lands on INSPIRATION when both taskType and intent are at 0.4 threshold', () => {
    const state = createInitialBriefingState()
    const inference = makeInference({
      taskType: makeInferredField('single_asset', 0.4),
      intent: makeInferredField('announcement', 0.4),
    })
    expect(evaluateTransitions(state, inference)).toBe('INSPIRATION')
  })

  // Plan example #5: "Website landing page, bold, conversion-focused"
  // taskType=website(0.85), intent=signups(0.75) => INSPIRATION
  it('lands on INSPIRATION for website with known intent (example #5)', () => {
    const state = createInitialBriefingState()
    const inference = makeInference({
      taskType: makeInferredField('single_asset', 0.85),
      intent: makeInferredField('signups', 0.75),
    })
    expect(evaluateTransitions(state, inference)).toBe('INSPIRATION')
  })

  // Plan example #6: "Logo for a yoga studio"
  // taskType=single_asset(0.85), intent=default for brand => INSPIRATION
  it('lands on INSPIRATION for logo with default intent (example #6)', () => {
    const state = createInitialBriefingState()
    const inference = makeInference({
      taskType: makeInferredField('single_asset', 0.85),
      intent: makeInferredField('awareness', 0.75),
    })
    expect(evaluateTransitions(state, inference)).toBe('INSPIRATION')
  })

  // Plan example #7: "3 Instagram reels, fitness app, Gymshark style"
  // taskType=multi_asset(0.9), intent=signups(0.9) => INSPIRATION
  it('lands on INSPIRATION for reels with known intent (example #7)', () => {
    const state = createInitialBriefingState()
    const inference = makeInference({
      taskType: makeInferredField('multi_asset_plan', 0.9),
      intent: makeInferredField('signups', 0.9),
    })
    expect(evaluateTransitions(state, inference)).toBe('INSPIRATION')
  })

  // Plan example #8: "Pitch deck for investor meeting next week"
  // taskType=slide(0.9), intent=null => INTENT
  it('lands on INTENT for pitch deck with no intent (example #8)', () => {
    const state = createInitialBriefingState()
    const inference = makeInference({
      taskType: makeInferredField('single_asset', 0.9),
      intent: makeInferredField<Intent>(null, 0, 'pending'),
    })
    expect(evaluateTransitions(state, inference)).toBe('INTENT')
  })

  // Plan example #9: "LinkedIn thought leadership, CEO, weekly posts"
  // taskType=multi_asset(0.85), intent=authority(0.95) => INSPIRATION
  it('lands on INSPIRATION for LinkedIn thought leadership (example #9)', () => {
    const state = createInitialBriefingState()
    const inference = makeInference({
      taskType: makeInferredField('multi_asset_plan', 0.85),
      intent: makeInferredField('authority', 0.95),
    })
    expect(evaluateTransitions(state, inference)).toBe('INSPIRATION')
  })

  // Plan example #10: "Something cool for our new product"
  // taskType=null, intent=null => TASK_TYPE
  it('lands on TASK_TYPE for vague message (example #10)', () => {
    const state = createInitialBriefingState()
    const inference = makeInference()
    expect(evaluateTransitions(state, inference)).toBe('TASK_TYPE')
  })

  // Non-EXTRACT stage advancement
  it('stays at TASK_TYPE when taskType not yet confirmed', () => {
    const state = createInitialBriefingState()
    state.stage = 'TASK_TYPE'
    expect(evaluateTransitions(state, makeInference())).toBe('TASK_TYPE')
  })

  it('advances from TASK_TYPE to INTENT when taskType at 0.4+ but intent unknown', () => {
    const state = createInitialBriefingState()
    state.stage = 'TASK_TYPE'
    state.brief.taskType = makeInferredField('single_asset', 0.4)
    expect(evaluateTransitions(state, makeInference())).toBe('INTENT')
  })

  it('advances from TASK_TYPE to INSPIRATION when both taskType and intent at 0.4+', () => {
    const state = createInitialBriefingState()
    state.stage = 'TASK_TYPE'
    state.brief.taskType = makeInferredField('single_asset', 0.4)
    state.brief.intent = makeInferredField('signups', 0.4)
    expect(evaluateTransitions(state, makeInference())).toBe('INSPIRATION')
  })

  it('advances from INTENT to INSPIRATION when intent at 0.4+', () => {
    const state = createInitialBriefingState()
    state.stage = 'INTENT'
    state.brief.intent = makeInferredField('awareness', 0.4)
    expect(evaluateTransitions(state, makeInference())).toBe('INSPIRATION')
  })

  it('auto-advances from TASK_TYPE after 3 turns with any non-null value', () => {
    const state = createInitialBriefingState()
    state.stage = 'TASK_TYPE'
    state.brief.taskType = makeInferredField('single_asset', 0.2) // Below 0.4 threshold
    state.turnsInCurrentStage = 3 // At maxTurnsBeforeRecommend
    expect(evaluateTransitions(state, makeInference())).toBe('INTENT')
  })

  it('does NOT auto-advance from TASK_TYPE after 3 turns when value is null', () => {
    const state = createInitialBriefingState()
    state.stage = 'TASK_TYPE'
    state.turnsInCurrentStage = 3
    // taskType.value is still null — no fallback
    expect(evaluateTransitions(state, makeInference())).toBe('TASK_TYPE')
  })

  it('auto-advances from INTENT after 3 turns with any non-null value', () => {
    const state = createInitialBriefingState()
    state.stage = 'INTENT'
    state.brief.intent = makeInferredField('awareness', 0.15) // Below 0.4 threshold
    state.turnsInCurrentStage = 3
    expect(evaluateTransitions(state, makeInference())).toBe('INSPIRATION')
  })

  it('does NOT auto-advance from INTENT after 3 turns when value is null', () => {
    const state = createInitialBriefingState()
    state.stage = 'INTENT'
    state.turnsInCurrentStage = 3
    // intent.value is still null — no fallback
    expect(evaluateTransitions(state, makeInference())).toBe('INTENT')
  })

  it('advances from INSPIRATION to STRUCTURE when styles selected', () => {
    const state = createInitialBriefingState()
    state.stage = 'INSPIRATION'
    state.brief.visualDirection = {
      selectedStyles: [
        {
          id: '1',
          name: 'Dark Tech',
          description: null,
          imageUrl: '',
          deliverableType: 'video',
          styleAxis: 'tech',
          subStyle: null,
          semanticTags: [],
        },
      ],
      moodKeywords: [],
      colorPalette: [],
      typography: { primary: '', secondary: '' },
      avoidElements: [],
    }
    expect(evaluateTransitions(state, makeInference())).toBe('STRUCTURE')
  })

  it('advances from STRUCTURE to STRATEGIC_REVIEW when structure set', () => {
    const state = createInitialBriefingState()
    state.stage = 'STRUCTURE'
    state.structure = {
      type: 'storyboard',
      scenes: [
        {
          sceneNumber: 1,
          title: 'Hook',
          description: 'Desc',
          duration: '5s',
          visualNote: 'Note',
        },
      ],
    }
    expect(evaluateTransitions(state, makeInference())).toBe('STRATEGIC_REVIEW')
  })

  it('stays at STRATEGIC_REVIEW (advances via dispatch)', () => {
    const state = createInitialBriefingState()
    state.stage = 'STRATEGIC_REVIEW'
    expect(evaluateTransitions(state, makeInference())).toBe('STRATEGIC_REVIEW')
  })

  it('stays at REVIEW (advances via dispatch)', () => {
    const state = createInitialBriefingState()
    state.stage = 'REVIEW'
    expect(evaluateTransitions(state, makeInference())).toBe('REVIEW')
  })

  it('stays at DEEPEN (advances via dispatch)', () => {
    const state = createInitialBriefingState()
    state.stage = 'DEEPEN'
    expect(evaluateTransitions(state, makeInference())).toBe('DEEPEN')
  })
})

// =============================================================================
// GO BACK
// =============================================================================

describe('goBackTo', () => {
  function makeAdvancedState(): BriefingState {
    const state = createInitialBriefingState()
    state.stage = 'REVIEW'
    state.deliverableCategory = 'video'
    state.brief.taskType = makeInferredField('single_asset', 0.9)
    state.brief.intent = makeInferredField('announcement', 0.9)
    state.brief.visualDirection = {
      selectedStyles: [
        {
          id: '1',
          name: 'Test',
          description: null,
          imageUrl: '',
          deliverableType: 'v',
          styleAxis: 'tech',
          subStyle: null,
          semanticTags: [],
        },
      ],
      moodKeywords: [],
      colorPalette: [],
      typography: { primary: '', secondary: '' },
      avoidElements: [],
    }
    state.structure = { type: 'storyboard', scenes: [] }
    state.strategicReview = {
      strengths: ['Strong hook'],
      risks: ['Generic CTA'],
      optimizationSuggestion: 'Add metric',
      inspirationFitScore: 'aligned',
      inspirationFitNote: null,
      userOverride: false,
    }
    state.sectionMoodboards = { intro: { moodKeywords: ['dark'] } }
    state.deepenSelections = ['production_copy']
    return state
  }

  it('does not go forward', () => {
    const state = makeAdvancedState()
    state.stage = 'STRUCTURE'
    const result = goBackTo(state, 'REVIEW')
    expect(result.stage).toBe('STRUCTURE')
  })

  it('clears selectedStyles when going back to INSPIRATION', () => {
    const state = makeAdvancedState()
    const result = goBackTo(state, 'INSPIRATION')
    expect(result.stage).toBe('INSPIRATION')
    expect(result.brief.visualDirection).toBeNull()
    // Preserves intent/topic/audience
    expect(result.brief.intent.value).toBe('announcement')
    // Clears structure and downstream
    expect(result.structure).toBeNull()
    expect(result.strategicReview).toBeNull()
    expect(result.deepenSelections).toBeNull()
  })

  it('clears intent and all downstream when going back to INTENT', () => {
    const state = makeAdvancedState()
    const result = goBackTo(state, 'INTENT')
    expect(result.stage).toBe('INTENT')
    expect(result.brief.intent.value).toBeNull()
    expect(result.brief.visualDirection).toBeNull()
    expect(result.structure).toBeNull()
  })

  it('clears taskType and all downstream when going back to TASK_TYPE', () => {
    const state = makeAdvancedState()
    const result = goBackTo(state, 'TASK_TYPE')
    expect(result.stage).toBe('TASK_TYPE')
    expect(result.brief.taskType.value).toBeNull()
    expect(result.deliverableCategory).toBeNull()
    expect(result.brief.intent.value).toBeNull()
    expect(result.brief.visualDirection).toBeNull()
    expect(result.structure).toBeNull()
  })

  it('clears structure and downstream when going back to STRUCTURE', () => {
    const state = makeAdvancedState()
    const result = goBackTo(state, 'STRUCTURE')
    expect(result.stage).toBe('STRUCTURE')
    // Structure cleared
    expect(result.structure).toBeNull()
    expect(result.strategicReview).toBeNull()
    expect(result.sectionMoodboards).toEqual({})
    expect(result.deepenSelections).toBeNull()
    // Preserves visual direction (selectedStyles)
    expect(result.brief.visualDirection).not.toBeNull()
  })

  it('resets turnsInCurrentStage to 0', () => {
    const state = makeAdvancedState()
    state.turnsInCurrentStage = 5
    const result = goBackTo(state, 'INSPIRATION')
    expect(result.turnsInCurrentStage).toBe(0)
  })
})

// =============================================================================
// PIVOT CATEGORY
// =============================================================================

describe('pivotCategory', () => {
  it('preserves intent, topic, audience, styleKeywords, inspirationRefs', () => {
    const state = createInitialBriefingState()
    state.stage = 'STRUCTURE'
    state.deliverableCategory = 'video'
    state.brief.intent = makeInferredField('announcement', 0.9)
    state.brief.topic = makeInferredField('SaaS product', 0.8)
    state.styleKeywords = ['minimal']
    state.inspirationRefs = ['Stripe']
    state.structure = { type: 'storyboard', scenes: [] }
    state.strategicReview = {
      strengths: [],
      risks: [],
      optimizationSuggestion: '',
      inspirationFitScore: 'aligned',
      inspirationFitNote: null,
      userOverride: false,
    }
    state.sectionMoodboards = { a: { moodKeywords: ['dark'] } }
    state.competitiveDifferentiation = 'Better than X'
    state.deepenSelections = ['production_copy']

    const result = pivotCategory(state, 'website')

    expect(result.stage).toBe('STRUCTURE')
    expect(result.deliverableCategory).toBe('website')
    // Preserved
    expect(result.brief.intent.value).toBe('announcement')
    expect(result.brief.topic.value).toBe('SaaS product')
    expect(result.styleKeywords).toEqual(['minimal'])
    expect(result.inspirationRefs).toEqual(['Stripe'])
    // Cleared
    expect(result.structure).toBeNull()
    expect(result.strategicReview).toBeNull()
    expect(result.sectionMoodboards).toEqual({})
    expect(result.competitiveDifferentiation).toBeNull()
    expect(result.deepenSelections).toBeNull()
    expect(result.turnsInCurrentStage).toBe(0)
  })
})

// =============================================================================
// SERIALIZATION
// =============================================================================

describe('serialize / deserialize', () => {
  it('roundtrip preserves all state (test #16)', () => {
    const state = createInitialBriefingState()
    state.stage = 'STRUCTURE'
    state.deliverableCategory = 'video'
    state.brief.taskType = makeInferredField('single_asset', 0.9)
    state.brief.intent = makeInferredField('announcement', 0.85)
    state.brief.topic = makeInferredField('AI tool', 0.8)
    state.industry = makeInferredField('technology', 0.8)
    state.styleKeywords = ['minimal', 'clean']
    state.inspirationRefs = ['Stripe']
    state.videoReferenceIds = ['vid-1']
    state.structure = {
      type: 'storyboard',
      scenes: [
        {
          sceneNumber: 1,
          title: 'Hook',
          description: 'Opening hook',
          duration: '5s',
          visualNote: 'Dark bg',
          hookData: {
            targetPersona: 'CTO',
            painMetric: '6 hours/week lost',
            quantifiableImpact: '2x faster deployment',
          },
        },
      ],
    }
    state.toneProfile = {
      languageSharpness: 'direct',
      technicalDepth: 'high',
      emotionalIntensity: 'low',
      directnessLevel: 'high',
      vocabularyRegister: ['infrastructure', 'deployment', 'scalable'],
      toneDescription: 'Direct, technical tone for CTO audience.',
    }
    state.sectionMoodboards = {
      intro: { moodKeywords: ['dark', 'techy'] },
    }
    state.turnsInCurrentStage = 2
    state.messageCount = 5

    const serialized = serialize(state)
    const deserialized = deserialize(serialized)

    // Verify all fields
    expect(deserialized.stage).toBe('STRUCTURE')
    expect(deserialized.deliverableCategory).toBe('video')
    expect(deserialized.brief.taskType.value).toBe('single_asset')
    expect(deserialized.brief.intent.value).toBe('announcement')
    expect(deserialized.brief.topic.value).toBe('AI tool')
    expect(deserialized.industry?.value).toBe('technology')
    expect(deserialized.styleKeywords).toEqual(['minimal', 'clean'])
    expect(deserialized.inspirationRefs).toEqual(['Stripe'])
    expect(deserialized.videoReferenceIds).toEqual(['vid-1'])
    expect(deserialized.toneProfile?.languageSharpness).toBe('direct')
    expect(deserialized.turnsInCurrentStage).toBe(2)
    expect(deserialized.messageCount).toBe(5)

    // Dates restored as Date objects
    expect(deserialized.brief.createdAt).toBeInstanceOf(Date)
    expect(deserialized.brief.updatedAt).toBeInstanceOf(Date)

    // Structure preserved
    if (deserialized.structure?.type === 'storyboard') {
      expect(deserialized.structure.scenes).toHaveLength(1)
      expect(deserialized.structure.scenes[0].hookData?.targetPersona).toBe('CTO')
    } else {
      throw new Error('Expected storyboard')
    }

    // Section moodboards preserved
    expect(deserialized.sectionMoodboards).toEqual({
      intro: { moodKeywords: ['dark', 'techy'] },
    })
  })
})

// =============================================================================
// STALL CONFIG (tests #17, #18, #19)
// =============================================================================

describe('STALL_CONFIG', () => {
  it('TASK_TYPE/INTENT narrow at 2, recommend at 3 (test #17)', () => {
    expect(STALL_CONFIG.TASK_TYPE.maxTurnsBeforeNarrow).toBe(2)
    expect(STALL_CONFIG.TASK_TYPE.maxTurnsBeforeRecommend).toBe(3)
    expect(STALL_CONFIG.INTENT.maxTurnsBeforeNarrow).toBe(2)
    expect(STALL_CONFIG.INTENT.maxTurnsBeforeRecommend).toBe(3)
  })

  it('STRUCTURE soft nudge at 4 (test #18)', () => {
    expect(STALL_CONFIG.STRUCTURE.softNudgeAfter).toBe(4)
  })

  it('INSPIRATION/MOODBOARD/REVIEW/DEEPEN have no limits (test #19)', () => {
    const noLimitStages: BriefingStage[] = ['INSPIRATION', 'MOODBOARD', 'REVIEW', 'DEEPEN']
    for (const stage of noLimitStages) {
      expect(STALL_CONFIG[stage].maxTurnsBeforeNarrow).toBeNull()
      expect(STALL_CONFIG[stage].maxTurnsBeforeRecommend).toBeNull()
      expect(STALL_CONFIG[stage].softNudgeAfter).toBeNull()
    }
  })
})

// =============================================================================
// BRIEF COMPOSITION (test #15)
// =============================================================================

describe('BriefingState composes LiveBrief', () => {
  it('brief fields are readable from state.brief.* (test #15)', () => {
    const state = createInitialBriefingState()
    state.brief.taskType = makeInferredField('campaign', 0.9)
    state.brief.intent = makeInferredField('sales', 0.8)
    state.brief.platform = makeInferredField('instagram', 0.95)
    state.brief.topic = makeInferredField('Summer collection', 0.85)

    expect(state.brief.taskType.value).toBe('campaign')
    expect(state.brief.intent.value).toBe('sales')
    expect(state.brief.platform.value).toBe('instagram')
    expect(state.brief.topic.value).toBe('Summer collection')
  })
})
