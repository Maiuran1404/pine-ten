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
  const hasUserMessage = userMessages.length > 0;

  // Stage 1: Brief - User has sent at least one message
  if (hasUserMessage) {
    completedStages.push('brief');
    currentStage = 'style';
  }

  // Stage 2: Style - User has selected styles OR has 2+ moodboard items
  const hasStyleSelection = selectedStyles.length > 0;
  const hasMoodboardItems = moodboardItems.length >= 2;

  if (hasStyleSelection || hasMoodboardItems) {
    completedStages.push('style');
    currentStage = 'details';
  }

  // Stage 3: Details - A task proposal has been generated
  const hasTaskProposal = pendingTask !== null;

  if (hasTaskProposal) {
    completedStages.push('details');
    currentStage = 'review';
  }

  // Stage 4: Review - Pending task exists and is ready for review
  // (Same as details for now, but differentiated by UI state)
  if (hasTaskProposal && completedStages.includes('details')) {
    completedStages.push('review');
    currentStage = 'submit';
  }

  // Stage 5: Submit - Task has been submitted
  if (taskSubmitted) {
    completedStages.push('submit');
    currentStage = 'submit'; // Stay at submit
  }

  // Calculate progress percentage
  const progressPercentage = calculateProgressPercentage(completedStages, currentStage);

  return {
    currentStage,
    completedStages,
    progressPercentage,
    stageDescriptions: STAGE_DESCRIPTIONS,
  };
}

/**
 * Calculate progress percentage based on completed stages
 */
function calculateProgressPercentage(
  completedStages: ChatStage[],
  currentStage: ChatStage
): number {
  const stageWeights: Record<ChatStage, number> = {
    brief: 20,
    style: 25,
    details: 25,
    review: 15,
    submit: 15,
  };

  // Sum weights of completed stages
  let percentage = completedStages.reduce(
    (sum, stage) => sum + stageWeights[stage],
    0
  );

  // Add partial progress for current stage if it's in progress
  const currentIndex = CHAT_STAGES.indexOf(currentStage);
  const completedIndex = completedStages.length - 1;

  if (currentIndex > completedIndex) {
    // Add half of the current stage's weight as "in progress"
    percentage += stageWeights[currentStage] * 0.5;
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
