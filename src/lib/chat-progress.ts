import {
  type ChatStage,
  type MoodboardItem,
  type TaskProposal,
  type ChatMessage,
} from '@/components/chat/types'
import type {
  BriefingStage,
  VideoNarrative,
  WebsiteInspiration,
} from '@/lib/ai/briefing-state-machine'

interface ProgressState {
  messages: ChatMessage[]
  selectedStyles: string[]
  moodboardItems: MoodboardItem[]
  pendingTask: TaskProposal | null
  taskSubmitted: boolean
}

interface ProgressResult {
  currentStage: ChatStage
  completedStages: ChatStage[]
  progressPercentage: number
  stageDescriptions: Record<ChatStage, string>
}

/**
 * Stage definitions with descriptions
 */
export const CHAT_STAGES: ChatStage[] = ['brief', 'narrative', 'style', 'storyboard', 'review']

export const STAGE_DESCRIPTIONS: Record<ChatStage, string> = {
  brief: 'Describe your project',
  narrative: 'Story concept',
  style: 'Visual style',
  storyboard: 'Storyboard',
  review: 'Review & submit',
  // Legacy entries (kept for backward compat, weight 0)
  details: 'Define your structure',
  strategic_review: 'Strategic review',
  moodboard: 'Refine your moodboard',
  deepen: 'Deepen your brief',
  submit: 'Submit for creation',
}

export const WEBSITE_STAGE_DESCRIPTIONS: Record<ChatStage, string> = {
  ...STAGE_DESCRIPTIONS,
  brief: 'Blueprint',
  style: 'Style',
  storyboard: 'Studio',
  review: 'Review',
}

/**
 * Stages used when the briefing state machine is enabled.
 */
export const BRIEFING_CHAT_STAGES: ChatStage[] = [
  'brief',
  'narrative',
  'style',
  'storyboard',
  'review',
]

/**
 * Stages used for website deliverables.
 * Maps to: Blueprint → Style (Inspiration + Style variant) → Studio → Review
 */
export const WEBSITE_CHAT_STAGES: ChatStage[] = ['brief', 'style', 'storyboard', 'review']

/**
 * Map a BriefingStage (state machine) to a ChatStage (progress UI).
 * Multiple BriefingStages collapse into a single ChatStage so the
 * progress bar stays simple.
 *
 * When `deliverableCategory` is 'website', uses a website-specific mapping:
 *   EXTRACT/TASK_TYPE/INTENT/STRUCTURE → 'brief' (Blueprint)
 *   INSPIRATION → 'style' (Inspiration + Style variant)
 *   ELABORATE → 'storyboard' (Section Studio)
 *   REVIEW+ → 'review'
 */
export function mapBriefingStageToChat(
  stage: BriefingStage,
  deliverableCategory?: string | null
): ChatStage {
  if (deliverableCategory === 'website') {
    switch (stage) {
      case 'EXTRACT':
      case 'TASK_TYPE':
      case 'INTENT':
      case 'STRUCTURE':
        return 'brief'
      case 'INSPIRATION':
        return 'style'
      case 'ELABORATE':
        return 'storyboard'
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
  }

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
      return 'storyboard'
    case 'STRATEGIC_REVIEW':
    case 'MOODBOARD':
      return 'storyboard'
    case 'REVIEW':
    case 'DEEPEN':
      return 'review'
    case 'SUBMIT':
      return 'review'
    default:
      return 'brief'
  }
}

/**
 * Calculate progress from a BriefingStage.
 * Returns a ProgressResult compatible with the existing progress UI.
 */
