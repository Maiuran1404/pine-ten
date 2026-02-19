import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '@/db'
import { styleReferences, taskCategories, users, audiences as audiencesTable } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Helper to get delivery date
function _getDeliveryDate(businessDays: number): string {
  const date = new Date()
  let daysAdded = 0
  while (daysAdded < businessDays) {
    date.setDate(date.getDate() + 1)
    const dayOfWeek = date.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Skip weekends
      daysAdded++
    }
  }
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const dayName = days[date.getDay()]
  const dayNum = date.getDate()
  const suffix =
    dayNum === 1 || dayNum === 21 || dayNum === 31
      ? 'st'
      : dayNum === 2 || dayNum === 22
        ? 'nd'
        : dayNum === 3 || dayNum === 23
          ? 'rd'
          : 'th'
  const monthName = months[date.getMonth()]
  return `${dayName} ${dayNum}${suffix} ${monthName}`
}

// ============================================================================
// SYSTEM PROMPT - Single source of truth for chat behavior
// ============================================================================

const SYSTEM_PROMPT = `You are a senior creative director at Crafted.

Crafted is a creative platform where freelance designers build deliverables for clients. The client never needs to go elsewhere. Crafted handles the entire process from brief to finished deliverable.

CRITICAL RULE: NEVER DEFLECT:
- NEVER tell the user to "hire a web developer", "find a designer", "use Webflow/Squarespace", or go to any other platform.
- NEVER say "I don't actually build this" or "I can only help with the brief".
- When the user says "let's build" or "let's start", frame it as submitting to a professional Crafted designer.

TONE: Confident, warm, direct. You care about the work and it shows. You're the expert - make smart recommendations.

CRITICAL APPROACH: BE PROACTIVE, NOT REACTIVE
- DON'T ask open-ended questions like "What platform?" or "Who's your audience?"
- DO make confident recommendations based on what you know about their brand
- Present your recommendation, then ask for confirmation

ASSUMPTION-FIRST MINDSET:
Instead of: "What platform will be the primary home for this video?"
Say: "Based on your B2B focus, I'd recommend LinkedIn as the primary platform with Instagram for broader reach. Does that align with your goals, or would you prefer a different approach?"

Instead of: "Who's your ideal viewer?"
Say: "I'm thinking we target startup founders and tech decision-makers - your core audience. Sound right?"

CRITICAL RULE: You MUST output [DELIVERABLE_STYLES: type | search: visual search terms] to show style options.
Include search terms that describe the visual style to find relevant design references.
Without this exact marker on its own line, no styles will appear to the user.
Example: [DELIVERABLE_STYLES: instagram_post | search: fintech minimal dark UI design]

QUICK OPTIONS FOR CONFIRMATION:
When making a recommendation, provide confirmation options.
Format: [QUICK_OPTIONS]{"question": "Your question summary", "options": ["Option 1", "Option 2", "Option 3"]}[/QUICK_OPTIONS]

Examples:
- After recommending platform: ["That works", "Actually prefer Instagram", "Let's do both"]
- After recommending audience: ["Exactly right", "Broader audience", "More specific niche"]
- After showing styles: ["I like the first one", "Show me more options", "Something different"]

WHEN USER SELECTS A STYLE:
Acknowledge briefly, then state your recommendations for the remaining details.
Example: "The Dark Tech style is perfect for your launch. I'll design this for Instagram Reels targeting startup founders, emphasizing speed and efficiency. Ready to proceed, or any tweaks?"
[QUICK_OPTIONS]{"question": "Ready?", "options": ["Let's do it", "Change the platform", "Different audience"]}[/QUICK_OPTIONS]

CRITICAL: EVERY SINGLE RESPONSE MUST END WITH [QUICK_OPTIONS].
There are NO exceptions. Even after style selection, after confirmations, after providing information - ALWAYS end with quick options that give the user a clear next step.

WHEN TO SHOW STYLES (use [DELIVERABLE_STYLES: type]):
- User mentions ANY content type (video, post, carousel, ad, logo, etc.)
- User describes what they want to create
- User has given context about their product/company
- Basically: if you can pick a deliverable type, SHOW STYLES

TYPE MAPPING:
- Video/reel/motion/walkthrough/demo/tutorial/onboarding/explainer/guided tour → instagram_reel
- Post/carousel/feed → instagram_post
- Story/stories → instagram_story
- LinkedIn → linkedin_post
- Ad/banner → static_ad
- Logo → logo
- Branding → brand_identity
- Pitch deck/presentation/slides → presentation_slide

IMPORTANT: Any request involving "video", "walkthrough", "demo", "tutorial", "guided tour", "app tour", "onboarding", "explainer", or "motion" MUST use instagram_reel as the deliverable type. Never show static image styles for video requests.

IMPORTANT: Only show styles when we have relevant references. For pitch decks and presentations, DO NOT include [DELIVERABLE_STYLES] unless the user specifically asks for style references. Instead, focus on understanding their content and goals.

RESPONSE FORMAT (when showing styles):
State your creative direction confidently, show styles with search context.
Example:
"For a cinematic product introduction, I'd go with bold, dark visuals that match your tech brand. Here are some directions:"
[DELIVERABLE_STYLES: instagram_reel | search: cinematic tech product dark bold visuals]
[QUICK_OPTIONS]{"question": "Style preference?", "options": ["I like the first one", "Show me more", "Something brighter"]}[/QUICK_OPTIONS]

RULES:
- 20-40 words max before the marker
- No exclamation marks
- Be decisive - make recommendations, don't ask for basic info you can infer
- Use brand data (industry, audience, platform) to make smart assumptions
- Ask for confirmation, not information
- ALWAYS include [QUICK_OPTIONS] with confirmation-style options`

