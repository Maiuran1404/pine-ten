/**
 * Deterministic Quick Options for Briefing State Machine
 *
 * AI does NOT produce quick options. The state machine generates them
 * based on current stage and stall config.
 *
 * All functions are pure — no side effects, no API calls.
 */

import type { QuickOptions } from '@/components/chat/types'
import type { BriefingState, BriefingStage, DeliverableCategory } from './briefing-state-machine'
import { STALL_CONFIG } from './briefing-state-machine'

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Generate deterministic quick options based on current state.
 * Returns null if no quick options should be shown (e.g., SUBMIT, EXTRACT).
 */
export function generateQuickOptions(state: BriefingState): QuickOptions | null {
  const generator = STAGE_OPTIONS[state.stage]
  if (!generator) return null
  return generator(state)
}

// =============================================================================
// STAGE-SPECIFIC GENERATORS
// =============================================================================

const STAGE_OPTIONS: Record<BriefingStage, (state: BriefingState) => QuickOptions | null> = {
  EXTRACT: (state) => {
    const turns = state.turnsInCurrentStage
    const config = STALL_CONFIG.EXTRACT

    // Turn 3+: confident recommendation
    if (config.maxTurnsBeforeRecommend !== null && turns >= config.maxTurnsBeforeRecommend) {
      return {
        question: 'Pick a direction',
        options: [
          'Sounds good',
          "Actually, let's do something else",
          'I need to think about this differently',
        ],
      }
    }

    // Turn 2: narrowed options
    if (config.maxTurnsBeforeNarrow !== null && turns >= config.maxTurnsBeforeNarrow) {
      return {
        question: 'What kind of project?',
        options: ['Video content', 'Social media graphics', 'Website design', 'Something else'],
      }
    }

    // Turn 0-1: no quick options — let the user describe freely
    return null
  },

  TASK_TYPE: (state) => {
    const turns = state.turnsInCurrentStage
    const config = STALL_CONFIG.TASK_TYPE

    // Turn 3+: confident recommendation
    if (config.maxTurnsBeforeRecommend !== null && turns >= config.maxTurnsBeforeRecommend) {
      return {
        question: 'Pick a direction',
        options: [
          'Sounds good',
          "Actually, let's do something else",
          'I need to think about this differently',
        ],
      }
    }

    // Turn 2: narrowed options
    if (config.maxTurnsBeforeNarrow !== null && turns >= config.maxTurnsBeforeNarrow) {
      return {
        question: 'Which is closer?',
        options: ['Video (impact piece)', 'Social content (ongoing)', 'Something else'],
      }
    }

    // Turn 1: full options
    return {
      question: 'What are we making?',
      options: ['Video', 'Social content', 'Website design', 'Branding', 'Something else'],
    }
  },

  INTENT: (state) => {
    const turns = state.turnsInCurrentStage
    const config = STALL_CONFIG.INTENT

    // Turn 3+: confident recommendation
    if (config.maxTurnsBeforeRecommend !== null && turns >= config.maxTurnsBeforeRecommend) {
      return {
        question: 'Pick a direction',
        options: [
          'Sounds good',
          "Actually, let's focus on something else",
          'I need to think about this differently',
        ],
      }
    }

    // Turn 2: narrowed
    if (config.maxTurnsBeforeNarrow !== null && turns >= config.maxTurnsBeforeNarrow) {
      return {
        question: "What's the main goal?",
        options: ['Drive signups', 'Build authority', 'Something else'],
      }
    }

    // Turn 1: full options
    return {
      question: "What's the business goal?",
      options: ['Drive signups', 'Build authority', 'Increase awareness', 'Boost sales'],
    }
  },

  INSPIRATION: (state) => {
    // Website-specific inspiration options
    if (state.deliverableCategory === 'website') {
      const hasInspirations = (state.websiteInspirations?.length ?? 0) > 0
      const styleConfirmed = state.websiteStyleConfirmed === true

      if (!hasInspirations) {
        return {
          question: 'Find inspiration',
          options: ['Browse gallery', 'I have a reference URL', 'Skip inspirations'],
        }
      }

      if (!styleConfirmed) {
        return {
          question: 'Ready for styles?',
          options: ['Pick a style', 'Show me variants', 'Add more references'],
        }
      }

      return {
        question: 'What do you think?',
        options: ['I like this direction', 'Show me more', 'Something different'],
      }
    }

    // Default for non-website deliverables
    return {
      question: 'What do you think?',
      options: ['I like this direction', 'Show me more', 'Something different'],
    }
  },

  STRUCTURE: (state) => {
    // Website-specific structure options (goal chips)
    if (state.deliverableCategory === 'website') {
      return {
        question: "What's the primary goal?",
        options: ['Book consultations', 'Build authority', 'Generate leads'],
      }
    }

    // Default for non-website deliverables
    return {
      question: 'How does this look?',
      options: ['Looks good, continue', 'I want to adjust this', 'Different approach'],
    }
  },

  STRATEGIC_REVIEW: () => ({
    question: 'Your call',
    options: ['Looks good, continue', "Good catch, let's adjust", 'I hear you but keep it as-is'],
  }),

  MOODBOARD: () => ({
    question: 'Visual direction',
    options: ['Ready to review', 'Tweak visuals', 'Add section-specific direction'],
  }),

  REVIEW: () => ({
    question: "What's next?",
    options: ['Submit as-is', 'Go deeper first', 'Make changes'],
  }),

  DEEPEN: (state) => {
    const category = state.deliverableCategory
    const contextOptions = getDeepenQuickOptions(category)
    return {
      question: 'What would add the most value?',
      options: [...contextOptions, 'Done, submit now'],
    }
  },

  ELABORATE: (state) => {
    const isFirstTurn = state.turnsInCurrentStage === 0
    const category = state.deliverableCategory

    // Website-specific elaborate options (Section Studio)
    if (category === 'website') {
      if (isFirstTurn) {
        return {
          question: 'Section studio',
          options: ['Generate all copy', 'Edit specific section', 'Good enough, review'],
        }
      }
      return {
        question: 'What needs work?',
        options: ['Generate all copy', 'Edit specific section', 'Good enough, review'],
      }
    }

    if (isFirstTurn) {
      return {
        question: 'How does the detail look?',
        options: ['Looks great, continue', 'Adjust specific sections', 'Different approach'],
      }
    }
    // Subsequent turns: deliverable-specific refinement
    switch (category) {
      case 'video':
        return {
          question: 'What needs work?',
          options: ['Rewrite a scene script', 'Adjust director notes', 'Good enough, move on'],
        }
      case 'content':
        return {
          question: 'What needs work?',
          options: ['Rewrite post captions', 'Adjust pillar identity', 'Good enough, move on'],
        }
      default:
        return {
          question: 'What needs work?',
          options: ['Refine the copy', 'Adjust the layout', 'Good enough, move on'],
        }
    }
  },

  SUBMIT: () => null, // Single-pass stage
}

// =============================================================================
// DEEPEN OPTIONS BY DELIVERABLE
// =============================================================================

function getDeepenQuickOptions(category: DeliverableCategory | null): string[] {
  switch (category) {
    case 'video':
      return ['Refine script', 'A/B hook variant']
    case 'website':
      return ['Refine copy', 'Conversion optimization']
    case 'content':
      return ['Refine messaging', 'A/B content variants']
    case 'design':
    case 'brand':
      return ['Asset specifications', 'Variant concepts']
    default:
      return ['Optimize for conversion', 'Full asset specs']
  }
}