export function calculateChatStageFromBriefing(
  briefingStage: BriefingStage,
  deliverableCategory?: string | null
): ProgressResult {
  const chatStage = mapBriefingStageToChat(briefingStage, deliverableCategory)
  const stages = deliverableCategory === 'website' ? WEBSITE_CHAT_STAGES : BRIEFING_CHAT_STAGES
  const stageIndex = stages.indexOf(chatStage)

  const completedStages = stages.slice(0, stageIndex)
  const basePercentage = Math.round((stageIndex / (stages.length - 1)) * 100)

  // Add sub-stage progress within the "brief" stage so it doesn't stay at 0%
  let subStageBonus = 0
  if (chatStage === 'brief') {
    if (deliverableCategory === 'website') {
      // Website blueprint: EXTRACT=0, TASK_TYPE=3, INTENT=5, STRUCTURE=10
      const subStageMap: Record<string, number> = {
        EXTRACT: 0,
        TASK_TYPE: 3,
        INTENT: 5,
        STRUCTURE: 10,
      }
      subStageBonus = subStageMap[briefingStage] ?? 0
    } else {
      const subStageMap: Record<string, number> = { EXTRACT: 0, TASK_TYPE: 3, INTENT: 7 }
      subStageBonus = subStageMap[briefingStage] ?? 0
    }
  }

  return {
    currentStage: chatStage,
    completedStages,
    progressPercentage: Math.min(100, basePercentage + subStageBonus),
    stageDescriptions:
      deliverableCategory === 'website' ? WEBSITE_STAGE_DESCRIPTIONS : STAGE_DESCRIPTIONS,
  }
}

/**
 * Calculate the current chat stage based on conversation state
 */
export function calculateChatStage(state: ProgressState): ProgressResult {
  const { messages, selectedStyles, moodboardItems, pendingTask, taskSubmitted } = state

  const completedStages: ChatStage[] = []
  let currentStage: ChatStage = 'brief'

  // Count user messages (excluding welcome)
  const userMessages = messages.filter((m) => m.role === 'user' && m.id !== 'welcome')
  const userMessageCount = userMessages.length
  const hasUserMessage = userMessageCount > 0

  // Check if visual styles have been shown (message contains deliverableStyles)
  const hasStylesShown = messages.some(
    (m) => m.role === 'assistant' && m.deliverableStyles && m.deliverableStyles.length > 0
  )

  // Stage 1: Brief - User has sent at least one message
  // Only advance to style stage if styles have been shown
  if (hasUserMessage) {
    completedStages.push('brief')
    currentStage = hasStylesShown ? 'style' : 'brief'
  }

  // Stage 2: Style - User has selected styles OR has moodboard items
  // Only mark complete if user has actually selected/added styles
  const hasStyleSelection = selectedStyles.length > 0
  const hasMoodboardItems = moodboardItems.length >= 1

  if (hasStyleSelection || hasMoodboardItems) {
    if (!completedStages.includes('brief')) {
      completedStages.push('brief')
    }
    completedStages.push('style')
    currentStage = 'details'
  }

  // Stage 3: Details - A task proposal has been generated
  const hasTaskProposal = pendingTask !== null

  if (hasTaskProposal) {
    if (!completedStages.includes('brief')) completedStages.push('brief')
    if (!completedStages.includes('style')) completedStages.push('style')
    completedStages.push('details')
    currentStage = 'review'
  }

  // Stage 4: Review - Pending task exists and is ready for review
  if (hasTaskProposal && completedStages.includes('details')) {
    completedStages.push('review')
    currentStage = 'submit'
  }

  // Stage 5: Submit - Task has been submitted
  if (taskSubmitted) {
    completedStages.push('submit')
    currentStage = 'submit'
  }

  // Calculate progress percentage with message-based micro-progress
  const progressPercentage = calculateProgressPercentage(
    completedStages,
    currentStage,
    userMessageCount,
    moodboardItems.length
  )

  return {
    currentStage,
    completedStages,
    progressPercentage,
    stageDescriptions: STAGE_DESCRIPTIONS,
  }
}

/**
 * Calculate progress percentage based on completed stages
 * Now includes message-based micro-progress for smoother progression
 */
