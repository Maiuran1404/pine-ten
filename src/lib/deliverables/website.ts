/**
 * Website Deliverable Config
 *
 * Handles website design: blueprint → inspiration → style → section studio → review.
 * Extracted from briefing-state-machine.ts, briefing-quick-options.ts,
 * chat-progress.ts, and structure-panel.tsx.
 */

import { Layout } from 'lucide-react'
import type { ChatStage } from '@/components/chat/types'
import type { BriefingStage, BriefingState, WebsitePhase } from '@/lib/ai/briefing-state-machine'
import type { DeliverableConfig, StageContext, ElaborationProgress } from './types'

export const websiteConfig: DeliverableConfig = {
  type: 'website',
  structureType: 'layout',
  label: 'Website',
  icon: Layout,

  // ─── Stage Pipeline ──────────────────────────────────────────

  chatStages: ['brief', 'style', 'storyboard', 'review'],

  stageLabels: {
    brief: 'Blueprint',
    style: 'Style',
    storyboard: 'Studio',
    review: 'Review',
  },

  mapBriefingStageToChat: (stage: BriefingStage): ChatStage => {
    switch (stage) {
      case 'EXTRACT':
      case 'TASK_TYPE':
      case 'INTENT':
      case 'STRUCTURE':
        return 'brief'
      case 'INSPIRATION':
        return 'style'
      case 'ELABORATE':
      case 'STRATEGIC_REVIEW':
      case 'MOODBOARD':
        return 'storyboard'
      case 'REVIEW':
      case 'DEEPEN':
      case 'SUBMIT':
        return 'review'
      default:
        return 'brief'
    }
  },

  stageDescriptions: (stage: BriefingStage, ctx: StageContext): string => {
    switch (stage) {
      case 'EXTRACT':
      case 'TASK_TYPE':
      case 'INTENT':
        return 'Describe your project'
      case 'STRUCTURE':
        return 'Generating page layout'
      case 'INSPIRATION':
        if ((ctx.websiteInspirations?.length ?? 0) === 0) return 'Choose inspirations'
        if (!ctx.websiteStyleConfirmed) return 'Select visual style'
        return 'Style confirmed'
      case 'ELABORATE':
        return 'Section studio'
      case 'STRATEGIC_REVIEW':
        return 'Strategic review'
      case 'MOODBOARD':
        return 'Building your brief'
      case 'REVIEW':
      case 'DEEPEN':
        return 'Review your brief'
      case 'SUBMIT':
        return 'Ready to submit'
      default:
        return 'Building your brief'
    }
  },

  exitConditions: {
    STRUCTURE: (s: BriefingState) => {
      if (!s.structure) return false
      return true
    },
    INSPIRATION: (s: BriefingState) => {
      // Website: requires both inspirations selected AND style variant confirmed
      return (s.websiteInspirations?.length ?? 0) > 0 && s.websiteStyleConfirmed === true
    },
    ELABORATE: (s: BriefingState) => {
      return websiteConfig.checkElaborationComplete(s)
    },
  },

  // ─── Quick Options ──────────────────────────────────────────

  getQuickOptions: (state: BriefingState) => {
    if (state.stage === 'STRUCTURE') {
      return {
        question: "What's the primary goal?",
        options: ['Book consultations', 'Build authority', 'Generate leads'],
      }
    }
    if (state.stage === 'INSPIRATION') {
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
    if (state.stage === 'ELABORATE') {
      if (state.turnsInCurrentStage === 0) {
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
    if (state.stage === 'DEEPEN') {
      return {
        question: 'What would add the most value?',
        options: [...websiteConfig.deepenQuickOptions, 'Done, submit now'],
      }
    }
    // Return undefined for stages that should use the default handler
    return undefined
  },

  deepenQuickOptions: ['Refine copy', 'Conversion optimization'],

  // ─── Elaboration ──────────────────────────────────────────

  checkElaborationComplete: (state: BriefingState): boolean => {
    if (!state.structure) return false
    if (state.structure.type !== 'layout') return false
    // Check if any section has headline or draftContent
    return state.structure.sections.some((s) => s.headline || s.draftContent)
  },

  getElaborationProgress: (data): ElaborationProgress => {
    if (data.type !== 'layout') return { done: 0, total: 0 }
    const sections = data.sections
    const done = sections.filter((s) => s.headline || s.draftContent).length
    return { done, total: sections.length }
  },

  // ─── UI ──────────────────────────────────────────

  loadingMessages: [
    'Drafting page structure...',
    'Mapping content sections...',
    'Building layout framework...',
    'Defining content blocks...',
    'Organizing information hierarchy...',
  ],

  deepenOptions: ['production_copy', 'conversion_optimization'],

  creditEstimate: 30,

  // ─── Readiness ──────────────────────────────────────────

  isReadyForDesigner: (state: BriefingState): boolean => {
    const brief = state.brief
    const hasTaskSummary = brief.taskSummary.value && brief.taskSummary.confidence >= 0.7
    const hasIntent = brief.intent.value && brief.intent.confidence >= 0.7
    const hasPlatform = brief.platform.value && brief.platform.confidence >= 0.7
    const hasAudience = brief.audience.value && brief.audience.confidence >= 0.7
    // Websites don't need predefined pixel dimensions
    // Websites use websiteStyleConfirmed instead of deliverable style cards
    const hasStyleConfirmed = state.websiteStyleConfirmed === true
    const hasContent = true // Layout sections serve this role

    return !!(
      hasTaskSummary &&
      hasIntent &&
      hasPlatform &&
      hasAudience &&
      hasStyleConfirmed &&
      hasContent
    )
  },

  shouldShowStructurePanel: (state: BriefingState): boolean => {
    return (
      state.stage === 'STRUCTURE' ||
      state.stage === 'INSPIRATION' ||
      state.stage === 'ELABORATE' ||
      state.structure !== null ||
      state.deliverableCategory === 'website'
    )
  },

  getSubStageBonus: (briefingStage: BriefingStage): number => {
    // Website blueprint: EXTRACT=0, TASK_TYPE=3, INTENT=5, STRUCTURE=10
    const subStageMap: Record<string, number> = {
      EXTRACT: 0,
      TASK_TYPE: 3,
      INTENT: 5,
      STRUCTURE: 10,
    }
    return subStageMap[briefingStage] ?? 0
  },

  // ─── Website-specific ──────────────────────────────────────

  derivePhase: (state: BriefingState): WebsitePhase | null => {
    if (state.deliverableCategory !== 'website') return null
    if (!state.structure) return 'blueprint'
    if ((state.websiteInspirations?.length ?? 0) === 0) return 'inspiration'
    if (!state.websiteStyleConfirmed) return 'style'
    if (!websiteConfig.checkElaborationComplete(state)) return 'studio'
    return 'review'
  },
}
