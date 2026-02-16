/**
 * Stage-Aware Prompt Builder for Briefing State Machine
 *
 * Replaces the static SYSTEM_PROMPT. Each stage gets a focused prompt with
 * tone injection, authority mode, and stall escalation.
 *
 * All functions are pure — no side effects, no API calls.
 */

import type { BriefingState, BriefingStage, DeliverableCategory } from './briefing-state-machine'
import { STALL_CONFIG } from './briefing-state-machine'

// =============================================================================
// BRAND CONTEXT TYPE (passed from caller)
// =============================================================================

export interface BrandContext {
  companyName?: string
  industry?: string
  toneOfVoice?: string
  brandDescription?: string
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Build a stage-aware system prompt from the current briefing state.
 * Injects: current state summary, tone, stage-specific instructions,
 * authority mode, stall escalation, and deliverable-specific guidance.
 */
export function buildSystemPrompt(state: BriefingState, brandContext?: BrandContext): string {
  const sections: string[] = []

  // Role preamble
  sections.push(ROLE_PREAMBLE)

  // Current state
  sections.push(buildCurrentState(state))

  // Tone
  sections.push(buildToneSection(state))

  // Stage-specific task
  sections.push(buildStageTask(state))

  // Deliverable-specific guidance
  const deliverableGuidance = buildDeliverableGuidance(state)
  if (deliverableGuidance) {
    sections.push(deliverableGuidance)
  }

  // Stall escalation
  const stallSection = buildStallEscalation(state)
  if (stallSection) {
    sections.push(stallSection)
  }

  // Competitive differentiation soft prompt
  const competitivePrompt = buildCompetitivePrompt(state)
  if (competitivePrompt) {
    sections.push(competitivePrompt)
  }

  // Brand context
  if (brandContext) {
    sections.push(buildBrandSection(brandContext))
  }

  // Closing instruction
  sections.push(CLOSING_INSTRUCTION)

  return sections.join('\n\n')
}

// =============================================================================
// ROLE PREAMBLE
// =============================================================================

const ROLE_PREAMBLE = `You are a senior creative strategist helping a client build a creative brief. You guide the conversation through a structured flow — asking the right questions at the right time, showing visual references, building structure, and providing strategic review.

You are NOT an order-taker. You are a creative partner who brings expertise, catches blind spots, and pushes the work to be better.

VOICE:
Write like a senior creative director on a client call — warm, direct, opinionated. Vary sentence length. Short sentences land harder. Longer ones can unpack an idea when needed.

ANTI-JARGON:
- No stacked adjectives ("clean, trust-forward, conversion-focused"). Pick one. Make it count.
- No hollow phrases: "elevates the narrative", "positions you as", "speaks to the audience", "resonates deeply", "heartbeat of the campaign".

REFERENCES:
When the user shares a reference (e.g., "I want something like Stripe"), acknowledge it once, extract the principle (e.g., "clean hierarchy, product-first"), and move on. Do not keep citing the reference name.

FEEDBACK STRUCTURE:
Lead with your honest assessment. If you have a flag, lead with it. Don't sandwich critique between praise.

RULES:
- Be concise. No filler.
- One question at a time unless grouping makes sense.
- Never repeat what the user already told you.
- Match the user's energy and vocabulary level.
- DO NOT generate [QUICK_OPTIONS] — they are handled by the system.`

// =============================================================================
// CURRENT STATE
// =============================================================================

function buildCurrentState(state: BriefingState): string {
  const known: string[] = []
  const missing: string[] = []

  // Task type
  if (state.brief.taskType.value) {
    known.push(
      `Task type: ${state.brief.taskType.value} (confidence: ${state.brief.taskType.confidence})`
    )
  } else {
    missing.push('Task type')
  }

  // Intent
  if (state.brief.intent.value) {
    known.push(`Intent: ${state.brief.intent.value} (confidence: ${state.brief.intent.confidence})`)
  } else {
    missing.push('Intent / business goal')
  }

  // Platform
  if (state.brief.platform.value) {
    known.push(`Platform: ${state.brief.platform.value}`)
  } else {
    missing.push('Platform')
  }

  // Topic
  if (state.brief.topic.value) {
    known.push(`Topic: ${state.brief.topic.value}`)
  } else {
    missing.push('Topic / subject')
  }

  // Audience
  if (state.brief.audience.value) {
    known.push(`Audience: ${state.brief.audience.value.name}`)
  } else {
    missing.push('Target audience')
  }

  // Deliverable category
  if (state.deliverableCategory) {
    known.push(`Deliverable category: ${state.deliverableCategory}`)
  }

  // Industry
  if (state.industry?.value) {
    known.push(`Industry: ${state.industry.value}`)
  }

  // Style keywords
  if (state.styleKeywords.length > 0) {
    known.push(`Style keywords: ${state.styleKeywords.join(', ')}`)
  }

  // Inspiration refs
  if (state.inspirationRefs.length > 0) {
    known.push(`Inspiration references: ${state.inspirationRefs.join(', ')}`)
  }

  // Structure
  if (state.structure) {
    known.push(`Structure: ${state.structure.type} (${getStructureSummary(state.structure)})`)
  }

  // Competitive differentiation
  if (state.competitiveDifferentiation) {
    known.push(`Competitive differentiation: ${state.competitiveDifferentiation}`)
  }

  return `== CURRENT STATE ==
Stage: ${state.stage}
Turn in stage: ${state.turnsInCurrentStage}
Message count: ${state.messageCount}

What we know:
${known.length > 0 ? known.map((k) => `- ${k}`).join('\n') : '- Nothing yet'}

What's missing:
${missing.length > 0 ? missing.map((m) => `- ${m}`).join('\n') : '- Nothing critical'}`
}

function getStructureSummary(structure: BriefingState['structure']): string {
  if (!structure) return 'none'
  switch (structure.type) {
    case 'storyboard':
      return `${structure.scenes.length} scenes`
    case 'layout':
      return `${structure.sections.length} sections`
    case 'calendar':
      return `${structure.outline.weeks.length} weeks, ${structure.outline.postingCadence}`
    case 'single_design':
      return `${structure.specification.format}`
    default:
      return 'set'
  }
}

// =============================================================================
// TONE
// =============================================================================

function buildToneSection(state: BriefingState): string {
  // Authority mode override for specific stages
  if (isAuthorityStage(state.stage)) {
    return `== TONE OVERRIDE: AUTHORITY MODE ==
You are a senior creative director presenting your professional assessment.
NEVER use: "What do you think?", "Does this work?", "Everything look good?", "Let me know if..."
ALWAYS use: "This is strong because X.", "The risk is Y.", "I'd recommend Z.", "One thing I'd push on..."
Frame your analysis with confidence. You are the expert in the room.`
  }

  // Calibrated tone from state
  if (state.toneProfile) {
    return `== TONE ==\n${state.toneProfile.toneDescription}`
  }

  return `== TONE ==
Use a clear, friendly, conversational tone. Be direct without being cold. Match the energy of the user.`
}

function isAuthorityStage(stage: BriefingStage): boolean {
  return ['STRATEGIC_REVIEW', 'REVIEW', 'DEEPEN', 'SUBMIT'].includes(stage)
}

// =============================================================================
// STAGE-SPECIFIC TASKS
// =============================================================================

function buildStageTask(state: BriefingState): string {
  const taskMap: Record<BriefingStage, (state: BriefingState) => string> = {
    EXTRACT: buildExtractTask,
    TASK_TYPE: buildTaskTypeTask,
    INTENT: buildIntentTask,
    INSPIRATION: buildInspirationTask,
    STRUCTURE: buildStructureTask,
    STRATEGIC_REVIEW: buildStrategicReviewTask,
    MOODBOARD: buildMoodboardTask,
    REVIEW: buildReviewTask,
    DEEPEN: buildDeepenTask,
    SUBMIT: buildSubmitTask,
  }

  const builder = taskMap[state.stage]
  return `== YOUR TASK THIS TURN ==\n${builder(state)}`
}

function buildExtractTask(_state: BriefingState): string {
  return `Process the user's first message. Acknowledge what you understood and ask about the first missing piece.
- If you understood their task type and intent clearly, confirm and move forward.
- If the message is vague, ask what they want to create.
- Reference any style keywords or inspiration they mentioned.
- Ask one meaningful question about their goals or audience before generating ideas.
- Be concise — don't repeat back everything they said.`
}

function buildTaskTypeTask(_state: BriefingState): string {
  return `We need to know what they're making.
- Recommend a deliverable type based on context, or ask directly.
- The options are: video, social content (calendar), website/landing page, design asset, or branding.
- If they seem unsure, frame the question as "What's the hero deliverable?"
- One clear question. No rambling.`
}

function buildIntentTask(state: BriefingState): string {
  return `We know WHAT they're making (${state.brief.taskType.value || 'TBD'}). We need to know WHY.
- Infer the business goal from context, or ask directly.
- Common intents: drive signups, build authority, increase awareness, boost sales, educate.
- Frame it naturally: "What should this make people do?" or "What's the conversion goal?"
- One question. Be brief.`
}

function buildInspirationTask(_state: BriefingState): string {
  return `Show visual style references that match the context.
- Frame the creative direction based on what you know about audience, industry, and intent.
- The system will display style cards — your job is to introduce them with context.
- If the user shared references, acknowledge them once and extract the principle. Don't keep citing the reference name.
- Reference real campaigns from adjacent industries rather than abstract mood language.
- Keep it to 1-2 sentences framing the direction.`
}

function buildStructureTask(state: BriefingState): string {
  const category = state.deliverableCategory
  const isFirstTurn = state.turnsInCurrentStage === 0
  const intentValue = state.brief.intent.value?.toLowerCase() ?? ''
  const isLaunch = intentValue.includes('launch')

  // On first turn, ask a clarifying question before generating structure
  const clarifyPrefix = isFirstTurn
    ? `Before generating structure, ask ONE clarifying question (e.g., "What's the single action you want someone to take after seeing this?").
If the user already shared a key differentiator (e.g., "we're clinically proven"), acknowledge it first — "That's a strong angle, we should lead with that." Then lay out the structure. Then note that this follows best practices. Don't silently incorporate it into a layout dump.\n\n`
    : ''

  // For any launch intent, ask for latest assets
  const launchAssetPrompt = isLaunch
    ? `\n- If the user is launching something and hasn't shared latest product screenshots, UI flows, or assets, ask for them. Launch assets should reflect the latest version.`
    : ''

  switch (category) {
    case 'video':
      return `${clarifyPrefix}Create a scene-by-scene storyboard with a strong opening hook.
- Generate 3-5 scenes. Scene 1 MUST have a hook with persona + pain metric.
- Each scene: title, description, duration, visual note.
- Output as [STORYBOARD]{json}[/STORYBOARD].${launchAssetPrompt}`
    case 'website':
      return `${clarifyPrefix}Create a section-by-section layout.
- Generate appropriate sections: hero, features, social proof, CTA, footer, etc.
- Each section: name, purpose, content guidance, order.
- Output as [LAYOUT]{json}[/LAYOUT].${launchAssetPrompt}`
    case 'content':
      return `${clarifyPrefix}Create a strategic content calendar.
- Include: posting cadence, content pillars (with %), weekly arcs, CTA escalation.
- Each post: day, pillar type, topic, format, CTA, engagement trigger.
- Output as [CALENDAR]{json}[/CALENDAR].${launchAssetPrompt}`
    case 'design':
    case 'brand':
      return `${clarifyPrefix}Create a design specification.
- Include: format, dimensions, key elements, copy guidance.
- Output as [DESIGN_SPEC]{json}[/DESIGN_SPEC].${launchAssetPrompt}`
    default:
      return `${clarifyPrefix}Based on what we know, create the appropriate structure for this deliverable.
Output the structure in the appropriate marker format.${launchAssetPrompt}`
  }
}

function buildStrategicReviewTask(_state: BriefingState): string {
  return `Surface your strategic assessment of the brief so far.
Lead with your honest assessment. If you have a flag, lead with it. Don't sandwich critique between praise.
- Lead with risks (1-2 risks or blind spots).
- Then strengths (1-2 max).
- Then one concrete optimization.
- Check if the inspiration fits the audience (the system provides fit data).
- Don't repeat reference names. No filler like "This positions you as..."
- Frame as expert assessment, not a question.
- Output as [STRATEGIC_REVIEW]{json}[/STRATEGIC_REVIEW].`
}

function buildMoodboardTask(_state: BriefingState): string {
  return `Finalize the visual direction.
- Describe overall visual direction: colors, typography, mood, texture.
- If the user asked for section-specific direction, provide overrides.
- Be specific: name fonts, describe color relationships, reference art direction.`
}

function buildReviewTask(_state: BriefingState): string {
  return `Expert consultation on the completed brief. 1-2 key insights only. Cut filler lines.
- Lead with your honest read. Don't sandwich critique between praise.
- Name the strongest element in one sentence.
- Name ONE thing to push.
- DO NOT ask "Does this look good?" — state your assessment with confidence.`
}

function buildDeepenTask(state: BriefingState): string {
  const category = state.deliverableCategory
  const options = getDeepenOptionsForCategory(category)
  return `Offer depth escalation paths relevant to this ${category || 'deliverable'}.
Available paths: ${options.join(', ')}.
- Present options clearly. User can select multiple before submitting.
- If they selected a deepening, execute it (e.g., refine copy, generate variant).`
}

function buildSubmitTask(_state: BriefingState): string {
  return `Generate the task submission.
- Summarize the brief concisely.
- Output [TASK_READY] block with all relevant details.
- Express confidence in the brief. No passive language.`
}

function getDeepenOptionsForCategory(category: DeliverableCategory | null): string[] {
  switch (category) {
    case 'video':
      return ['Refine script to production-ready', 'Generate A/B hook variant']
    case 'website':
      return ['Refine copy to production-ready', 'Conversion optimization pass']
    case 'content':
      return ['Refine messaging per post', 'Generate A/B content variants']
    case 'design':
    case 'brand':
      return ['Expand into asset-ready specifications', 'Generate variant concepts']
    default:
      return ['Optimize for conversion', 'Expand into full asset specifications']
  }
}

// =============================================================================
// DELIVERABLE-SPECIFIC GUIDANCE
// =============================================================================

function buildDeliverableGuidance(state: BriefingState): string | null {
  if (state.stage !== 'STRUCTURE') return null

  if (state.deliverableCategory === 'video') {
    return VIDEO_HOOK_GUIDANCE
  }

  if (state.deliverableCategory === 'content') {
    return CONTENT_CALENDAR_GUIDANCE
  }

  return null
}

const VIDEO_HOOK_GUIDANCE = `== HOOK GENERATION (SCENE 1) ==
The opening hook MUST include:
1. Target persona: Reference the specific role ("CTO", "Head of Growth", "Founder")
   — NOT generic ("business leaders", "professionals")
2. Pain metric: Name a specific operational consequence
   — NOT vague ("struggling with growth")
   — YES specific ("losing 40% of pipeline to manual follow-up")
3. Quantifiable impact: Include a number or metric where data supports it
   — "Teams using X ship 2x faster" not "Teams using X are more productive"
The hook should feel like it was written by someone who worked in the target industry.`

const CONTENT_CALENDAR_GUIDANCE = `== CONTENT CALENDAR REQUIREMENTS ==
1. POSTING CADENCE: State explicit frequency (e.g., "3x/week: Mon, Wed, Fri")
2. CONTENT PILLARS: Define 2-4 pillars with percentage allocation
3. WEEKLY NARRATIVE ARC: Each week tells a coherent story — not random topics
4. PILLAR vs SUPPORT: Label each post as pillar (flagship) or support (lighter)
5. CTA ESCALATION: First third = awareness CTAs, middle = engagement, final = conversion
6. ENGAGEMENT TRIGGERS: Each post has a specific interaction driver
7. DISTRIBUTION LOGIC: Specify platforms and cross-posting strategy`

// =============================================================================
// STALL ESCALATION
// =============================================================================

function buildStallEscalation(state: BriefingState): string | null {
  const config = STALL_CONFIG[state.stage]
  const turns = state.turnsInCurrentStage

  if (config.maxTurnsBeforeNarrow !== null && turns >= config.maxTurnsBeforeNarrow) {
    if (config.maxTurnsBeforeRecommend !== null && turns >= config.maxTurnsBeforeRecommend) {
      return `== STALL RECOVERY: RECOMMEND ==
The user has been at this stage for ${turns} turns. Make a confident recommendation.
"Let's go with X — we can always adjust later."
Do NOT auto-advance. Wait for their confirmation.`
    }
    return `== STALL RECOVERY: NARROW ==
The user has been at this stage for ${turns} turns. Narrow to 2 options with brief reasoning.
Help them decide, don't overwhelm.`
  }

  if (config.softNudgeAfter !== null && turns >= config.softNudgeAfter) {
    return `== SOFT NUDGE ==
The user has been at this stage for ${turns} turns. You may add a gentle:
"We've got a solid foundation. Want to keep refining, or move on?"
Only if natural. Don't force it.`
  }

  return null
}

// =============================================================================
// COMPETITIVE DIFFERENTIATION
// =============================================================================

function buildCompetitivePrompt(state: BriefingState): string | null {
  // Only at INTENT/STRUCTURE for website/brand/product launch
  if (!['INTENT', 'STRUCTURE'].includes(state.stage)) return null
  if (!['website', 'brand'].includes(state.deliverableCategory ?? '')) return null
  if (state.competitiveDifferentiation) return null // Already captured

  return `== COMPETITIVE DIFFERENTIATION (OPTIONAL) ==
If the user hasn't mentioned competitors and this is a website/brand/product launch:
"Is there anyone in your space doing something similar that you want to differentiate from?"
This is optional — if the user ignores it, move on. If they engage, note it.`
}

// =============================================================================
// BRAND CONTEXT
// =============================================================================

function buildBrandSection(ctx: BrandContext): string {
  const parts: string[] = ['== BRAND CONTEXT ==']
  if (ctx.companyName) parts.push(`Company: ${ctx.companyName}`)
  if (ctx.industry) parts.push(`Industry: ${ctx.industry}`)
  if (ctx.toneOfVoice) parts.push(`Tone of voice: ${ctx.toneOfVoice}`)
  if (ctx.brandDescription) parts.push(`Description: ${ctx.brandDescription}`)
  return parts.join('\n')
}

// =============================================================================
// CLOSING
// =============================================================================

const CLOSING_INSTRUCTION =
  'Your response MUST end with a confident statement or clear direction, not a passive question.'