function calculateProgressPercentage(
  completedStages: ChatStage[],
  currentStage: ChatStage,
  userMessageCount: number,
  moodboardItemCount: number
): number {
  const stageWeights: Record<ChatStage, number> = {
    brief: 10,
    narrative: 20,
    style: 15,
    storyboard: 30,
    review: 25,
    // Legacy stages (weight 0)
    details: 0,
    strategic_review: 0,
    moodboard: 0,
    deepen: 0,
    submit: 0,
  }

  // Sum weights of completed stages
  let percentage = completedStages.reduce((sum, stage) => sum + stageWeights[stage], 0)

  // Add message-based micro-progress within the current stage
  // This creates smoother progression as user exchanges messages
  const currentIndex = BRIEFING_CHAT_STAGES.indexOf(currentStage)
  const completedIndex = completedStages.length - 1

  if (currentIndex > completedIndex) {
    const currentWeight = stageWeights[currentStage]

    // Calculate micro-progress based on stage
    let microProgress = 0

    switch (currentStage) {
      case 'brief':
        // Brief stage: progress based on having sent a message
        microProgress = userMessageCount > 0 ? currentWeight * 0.5 : 0
        break

      case 'narrative':
        // Narrative stage: progress based on messages exchanged
        microProgress = currentWeight * Math.min(0.8, 0.2 + Math.min(userMessageCount, 4) * 0.15)
        break

      case 'style':
        // Style stage: small progress while browsing styles
        microProgress = currentWeight * 0.3
        break

      case 'storyboard': {
        // Storyboard stage: progress based on messages exchanged
        const messageProgress = Math.min(userMessageCount - 1, 4) * 0.15
        const moodboardBonus = Math.min(moodboardItemCount, 3) * 0.05
        microProgress = currentWeight * Math.min(0.8, 0.2 + messageProgress + moodboardBonus)
        break
      }

      case 'review':
        // Review stage: progress when task is ready for review
        microProgress = currentWeight * 0.5
        break

      default:
        microProgress = currentWeight * 0.5
    }

    percentage += microProgress
  }

  return Math.min(100, Math.round(percentage))
}

/**
 * Get the next stage to complete
 */
export function getNextStage(currentStage: ChatStage): ChatStage | null {
  const currentIndex = CHAT_STAGES.indexOf(currentStage)
  if (currentIndex < CHAT_STAGES.length - 1) {
    return CHAT_STAGES[currentIndex + 1]
  }
  return null
}

/**
 * Get a hint message for the current stage
 */
export function getStageHint(currentStage: ChatStage): string {
  const hints: Record<ChatStage, string> = {
    brief: 'Tell me about your design project',
    narrative: 'Building your story concept',
    style: 'Select styles that match your vision',
    storyboard: 'Building your storyboard',
    review: 'Review and confirm your request',
    // Legacy
    details: 'Let me refine the requirements',
    strategic_review: 'Reviewing your creative strategy',
    moodboard: 'Refine your moodboard selections',
    deepen: 'Add more detail to your brief',
    submit: 'Ready to submit!',
  }
  return hints[currentStage]
}

/**
 * Check if a stage is completed
 */
export function isStageCompleted(stage: ChatStage, completedStages: ChatStage[]): boolean {
  return completedStages.includes(stage)
}

/**
 * Check if a stage is the current active stage
 */
export function isCurrentStage(stage: ChatStage, currentStage: ChatStage): boolean {
  return stage === currentStage
}

/**
 * Generate a context-aware label from BriefingStage + state data.
 * This replaces static STAGE_DESCRIPTIONS for the active step label.
 */
export function getContextualStageDescription(
  briefingStage: BriefingStage,
  context?: {
    deliverableCategory?: string | null
    structure?: unknown
    videoNarrative?: VideoNarrative | null
    narrativeApproved?: boolean
    websiteInspirations?: WebsiteInspiration[]
    websiteStyleConfirmed?: boolean
  }
): string {
  switch (briefingStage) {
    case 'EXTRACT':
    case 'TASK_TYPE':
    case 'INTENT':
      return 'Describe your project'
    case 'STRUCTURE':
      if (context?.deliverableCategory === 'video') {
        if (!context.videoNarrative) return 'Building story concept'
        if (!context.narrativeApproved) return 'Review story concept'
        return 'Story concept approved'
      }
      if (context?.deliverableCategory === 'website') return 'Generating page layout'
      if (context?.deliverableCategory === 'content') return 'Content plan'
      return 'Define your structure'
    case 'INSPIRATION':
      if (context?.deliverableCategory === 'website') {
        if ((context.websiteInspirations?.length ?? 0) === 0) return 'Choose inspirations'
        if (!context.websiteStyleConfirmed) return 'Select visual style'
        return 'Style confirmed'
      }
      return 'Choose your visual style'
    case 'ELABORATE':
      if (context?.deliverableCategory === 'video') {
        if (context?.structure) return 'Storyboard ready'
        return 'Building storyboard'
      }
      if (context?.deliverableCategory === 'website') return 'Section studio'
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
}
