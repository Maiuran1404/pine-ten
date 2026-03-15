/**
 * Design/Brand Deliverable Config
 *
 * Handles single design assets and branding projects.
 * Extracted from briefing-state-machine.ts, briefing-quick-options.ts,
 * chat-progress.ts.
 */

import { Palette } from 'lucide-react'
import type { ChatStage } from '@/components/chat/types'
import type { BriefingStage, BriefingState } from '@/lib/ai/briefing-state-machine'
import type { DeliverableConfig, StageContext, ElaborationProgress } from './types'

export const designConfig: DeliverableConfig = {
  type: 'design',
  structureType: 'single_design',
  label: 'Design',
  icon: Palette,

  // ─── Stage Pipeline ──────────────────────────────────────────

  chatStages: ['brief', 'narrative', 'style', 'storyboard', 'review'],

  stageLabels: {
    brief: 'Brief',
    narrative: 'Spec',
    style: 'Style',
    storyboard: 'Details',
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
        return 'Define your structure'
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
      return designConfig.checkElaborationComplete(s)
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
        options: ['Refine the copy', 'Adjust the layout', 'Good enough, move on'],
      }
    }
    if (state.stage === 'DEEPEN') {
      return {
        question: 'What would add the most value?',
        options: [...designConfig.deepenQuickOptions, 'Done, submit now'],
      }
    }
    return undefined
  },

  deepenQuickOptions: ['Asset specifications', 'Variant concepts'],

  // ─── Elaboration ──────────────────────────────────────────

  checkElaborationComplete: (state: BriefingState): boolean => {
    if (!state.structure) return false
    if (state.structure.type !== 'single_design') return false
    const spec = state.structure.specification
    return (spec.exactCopy !== undefined && spec.exactCopy.length > 0) || !!spec.layoutNotes
  },

  getElaborationProgress: (data): ElaborationProgress => {
    if (data.type !== 'single_design') return { done: 0, total: 0 }
    const spec = data.specification
    let done = 0
    const total = 3 // exactCopy, layoutNotes, referenceDesignIds
    if (spec.exactCopy && spec.exactCopy.length > 0) done++
    if (spec.layoutNotes) done++
    if (spec.referenceDesignIds && spec.referenceDesignIds.length > 0) done++
    return { done, total }
  },

  // ─── UI ──────────────────────────────────────────

  loadingMessages: [
    'Defining design specifications...',
    'Mapping key elements...',
    'Building dimension guide...',
    'Crafting copy guidelines...',
    'Refining layout notes...',
  ],

  deepenOptions: ['asset_specifications', 'ab_variant'],

  creditEstimate: 40,

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
