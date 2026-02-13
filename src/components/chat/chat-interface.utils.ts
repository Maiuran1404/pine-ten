/**
 * Utility functions for the ChatInterface component.
 * Contains text formatting, time formatting, smart completions,
 * task title generation, and status display helpers.
 */

import type { TaskProposal, ChatMessage as Message } from './types'

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
 * Extracts title, description, category, and credits from conversation content.
 */
export function constructTaskFromConversation(messages: Message[]): TaskProposal {
  const userMessages = messages.filter((m) => m.role === 'user')
  const userContent = userMessages.map((m) => m.content).join(' ')
  const firstUserMsg = userMessages[0]?.content || ''
  const contentLower = userContent.toLowerCase()

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

  // Clean up title
  title = title.replace(/\s+/g, ' ').trim()
  if (title.length > 60) {
    title = title.substring(0, 57) + '...'
  }

  // Build description
  let description = firstUserMsg
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

  return {
    title,
    description,
    category,
    estimatedHours: 24,
    deliveryDays: 3,
    creditsRequired,
  }
}

/** The smart autocomplete completion patterns for the chat input. */
export function generateSmartCompletion(text: string): string | null {
  if (!text || text.length < 3) return null

  const lowerText = text.toLowerCase().trim()
  const words = lowerText.split(/\s+/)
  const lastWord = words[words.length - 1] || ''

  const completions: Array<{ pattern: RegExp | string; completion: string }> = [
    {
      pattern:
        /^a\s+(tech\s+)?(product|app|platform|tool|software|service)\s*(\/\s*\w+)?\s+for\s*$/i,
      completion: 'businesses to streamline their workflows',
    },
    {
      pattern: /^a\s+(saas|b2b|b2c)\s+(product|app|platform|tool)\s+for\s*$/i,
      completion: 'managing team productivity',
    },
    { pattern: /^a\s+(mobile|web)\s+app\s+for\s*$/i, completion: 'tracking fitness goals' },
    { pattern: /^a\s+new\s*$/i, completion: "product we're launching" },
    { pattern: /^an\s+app\s+(that|which|for)\s*$/i, completion: 'helps people save time' },
    { pattern: /^an\s+ai\s*$/i, completion: 'powered tool for content creation' },
    { pattern: /^it('s| is)\s+(a|an)\s*$/i, completion: 'SaaS platform for businesses' },
    { pattern: /^it('s| is)\s+called\s*$/i, completion: 'and it helps businesses' },
    {
      pattern: /^we\s+(have|built|created|made)\s+(a|an)\s*$/i,
      completion: 'platform that helps businesses',
    },
    { pattern: /^we('re| are)\s+(a|an)?\s*$/i, completion: 'launching next month' },
    { pattern: /^we('re| are)\s+launching\s*$/i, completion: 'a new product next month' },
    { pattern: /^we('re| are)\s+building\s*$/i, completion: 'a platform for teams' },
    {
      pattern: /^my\s+(product|app|company|startup|business)\s*$/i,
      completion: 'helps businesses save time',
    },
    {
      pattern: /^our\s+(product|app|company|startup|business)\s*$/i,
      completion: 'is a platform for teams',
    },
    { pattern: /^our\s+new\s*$/i, completion: 'product launches next month' },
    { pattern: /^(a|an)\s+(fitness|health|wellness)\s*$/i, completion: 'tracking app' },
    { pattern: /^(a|an)\s+(project|task)\s+management\s*$/i, completion: 'tool for remote teams' },
    {
      pattern: /^(a|an)\s+(e-?commerce|shopping)\s*$/i,
      completion: 'platform for small businesses',
    },
    { pattern: /^(a|an)\s+(fintech|finance)\s*$/i, completion: 'app for personal budgeting' },
    { pattern: /^(a|an)\s+(social|community)\s*$/i, completion: 'platform for creators' },
    { pattern: /^(a|an)\s+(marketing|crm)\s*$/i, completion: 'tool for small businesses' },
    {
      pattern: /that\s+helps\s+(people|users|businesses|teams|companies)\s*$/i,
      completion: 'save time and money',
    },
    {
      pattern: /that\s+lets\s+(people|users|you)\s*$/i,
      completion: 'manage their projects easily',
    },
    {
      pattern: /that\s+makes\s+(it\s+)?(easy|easier|simple)\s*$/i,
      completion: 'to collaborate with teams',
    },
    { pattern: /that\s+automates\s*$/i, completion: 'repetitive tasks' },
    { pattern: /that\s+connects\s*$/i, completion: 'businesses with customers' },
    {
      pattern: /to\s+help\s+(people|users|businesses|teams)\s*$/i,
      completion: 'be more productive',
    },
    {
      pattern: /^i('ll| will)?\s*(go|like|choose|pick|want)\s*(with|the)?\s*$/i,
      completion: 'the first style',
    },
    { pattern: /^the\s+first\s*$/i, completion: 'one looks great' },
    { pattern: /^the\s+second\s*$/i, completion: 'option please' },
    { pattern: /^the\s+third\s*$/i, completion: 'style works well' },
    { pattern: /^i\s+like\s+(the\s+)?$/i, completion: 'minimal style' },
    { pattern: /^let('s|s)?\s*go\s*(with)?\s*$/i, completion: 'the first option' },
    { pattern: /^show\s+me\s*$/i, completion: 'more options' },
    { pattern: /^something\s+more\s*$/i, completion: 'minimal and clean' },
    { pattern: /^something\s+less\s*$/i, completion: 'busy and more focused' },
    { pattern: /^for\s+(my|our)\s*$/i, completion: 'target audience of professionals' },
    { pattern: /^targeting\s*$/i, completion: 'young professionals aged 25-40' },
    { pattern: /^the\s+audience\s+(is|are)?\s*$/i, completion: 'primarily business owners' },
    { pattern: /^(mainly|mostly|primarily)\s*$/i, completion: 'business professionals' },
    { pattern: /^(aimed\s+at|for)\s+(small|medium|large)\s*$/i, completion: 'businesses' },
    { pattern: /^(aimed\s+at|for)\s+(young|older)\s*$/i, completion: 'professionals' },
    { pattern: /^(for|on)\s+instagram\s*$/i, completion: 'reels and stories' },
    { pattern: /^(for|on)\s+linkedin\s*$/i, completion: 'thought leadership posts' },
    { pattern: /^(for|on)\s+tiktok\s*$/i, completion: 'short-form videos' },
    { pattern: /^(for|on)\s+twitter\s*$/i, completion: 'engagement threads' },
    { pattern: /^(for|on)\s+youtube\s*$/i, completion: 'video content' },
    { pattern: /^(for|on)\s+(the\s+)?web\s*$/i, completion: 'landing page' },
    { pattern: /^(to|we want to)\s+drive\s*$/i, completion: 'signups and conversions' },
    { pattern: /^(to|we want to)\s+increase\s*$/i, completion: 'brand awareness' },
    { pattern: /^(to|we want to)\s+launch\s*$/i, completion: 'our new product' },
    { pattern: /^(to|we want to)\s+promote\s*$/i, completion: 'our upcoming launch' },
    { pattern: /^(to|we want to)\s+build\s*$/i, completion: 'brand authority' },
    { pattern: /^(to|we want to)\s+grow\s*$/i, completion: 'our audience' },
    { pattern: /^(to|we want to)\s+get\s*$/i, completion: 'more customers' },
    { pattern: /^(to|we want to)\s+attract\s*$/i, completion: 'new users' },
    { pattern: /^(to|we want to)\s+generate\s*$/i, completion: 'leads and sales' },
    { pattern: /^launching\s+(in|on|next|this)\s*$/i, completion: '2 weeks' },
    { pattern: /^we\s+launch\s+(in|on|next|this)\s*$/i, completion: '2 weeks' },
    { pattern: /^need\s+(this|it)\s+by\s*$/i, completion: 'next week' },
    { pattern: /^by\s+(next|this)\s*$/i, completion: 'week if possible' },
    { pattern: /^as\s+soon\s*$/i, completion: 'as possible' },
    { pattern: /^in\s+(the\s+)?next\s*$/i, completion: 'few days' },
    { pattern: /^within\s*$/i, completion: 'the next week' },
    { pattern: /^(\d+)\s+(posts?|videos?|pieces?|assets?)\s*$/i, completion: 'for the campaign' },
    { pattern: /^a\s+series\s+of\s*$/i, completion: 'posts for our launch' },
    { pattern: /^multiple\s*$/i, completion: 'versions for A/B testing' },
    { pattern: /^just\s+(one|1|a\s+single)\s*$/i, completion: 'hero video' },
    { pattern: /^(yes|yeah|yep|sure|perfect),?\s*$/i, completion: "let's go with that" },
    { pattern: /^(no|nope|not\s+quite),?\s*$/i, completion: 'show me different options' },
    { pattern: /^(great|nice|good|love\s+it),?\s*$/i, completion: "let's move forward" },
    { pattern: /^can\s+you\s*$/i, completion: 'make it more minimal?' },
    { pattern: /^could\s+(you|we)\s*$/i, completion: 'try a different style?' },
    { pattern: /^i\s+need\s*$/i, completion: 'something eye-catching' },
    { pattern: /^make\s+it\s*$/i, completion: 'more bold and vibrant' },
    { pattern: /^keep\s+it\s*$/i, completion: 'simple and clean' },
    { pattern: /^something\s+that\s*$/i, completion: 'stands out' },
    { pattern: /^i\s+want\s*$/i, completion: 'something modern and clean' },
    { pattern: /^we\s+need\s*$/i, completion: 'this by next week' },
    { pattern: /^i('m| am)\s+looking\s+for\s*$/i, completion: 'something bold and modern' },
    { pattern: /^i\s+was\s+thinking\s*$/i, completion: 'something more minimal' },
    { pattern: /^what\s+about\s*$/i, completion: 'a more colorful version?' },
    { pattern: /^how\s+about\s*$/i, completion: 'we try a different approach?' },
    { pattern: /^can\s+we\s+(also|add)\s*$/i, completion: 'include our tagline?' },
    { pattern: /^should\s+(we|i)\s*$/i, completion: 'include the logo?' },
  ]

  // Check for pattern matches
  for (const { pattern, completion } of completions) {
    if (typeof pattern === 'string') {
      if (lowerText.endsWith(pattern.toLowerCase())) {
        return completion
      }
    } else if (pattern.test(lowerText)) {
      return completion
    }
  }

  // Word-level completions for partial words
  const wordCompletions: Record<string, string> = {
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

  if (lastWord.length >= 3) {
    for (const [prefix, suffix] of Object.entries(wordCompletions)) {
      if (lastWord.startsWith(prefix) && !lastWord.includes(suffix.charAt(0).toLowerCase())) {
        return suffix
      }
    }
  }

  // Ending-based completions
  const endingCompletions: Array<{ ending: string; completion: string }> = [
    { ending: ' for', completion: 'businesses to manage their workflows' },
    { ending: ' for ', completion: 'businesses to manage their workflows' },
    { ending: ' that', completion: 'helps teams be more productive' },
    { ending: ' that ', completion: 'helps teams be more productive' },
    { ending: ' which', completion: 'helps businesses save time' },
    { ending: ' to', completion: 'help businesses grow' },
    { ending: ' to ', completion: 'help businesses grow' },
    { ending: ' with', completion: 'a modern, clean design' },
    { ending: ' about', completion: 'our new product launch' },
    { ending: ' like', completion: 'something bold and eye-catching' },
    { ending: ' using', completion: 'AI and automation' },
    { ending: ' helps', completion: 'businesses save time' },
    { ending: ' lets', completion: 'users manage their projects' },
    { ending: ' allows', completion: 'teams to collaborate' },
    { ending: ' enables', completion: 'businesses to scale' },
    { ending: ' makes', completion: 'it easy to get started' },
    { ending: ' and', completion: 'increase conversions' },
    { ending: ' or', completion: 'something similar' },
    { ending: ' but', completion: 'more minimal' },
    { ending: ' by', completion: 'next week' },
    { ending: ' in', completion: 'the next few days' },
    { ending: ' on', completion: 'social media' },
    { ending: '?', completion: '' },
  ]

  for (const { ending, completion } of endingCompletions) {
    if (lowerText.endsWith(ending) && completion) {
      return completion
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
    PENDING: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-500' },
    ASSIGNED: { label: 'Assigned', color: 'bg-blue-500/10 text-blue-500' },
    IN_PROGRESS: { label: 'In Progress', color: 'bg-primary/10 text-primary' },
    PENDING_ADMIN_REVIEW: { label: 'Under Review', color: 'bg-orange-500/10 text-orange-500' },
    PENDING_REVIEW: { label: 'Pending Review', color: 'bg-purple-500/10 text-purple-500' },
    REVISION_REQUESTED: { label: 'Revision Requested', color: 'bg-red-500/10 text-red-500' },
    COMPLETED: { label: 'Completed', color: 'bg-emerald-600/10 text-emerald-500' },
    CANCELLED: { label: 'Cancelled', color: 'bg-muted text-muted-foreground' },
  }
  return statusMap[status] || { label: status, color: 'bg-muted text-muted-foreground' }
}
