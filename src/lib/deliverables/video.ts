/**
 * Video Deliverable Config
 *
 * Handles video content: narrative → storyboard → scene elaboration flow.
 * Extracted from briefing-state-machine.ts, briefing-quick-options.ts,
 * chat-progress.ts, and structure-panel.tsx.
 */

import { Film } from 'lucide-react'
import type { ChatStage } from '@/components/chat/types'
import type { BriefingStage, BriefingState } from '@/lib/ai/briefing-state-machine'
import type { DeliverableConfig, StageContext, ElaborationProgress } from './types'

export const videoConfig: DeliverableConfig = {
  type: 'video',
  structureType: 'storyboard',
  label: 'Video',
  icon: Film,

  // ─── Stage Pipeline ──────────────────────────────────────────

  chatStages: ['brief', 'narrative', 'style', 'storyboard', 'review'],

  stageLabels: {
    brief: 'Brief',
    narrative: 'Narrative',
    style: 'Style',
    storyboard: 'Storyboard',
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

  stageDescriptions: (stage: BriefingStage, ctx: StageContext): string => {
    switch (stage) {
      case 'EXTRACT':
      case 'TASK_TYPE':
      case 'INTENT':
        return 'Describe your project'
      case 'STRUCTURE':
        if (!ctx.videoNarrative) return 'Building story concept'
        if (!ctx.narrativeApproved) return 'Review story concept'
        return 'Story concept approved'
      case 'INSPIRATION':
        return 'Choose your visual style'
      case 'ELABORATE':
        if (ctx.structure) return 'Storyboard ready'
        return 'Building storyboard'
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
      // Video: exit after narrative approval only (storyboard moves to ELABORATE)
      return s.narrativeApproved === true
    },
    INSPIRATION: (s: BriefingState) => {
      // Style selection after structure is built.
      // Video needs it for DALL-E image generation style context at ELABORATE.
      return (s.brief.visualDirection?.selectedStyles?.length ?? 0) > 0
    },
    ELABORATE: (s: BriefingState) => {
      return videoConfig.checkElaborationComplete(s)
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
        options: ['Rewrite a scene script', 'Adjust director notes', 'Good enough, move on'],
      }
    }
    if (state.stage === 'DEEPEN') {
      return {
        question: 'What would add the most value?',
        options: [...videoConfig.deepenQuickOptions, 'Done, submit now'],
      }
    }
    // Return undefined for stages that should use the default handler
    return undefined
  },

  deepenQuickOptions: ['Refine script', 'A/B hook variant'],

  // ─── Elaboration ──────────────────────────────────────────

  checkElaborationComplete: (state: BriefingState): boolean => {
    if (!state.structure) return false
    if (state.structure.type !== 'storyboard') return false

    // If user explicitly approved the storyboard, skip elaboration count check.
    if (state.storyboardReviewed === true) return true

    // Otherwise require substantial elaboration before auto-advancing.
    // Accept voiceover as fallback for fullScript.
    const scenes = state.structure.scenes
    const elaboratedCount = scenes.filter(
      (s) => s.fullScript || s.directorNotes || (s.voiceover && s.voiceover.length > 30)
    ).length
    // 60% threshold
    const substantiallyElaborated = elaboratedCount >= Math.ceil(scenes.length * 0.6)
    return substantiallyElaborated
  },

  getElaborationProgress: (data): ElaborationProgress => {
    if (data.type !== 'storyboard') return { done: 0, total: 0 }
    const scenes = data.scenes
    const done = scenes.filter(
      (s) => s.fullScript || s.directorNotes || (s.voiceover && s.voiceover.length > 30)
    ).length
    return { done, total: scenes.length }
  },

  // ─── UI ──────────────────────────────────────────

  loadingMessages: [
    'Framing your opening shot...',
    'Building visual sequences...',
    'Composing the narrative arc...',
    'Crafting scene transitions...',
    'Setting the visual tone...',
  ],

  deepenOptions: ['script_writing', 'ab_variant'],

  creditEstimate: 30,

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
      state.structure !== null ||
      state.videoNarrative !== null
    )
  },

  getSubStageBonus: (briefingStage: BriefingStage): number => {
    const subStageMap: Record<string, number> = { EXTRACT: 0, TASK_TYPE: 3, INTENT: 7 }
    return subStageMap[briefingStage] ?? 0
  },
}
