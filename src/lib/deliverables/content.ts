/**
 * Content/Calendar Deliverable Config
 *
 * Handles content calendars and social media plans.
 * Extracted from briefing-state-machine.ts, briefing-quick-options.ts,
 * chat-progress.ts.
 */

import { Calendar } from 'lucide-react'
import type { ChatStage } from '@/components/chat/types'
import type { BriefingStage, BriefingState } from '@/lib/ai/briefing-state-machine'
import type { DeliverableConfig, StageContext, ElaborationProgress } from './types'

export const contentConfig: DeliverableConfig = {
  type: 'content',
  structureType: 'calendar',
  label: 'Content',
  icon: Calendar,

  // ─── Stage Pipeline ──────────────────────────────────────────

  chatStages: ['brief', 'narrative', 'style', 'storyboard', 'review'],

  stageLabels: {
    brief: 'Brief',
    narrative: 'Plan',
    style: 'Style',
    storyboard: 'Calendar',
    review: 'Review',
  },

  mapBriefingStageToChat: (stage: BriefingStage): ChatStage => {
    switch (stage) {
      case 'EXTRACT':
      case 'TASK_TYPE':
      case 'INTENT':
        return 'brief'
      case 'STRUCTURE':
        return 'narrative'
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

  stageDescriptions: (stage: BriefingStage, _ctx: StageContext): string => {
    switch (stage) {
      case 'EXTRACT':
      case 'TASK_TYPE':
      case 'INTENT':
        return 'Describe your project'
      case 'STRUCTURE':
        return 'Content plan'
      case 'INSPIRATION':
        return 'Choose your visual style'
      case 'ELABORATE':
        return 'Refine details'
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
      return (s.brief.visualDirection?.selectedStyles?.length ?? 0) > 0
    },
    ELABORATE: (s: BriefingState) => {
      return contentConfig.checkElaborationComplete(s)
    },
  },

  // ─── Quick Options ──────────────────────────────────────────

  getQuickOptions: (state: BriefingState) => {
    if (state.stage === 'ELABORATE') {
      if (state.turnsInCurrentStage === 0) {
        return {
          question: 'How does the detail look?',
          options: ['Looks great, continue', 'Adjust specific sections', 'Different approach'],
        }
      }
      return {
        question: 'What needs work?',
        options: ['Rewrite post captions', 'Adjust pillar identity', 'Good enough, move on'],
      }
    }
    if (state.stage === 'DEEPEN') {
      return {
        question: 'What would add the most value?',
        options: [...contentConfig.deepenQuickOptions, 'Done, submit now'],
      }
    }
    return undefined
  },

  deepenQuickOptions: ['Refine messaging', 'A/B content variants'],

  // ─── Elaboration ──────────────────────────────────────────

  checkElaborationComplete: (state: BriefingState): boolean => {
    if (!state.structure) return false
    if (state.structure.type !== 'calendar') return false
    const hasPostDetail = state.structure.outline.weeks.some((w) =>
      w.posts.some((p) => p.sampleCopy || p.captionHook)
    )
    const hasPillarDetail = state.structure.outline.contentPillars.some((p) => p.visualIdentity)
    return hasPostDetail || hasPillarDetail
  },

  getElaborationProgress: (data): ElaborationProgress => {
    if (data.type !== 'calendar') return { done: 0, total: 0 }
    const allPosts = data.outline.weeks.flatMap((w) => w.posts)
    const done = allPosts.filter((p) => p.sampleCopy || p.captionHook).length
    return { done, total: allPosts.length }
  },

  // ─── UI ──────────────────────────────────────────

  loadingMessages: [
    'Planning your content strategy...',
    'Mapping content pillars...',
    'Building weekly cadence...',
    'Crafting engagement triggers...',
    'Scheduling optimal posting times...',
  ],

  deepenOptions: ['production_copy', 'ab_variant'],

  creditEstimate: 15,

  // ─── Readiness ──────────────────────────────────────────

  isReadyForDesigner: (state: BriefingState): boolean => {
    const brief = state.brief
    const hasTaskSummary = brief.taskSummary.value && brief.taskSummary.confidence >= 0.7
    const hasIntent = brief.intent.value && brief.intent.confidence >= 0.7
    const hasPlatform = brief.platform.value && brief.platform.confidence >= 0.7
    const hasAudience = brief.audience.value && brief.audience.confidence >= 0.7
    const hasDimensions = brief.dimensions.length > 0
    const hasContent =
      brief.taskType.value === 'single_asset' ||
      (brief.contentOutline && brief.contentOutline.weekGroups.length > 0)
    const hasVisual = brief.visualDirection && brief.visualDirection.selectedStyles.length > 0

    return !!(
      hasTaskSummary &&
      hasIntent &&
      hasPlatform &&
      hasAudience &&
      hasDimensions &&
      hasContent &&
      hasVisual
    )
  },

  shouldShowStructurePanel: (state: BriefingState): boolean => {
    return (
      state.stage === 'STRUCTURE' ||
      state.stage === 'INSPIRATION' ||
      state.stage === 'ELABORATE' ||
      state.structure !== null
    )
  },

  getSubStageBonus: (briefingStage: BriefingStage): number => {
    const subStageMap: Record<string, number> = { EXTRACT: 0, TASK_TYPE: 3, INTENT: 7 }
    return subStageMap[briefingStage] ?? 0
  },
}
