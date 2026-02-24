import 'server-only'

export const WEBSITE_SKELETON_STAGES = [
  'INITIAL_GENERATION',
  'SECTION_FEEDBACK',
  'CONTENT_REFINEMENT',
  'STYLE_APPLICATION',
  'FINAL_REVIEW',
] as const

export type WebsiteSkeletonStage = (typeof WEBSITE_SKELETON_STAGES)[number]

export interface WebsiteSkeletonState {
  stage: WebsiteSkeletonStage
  chatTurns: number
  sectionsConfirmed: number
  totalSections: number
  hasStylePreferences: boolean
  hasFeedback: boolean
}

export function createInitialSkeletonState(totalSections: number): WebsiteSkeletonState {
  return {
    stage: 'INITIAL_GENERATION',
    chatTurns: 0,
    sectionsConfirmed: 0,
    totalSections,
    hasStylePreferences: false,
    hasFeedback: false,
  }
}

export function advanceSkeletonStage(state: WebsiteSkeletonState): WebsiteSkeletonState {
  const nextStageMap: Record<WebsiteSkeletonStage, WebsiteSkeletonStage | null> = {
    INITIAL_GENERATION: 'SECTION_FEEDBACK',
    SECTION_FEEDBACK: 'CONTENT_REFINEMENT',
    CONTENT_REFINEMENT: 'STYLE_APPLICATION',
    STYLE_APPLICATION: 'FINAL_REVIEW',
    FINAL_REVIEW: null,
  }

  const nextStage = nextStageMap[state.stage]
  if (!nextStage) return state

  return {
    ...state,
    stage: nextStage,
  }
}

export function shouldAdvanceStage(state: WebsiteSkeletonState): boolean {
  switch (state.stage) {
    case 'INITIAL_GENERATION':
      // After first skeleton is generated, move to feedback
      return state.chatTurns >= 1
    case 'SECTION_FEEDBACK':
      // After user has provided feedback on sections
      return state.hasFeedback && state.chatTurns >= 3
    case 'CONTENT_REFINEMENT':
      // After content direction is established
      return state.chatTurns >= 5
    case 'STYLE_APPLICATION':
      // After style preferences are set
      return state.hasStylePreferences
    case 'FINAL_REVIEW':
      return false // Terminal state
    default:
      return false
  }
}

export function getStagePromptHint(stage: WebsiteSkeletonStage): string {
  const hints: Record<WebsiteSkeletonStage, string> = {
    INITIAL_GENERATION:
      "Generate the initial section-by-section skeleton based on the user's inspirations and notes. Be proactive with recommendations.",
    SECTION_FEEDBACK:
      'The user is reviewing and giving feedback on individual sections. Help them refine the structure - add, remove, or reorder sections.',
    CONTENT_REFINEMENT:
      'Focus on content direction for each section - headlines, copy tone, key messages. Suggest specific placeholder content.',
    STYLE_APPLICATION:
      "Apply visual style preferences - colors, typography, spacing. Reference the user's inspiration picks for style cues.",
    FINAL_REVIEW:
      'The skeleton is nearly complete. Summarize the full design, confirm all sections are satisfactory, and prepare for approval.',
  }
  return hints[stage]
}

export function getStageIndex(stage: WebsiteSkeletonStage): number {
  return WEBSITE_SKELETON_STAGES.indexOf(stage)
}

export function isTerminalStage(stage: WebsiteSkeletonStage): boolean {
  return stage === 'FINAL_REVIEW'
}
