import { describe, it, expect } from 'vitest'
import {
  createInitialBriefingState,
  deriveStage,
  goBackTo,
  pivotCategory,
  serialize,
  deserialize,
  STALL_CONFIG,
  type BriefingState,
  type BriefingStage,
} from './briefing-state-machine'
import type { InferredField, TaskType } from '@/components/chat/brief-panel/types'

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

// =============================================================================
// deriveStage — pipeline gate traversal + stall safety
// =============================================================================

describe('deriveStage', () => {
  // ---- Pipeline gate traversal ----

  describe('pipeline gate traversal', () => {
    it('returns EXTRACT for fresh state (no topic)', () => {
      const state = createInitialBriefingState()
      expect(deriveStage(state)).toBe('EXTRACT')
    })

    it('returns TASK_TYPE when topic satisfied but taskType missing', () => {
      const state = createInitialBriefingState()
      state.brief.topic = makeInferredField('SaaS product launch', 0.8)
      expect(deriveStage(state)).toBe('TASK_TYPE')
    })

    it('returns INTENT when topic + taskType satisfied but intent missing', () => {
      const state = createInitialBriefingState()
      state.brief.topic = makeInferredField('SaaS product launch', 0.8)
      state.brief.taskType = makeInferredField('single_asset', 0.85)
      expect(deriveStage(state)).toBe('INTENT')
    })

    it('returns INSPIRATION when topic + taskType + intent all satisfied', () => {
      const state = createInitialBriefingState()
      state.brief.topic = makeInferredField('SaaS product launch', 0.8)
      state.brief.taskType = makeInferredField('single_asset', 0.85)
      state.brief.intent = makeInferredField('announcement', 0.85)
      expect(deriveStage(state)).toBe('INSPIRATION')
    })

    it('returns STRUCTURE when styles selected but no structure', () => {
      const state = createInitialBriefingState()
      state.brief.topic = makeInferredField('SaaS product launch', 0.8)
      state.brief.taskType = makeInferredField('single_asset', 0.85)
      state.brief.intent = makeInferredField('announcement', 0.85)
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
      expect(deriveStage(state)).toBe('STRUCTURE')
    })

    it('returns ELABORATE when styles selected and structure exists', () => {
      const state = createInitialBriefingState()
      state.brief.topic = makeInferredField('SaaS product launch', 0.8)
      state.brief.taskType = makeInferredField('single_asset', 0.85)
      state.brief.intent = makeInferredField('announcement', 0.85)
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
      expect(deriveStage(state)).toBe('ELABORATE')
    })

    it('returns REVIEW when all gates satisfied', () => {
      const state = createInitialBriefingState()
      state.brief.topic = makeInferredField('SaaS product launch', 0.8)
      state.brief.taskType = makeInferredField('single_asset', 0.85)
      state.brief.intent = makeInferredField('announcement', 0.85)
      state.structure = {
        type: 'storyboard',
        scenes: [
          {
            sceneNumber: 1,
            title: 'Hook',
            description: 'Desc',
            duration: '5s',
            visualNote: 'Note',
            fullScript: 'Full script here',
          },
        ],
      }
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
      // MOODBOARD removed from pipeline — goes straight to REVIEW
      expect(deriveStage(state)).toBe('REVIEW')
    })
  })

  // ---- Confidence thresholds ----

  describe('confidence thresholds', () => {
    it('requires topic confidence >= 0.4 for EXTRACT gate', () => {
      const state = createInitialBriefingState()
      state.brief.topic = makeInferredField('SaaS', 0.3)
      expect(deriveStage(state)).toBe('EXTRACT')

      state.brief.topic = makeInferredField('SaaS', 0.4)
      expect(deriveStage(state)).toBe('TASK_TYPE')
    })

    it('requires taskType confidence >= 0.4 for TASK_TYPE gate', () => {
      const state = createInitialBriefingState()
      state.brief.topic = makeInferredField('SaaS', 0.8)
      state.brief.taskType = makeInferredField('single_asset', 0.3)
      expect(deriveStage(state)).toBe('TASK_TYPE')

      state.brief.taskType = makeInferredField('single_asset', 0.4)
      expect(deriveStage(state)).toBe('INTENT')
    })

    it('requires intent confidence >= 0.4 for INTENT gate', () => {
      const state = createInitialBriefingState()
      state.brief.topic = makeInferredField('SaaS', 0.8)
      state.brief.taskType = makeInferredField('single_asset', 0.8)
      state.brief.intent = makeInferredField('announcement', 0.3)
      expect(deriveStage(state)).toBe('INTENT')

      state.brief.intent = makeInferredField('announcement', 0.4)
      expect(deriveStage(state)).toBe('INSPIRATION')
    })

    it('requires non-null value for topic even at high confidence', () => {
      const state = createInitialBriefingState()
      state.brief.topic = makeInferredField<string>(null, 0.9)
      expect(deriveStage(state)).toBe('EXTRACT')
    })

    it('requires non-null value for taskType even at high confidence', () => {
      const state = createInitialBriefingState()
      state.brief.topic = makeInferredField('SaaS', 0.8)
      state.brief.taskType = makeInferredField<TaskType>(null, 0.9)
      expect(deriveStage(state)).toBe('TASK_TYPE')
    })
  })

  // ---- Plan examples (rewritten for deriveStage) ----

  describe('plan examples', () => {
    it('example #2: Stripe launch video with full context → INSPIRATION', () => {
      const state = createInitialBriefingState()
      state.brief.topic = makeInferredField('Stripe launch video for B2B SaaS', 0.9)
      state.brief.taskType = makeInferredField('single_asset', 0.85)
      state.brief.intent = makeInferredField('announcement', 0.85)
      expect(deriveStage(state)).toBe('INSPIRATION')
    })

    it('example #3: content plan with taskType but no intent → INTENT', () => {
      const state = createInitialBriefingState()
      state.brief.topic = makeInferredField('30-day Instagram content plan', 0.9)
      state.brief.taskType = makeInferredField('multi_asset_plan', 0.95)
      expect(deriveStage(state)).toBe('INTENT')
    })

    it('example #4: intent known but no taskType → TASK_TYPE', () => {
      const state = createInitialBriefingState()
      state.brief.topic = makeInferredField('AI tool launch', 0.7)
      state.brief.intent = makeInferredField('announcement', 0.7)
      // taskType not set → TASK_TYPE gate unsatisfied
      expect(deriveStage(state)).toBe('TASK_TYPE')
    })

    it('example #5: website landing page with known intent → INSPIRATION', () => {
      const state = createInitialBriefingState()
      state.brief.topic = makeInferredField('Website landing page', 0.85)
      state.brief.taskType = makeInferredField('single_asset', 0.85)
      state.brief.intent = makeInferredField('signups', 0.75)
      expect(deriveStage(state)).toBe('INSPIRATION')
    })

    it('example #6: logo for yoga studio → INSPIRATION', () => {
      const state = createInitialBriefingState()
      state.brief.topic = makeInferredField('Logo for yoga studio', 0.85)
      state.brief.taskType = makeInferredField('single_asset', 0.85)
      state.brief.intent = makeInferredField('awareness', 0.75)
      expect(deriveStage(state)).toBe('INSPIRATION')
    })

    it('example #7: Instagram reels with known intent → INSPIRATION', () => {
      const state = createInitialBriefingState()
      state.brief.topic = makeInferredField('Fitness app Instagram reels', 0.9)
      state.brief.taskType = makeInferredField('multi_asset_plan', 0.9)
      state.brief.intent = makeInferredField('signups', 0.9)
      expect(deriveStage(state)).toBe('INSPIRATION')
    })

    it('example #8: pitch deck with no intent → INTENT', () => {
      const state = createInitialBriefingState()
      state.brief.topic = makeInferredField('Pitch deck for investor meeting', 0.9)
      state.brief.taskType = makeInferredField('single_asset', 0.9)
      expect(deriveStage(state)).toBe('INTENT')
    })

    it('example #9: LinkedIn thought leadership → INSPIRATION', () => {
      const state = createInitialBriefingState()
      state.brief.topic = makeInferredField('LinkedIn thought leadership', 0.9)
      state.brief.taskType = makeInferredField('multi_asset_plan', 0.85)
      state.brief.intent = makeInferredField('authority', 0.95)
      expect(deriveStage(state)).toBe('INSPIRATION')
    })

    it('example #10: vague message → EXTRACT', () => {
      const state = createInitialBriefingState()
      expect(deriveStage(state)).toBe('EXTRACT')
    })
  })

  // ---- Non-EXTRACT stage advancement ----

  describe('stage advancement', () => {
    it('stays at TASK_TYPE when taskType not yet satisfied', () => {
      const state = createInitialBriefingState()
      state.stage = 'TASK_TYPE'
      state.brief.topic = makeInferredField('SaaS', 0.8) // EXTRACT gate satisfied
      expect(deriveStage(state)).toBe('TASK_TYPE')
    })

    it('advances from TASK_TYPE to INTENT when taskType at 0.4+', () => {
      const state = createInitialBriefingState()
      state.stage = 'TASK_TYPE'
      state.brief.topic = makeInferredField('SaaS', 0.8)
      state.brief.taskType = makeInferredField('single_asset', 0.4)
      expect(deriveStage(state)).toBe('INTENT')
    })

    it('advances from TASK_TYPE to INSPIRATION when both taskType and intent at 0.4+', () => {
      const state = createInitialBriefingState()
      state.stage = 'TASK_TYPE'
      state.brief.topic = makeInferredField('SaaS', 0.8)
      state.brief.taskType = makeInferredField('single_asset', 0.4)
      state.brief.intent = makeInferredField('signups', 0.4)
      expect(deriveStage(state)).toBe('INSPIRATION')
    })

    it('advances from INTENT to INSPIRATION when intent at 0.4+', () => {
      const state = createInitialBriefingState()
      state.stage = 'INTENT'
      state.brief.topic = makeInferredField('SaaS', 0.8)
      state.brief.taskType = makeInferredField('single_asset', 0.8)
      state.brief.intent = makeInferredField('awareness', 0.4)
      expect(deriveStage(state)).toBe('INSPIRATION')
    })

    it('advances from INSPIRATION to STRUCTURE when styles selected', () => {
      const state = createInitialBriefingState()
      state.stage = 'INSPIRATION'
      state.brief.topic = makeInferredField('SaaS', 0.8)
      state.brief.taskType = makeInferredField('single_asset', 0.8)
      state.brief.intent = makeInferredField('announcement', 0.8)
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
      expect(deriveStage(state)).toBe('STRUCTURE')
    })

    it('advances from STRUCTURE to ELABORATE when structure set', () => {
      const state = createInitialBriefingState()
      state.stage = 'STRUCTURE'
      state.brief.topic = makeInferredField('SaaS', 0.8)
      state.brief.taskType = makeInferredField('single_asset', 0.8)
      state.brief.intent = makeInferredField('announcement', 0.8)
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
      expect(deriveStage(state)).toBe('ELABORATE')
    })

    it('stays at STRUCTURE when structure is null', () => {
      const state = createInitialBriefingState()
      state.stage = 'STRUCTURE'
      state.brief.topic = makeInferredField('SaaS', 0.8)
      state.brief.taskType = makeInferredField('single_asset', 0.8)
      state.brief.intent = makeInferredField('announcement', 0.8)
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
      state.structure = null
      state.turnsInCurrentStage = 1
      expect(deriveStage(state)).toBe('STRUCTURE')
    })

    it('stays at REVIEW (terminal stage — exitWhen always false)', () => {
      const state = createInitialBriefingState()
      state.stage = 'REVIEW'
      state.brief.topic = makeInferredField('SaaS', 0.8)
      state.brief.taskType = makeInferredField('single_asset', 0.8)
      state.brief.intent = makeInferredField('announcement', 0.8)
      state.structure = {
        type: 'storyboard',
        scenes: [
          {
            sceneNumber: 1,
            title: 'Hook',
            description: 'Desc',
            duration: '5s',
            visualNote: 'Note',
            fullScript: 'Full script',
          },
        ],
      }
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
      expect(deriveStage(state)).toBe('REVIEW')
    })
  })

  // ---- Stall safety ----

  describe('stall safety', () => {
    it('force-advances from EXTRACT after 2 turns', () => {
      const state = createInitialBriefingState()
      state.stage = 'EXTRACT'
      state.turnsInCurrentStage = 2
      // topic not set → EXTRACT gate unsatisfied
      // But stall: gate.stage (EXTRACT) === state.stage (EXTRACT) && turns >= 2 → skip
      expect(deriveStage(state)).toBe('TASK_TYPE')
    })

    it('force-advances from TASK_TYPE after 2 turns even with null taskType', () => {
      const state = createInitialBriefingState()
      state.stage = 'TASK_TYPE'
      state.brief.topic = makeInferredField('SaaS', 0.8) // satisfy EXTRACT
      state.turnsInCurrentStage = 2
      // taskType not set → TASK_TYPE gate unsatisfied, but stall-advance skips it
      expect(deriveStage(state)).toBe('INTENT')
    })

    it('force-advances from TASK_TYPE after 2 turns even with low confidence', () => {
      const state = createInitialBriefingState()
      state.stage = 'TASK_TYPE'
      state.brief.topic = makeInferredField('SaaS', 0.8)
      state.brief.taskType = makeInferredField('single_asset', 0.2) // Below 0.4 threshold
      state.turnsInCurrentStage = 2
      expect(deriveStage(state)).toBe('INTENT')
    })

    it('force-advances from INTENT after 2 turns even with null intent', () => {
      const state = createInitialBriefingState()
      state.stage = 'INTENT'
      state.brief.topic = makeInferredField('SaaS', 0.8)
      state.brief.taskType = makeInferredField('single_asset', 0.8)
      state.turnsInCurrentStage = 2
      expect(deriveStage(state)).toBe('INSPIRATION')
    })

    it('force-advances from INTENT after 2 turns with low confidence', () => {
      const state = createInitialBriefingState()
      state.stage = 'INTENT'
      state.brief.topic = makeInferredField('SaaS', 0.8)
      state.brief.taskType = makeInferredField('single_asset', 0.8)
      state.brief.intent = makeInferredField('awareness', 0.15) // Below threshold
      state.turnsInCurrentStage = 2
      expect(deriveStage(state)).toBe('INSPIRATION')
    })

    it('does not force-advance from STRUCTURE (maxTurnsBeforeRecommend is null)', () => {
      const state = createInitialBriefingState()
      state.stage = 'STRUCTURE'
      state.brief.topic = makeInferredField('SaaS', 0.8)
      state.brief.taskType = makeInferredField('single_asset', 0.8)
      state.brief.intent = makeInferredField('announcement', 0.8)
      state.brief.visualDirection = {
        selectedStyles: [
          {
            id: '1',
            name: 'Style',
            description: null,
            imageUrl: '',
            deliverableType: 'video',
            styleAxis: 'tech',
            subStyle: null,
          },
        ],
      }
      state.structure = null
      state.turnsInCurrentStage = 10
      expect(deriveStage(state)).toBe('STRUCTURE')
    })

    it('does not force-advance from REVIEW (excluded from stall safety)', () => {
      const state = createInitialBriefingState()
      state.stage = 'REVIEW'
      state.brief.topic = makeInferredField('SaaS', 0.8)
      state.brief.taskType = makeInferredField('single_asset', 0.8)
      state.brief.intent = makeInferredField('announcement', 0.8)
      state.structure = {
        type: 'storyboard',
        scenes: [
          {
            sceneNumber: 1,
            title: 'Hook',
            description: 'Desc',
            duration: '5s',
            visualNote: 'Note',
            fullScript: 'Full script',
          },
        ],
      }
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
      state.turnsInCurrentStage = 100
      expect(deriveStage(state)).toBe('REVIEW')
    })

    it('stall safety only applies to current stage, not earlier unsatisfied gates', () => {
      const state = createInitialBriefingState()
      state.stage = 'INTENT' // Current stage is INTENT
      state.turnsInCurrentStage = 2
      // topic not set → EXTRACT gate unsatisfied
      // Stall check: gate.stage (EXTRACT) !== state.stage (INTENT) → no force-advance
      expect(deriveStage(state)).toBe('EXTRACT')
    })

    it('does not stall-advance when turnsInCurrentStage is below threshold', () => {
      const state = createInitialBriefingState()
      state.stage = 'TASK_TYPE'
      state.brief.topic = makeInferredField('SaaS', 0.8)
      state.turnsInCurrentStage = 1 // Below maxTurnsBeforeRecommend=2
      expect(deriveStage(state)).toBe('TASK_TYPE')
    })
  })

  // ---- Video-specific gates ----

  describe('video-specific gates', () => {
    it('requires narrative approval for video at STRUCTURE gate', () => {
      const state = createInitialBriefingState()
      state.brief.topic = makeInferredField('SaaS video', 0.8)
      state.brief.taskType = makeInferredField('single_asset', 0.8)
      state.brief.intent = makeInferredField('announcement', 0.8)
      state.deliverableCategory = 'video'
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
      state.narrativeApproved = false
      expect(deriveStage(state)).toBe('STRUCTURE')

      // With narrative approved, advances to ELABORATE
      state.narrativeApproved = true
      expect(deriveStage(state)).toBe('ELABORATE')
    })

    it('video projects require style selection at INSPIRATION gate', () => {
      const state = createInitialBriefingState()
      state.brief.topic = makeInferredField('SaaS video', 0.8)
      state.brief.taskType = makeInferredField('single_asset', 0.8)
      state.brief.intent = makeInferredField('announcement', 0.8)
      state.deliverableCategory = 'video'
      // No styles selected — stays at INSPIRATION
      expect(deriveStage(state)).toBe('INSPIRATION')
    })
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

  it('clears visualDirection and structure when going back to INSPIRATION', () => {
    const state = makeAdvancedState()
    const result = goBackTo(state, 'INSPIRATION')
    expect(result.stage).toBe('INSPIRATION')
    expect(result.brief.visualDirection).toBeNull()
    // Preserves intent/topic/audience
    expect(result.brief.intent.value).toBe('announcement')
    // Clears structure (STRUCTURE is after INSPIRATION in pipeline)
    expect(result.structure).toBeNull()
    // Clears downstream
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

  it('clears structure and downstream when going back to STRUCTURE, preserves visualDirection', () => {
    const state = makeAdvancedState()
    const result = goBackTo(state, 'STRUCTURE')
    expect(result.stage).toBe('STRUCTURE')
    // Structure cleared
    expect(result.structure).toBeNull()
    expect(result.strategicReview).toBeNull()
    expect(result.sectionMoodboards).toEqual({})
    expect(result.deepenSelections).toBeNull()
    // Visual direction preserved (INSPIRATION is before STRUCTURE in pipeline)
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
  it('TASK_TYPE/INTENT narrow at 1, recommend at 2 (test #17)', () => {
    expect(STALL_CONFIG.TASK_TYPE.maxTurnsBeforeNarrow).toBe(1)
    expect(STALL_CONFIG.TASK_TYPE.maxTurnsBeforeRecommend).toBe(2)
    expect(STALL_CONFIG.INTENT.maxTurnsBeforeNarrow).toBe(1)
    expect(STALL_CONFIG.INTENT.maxTurnsBeforeRecommend).toBe(2)
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
