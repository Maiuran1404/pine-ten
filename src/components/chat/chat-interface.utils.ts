/**
 * Utility functions for the ChatInterface component.
 * Contains text formatting, time formatting, smart completions,
 * task title generation, and status display helpers.
 */

import type { TaskProposal, ChatMessage as Message } from './types'
import type { LiveBrief } from './brief-panel/types'
import { calculateDeliveryDays } from '@/lib/deadline'

/** Format a date into a relative time string (e.g. "5m ago", "2h ago"). */
export function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

/** Auto-capitalize "i" to "I" when it's a standalone word. */
export function autoCapitalizeI(text: string): string {
  return text.replace(/\bi\b/g, 'I')
}

/** Format a date for display in the side panel. */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Regex patterns indicating the AI is ready to proceed with task creation. */
export const READY_PATTERNS = [
  /ready to execute/i,
  /ready to submit/i,
  /ready to move forward/i,
  /sound good to move forward/i,
  /shall i submit/i,
  /ready to proceed/i,
  /ready when you are/i,
  /good to go/i,
  /ready to create/i,
  /shall (i|we) create/i,
  /let(')?s create this/i,
  /creative brief.*complete/i,
  /brief is ready/i,
  /finalized.*brief/i,
  /here's your.*brief/i,
  /ready to get started/i,
  /want (me|us) to (submit|create|proceed)/i,
  // Catch-all: "brief" within 40 chars of a completion keyword
  /\bbrief\b.{0,40}\b(complete|locked|finalized|all set|wrapped up|done)\b/i,
  /locked and loaded/i,
  /ready to get this built/i,
  /ready to (have|get) (this|it|your)/i,
  /bring.*to life/i,
  /\bfinal brief\b/i,
]

/** Check if a message indicates the AI is ready to create a task. */
export function hasReadyIndicator(content: string): boolean {
  return READY_PATTERNS.some((p) => p.test(content))
}

/** Generate a smart chat title from the conversation messages. */
export function getChatTitle(messages: Message[]): string | null {
  if (messages.length <= 1) return null

  const userMessages = messages.filter((m) => m.role === 'user')
  if (userMessages.length === 0) return null

  const allUserContent = userMessages.map((m) => m.content.toLowerCase()).join(' ')

  let contentType = ''
  if (allUserContent.includes('instagram stories') || allUserContent.includes('story')) {
    contentType = 'Instagram Stories'
  } else if (allUserContent.includes('instagram') || allUserContent.includes('feed post')) {
    contentType = 'Instagram Posts'
  } else if (allUserContent.includes('linkedin')) {
    contentType = 'LinkedIn Content'
  } else if (allUserContent.includes('social media')) {
    contentType = 'Social Media Content'
  } else if (allUserContent.includes('logo')) {
    contentType = 'Logo Design'
  } else if (allUserContent.includes('video')) {
    contentType = 'Video Content'
  } else if (allUserContent.includes('website') || allUserContent.includes('web')) {
    contentType = 'Web Design'
  }

  let quantity = ''
  if (
    allUserContent.includes('series') ||
    allUserContent.includes('multiple') ||
    allUserContent.includes('pack')
  ) {
    quantity = 'Series'
  }

  if (contentType && quantity) {
    return `${contentType} ${quantity}`
  } else if (contentType) {
    return contentType
  }

  const content = userMessages[0].content
  const contentStr = typeof content === 'string' ? content : String(content || 'New Request')
  return contentStr.length > 40 ? contentStr.substring(0, 40) + '...' : contentStr
}

/**
 * Construct a task proposal from conversation messages.
 * Prefers refined values from the LiveBrief when available,
 * falls back to regex extraction from raw messages.
 */
export function constructTaskFromConversation(
  messages: Message[],
  brief?: LiveBrief | null
): TaskProposal {
  const userMessages = messages.filter((m) => m.role === 'user')
  const userContent = userMessages.map((m) => m.content).join(' ')
  const firstUserMsg = userMessages[0]?.content || ''
  const contentLower = userContent.toLowerCase()

  // If brief has a refined taskSummary, use it as the title
  const briefTitle = brief?.taskSummary?.value
  const briefTopic = brief?.topic?.value

  // Extract product/brand name
  let productContext = ''
  const forPattern =
    /(?:for|about|showcasing?|featuring?|promoting?|introducing?)\s+(?:my\s+)?(?:the\s+)?([A-Z][A-Za-z0-9]*(?:\s+[A-Z][A-Za-z0-9]*)*(?:'s)?)/
  const forMatch = userContent.match(forPattern)
  if (forMatch) {
    productContext = forMatch[1].replace(/'s$/, '')
  }

  // Extract purpose/type of content
  let contentType = ''
  let baseTitle = ''

  if (
    contentLower.includes('calendar') ||
    contentLower.includes('content plan') ||
    contentLower.includes('posting schedule') ||
    contentLower.includes('content schedule')
  ) {
    baseTitle = 'Content Calendar'
  } else if (contentLower.includes('landing page') || contentLower.includes('landing-page')) {
    baseTitle = 'Landing Page'
  } else if (
    contentLower.includes('feature') &&
    (contentLower.includes('video') || contentLower.includes('explainer'))
  ) {
    contentType = 'Feature Explainer'
    baseTitle = 'Video'
  } else if (contentLower.includes('launch') && contentLower.includes('video')) {
    contentType = 'Launch'
    baseTitle = 'Video'
  } else if (contentLower.includes('demo') || contentLower.includes('walkthrough')) {
    contentType = 'Product Demo'
    baseTitle = 'Video'
  } else if (contentLower.includes('testimonial')) {
    contentType = 'Testimonial'
    baseTitle = contentLower.includes('video') ? 'Video' : 'Content'
  } else if (contentLower.includes('carousel')) {
    baseTitle = 'Instagram Carousel'
  } else if (contentLower.includes('instagram') && contentLower.includes('story')) {
    baseTitle = 'Instagram Stories'
  } else if (contentLower.includes('instagram') || contentLower.includes('post')) {
    baseTitle = 'Instagram Posts'
  } else if (contentLower.includes('linkedin')) {
    baseTitle = 'LinkedIn Content'
  } else if (contentLower.includes('video') || contentLower.includes('reel')) {
    baseTitle = 'Video Content'
  } else if (contentLower.includes('logo')) {
    baseTitle = 'Logo Design'
  } else if (contentLower.includes('banner') || contentLower.includes('ad')) {
    baseTitle = 'Banner/Ad Design'
  } else if (contentLower.includes('pitch') && contentLower.includes('deck')) {
    baseTitle = 'Pitch Deck'
  } else if (contentLower.includes('presentation')) {
    baseTitle = 'Presentation'
  } else {
    baseTitle = 'Design Request'
  }

  // Construct descriptive title
  let title = baseTitle
  if (contentType && productContext) {
    title = `${productContext} ${contentType} ${baseTitle}`
  } else if (productContext) {
    title = `${productContext} ${baseTitle}`
  } else if (contentType) {
    title = `${contentType} ${baseTitle}`
  }

  // Add context from quoted text if title is still generic
  if (!productContext) {
    const quotedMatch = firstUserMsg.match(/["']([^"']+)["']/)
    if (quotedMatch && quotedMatch[1].length < 30) {
      title = `${title}: ${quotedMatch[1]}`
    }
  }

  // Prefer brief's refined summary over regex-extracted title
  if (briefTitle && briefTitle !== 'New Brief' && briefTitle !== 'New project request') {
    title = briefTitle
  }

  // Clean up title
  title = title.replace(/\s+/g, ' ').trim()
  if (title.length > 60) {
    title = title.substring(0, 57) + '...'
  }

  // Build description — prefer brief topic over raw first message
  // API requires minimum 10 characters, so build a sufficiently long description
  let description = briefTopic && briefTopic.length >= 10 ? briefTopic : firstUserMsg
  if (description.length < 10) {
    // Pad short descriptions with the title context to meet API minimum
    description = `${title} — ${description || 'Design request'}`.substring(0, 200)
  }
  if (description.length > 200) {
    description = description.substring(0, 197) + '...'
  }

  // Determine category
  let category = 'Social Media'
  if (contentLower.includes('logo')) category = 'Logo Design'
  else if (contentLower.includes('video') || contentLower.includes('reel')) category = 'Video'
  else if (contentLower.includes('banner') || contentLower.includes('ad')) category = 'Advertising'
  else if (contentLower.includes('brand')) category = 'Branding'

  // Smart credit calculation
  const categoryBaseCredits: Record<string, number> = {
    'Social Media': 15,
    Advertising: 20,
    Video: 30,
    'Logo Design': 40,
    Branding: 60,
  }
  let creditsRequired = categoryBaseCredits[category] || 15

  // Adjust for quantity
  const quantityPatterns = [
    /(\d+)\s*(slides?|images?|posts?|frames?|pieces?|designs?|concepts?)/i,
    /(\d+)\s*(carousel|story|stories|reels?)/i,
    /(\d+)\s*(versions?|variants?|options?)/i,
  ]

  for (const pattern of quantityPatterns) {
    const match = userContent.match(pattern)
    if (match) {
      const count = parseInt(match[1], 10)
      if (count > 1 && count <= 20) {
        const perItemCredits = category === 'Video' ? 5 : category === 'Advertising' ? 4 : 3
        creditsRequired += (count - 1) * perItemCredits
        break
      }
    }
  }

  // Adjust for complexity indicators
  if (contentLower.includes('animation') || contentLower.includes('animated')) {
    creditsRequired += 10
  }
  if (contentLower.includes('multiple platforms') || contentLower.includes('multi-platform')) {
    creditsRequired += 5
  }
  if (
    contentLower.includes('rush') ||
    contentLower.includes('urgent') ||
    contentLower.includes('asap')
  ) {
    creditsRequired = Math.round(creditsRequired * 1.25)
  }

  creditsRequired = Math.min(creditsRequired, 100)

  // Map category to slug for delivery calculation
  const categorySlugMap: Record<string, string> = {
    'Social Media': 'social-media',
    Advertising: 'static-ads',
    Video: 'video-motion',
    'Logo Design': 'ui-ux',
    Branding: 'ui-ux',
  }
  const deliveryCategorySlug = categorySlugMap[category] || 'social-media'

  // Detect complexity from content
  let complexity = 'INTERMEDIATE'
  if (
    contentLower.includes('simple') ||
    contentLower.includes('basic') ||
    contentLower.includes('quick')
  ) {
    complexity = 'SIMPLE'
  } else if (
    contentLower.includes('complex') ||
    contentLower.includes('advanced') ||
    contentLower.includes('premium')
  ) {
    complexity = 'ADVANCED'
  } else if (
    contentLower.includes('expert') ||
    contentLower.includes('enterprise') ||
    contentLower.includes('custom')
  ) {
    complexity = 'EXPERT'
  }

  // Detect urgency from content
  let urgency = 'STANDARD'
  if (
    contentLower.includes('rush') ||
    contentLower.includes('urgent') ||
    contentLower.includes('asap') ||
    contentLower.includes('emergency')
  ) {
    urgency = 'URGENT'
  } else if (contentLower.includes('flexible') || contentLower.includes('no rush')) {
    urgency = 'FLEXIBLE'
  }

  // Detect quantity
  let quantity = 1
  for (const pattern of quantityPatterns) {
    const match = userContent.match(pattern)
    if (match) {
      const count = parseInt(match[1], 10)
      if (count > 1 && count <= 20) {
        quantity = count
        break
      }
    }
  }

  const deliveryDays = calculateDeliveryDays(deliveryCategorySlug, complexity, urgency, quantity)

  return {
    title,
    description,
    category,
    estimatedHours: 24,
    deliveryDays,
    creditsRequired,
  }
}

/** Context available for smart completions from the briefing flow. */
export interface SmartCompletionContext {
  briefingStage?: string | null
  deliverableCategory?: string | null
  lastAssistantMessage?: string | null
  brandName?: string | null
  platform?: string | null
  intent?: string | null
}

type CompletionEntry = { pattern: RegExp; completion: string }

// ── AI question-aware completions (highest signal) ──────────────────────
// Detects what the AI just asked and returns completions relevant to that question.
function getQuestionAwareCompletions(
  lastMessage: string | null | undefined
): CompletionEntry[] | null {
  if (!lastMessage) return null
  const msg = lastMessage.toLowerCase()

  // Audience / who questions
  if (/\b(audience|who|target|demographic|customer)\b/.test(msg)) {
    return [
      { pattern: /^(for|targeting)\s*$/i, completion: 'young professionals aged 25-35' },
      { pattern: /^(mainly|mostly|primarily)\s*$/i, completion: 'business owners and founders' },
      { pattern: /^(our|my)\s*$/i, completion: 'target audience is tech-savvy professionals' },
      { pattern: /^(small|medium|large)\s*$/i, completion: 'business owners' },
      { pattern: /^(young|older)\s*$/i, completion: 'professionals in their 30s' },
      { pattern: /^(b2b|b2c)\s*$/i, completion: 'customers in the tech space' },
      { pattern: /^people\s+(who|that)\s*$/i, completion: 'want to grow their business' },
    ]
  }

  // Goal / intent questions
  if (/\b(goal|achieve|objective|get people to|purpose|aim|result)\b/.test(msg)) {
    return [
      { pattern: /^(to|we want to)\s+drive\s*$/i, completion: 'signups and conversions' },
      { pattern: /^(to|we want to)\s+increase\s*$/i, completion: 'brand awareness' },
      { pattern: /^(to|we want to)\s+build\s*$/i, completion: 'authority in our space' },
      { pattern: /^(to|we want to)\s+grow\s*$/i, completion: 'our audience' },
      { pattern: /^(to|we want to)\s+generate\s*$/i, completion: 'leads and sales' },
      { pattern: /^(to|we want to)\s+attract\s*$/i, completion: 'new customers' },
      { pattern: /^(to|we want to)\s+boost\s*$/i, completion: 'engagement and awareness' },
      { pattern: /^(get|drive)\s+(more|people)\s*$/i, completion: 'to sign up' },
    ]
  }

  // Scene / quantity / structure questions
  if (/\b(scene|how many|slides?|section|length|duration)\b/.test(msg)) {
    return [
      { pattern: /^(\d+)\s*$/i, completion: 'scenes with transitions' },
      { pattern: /^(a\s+)?short\s*$/i, completion: '30-second product demo' },
      { pattern: /^(about|around)\s*$/i, completion: '60 seconds total' },
      { pattern: /^(i\s+need|we\s+need)\s*$/i, completion: '3 scenes highlighting key features' },
      {
        pattern: /^each\s+(scene|slide|section)\s*$/i,
        completion: 'should focus on a key benefit',
      },
    ]
  }

  // Style / visual preference questions
  if (/\b(style|look|feel|aesthetic|visual|design|vibe|mood)\b/.test(msg)) {
    return [
      { pattern: /^something\s*$/i, completion: 'bold and modern' },
      { pattern: /^i\s+like\s*$/i, completion: 'the clean minimal look' },
      { pattern: /^make\s+it\s*$/i, completion: 'feel premium and editorial' },
      { pattern: /^keep\s+it\s*$/i, completion: 'on brand with our style' },
      { pattern: /^(i('m| am)\s+)?looking\s+for\s*$/i, completion: 'something sleek and modern' },
      { pattern: /^(more|very)\s*$/i, completion: 'minimal and refined' },
    ]
  }

  // Platform questions
  if (/\b(platform|where|channel|publish|post)\b/.test(msg)) {
    return [
      { pattern: /^(for|on)\s+instagram\s*$/i, completion: 'reels and stories' },
      { pattern: /^(for|on)\s+linkedin\s*$/i, completion: 'thought leadership posts' },
      { pattern: /^(for|on)\s+tiktok\s*$/i, completion: 'short-form videos' },
      { pattern: /^(for|on)\s+youtube\s*$/i, completion: 'video content' },
      { pattern: /^(for|on)\s+(the\s+)?web\s*$/i, completion: 'our landing page' },
      { pattern: /^(mainly|primarily)\s*$/i, completion: 'Instagram and LinkedIn' },
    ]
  }

  // Timeline / deadline questions
  if (/\b(timeline|when|deadline|urgency|rush|how soon)\b/.test(msg)) {
    return [
      { pattern: /^(by|before)\s+(next|this)\s*$/i, completion: 'week if possible' },
      { pattern: /^(within|in)\s*$/i, completion: 'the next week' },
      { pattern: /^as\s+soon\s*$/i, completion: 'as possible' },
      { pattern: /^(no|not)\s*$/i, completion: 'rush — flexible timeline' },
      { pattern: /^(we\s+)?launch\s*$/i, completion: 'in 2 weeks' },
    ]
  }

  return null
}

// ── Stage-specific completion pools ─────────────────────────────────────
function getStageCompletions(
  stage: string | null | undefined,
  category: string | null | undefined,
  brandName: string | null | undefined
): CompletionEntry[] {
  const brand = brandName || 'our'

  switch (stage) {
    case 'EXTRACT':
    case 'TASK_TYPE':
      return [
        {
          pattern: /^a\s+(tech\s+)?(product|app|platform|tool|software|service)\s+for\s*$/i,
          completion: 'businesses to streamline their workflows',
        },
        {
          pattern: /^a\s+new\s*$/i,
          completion: `product ${brand === 'our' ? "we're" : `${brand} is`} launching`,
        },
        { pattern: /^an\s+app\s+(that|which|for)\s*$/i, completion: 'helps people save time' },
        { pattern: /^an\s+ai\s*$/i, completion: 'powered tool for content creation' },
        { pattern: /^it('s| is)\s+(a|an)\s*$/i, completion: 'SaaS platform for businesses' },
        {
          pattern: /^it('s| is)\s+called\s*$/i,
          completion: `${brandName || 'and it helps businesses'}`,
        },
        {
          pattern: /^we\s+(have|built|created|made)\s+(a|an)\s*$/i,
          completion: 'platform that helps businesses',
        },
        { pattern: /^we('re| are)\s+launching\s*$/i, completion: 'a new product next month' },
        { pattern: /^we('re| are)\s+building\s*$/i, completion: 'a platform for teams' },
        {
          pattern: /^(my|our)\s+(product|app|company|startup|business)\s*$/i,
          completion: 'helps businesses save time',
        },
        { pattern: /^our\s+new\s*$/i, completion: 'product launches next month' },
        { pattern: /^(a|an)\s+(fitness|health|wellness)\s*$/i, completion: 'tracking app' },
        {
          pattern: /^(a|an)\s+(e-?commerce|shopping)\s*$/i,
          completion: 'platform for small businesses',
        },
        { pattern: /^(a|an)\s+(social|community)\s*$/i, completion: 'platform for creators' },
        {
          pattern: /that\s+helps\s+(people|users|businesses|teams)\s*$/i,
          completion: 'save time and money',
        },
        { pattern: /that\s+connects\s*$/i, completion: 'businesses with customers' },
        {
          pattern: /^i\s+need\s*$/i,
          completion: `content for ${brand === 'our' ? 'our' : `${brand}'s`} launch`,
        },
        {
          pattern: /^we\s+need\s*$/i,
          completion: `design assets for ${brand === 'our' ? 'our' : `${brand}'s`} brand`,
        },
      ]

    case 'INTENT':
      return [
        { pattern: /^(to|we want to)\s+drive\s*$/i, completion: 'signups and conversions' },
        { pattern: /^(to|we want to)\s+increase\s*$/i, completion: 'brand awareness' },
        { pattern: /^(to|we want to)\s+build\s*$/i, completion: 'authority in our space' },
        { pattern: /^(to|we want to)\s+grow\s*$/i, completion: 'our audience' },
        { pattern: /^(to|we want to)\s+generate\s*$/i, completion: 'leads and sales' },
        { pattern: /^(to|we want to)\s+launch\s*$/i, completion: 'our new product' },
        { pattern: /^(to|we want to)\s+promote\s*$/i, completion: 'our upcoming launch' },
        { pattern: /^(to|we want to)\s+attract\s*$/i, completion: 'new users' },
        { pattern: /^(to|we want to)\s+get\s*$/i, completion: 'more customers' },
        { pattern: /^(get|drive)\s+(more|people)\s*$/i, completion: 'to sign up' },
      ]

    case 'INSPIRATION':
      return [
        { pattern: /^something\s*$/i, completion: 'bold and modern' },
        { pattern: /^i\s+like\s*$/i, completion: 'the clean minimal look' },
        { pattern: /^make\s+it\s*$/i, completion: 'feel premium and editorial' },
        { pattern: /^keep\s+it\s*$/i, completion: 'on brand with our style' },
        { pattern: /^something\s+more\s*$/i, completion: 'minimal and clean' },
        { pattern: /^something\s+less\s*$/i, completion: 'busy and more focused' },
        { pattern: /^(i('m| am)\s+)?looking\s+for\s*$/i, completion: 'something sleek and modern' },
        { pattern: /^i\s+was\s+thinking\s*$/i, completion: 'something more minimal' },
        { pattern: /^(more|very)\s*$/i, completion: 'minimal and refined' },
      ]

    case 'STRUCTURE':
      if (category === 'video') {
        return [
          { pattern: /^i\s+need\s*$/i, completion: '3 scenes highlighting key features' },
          { pattern: /^(a\s+)?short\s*$/i, completion: '30-second product demo' },
          { pattern: /^something\s*$/i, completion: 'under a minute' },
          { pattern: /^each\s+scene\s*$/i, completion: 'should focus on a key benefit' },
          { pattern: /^(start|open)\s+(with|on)\s*$/i, completion: 'a hook that grabs attention' },
          { pattern: /^(end|close)\s+(with|on)\s*$/i, completion: 'a strong CTA' },
          { pattern: /^(\d+)\s+(scenes?|shots?)\s*$/i, completion: 'with smooth transitions' },
        ]
      }
      if (category === 'website') {
        return [
          { pattern: /^(a\s+)?hero\s*$/i, completion: 'section with our value prop' },
          { pattern: /^include\s*$/i, completion: 'a features section and pricing' },
          { pattern: /^start\s+with\s*$/i, completion: 'a strong headline and CTA' },
          { pattern: /^(i|we)\s+need\s*$/i, completion: 'a landing page with clear sections' },
          { pattern: /^(add|with)\s+(a\s+)?$/i, completion: 'testimonials section' },
        ]
      }
      if (category === 'content') {
        return [
          { pattern: /^(\d+)\s+posts?\s*$/i, completion: 'per week' },
          { pattern: /^(a\s+)?mix\s*$/i, completion: 'of educational and promotional content' },
          { pattern: /^include\s*$/i, completion: 'carousel and single posts' },
          { pattern: /^(a\s+)?series\s+of\s*$/i, completion: 'posts for our launch' },
          { pattern: /^each\s+(post|piece)\s*$/i, completion: 'should have a clear CTA' },
        ]
      }
      // Design/brand structure
      return [
        { pattern: /^i\s+need\s*$/i, completion: 'multiple size variations' },
        { pattern: /^include\s*$/i, completion: 'our logo and brand colors' },
        { pattern: /^(the|a)\s+main\s*$/i, completion: 'design should be 1080x1080' },
        { pattern: /^(a\s+)?series\s+of\s*$/i, completion: 'posts for our launch' },
      ]

    case 'ELABORATE':
      return [
        { pattern: /^the\s+headline\s*$/i, completion: 'should be punchy and action-driven' },
        { pattern: /^for\s+the\s+CTA\s*$/i, completion: "use 'Get Started' or 'Learn More'" },
        { pattern: /^the\s+copy\s*$/i, completion: 'should be conversational' },
        { pattern: /^(the|our)\s+tone\s*$/i, completion: 'should be professional yet friendly' },
        { pattern: /^(use|include)\s+$/i, completion: 'our brand colors and logo' },
        { pattern: /^make\s+(sure|it)\s*$/i, completion: 'the CTA stands out' },
        { pattern: /^(the|a)\s+background\s*$/i, completion: 'should be clean and minimal' },
      ]

    case 'MOODBOARD':
    case 'REVIEW':
    case 'SUBMIT':
    case 'DEEPEN':
    case 'STRATEGIC_REVIEW':
      return [
        {
          pattern: /^(yes|yeah|yep|sure|perfect),?\s*$/i,
          completion: "this looks great, let's proceed",
        },
        { pattern: /^looks\s+good\s*$/i, completion: "let's move forward" },
        { pattern: /^(great|nice|good|love\s+it),?\s*$/i, completion: "let's move forward" },
        { pattern: /^i('d| would)\s+like\s*$/i, completion: 'to adjust the visual direction' },
        { pattern: /^can\s+we\s*$/i, completion: 'change the color palette?' },
        { pattern: /^(no|nope|not\s+quite),?\s*$/i, completion: "I'd like to make some changes" },
        { pattern: /^(actually|wait),?\s*$/i, completion: 'can we adjust the style?' },
        { pattern: /^one\s+(more|last)\s*$/i, completion: 'thing before we submit' },
      ]

    default:
      return []
  }
}

// ── Universal completions (active at all stages) ────────────────────────
const UNIVERSAL_COMPLETIONS: CompletionEntry[] = [
  { pattern: /^can\s+you\s*$/i, completion: 'make it more minimal?' },
  { pattern: /^could\s+(you|we)\s*$/i, completion: 'try a different style?' },
  { pattern: /^what\s+about\s*$/i, completion: 'a more colorful version?' },
  { pattern: /^how\s+about\s*$/i, completion: 'we try a different approach?' },
  { pattern: /^can\s+we\s+(also|add)\s*$/i, completion: 'include our tagline?' },
  { pattern: /^should\s+(we|i)\s*$/i, completion: 'include the logo?' },
  { pattern: /^show\s+me\s*$/i, completion: 'more options' },
  { pattern: /^(for|on)\s+instagram\s*$/i, completion: 'reels and stories' },
  { pattern: /^(for|on)\s+linkedin\s*$/i, completion: 'thought leadership posts' },
  { pattern: /^(for|on)\s+tiktok\s*$/i, completion: 'short-form videos' },
  { pattern: /^(for|on)\s+youtube\s*$/i, completion: 'video content' },
  { pattern: /^(for|on)\s+(the\s+)?web\s*$/i, completion: 'landing page' },
  { pattern: /^as\s+soon\s*$/i, completion: 'as possible' },
  { pattern: /^i\s+want\s*$/i, completion: 'something modern and clean' },
]

// ── Word-level completions (partial word → complete word) ───────────────
const WORD_COMPLETIONS: Record<string, string> = {
  inst: 'agram',
  link: 'edIn',
  tikt: 'ok',
  face: 'book',
  yout: 'ube',
  twit: 'ter',
  mini: 'mal',
  moder: 'n',
  cine: 'matic',
  prof: 'essional',
  eleg: 'ant',
  vibr: 'ant',
  dynam: 'ic',
  sleek: ' and modern',
  prod: 'uct',
  serv: 'ice',
  plat: 'form',
  busin: 'esses',
  enter: 'prise',
  start: 'up',
  compan: 'y',
  anno: 'uncement',
  awar: 'eness',
  laun: 'ch',
  prom: 'otion',
  conv: 'ersion',
  sign: 'ups',
  engag: 'ement',
  stream: 'line workflows',
  auto: 'mate tasks',
  manag: 'e their projects',
  track: 'ing and analytics',
  colla: 'borate',
}

/** Match text against a pool of completions, returning the first match. */
function matchPool(text: string, pool: CompletionEntry[]): string | null {
  for (const { pattern, completion } of pool) {
    if (pattern.test(text)) return completion
  }
  return null
}

/**
 * Context-aware smart autocomplete completion engine.
 * Priority: AI question-aware > stage-specific > universal > word completions.
 */
export function generateSmartCompletion(
  text: string,
  context?: SmartCompletionContext
): string | null {
  if (!text || text.length < 3) return null

  const lowerText = text.toLowerCase().trim()
  const words = lowerText.split(/\s+/)
  const lastWord = words[words.length - 1] || ''

  // 1. AI question-aware completions (highest signal)
  const questionPool = getQuestionAwareCompletions(context?.lastAssistantMessage)
  if (questionPool) {
    const match = matchPool(lowerText, questionPool)
    if (match) return match
  }

  // 2. Stage-specific completions
  if (context?.briefingStage) {
    const stagePool = getStageCompletions(
      context.briefingStage,
      context.deliverableCategory,
      context.brandName
    )
    const match = matchPool(lowerText, stagePool)
    if (match) return match
  }

  // 3. Universal completions (active at all stages)
  const universalMatch = matchPool(lowerText, UNIVERSAL_COMPLETIONS)
  if (universalMatch) return universalMatch

  // 4. Word-level completions for partial words
  if (lastWord.length >= 3) {
    for (const [prefix, suffix] of Object.entries(WORD_COMPLETIONS)) {
      if (lastWord.startsWith(prefix) && !lastWord.includes(suffix.charAt(0).toLowerCase())) {
        return suffix
      }
    }
  }

  return null
}

/** Task status display configuration. */
export function getStatusDisplay(status: string): {
  label: string
  color: string
} {
  const statusMap: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Pending', color: 'bg-ds-warning/10 text-ds-warning' },
    ASSIGNED: { label: 'Assigned', color: 'bg-ds-info/10 text-ds-info' },
    IN_PROGRESS: { label: 'In Progress', color: 'bg-primary/10 text-primary' },
    PENDING_ADMIN_REVIEW: { label: 'Under Review', color: 'bg-ds-warning/10 text-ds-warning' },
    PENDING_REVIEW: {
      label: 'Pending Review',
      color: 'bg-ds-role-transition/10 text-ds-role-transition',
    },
    REVISION_REQUESTED: { label: 'Revision Requested', color: 'bg-ds-error/10 text-ds-error' },
    COMPLETED: { label: 'Completed', color: 'bg-ds-success/10 text-ds-success' },
    CANCELLED: { label: 'Cancelled', color: 'bg-muted text-muted-foreground' },
  }
  return statusMap[status] || { label: status, color: 'bg-muted text-muted-foreground' }
}
