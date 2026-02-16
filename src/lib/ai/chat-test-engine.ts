import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { logger } from '@/lib/logger'
import type { ChatTestScenario } from './chat-test-scenarios'

type GeneratedBy = 'quick_option' | 'template' | 'haiku'

interface GeneratedReply {
  content: string
  generatedBy: GeneratedBy
}

const MAX_TURNS = 20
const STUCK_FORCE_AGREE_TURNS = 4
const STUCK_HARD_AGREE_TURNS = 6

/**
 * Stage-specific template replies keyed by briefing stage.
 * Each returns a reply that moves the conversation forward.
 */
const stageTemplates: Record<string, (scenario: ChatTestScenario) => string> = {
  EXTRACT: (s) => s.openingMessage,
  TASK_TYPE: (s) =>
    s.contentType ? `I'd like a ${s.contentType}` : "I'm thinking social media content",
  INTENT: (s) => (s.intent ? `The goal is ${s.intent}` : 'We want to increase brand awareness'),
  INSPIRATION: () => 'I like the first style, it fits our brand perfectly',
  STRUCTURE: () => "That structure looks great, let's proceed with it",
  STRATEGIC_REVIEW: () => "Good analysis, the strategy makes sense. Let's continue",
  MOODBOARD: () => "The visual direction works for us, let's move forward",
  REVIEW: () => "Everything looks good, I'm happy with this brief",
}

/**
 * Pick the most forward-moving quick option.
 * Prefers options containing positive/agreeable keywords.
 */
function pickBestQuickOption(options: string[]): string | null {
  if (!options || options.length === 0) return null

  const positiveKeywords = [
    'yes',
    'looks good',
    'proceed',
    'continue',
    'perfect',
    'great',
    'confirm',
    'approve',
    'accept',
    'love',
    "let's go",
    'sounds good',
    'ready',
  ]

  // Find the most agreeable option
  for (const option of options) {
    const lower = option.toLowerCase()
    if (positiveKeywords.some((kw) => lower.includes(kw))) {
      return option
    }
  }

  // Default to first option (usually the most forward-moving)
  return options[0]
}

/**
 * Generate a synthetic user reply using Claude Haiku.
 * Only used as a last resort when no quick option or template fits.
 */
async function generateHaikuReply(
  scenario: ChatTestScenario,
  lastAssistantMessage: string,
  stage: string
): Promise<string> {
  const anthropic = new Anthropic()

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: `You are simulating a client in a design briefing chat. The client is from ${scenario.industry} industry, company "${scenario.companyName}". Current stage: ${stage}.

The design assistant just said:
"${lastAssistantMessage.slice(0, 500)}"

Reply as the client in under 25 words. Be agreeable and move the conversation forward. Just give the reply, nothing else.`,
      },
    ],
  })

  const block = message.content[0]
  if (block.type === 'text') {
    return block.text.trim()
  }
  return "That sounds great, let's proceed."
}

/**
 * Generates the next synthetic user reply for a chat test run.
 *
 * Three-tier approach:
 * 1. Quick option (free, instant, ~60% of turns)
 * 2. Template (free, instant, ~30% of turns)
 * 3. Haiku fallback (cheap, ~10% of turns)
 *
 * Includes stuck detection to force progress.
 */
export async function generateSyntheticReply(
  scenario: ChatTestScenario,
  lastAssistantMessage: string,
  quickOptions: { question: string; options: string[] } | null | undefined,
  stage: string,
  turnsInStage: number,
  totalTurns: number
): Promise<GeneratedReply> {
  // Hard cap: if we've exceeded max turns, we're done
  if (totalTurns >= MAX_TURNS) {
    return {
      content: "Everything looks perfect, let's finalize this brief.",
      generatedBy: 'template',
    }
  }

  // Stuck detection: force progress after too many turns in same stage
  if (turnsInStage >= STUCK_HARD_AGREE_TURNS) {
    logger.warn(
      { scenario: scenario.name, stage, turnsInStage },
      'Chat test stuck - forcing hard agree'
    )
    // Include scenario context so the inference engine has actual signals to work with
    const contextMessage = buildContextRichAgreeMessage(scenario, stage)
    return {
      content: contextMessage,
      generatedBy: 'template',
    }
  }

  if (turnsInStage >= STUCK_FORCE_AGREE_TURNS && quickOptions?.options?.length) {
    logger.info(
      { scenario: scenario.name, stage, turnsInStage },
      'Chat test slightly stuck - forcing most agreeable quick option'
    )
    const best = pickBestQuickOption(quickOptions.options)
    if (best) {
      return { content: best, generatedBy: 'quick_option' }
    }
  }

  // Tier 1: Quick option (preferred — mimics real user clicking suggestions)
  if (quickOptions?.options?.length) {
    const picked = pickBestQuickOption(quickOptions.options)
    if (picked) {
      return { content: picked, generatedBy: 'quick_option' }
    }
  }

  // Tier 2: Template reply based on stage
  const templateFn = stageTemplates[stage]
  if (templateFn) {
    // Only use template for the first turn at a new stage (avoid repeating)
    if (turnsInStage <= 1) {
      return { content: templateFn(scenario), generatedBy: 'template' }
    }
  }

  // Tier 3: Haiku fallback for complex situations
  try {
    const reply = await generateHaikuReply(scenario, lastAssistantMessage, stage)
    return { content: reply, generatedBy: 'haiku' }
  } catch (err) {
    logger.error({ err, scenario: scenario.name }, 'Haiku fallback failed')
    // Ultimate fallback
    return {
      content: "That sounds great, let's move forward with that approach.",
      generatedBy: 'template',
    }
  }
}

/**
 * Check if a conversation run should be considered complete.
 */
export function isRunComplete(
  stage: string | null,
  totalTurns: number,
  status: string
): { complete: boolean; reason?: string } {
  if (status === 'completed' || status === 'failed') {
    return { complete: true, reason: 'already_finished' }
  }

  if (stage === 'REVIEW') {
    return { complete: true, reason: 'reached_review' }
  }

  if (totalTurns >= MAX_TURNS) {
    return { complete: true, reason: 'max_turns_exceeded' }
  }

  return { complete: false }
}

/**
 * Build a context-rich agree message that gives the inference engine
 * real signals based on the scenario and current stage.
 */
function buildContextRichAgreeMessage(scenario: ChatTestScenario, stage: string): string {
  switch (stage) {
    case 'EXTRACT':
    case 'TASK_TYPE': {
      const parts: string[] = ["Yes, let's go with that."]
      if (scenario.contentType) parts.push(`We need a ${scenario.contentType}.`)
      if (scenario.platform) parts.push(`It's for ${scenario.platform}.`)
      return parts.join(' ')
    }
    case 'INTENT': {
      const parts: string[] = ['That sounds right.']
      if (scenario.intent) parts.push(`The main goal is ${scenario.intent}.`)
      return parts.join(' ')
    }
    case 'INSPIRATION':
      return "I love that style, it fits our brand perfectly. Let's go with it."
    case 'STRUCTURE':
      return "That structure looks great. Let's proceed with this approach."
    case 'STRATEGIC_REVIEW':
      return "Good analysis, the strategy makes sense. I'm happy to continue."
    case 'MOODBOARD':
      return "The visual direction works well for us. Let's move to review."
    default:
      return "Yes, that looks perfect, let's continue to the next step."
  }
}
