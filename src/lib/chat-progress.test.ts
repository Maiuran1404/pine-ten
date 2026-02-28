import { describe, it, expect } from 'vitest'

// Zero mocks - these are pure functions
import {
  CHAT_STAGES,
  STAGE_DESCRIPTIONS,
  BRIEFING_CHAT_STAGES,
  mapBriefingStageToChat,
  calculateChatStageFromBriefing,
  calculateChatStage,
  getNextStage,
  getStageHint,
  isStageCompleted,
  isCurrentStage,
} from './chat-progress'

describe('CHAT_STAGES', () => {
  it('contains all expected stages in order', () => {
    expect(CHAT_STAGES).toEqual(['brief', 'narrative', 'style', 'storyboard', 'review'])
  })
})

describe('BRIEFING_CHAT_STAGES', () => {
  it('contains the 5 briefing stages in order', () => {
    expect(BRIEFING_CHAT_STAGES).toEqual(['brief', 'narrative', 'style', 'storyboard', 'review'])
  })
})

describe('mapBriefingStageToChat', () => {
  it('maps EXTRACT to brief', () => {
    expect(mapBriefingStageToChat('EXTRACT')).toBe('brief')
  })

  it('maps TASK_TYPE to brief', () => {
    expect(mapBriefingStageToChat('TASK_TYPE')).toBe('brief')
  })

  it('maps INTENT to brief', () => {
    expect(mapBriefingStageToChat('INTENT')).toBe('brief')
  })

  it('maps STRUCTURE to narrative', () => {
    expect(mapBriefingStageToChat('STRUCTURE')).toBe('narrative')
  })

  it('maps INSPIRATION to style', () => {
    expect(mapBriefingStageToChat('INSPIRATION')).toBe('style')
  })

  it('maps ELABORATE to storyboard', () => {
    expect(mapBriefingStageToChat('ELABORATE')).toBe('storyboard')
  })

  it('maps STRATEGIC_REVIEW to review', () => {
    expect(mapBriefingStageToChat('STRATEGIC_REVIEW')).toBe('review')
  })

  it('maps MOODBOARD to review', () => {
    expect(mapBriefingStageToChat('MOODBOARD')).toBe('review')
  })

  it('maps REVIEW to review', () => {
    expect(mapBriefingStageToChat('REVIEW')).toBe('review')
  })

  it('maps DEEPEN to review', () => {
    expect(mapBriefingStageToChat('DEEPEN')).toBe('review')
  })

  it('maps SUBMIT to review', () => {
    expect(mapBriefingStageToChat('SUBMIT')).toBe('review')
  })

  it('defaults to brief for unknown stage', () => {
    expect(mapBriefingStageToChat('UNKNOWN' as never)).toBe('brief')
  })
})

describe('calculateChatStageFromBriefing', () => {
  it('returns 0% for EXTRACT stage', () => {
    const result = calculateChatStageFromBriefing('EXTRACT')
    expect(result.currentStage).toBe('brief')
    expect(result.progressPercentage).toBe(0)
  })

  it('returns correct progress for INSPIRATION', () => {
    const result = calculateChatStageFromBriefing('INSPIRATION')
    expect(result.currentStage).toBe('style')
    expect(result.completedStages).toContain('brief')
    expect(result.progressPercentage).toBeGreaterThan(0)
  })

  it('returns high progress for SUBMIT', () => {
    const result = calculateChatStageFromBriefing('SUBMIT')
    expect(result.currentStage).toBe('review')
    expect(result.progressPercentage).toBe(100)
  })

  it('includes stage descriptions', () => {
    const result = calculateChatStageFromBriefing('EXTRACT')
    expect(result.stageDescriptions).toEqual(STAGE_DESCRIPTIONS)
  })
})

describe('calculateChatStage', () => {
  it('starts at brief stage with no messages', () => {
    const result = calculateChatStage({
      messages: [],
      selectedStyles: [],
      moodboardItems: [],
      pendingTask: null,
      taskSubmitted: false,
    })
    expect(result.currentStage).toBe('brief')
    expect(result.completedStages).toHaveLength(0)
  })

  it('advances past brief when user sends a message and styles shown', () => {
    const result = calculateChatStage({
      messages: [
        { id: '1', role: 'user', content: 'I need a post' },
        {
          id: '2',
          role: 'assistant',
          content: 'Here are styles',
          deliverableStyles: [{ id: 's1' }],
        },
      ] as never,
      selectedStyles: [],
      moodboardItems: [],
      pendingTask: null,
      taskSubmitted: false,
    })
    expect(result.currentStage).toBe('style')
    expect(result.completedStages).toContain('brief')
  })

  it('advances to details when styles are selected', () => {
    const result = calculateChatStage({
      messages: [{ id: '1', role: 'user', content: 'test' }] as never,
      selectedStyles: ['style-1'],
      moodboardItems: [],
      pendingTask: null,
      taskSubmitted: false,
    })
    expect(result.currentStage).toBe('details')
    expect(result.completedStages).toContain('style')
  })

  it('advances to submit when task is proposed', () => {
    const result = calculateChatStage({
      messages: [{ id: '1', role: 'user', content: 'test' }] as never,
      selectedStyles: ['style-1'],
      moodboardItems: [],
      pendingTask: {
        title: 'Task',
        description: 'Desc',
        category: 'cat',
        estimatedHours: 2,
        creditsRequired: 5,
      },
      taskSubmitted: false,
    })
    expect(result.currentStage).toBe('submit')
    expect(result.completedStages).toContain('details')
    expect(result.completedStages).toContain('review')
  })

  it('completes submit stage when task is submitted', () => {
    const result = calculateChatStage({
      messages: [{ id: '1', role: 'user', content: 'test' }] as never,
      selectedStyles: ['style-1'],
      moodboardItems: [],
      pendingTask: {
        title: 'Task',
        description: 'Desc',
        category: 'cat',
        estimatedHours: 2,
        creditsRequired: 5,
      },
      taskSubmitted: true,
    })
    expect(result.completedStages).toContain('submit')
  })
})

describe('getNextStage', () => {
  it('returns narrative after brief', () => {
    expect(getNextStage('brief')).toBe('narrative')
  })

  it('returns style after narrative', () => {
    expect(getNextStage('narrative')).toBe('style')
  })

  it('returns null for last stage', () => {
    expect(getNextStage('review')).toBeNull()
  })
})

describe('getStageHint', () => {
  it('returns a hint string for each stage', () => {
    for (const stage of CHAT_STAGES) {
      const hint = getStageHint(stage)
      expect(typeof hint).toBe('string')
      expect(hint.length).toBeGreaterThan(0)
    }
  })
})

describe('isStageCompleted', () => {
  it('returns true when stage is in completed list', () => {
    expect(isStageCompleted('brief', ['brief', 'style'])).toBe(true)
  })

  it('returns false when stage is not in completed list', () => {
    expect(isStageCompleted('details', ['brief', 'style'])).toBe(false)
  })
})

describe('isCurrentStage', () => {
  it('returns true when stages match', () => {
    expect(isCurrentStage('style', 'style')).toBe(true)
  })

  it('returns false when stages differ', () => {
    expect(isCurrentStage('brief', 'style')).toBe(false)
  })
})
