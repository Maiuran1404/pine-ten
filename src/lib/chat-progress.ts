import { type ChatStage, type MoodboardItem, type TaskProposal, type ChatMessage } from "@/components/chat/types";

interface ProgressState {
  messages: ChatMessage[];
  selectedStyles: string[];
  moodboardItems: MoodboardItem[];
  pendingTask: TaskProposal | null;
  taskSubmitted: boolean;
}

interface ProgressResult {
  currentStage: ChatStage;
  completedStages: ChatStage[];
  progressPercentage: number;
  stageDescriptions: Record<ChatStage, string>;
}

/**
 * Stage definitions with descriptions
 */
export const CHAT_STAGES: ChatStage[] = ['brief', 'style', 'details', 'review', 'submit'];

export const STAGE_DESCRIPTIONS: Record<ChatStage, string> = {
  brief: 'Describe your project',
  style: 'Choose your visual style',
  details: 'Refine your requirements',
  review: 'Review your request',
  submit: 'Submit for creation',
};

/**
 * Calculate the current chat stage based on conversation state
 */
export function calculateChatStage(state: ProgressState): ProgressResult {
  const {
    messages,
    selectedStyles,
    moodboardItems,
    pendingTask,
    taskSubmitted,
  } = state;

  const completedStages: ChatStage[] = [];
  let currentStage: ChatStage = 'brief';

  // Count user messages (excluding welcome)
  const userMessages = messages.filter(
    (m) => m.role === 'user' && m.id !== 'welcome'
  );
  const userMessageCount = userMessages.length;
  const hasUserMessage = userMessageCount > 0;

  // Check if visual styles have been shown (message contains deliverableStyles)
  const hasStylesShown = messages.some(
    (m) => m.role === 'assistant' && m.deliverableStyles && m.deliverableStyles.length > 0
  );

  // Stage 1: Brief - User has sent at least one message
  // Only advance to style stage if styles have been shown
  if (hasUserMessage) {
    completedStages.push('brief');
    currentStage = hasStylesShown ? 'style' : 'brief';
  }

  // Stage 2: Style - User has selected styles OR has moodboard items
  // Only mark complete if user has actually selected/added styles
  const hasStyleSelection = selectedStyles.length > 0;
  const hasMoodboardItems = moodboardItems.length >= 1;

  if (hasStyleSelection || hasMoodboardItems) {
    if (!completedStages.includes('brief')) {
      completedStages.push('brief');
    }
    completedStages.push('style');
    currentStage = 'details';
  }

  // Stage 3: Details - A task proposal has been generated
  const hasTaskProposal = pendingTask !== null;

  if (hasTaskProposal) {
    if (!completedStages.includes('brief')) completedStages.push('brief');
    if (!completedStages.includes('style')) completedStages.push('style');
    completedStages.push('details');
    currentStage = 'review';
  }

  // Stage 4: Review - Pending task exists and is ready for review
  if (hasTaskProposal && completedStages.includes('details')) {
    completedStages.push('review');
    currentStage = 'submit';
  }

  // Stage 5: Submit - Task has been submitted
  if (taskSubmitted) {
    completedStages.push('submit');
    currentStage = 'submit';
  }

  // Calculate progress percentage with message-based micro-progress
  const progressPercentage = calculateProgressPercentage(
    completedStages,
    currentStage,
    userMessageCount,
    moodboardItems.length
  );

  return {
    currentStage,
    completedStages,
    progressPercentage,
    stageDescriptions: STAGE_DESCRIPTIONS,
  };
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
    brief: 15,
    style: 20,
    details: 30,
    review: 20,
    submit: 15,
  };

  // Sum weights of completed stages
  let percentage = completedStages.reduce(
    (sum, stage) => sum + stageWeights[stage],
    0
  );

  // Add message-based micro-progress within the current stage
  // This creates smoother progression as user exchanges messages
  const currentIndex = CHAT_STAGES.indexOf(currentStage);
  const completedIndex = completedStages.length - 1;

  if (currentIndex > completedIndex) {
    const currentWeight = stageWeights[currentStage];

    // Calculate micro-progress based on stage
    let microProgress = 0;

    switch (currentStage) {
      case 'brief':
        // Brief stage: progress based on having sent a message
        microProgress = userMessageCount > 0 ? currentWeight * 0.5 : 0;
        break;

      case 'style':
        // Style stage: small progress while browsing styles
        microProgress = currentWeight * 0.3;
        break;

      case 'details':
        // Details stage: progress based on number of messages exchanged
        // Each message adds ~5% up to 80% of the stage weight
        const messageProgress = Math.min(userMessageCount - 1, 4) * 0.2;
        // Moodboard items add a small bonus
        const moodboardBonus = Math.min(moodboardItemCount, 3) * 0.05;
        microProgress = currentWeight * Math.min(0.8, 0.2 + messageProgress + moodboardBonus);
        break;

      case 'review':
        // Review stage: progress when task is ready for review
        microProgress = currentWeight * 0.5;
        break;

      case 'submit':
        // Submit stage: nearly complete
        microProgress = currentWeight * 0.9;
        break;

      default:
        microProgress = currentWeight * 0.5;
    }

    percentage += microProgress;
  }

  return Math.min(100, Math.round(percentage));
}

/**
 * Get the next stage to complete
 */
export function getNextStage(currentStage: ChatStage): ChatStage | null {
  const currentIndex = CHAT_STAGES.indexOf(currentStage);
  if (currentIndex < CHAT_STAGES.length - 1) {
    return CHAT_STAGES[currentIndex + 1];
  }
  return null;
}

/**
 * Get a hint message for the current stage
 */
export function getStageHint(currentStage: ChatStage): string {
  const hints: Record<ChatStage, string> = {
    brief: 'Tell me about your design project',
    style: 'Select styles that match your vision',
    details: 'Let me refine the requirements',
    review: 'Review and confirm your request',
    submit: 'Ready to submit!',
  };
  return hints[currentStage];
}

/**
 * Check if a stage is completed
 */
export function isStageCompleted(
  stage: ChatStage,
  completedStages: ChatStage[]
): boolean {
  return completedStages.includes(stage);
}

/**
 * Check if a stage is the current active stage
 */
export function isCurrentStage(
  stage: ChatStage,
  currentStage: ChatStage
): boolean {
  return stage === currentStage;
}