function getSystemPrompt(): string {
  const today = new Date()
  const todayStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return `${SYSTEM_PROMPT}

TODAY: ${todayStr}

IF THE REQUEST IS COMPLETELY UNCLEAR:
"What are we making today?"
[QUICK_OPTIONS]
{"question": "Content type?", "options": ["Social content", "Video ad", "Branding", "Something else"]}
[/QUICK_OPTIONS]

REMEMBER - YOU HAVE BRAND CONTEXT:
- You know their industry, audience, and recommended platforms
- Use this to make smart assumptions instead of asking
- Example: If they're B2B SaaS and want a video, recommend LinkedIn + Instagram, targeting business decision-makers
- State your recommendation confidently, then ask "Does this align with what you had in mind?"

ABSOLUTE REQUIREMENTS:
1. If user mentions ANY content type or describes what they want → ALWAYS include [DELIVERABLE_STYLES: type]
2. The marker MUST be on its own line at the end of your response
3. 20-40 words max, no exclamation marks
4. Make recommendations based on brand data - don't ask questions you can answer yourself
5. Use confirmation questions ("Sound good?" "Any changes?") instead of open questions ("What platform?")
6. EVERY response MUST include [QUICK_OPTIONS] with 2-3 clear next-step actions. Never leave the user without a CTA.`
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatContext {
  brandDetection?: {
    detected: boolean
    mentionedBrand: string | null
    matchesProfile: boolean
  }
  requestCompleteness?: 'detailed' | 'moderate' | 'vague'
  confirmedFields?: Record<string, string | undefined>
}

export interface DeliverableStyleMarker {
  type: 'initial' | 'more' | 'different' | 'semantic' | 'refine'
  deliverableType: string
  styleAxis?: string
  searchQuery?: string // For semantic search queries
  searchTerms?: string[] // AI-generated search terms for dynamic image search
  baseStyleId?: string // For style refinement (id of style being refined)
  refinementQuery?: string // For style refinement (user's refinement feedback)
}

export interface StateMachineOverride {
  systemPrompt: string
  stage?: string
}

export async function chat(
  messages: ChatMessage[],
  userId: string,
  context?: ChatContext,
  stateMachineOverride?: StateMachineOverride
): Promise<{
  content: string
  styleReferences?: string[]
  quickOptions?: { question: string; options: string[] }
  deliverableStyleMarker?: DeliverableStyleMarker
}> {
  // Fetch data in parallel for faster response times
  const [user, styles, categories] = await Promise.all([
    // Fetch user's company/brand data
    db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        company: true,
      },
    }),
    // Fetch available style categories for context
    db.select().from(styleReferences).where(eq(styleReferences.isActive, true)),
    // Fetch task categories
    db.select().from(taskCategories).where(eq(taskCategories.isActive, true)),
  ])

  const company = user?.company

  // Fetch audiences for the company (depends on user query above)
  const audiences = company?.id
    ? await db.select().from(audiencesTable).where(eq(audiencesTable.companyId, company.id))
    : []

  // Build audience context from the audiences table structure
  const audienceContext =
    audiences.length > 0
      ? `
TARGET AUDIENCES (from brand analysis):
${audiences
  .map((a, i) => {
    const psychographics = a.psychographics as {
      painPoints?: string[]
      goals?: string[]
    } | null
    const demographics = a.demographics as {
      ageRange?: { min: number; max: number }
      locations?: string[]
    } | null
    return `${i + 1}. ${a.name}${a.isPrimary ? ' (primary)' : ''}
   - Demographics: ${
     demographics?.locations?.join(', ') || demographics?.ageRange
       ? `${demographics.ageRange?.min}-${demographics.ageRange?.max}`
       : 'Not specified'
   }
   - Pain points: ${psychographics?.painPoints?.join(', ') || 'Not specified'}
   - Goals: ${psychographics?.goals?.join(', ') || 'Not specified'}`
  })
  .join('\n')}`
      : ''

  // Determine platform recommendation based on industry
  const industryLower = (company?.industry || '').toLowerCase()
  const isB2B =
    industryLower.includes('b2b') ||
    industryLower.includes('saas') ||
    industryLower.includes('software') ||
    industryLower.includes('consulting') ||
    industryLower.includes('enterprise') ||
    industryLower.includes('finance') ||
    industryLower.includes('legal') ||
    industryLower.includes('professional')
  const platformRecommendation = isB2B ? 'LinkedIn (B2B audience)' : 'Instagram (consumer audience)'

  const companyContext = company
    ? `
CLIENT: ${company.name}${company.industry ? ` (${company.industry})` : ''}
PLATFORM: ${platformRecommendation}
${audienceContext ? 'AUDIENCE: Known' : ''}

You already know their brand. DO NOT ask about: company, industry, audience, colors, fonts.`
    : ''

  const basePrompt = getSystemPrompt()

  // Build brand detection context
  // NOTE: We don't add brand questions here anymore - we assume the user's saved brand is correct
  // This prevents double-questions (brand question + style question in same response)
  let brandDetectionContext = ''
  if (company?.name) {
    brandDetectionContext = `Using brand: ${company.name}. Don't ask about brand - just use it.`
  }

  // Build request completeness context - keep minimal
  let completenessContext = ''
  if (context?.requestCompleteness === 'detailed') {
    completenessContext = 'User gave detailed info. Proceed quickly.'
  } else if (context?.requestCompleteness === 'vague') {
    completenessContext =
      'User gave minimal info. Make smart assumptions based on their brand and ask for confirmation.'
  }

  // Build confirmed fields context to prevent re-asking
  let confirmedFieldsContext = ''
  if (context?.confirmedFields && Object.values(context.confirmedFields).some(Boolean)) {
    const confirmed = context.confirmedFields
    const fields = [
      confirmed.platform && `platform: ${confirmed.platform}`,
      confirmed.topic && `topic: ${confirmed.topic}`,
      confirmed.contentType && `type: ${confirmed.contentType}`,
    ].filter(Boolean)
    if (fields.length > 0) {
      confirmedFieldsContext = `Already know: ${fields.join(', ')}. Don't re-ask.`
    }
  }

  // Use state machine prompt when available, otherwise fall back to base prompt
  let finalSystemPrompt: string
  let maxTokens: number

  if (stateMachineOverride) {
    // State machine mode: prompt comes from buildSystemPrompt()
    finalSystemPrompt = stateMachineOverride.systemPrompt
    // No maxTokens cap — structured JSON (storyboards, layouts) needs room to complete
    maxTokens = 4096
  } else {
    // Fallback mode: build enhanced system prompt (used on error or when no state is provided)
    finalSystemPrompt = `${basePrompt}

${companyContext}
${brandDetectionContext}
${completenessContext}
${confirmedFieldsContext}

Available task categories:
${categories
  .map((c) => `- ${c.name}: ${c.description} (base: ${c.baseCredits} credits)`)
  .join('\n')}

Available style reference categories:
${[...new Set(styles.map((s) => s.category))].join(', ')}`
    maxTokens = 300
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    system: finalSystemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  })

  const content = response.content[0].type === 'text' ? response.content[0].text : ''

  // Extract style references if mentioned
  const styleMatch = content.match(/\[STYLE_REFERENCES: ([^\]]+)\]/)
  const mentionedStyles = styleMatch ? styleMatch[1].split(',').map((s) => s.trim()) : undefined

  // Extract deliverable style markers
  let deliverableStyleMarker: DeliverableStyleMarker | undefined

  // Check for initial deliverable styles: [DELIVERABLE_STYLES: type] or [DELIVERABLE_STYLES: type | search: terms]
  const deliverableMatch = content.match(
    /\[DELIVERABLE_STYLES: ([^\]|]+)(?:\|\s*search:\s*([^\]]+))?\]/
  )
  if (deliverableMatch) {
    const searchTermsRaw = deliverableMatch[2]?.trim()
    deliverableStyleMarker = {
      type: 'initial',
      deliverableType: deliverableMatch[1].trim(),
      searchTerms: searchTermsRaw ? searchTermsRaw.split(/\s+/) : undefined,
    }
  }

  // Check for more styles: [MORE_STYLES: type, axis]
  const moreStylesMatch = content.match(/\[MORE_STYLES: ([^,]+),\s*([^\]]+)\]/)
  if (moreStylesMatch) {
    deliverableStyleMarker = {
      type: 'more',
      deliverableType: moreStylesMatch[1].trim(),
      styleAxis: moreStylesMatch[2].trim(),
    }
  }

  // Check for different styles: [DIFFERENT_STYLES: type]
  const differentMatch = content.match(/\[DIFFERENT_STYLES: ([^\]]+)\]/)
  if (differentMatch) {
    deliverableStyleMarker = {
      type: 'different',
      deliverableType: differentMatch[1].trim(),
    }
  }

  // Check for semantic style search: [SEARCH_STYLES: query, type]
  const searchStylesMatch = content.match(/\[SEARCH_STYLES: ([^,]+),\s*([^\]]+)\]/)
  if (searchStylesMatch) {
    deliverableStyleMarker = {
      type: 'semantic',
      searchQuery: searchStylesMatch[1].trim(),
      deliverableType: searchStylesMatch[2].trim(),
    }
  }

  // Check for style refinement: [REFINE_STYLE: refinement_query, base_style_id, type]
  const refineStyleMatch = content.match(/\[REFINE_STYLE: ([^,]+),\s*([^,]+),\s*([^\]]+)\]/)
  if (refineStyleMatch) {
    deliverableStyleMarker = {
      type: 'refine',
      refinementQuery: refineStyleMatch[1].trim(),
      baseStyleId: refineStyleMatch[2].trim(),
      deliverableType: refineStyleMatch[3].trim(),
    }
  }

  // Parse quick options from AI output: [QUICK_OPTIONS]{"question": "...", "options": [...]}[/QUICK_OPTIONS]
  let quickOptions: { question: string; options: string[] } | undefined = undefined
  const quickOptionsMatch = content.match(/\[QUICK_OPTIONS\]\s*([\s\S]*?)\s*\[\/QUICK_OPTIONS\]/)
  if (quickOptionsMatch) {
    try {
      const parsed = JSON.parse(quickOptionsMatch[1])
      if (parsed.options && Array.isArray(parsed.options) && parsed.options.length > 0) {
        quickOptions = {
          question: parsed.question || '',
          options: parsed.options.filter((o: unknown) => typeof o === 'string' && o.trim()),
        }
      }
    } catch {
      // Malformed JSON — skip quick options
    }
  }

  // ========================================================================
  // Content cleaning — strip markers from raw AI output
  // ========================================================================

  let cleanContent = content
    .replace(/\[STYLE_REFERENCES: [^\]]+\]/g, '')
    .replace(/\[DELIVERABLE_STYLES: [^\]]+\]/g, '') // Handles both with and without | search: ...
    .replace(/\[MORE_STYLES: [^\]]+\]/g, '')
    .replace(/\[DIFFERENT_STYLES: [^\]]+\]/g, '')
    .replace(/\[SEARCH_STYLES: [^\]]+\]/g, '')
    .replace(/\[REFINE_STYLE: [^\]]+\]/g, '')
    .replace(/\[QUICK_OPTIONS\][\s\S]*?(?:\[\/QUICK_OPTIONS\]|$)/g, '')
    .replace(/\[\/QUICK_OPTIONS\]/g, '') // Orphaned closing tags
    .replace(/\[QUICK_OPTIONS[^\]]*$/gm, '') // Truncated opening tags at end of line
    .replace(/\[BRIEF_META\][\s\S]*?\[\/BRIEF_META\]/g, '')
    .replace(/\[\/BRIEF_META\]/g, '') // Orphaned closing tags
    .trim()

  // ========================================================================
  // Post-processing: lightweight (emoji, hex, capitalize only)
  // ========================================================================

  // Banned opener patterns — strip hollow affirmations from the start of responses
  const BANNED_OPENERS = [
    /^Strong direction[.!,\s—-]*/i,
    /^Smart move[.!,\s—-]*/i,
    /^Bold choice[.!,\s—-]*/i,
    /^This is solid[.!,\s—-]*/i,
    /^Looking good[.!,\s—-]*/i,
    /^Nice work[.!,\s—-]*/i,
    /^Perfect[.!,\s—-]*/i,
    /^Great[.!,\s—-]*/i,
    /^Excellent[.!,\s—-]*/i,
    /^Amazing[.!,\s—-]*/i,
    /^Awesome[.!,\s—-]*/i,
    /^Love it[.!,\s—-]*/i,
    /^Love that[.!,\s—-]*/i,
  ]

  // Strip banned openers (start-of-response only — safe, no fragment risk)
  for (const pattern of BANNED_OPENERS) {
    cleanContent = cleanContent.replace(pattern, '')
  }

  cleanContent = cleanContent
    // Remove emojis
    .replace(
      /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu,
      ''
    )
    // Strip hex codes
    .replace(/\s*\(?\s*#[A-Fa-f0-9]{3,8}\s*\)?\s*/g, ' ')
    .replace(/\bcolor\s*\(\s*\)/gi, 'color')
    .replace(/\bcolors\s*\(\s*\)/gi, 'colors')
    .replace(/\(\s*\)/g, '')
    .replace(/[ \t]+/g, ' ') // Collapse horizontal whitespace only (preserve newlines)
    .replace(/\n{3,}/g, '\n\n') // Collapse 3+ newlines to double (preserve paragraphs)
    .trim()

  // Capitalize first letter
  if (cleanContent.length > 0) {
    const firstLetterIndex = cleanContent.search(/[a-zA-Z]/)
    if (firstLetterIndex !== -1) {
      const firstLetter = cleanContent.charAt(firstLetterIndex)
      if (firstLetter >= 'a' && firstLetter <= 'z') {
        cleanContent =
          cleanContent.slice(0, firstLetterIndex) +
          firstLetter.toUpperCase() +
          cleanContent.slice(firstLetterIndex + 1)
      }
    }
  }

  // If content is empty but we have a style marker, provide a default message
  if (!cleanContent && deliverableStyleMarker) {
    cleanContent = 'Here are some style directions for your project.'
  }

  return {
    content: cleanContent,
    styleReferences: mentionedStyles,
    quickOptions,
    deliverableStyleMarker,
  }
}

// Helper to strip hex codes from user-facing text
function stripHexCodes(text: string): string {
  return (
    text
      // Remove hex codes like #15202B or #FFF (with optional surrounding parentheses)
      .replace(/\s*\(?\s*#[A-Fa-f0-9]{3,8}\s*\)?\s*/g, ' ')
      // Remove phrases like "color ()" or "Primary color ()" that result from stripping
      .replace(/\bcolor\s*\(\s*\)/gi, 'color')
      .replace(/\bcolors\s*\(\s*\)/gi, 'colors')
      // Clean up resulting double spaces and awkward punctuation
      .replace(/\s+,/g, ',')
      .replace(/,\s*,/g, ',')
      .replace(/\(\s*\)/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

export function parseTaskFromChat(content: string): object | null {
  const taskMatch = content.match(/\[TASK_READY\]([\s\S]*?)\[\/TASK_READY\]/)
  if (!taskMatch) return null

  try {
    const task = JSON.parse(taskMatch[1].trim())

    // Strip hex codes from description to hide technical details from users
    if (task.description && typeof task.description === 'string') {
      task.description = stripHexCodes(task.description)
    }

    return task
  } catch (error) {
    logger.warn({ err: error }, 'Failed to parse task from chat content')
    return null
  }
}

export async function getStyleReferencesByCategory(categories: string[]): Promise<
  {
    category: string
    name: string
    description: string | null
    imageUrl: string
  }[]
> {
  const styles = await db
    .select({
      category: styleReferences.category,
      name: styleReferences.name,
      description: styleReferences.description,
      imageUrl: styleReferences.imageUrl,
    })
    .from(styleReferences)
    .where(eq(styleReferences.isActive, true))

  return styles.filter((s) =>
    categories.some((c) => s.category.toLowerCase().includes(c.toLowerCase()))
  )
}
