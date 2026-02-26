import { NextRequest } from 'next/server'
import Firecrawl from '@mendable/firecrawl-js'
import Anthropic from '@anthropic-ai/sdk'
import { logger } from '@/lib/logger'
import { extractBrandRequestSchema } from '@/lib/validations'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'

// Lazy initialization to avoid errors during build
let firecrawl: Firecrawl | null = null
let anthropic: Anthropic | null = null

function getFirecrawl() {
  if (!firecrawl) {
    firecrawl = new Firecrawl({
      apiKey: process.env.FIRECRAWL_API_KEY || '',
    })
  }
  return firecrawl
}

function getAnthropic(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    })
  }
  return anthropic
}

// Visual Style options - must match types.ts VISUAL_STYLE_OPTIONS
const VISUAL_STYLE_VALUES = [
  'minimal-clean',
  'bold-impactful',
  'elegant-refined',
  'modern-sleek',
  'playful-vibrant',
  'organic-natural',
  'tech-futuristic',
  'classic-timeless',
  'artistic-expressive',
  'corporate-professional',
  'warm-inviting',
  'edgy-disruptive',
] as const

// Brand Tone options - must match types.ts BRAND_TONE_OPTIONS
const BRAND_TONE_VALUES = [
  'friendly-approachable',
  'professional-trustworthy',
  'playful-witty',
  'bold-confident',
  'sophisticated-refined',
  'innovative-visionary',
  'empathetic-caring',
  'authoritative-expert',
  'casual-relaxed',
  'inspiring-motivational',
  'premium-exclusive',
  'rebellious-edgy',
] as const

// Industry Archetype values
const INDUSTRY_ARCHETYPE_VALUES = [
  'hospitality',
  'blue-collar',
  'white-collar',
  'e-commerce',
  'tech',
] as const

// Inferred audience segment
interface InferredAudience {
  name: string
  isPrimary: boolean
  demographics?: {
    ageRange?: { min: number; max: number }
    gender?: 'all' | 'male' | 'female' | 'other'
    income?: 'low' | 'middle' | 'high' | 'enterprise'
  }
  firmographics?: {
    companySize?: string[]
    industries?: string[]
    jobTitles?: string[]
    departments?: string[]
    decisionMakingRole?: 'decision-maker' | 'influencer' | 'end-user'
  }
  psychographics?: {
    painPoints?: string[]
    goals?: string[]
    values?: string[]
  }
  behavioral?: {
    contentPreferences?: string[]
    platforms?: string[]
    buyingProcess?: 'impulse' | 'considered' | 'committee'
  }
  confidence: number
}

interface BrandExtraction {
  name: string
  description: string
  tagline: string | null
  industry: string | null
  industryArchetype: string | null // hospitality, blue-collar, white-collar, e-commerce, tech
  logoUrl: string | null
  faviconUrl: string | null
  primaryColor: string
  secondaryColor: string | null
  accentColor: string | null
  backgroundColor: string
  textColor: string
  brandColors: string[]
  primaryFont: string | null
  secondaryFont: string | null
  socialLinks: {
    twitter?: string
    linkedin?: string
    facebook?: string
    instagram?: string
    youtube?: string
  }
  contactEmail: string | null
  contactPhone: string | null
  keywords: string[]
  // Explicit style and tone selections
  visualStyle: string
  brandTone: string
  // Brand personality/feel values (0-100 scale)
  feelPlayfulSerious: number // 0 = Playful, 100 = Serious
  feelBoldMinimal: number // 0 = Bold, 100 = Minimal
  feelExperimentalClassic: number // 0 = Experimental, 100 = Classic
  feelFriendlyProfessional: number // 0 = Friendly, 100 = Professional
  feelPremiumAccessible: number // 0 = Accessible, 100 = Premium
  // Brand signal sliders
  signalTone: number // 0 = Serious, 100 = Playful
  signalDensity: number // 0 = Minimal, 100 = Rich
  signalWarmth: number // 0 = Cold, 100 = Warm
  signalEnergy: number // 0 = Calm, 100 = Energetic
  // Brand voice summary (1-2 sentence brand strategist assessment)
  brandVoiceSummary: string
  // Inferred target audiences
  audiences?: InferredAudience[]
  // Strategic brand data
  competitors?: Array<{
    name: string
    website?: string
    positioning?: string
    strengths?: string
    weaknesses?: string
  }>
  positioning?: {
    uvp?: string
    missionStatement?: string
    positioningStatement?: string
    differentiators?: string[]
    targetMarket?: string
  }
  brandVoice?: {
    messagingPillars?: string[]
    toneDoList?: string[]
    toneDontList?: string[]
    brandPromise?: string
    keyPhrases?: string[]
    avoidPhrases?: string[]
  }
}

// Extract social links from page links
function extractSocialLinks(links: string[] | undefined): BrandExtraction['socialLinks'] {
  const socialLinks: BrandExtraction['socialLinks'] = {}
  if (!links) return socialLinks

  const linkStr = links.join(' ')

  if (linkStr.includes('twitter.com') || linkStr.includes('x.com')) {
    const link = links.find((l) => l.includes('twitter.com') || l.includes('x.com'))
    if (link) socialLinks.twitter = link
  }
  if (linkStr.includes('linkedin.com')) {
    const link = links.find((l) => l.includes('linkedin.com'))
    if (link) socialLinks.linkedin = link
  }
  if (linkStr.includes('facebook.com')) {
    const link = links.find((l) => l.includes('facebook.com'))
    if (link) socialLinks.facebook = link
  }
  if (linkStr.includes('instagram.com')) {
    const link = links.find((l) => l.includes('instagram.com'))
    if (link) socialLinks.instagram = link
  }
  if (linkStr.includes('youtube.com')) {
    const link = links.find((l) => l.includes('youtube.com'))
    if (link) socialLinks.youtube = link
  }

  return socialLinks
}

// Extract a brand name from a domain (e.g., "didit.me" → "Didit")
function extractNameFromDomain(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    const parts = hostname.split('.')
    if (parts.length < 2) return null
    const name = parts[0]
    if (!name || name.length < 2) return null
    return name.charAt(0).toUpperCase() + name.slice(1)
  } catch {
    return null
  }
}

// Extract a clean brand name from a page title
// Titles often follow patterns like "Tagline | Brand" or "Page - Brand Name"
// We check all segments and prefer the shortest non-generic one
function extractNameFromTitle(title: string): string {
  // Split by common title separators: | – — and " - " (hyphen with spaces)
  const segments = title
    .split(/\s*[|–—]\s*|\s+-\s+/)
    .map((s) => s.trim())
    .filter(Boolean)

  if (segments.length === 0) return 'Unknown Company'
  if (segments.length === 1) return segments[0]

  // Score each segment — brand names tend to be short and NOT start with generic words
  const taglinePrefixes =
    /^(the|a|an|your|our|we|get|stop|start|try|discover|welcome|introducing|build|create|make)\s/i

  const scored = segments.map((seg, i) => ({
    text: seg,
    index: i,
    wordCount: seg.split(/\s+/).length,
    looksLikeTagline: taglinePrefixes.test(seg) || seg.split(/\s+/).length > 4,
  }))

  // Prefer: non-tagline, fewer words, later position (brand name often last)
  const sorted = [...scored].sort((a, b) => {
    if (a.looksLikeTagline !== b.looksLikeTagline) return a.looksLikeTagline ? 1 : -1
    if (a.wordCount !== b.wordCount) return a.wordCount - b.wordCount
    return b.index - a.index
  })

  return sorted[0]?.text || segments[0]
}

// Create default brand data from metadata and Firecrawl branding
function createDefaultBrandData(
  metadata:
    | {
        title?: string
        description?: string
        ogImage?: string
        favicon?: string
      }
    | undefined,
  branding:
    | {
        colors?: {
          primary?: string
          secondary?: string
          accent?: string
          background?: string
          textPrimary?: string
          link?: string
          [key: string]: string | undefined
        }
        typography?: { fontFamilies?: { primary?: string } }
        fonts?: Array<{ family: string }>
        images?: { logo?: string | null; favicon?: string | null }
      }
    | undefined,
  links: string[] | undefined,
  normalizedUrl?: string
): BrandExtraction {
  // Get all hex colors from branding, excluding background and text colors
  const brandColors: string[] = branding?.colors
    ? Object.values(branding.colors).filter(
        (c): c is string => typeof c === 'string' && c.startsWith('#')
      )
    : []

  // Get primary color
  const primaryColor = branding?.colors?.primary || '#6366f1'

  // Firecrawl returns: primary, accent, background, textPrimary, link
  // We need: primaryColor, secondaryColor, accentColor
  // Map: primary -> primaryColor, accent -> secondaryColor, link -> accentColor (if different)

  // Secondary color: use Firecrawl's accent as our secondary (it's typically the 2nd brand color)
  const secondaryColor: string | null =
    branding?.colors?.accent || branding?.colors?.secondary || null

  // Accent color: use link if it's different from what we've already used, otherwise null
  let accentColor: string | null = null
  if (
    branding?.colors?.link &&
    branding?.colors?.link !== primaryColor &&
    branding?.colors?.link !== secondaryColor
  ) {
    accentColor = branding.colors.link
  }

  // If we still don't have an accent but have textPrimary that's not too dark/light, consider it
  if (
    !accentColor &&
    branding?.colors?.textPrimary &&
    branding.colors.textPrimary !== primaryColor &&
    branding.colors.textPrimary !== secondaryColor
  ) {
    // Only use textPrimary as accent if it's not pure black/white
    if (branding.colors.textPrimary !== '#000000' && branding.colors.textPrimary !== '#ffffff') {
      accentColor = branding.colors.textPrimary
    }
  }

  return {
    name:
      (metadata?.title ? extractNameFromTitle(metadata.title) : null) ||
      (normalizedUrl ? extractNameFromDomain(normalizedUrl) : null) ||
      'Unknown Company',
    description: metadata?.description || '',
    tagline: null,
    industry: null,
    industryArchetype: null,
    logoUrl: branding?.images?.logo || metadata?.ogImage || null,
    faviconUrl: branding?.images?.favicon || metadata?.favicon || null,
    primaryColor,
    secondaryColor,
    accentColor,
    backgroundColor: branding?.colors?.background || '#ffffff',
    textColor: branding?.colors?.textPrimary || '#1f2937',
    brandColors,
    primaryFont:
      branding?.typography?.fontFamilies?.primary || branding?.fonts?.[0]?.family || null,
    secondaryFont: null,
    socialLinks: extractSocialLinks(links),
    contactEmail: null,
    contactPhone: null,
    keywords: [],
    // Default style and tone selections
    visualStyle: 'modern-sleek',
    brandTone: 'professional-trustworthy',
    // Default feel values (neutral)
    feelPlayfulSerious: 50,
    feelBoldMinimal: 50,
    feelExperimentalClassic: 50,
    feelFriendlyProfessional: 50,
    feelPremiumAccessible: 50,
    // Default signal values (neutral)
    signalTone: 50,
    signalDensity: 50,
    signalWarmth: 50,
    signalEnergy: 50,
    // Brand voice summary (empty by default, populated by Claude)
    brandVoiceSummary: '',
    // Empty audiences array - will be populated by Claude analysis
    audiences: [],
    // Empty strategic brand data - will be populated by Claude analysis
    competitors: [],
    positioning: {},
    brandVoice: {},
  }
}

const EXTRACTION_TIMEOUT_MS = 60_000

export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAuth()

      // Guard against hung requests — fail gracefully before platform timeout
      const result = await Promise.race([
        extractBrand(request),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(Errors.badRequest('Brand extraction timed out. Please try again.')),
            EXTRACTION_TIMEOUT_MS
          )
        ),
      ])

      return result
    },
    { endpoint: 'POST /api/brand/extract' }
  )
}

async function extractBrand(request: NextRequest) {
  const body = await request.json()
  const { websiteUrl } = extractBrandRequestSchema.parse(body)

  // Normalize URL
  let normalizedUrl = websiteUrl.trim()
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`
  }

  // Scrape the website with Firecrawl - use viewport-sized screenshot to avoid oversized images
  let scrapeResult
  try {
    scrapeResult = await getFirecrawl().scrape(normalizedUrl, {
      formats: [
        'markdown',
        { type: 'screenshot', fullPage: false }, // Use viewport screenshot to stay within Claude's size limits
        'links',
        'branding',
      ],
      onlyMainContent: false,
      headers: { 'Accept-Language': 'en-US,en;q=0.9' }, // Prefer English content
    })
  } catch (scrapeError) {
    logger.error({ error: scrapeError }, 'Firecrawl scrape error')
    throw Errors.badRequest('Failed to scrape website. Please check the URL and try again.')
  }

  const { markdown, screenshot, links, metadata, branding } = scrapeResult as {
    markdown?: string
    screenshot?: string
    links?: string[]
    metadata?: {
      title?: string
      description?: string
      ogImage?: string
      favicon?: string
    }
    branding?: {
      colors?: {
        primary?: string
        secondary?: string
        accent?: string
        background?: string
        textPrimary?: string
        link?: string
        [key: string]: string | undefined
      }
      typography?: {
        fontFamilies?: {
          primary?: string
        }
      }
      fonts?: Array<{ family: string }>
      images?: {
        logo?: string | null
        favicon?: string | null
      }
      confidence?: {
        colors?: number
        buttons?: number
        overall?: number
      }
    }
  }

  // Check if Firecrawl has good branding data with reasonable confidence
  // Firecrawl returns confidence.colors between 0-1, we require at least 0.3 (30%)
  const colorConfidence = branding?.confidence?.colors ?? 0
  const hasColorsWithConfidence =
    branding?.colors && Object.keys(branding.colors).length > 2 && colorConfidence >= 0.3

  // If confidence is too low, use Claude for better color extraction
  const hasBrandingColors = hasColorsWithConfidence
  logger.info(
    { url: normalizedUrl, source: hasBrandingColors ? 'Firecrawl' : 'Claude', colorConfidence },
    'Brand extraction source selected'
  )

  // Even if Firecrawl has good branding colors, we still need Claude for:
  // 1. Target audience inference
  // 2. Visual style and brand tone detection
  // 3. Industry classification
  // So we always run Claude analysis, but may use Firecrawl colors as fallback
  const firecrawlBrandData = hasBrandingColors
    ? createDefaultBrandData(metadata, branding, links, normalizedUrl)
    : null

  // Otherwise, use Claude for deeper analysis
  const contentParts: Anthropic.Messages.ContentBlockParam[] = []

  // Add text content for context (always include this)
  const textPrompt = `Analyze this website and extract comprehensive brand information including visual personality.

Website URL: ${normalizedUrl}
Page Title: ${metadata?.title || 'Unknown'}
Page Description: ${metadata?.description || 'Unknown'}

Website Content (markdown):
${markdown?.slice(0, 8000) || 'No content available'}

Links found on page:
${links?.slice(0, 20).join('\n') || 'No links available'}

${screenshot ? 'A screenshot of the website is also provided for visual analysis.' : ''}

Based on the content${
    screenshot ? ' and screenshot' : ''
  } above, extract the following brand information in JSON format:

IMPORTANT: ALL output must be in English, even if the website content is in another language. Translate any non-English content.

1. **Company Name**: The official company/brand name. CRITICAL: The domain name is the strongest signal — for "${normalizedUrl}", the brand name is very likely derived from the domain (e.g., "didit.me" → "Didit", "stripe.com" → "Stripe", "notion.so" → "Notion"). Do NOT use taglines, headings, or slogans as the company name. Look for the actual brand name in the logo, domain, or page footer.
2. **Description**: A brief description of what the company does (2-3 sentences, in English)
3. **Tagline**: Any tagline or slogan found
4. **Industry**: The specific industry the company operates in (e.g., "Recruitment", "SaaS", "Restaurants", "Electrical Services", "Fashion & Apparel")
5. **Industry Archetype** (choose ONE that best categorizes the business model):
   - "hospitality": Restaurants, Cafes, Hotels, Food & Beverage, Accommodation services
   - "blue-collar": Construction, Electrical Services, Plumbing, HVAC, Manufacturing, Trade services
   - "white-collar": Recruitment, Banking, Venture Capital, Finance, Professional Services, Marketing & Advertising, Consulting
   - "e-commerce": Product-based online businesses, Fashion & Apparel, Retail, Online stores
   - "tech": Technology startups, SaaS, Software companies, Tech products
6. **Logo URL**: If you can identify a logo image URL from the content
7. **Colors**: Extract the main colors used:
   - primaryColor: The dominant brand color (hex code)
   - secondaryColor: Secondary brand color (hex code)
   - accentColor: Accent/highlight color (hex code)
   - backgroundColor: Main background color (hex code)
   - textColor: Main text color (hex code)
   - brandColors: Array of all significant brand colors (hex codes)
8. **Typography**: Identify fonts if mentioned or visible. Choose from these common options if the exact font isn't clear:
   - Modern Sans: Satoshi, Inter, DM Sans, Plus Jakarta Sans, Outfit, Space Grotesk, Manrope, Sora
   - Classic Sans: Helvetica, Arial, Futura, Avenir, Proxima Nova, Montserrat, Lato, Open Sans, Roboto
   - Elegant Serif: Playfair Display, Cormorant Garamond, Libre Baskerville, Source Serif Pro, Fraunces
   - Classic Serif: Times New Roman, Georgia, Merriweather, Lora
   - Geometric/Display: Poppins, Raleway, Josefin Sans, Bebas Neue, Oswald
9. **Social Links**: Any social media profile URLs found
10. **Contact Info**: Email and phone if found
11. **Keywords**: 5-10 keywords that describe this brand
12. **Visual Style** (choose ONE that best matches):
   - "minimal-clean": Simple, whitespace-focused, uncluttered
   - "bold-impactful": Strong contrasts, commanding presence
   - "elegant-refined": Sophisticated, luxurious, polished
   - "modern-sleek": Contemporary, cutting-edge, streamlined
   - "playful-vibrant": Colorful, energetic, fun
   - "organic-natural": Earthy, flowing, nature-inspired
   - "tech-futuristic": Digital, innovative, forward-thinking
   - "classic-timeless": Traditional, enduring, heritage
   - "artistic-expressive": Creative, unique, unconventional
   - "corporate-professional": Business-focused, trustworthy, established
   - "warm-inviting": Cozy, welcoming, friendly aesthetics
   - "edgy-disruptive": Rebellious, challenging norms, provocative
13. **Brand Tone** (choose ONE that best matches the voice/personality):
   - "friendly-approachable": Warm, conversational, relatable
   - "professional-trustworthy": Credible, reliable, expert
   - "playful-witty": Humorous, clever, light-hearted
   - "bold-confident": Assertive, self-assured, direct
   - "sophisticated-refined": Cultured, elegant, discerning
   - "innovative-visionary": Forward-thinking, pioneering, ambitious
   - "empathetic-caring": Understanding, supportive, compassionate
   - "authoritative-expert": Knowledgeable, commanding, leading
   - "casual-relaxed": Easy-going, informal, laid-back
   - "inspiring-motivational": Uplifting, empowering, encouraging
   - "premium-exclusive": Luxury, high-end, selective
   - "rebellious-edgy": Unconventional, provocative, challenging
14. **Brand Personality** (ALL values 0-100 scale, analyze carefully based on visual style, copy tone, and overall feel):
   - feelPlayfulSerious: 0 = Very playful/fun/casual, 100 = Very serious/formal/corporate
   - feelBoldMinimal: 0 = Bold/loud/maximalist with lots of visual elements, 100 = Minimal/clean/whitespace-heavy
   - feelExperimentalClassic: 0 = Experimental/edgy/unconventional, 100 = Classic/traditional/timeless
   - feelFriendlyProfessional: 0 = Friendly/warm/approachable, 100 = Professional/formal/businesslike
   - feelPremiumAccessible: 0 = Budget/accessible/everyday, 100 = Premium/luxury/exclusive
   - signalTone: 0 = Serious/corporate, 100 = Playful/casual (inverse of feelPlayfulSerious)
   - signalDensity: 0 = Minimal/sparse, 100 = Rich/dense (inverse of feelBoldMinimal)
   - signalWarmth: 0 = Cold/technical/distant, 100 = Warm/human/inviting
   - signalEnergy: 0 = Calm/quiet/subdued, 100 = Energetic/dynamic/vibrant

15. **Target Audiences** (CRITICAL: Infer 1-3 audience segments based on website content):
   Analyze the website to determine WHO this company sells to. Look for signals:
   - Pricing page: enterprise pricing = enterprise audience, affordable = SMB/consumer
   - Case studies/testimonials: what titles/companies are featured?
   - Language: technical jargon = developers/engineers, business speak = executives
   - Products/services described: who would need these?
   - Imagery: professionals, consumers, specific demographics?

   For each audience, provide:
   - name: Short descriptive name (e.g., "Enterprise HR Leaders", "Small Business Owners", "Tech Founders")
   - isPrimary: boolean (mark only ONE as primary - the main target customer)
   - demographics: age range, income level if apparent from pricing/positioning
   - firmographics (for B2B): company sizes, industries, job titles, departments, decision-making role
   - psychographics: 2-3 pain points, 2-3 goals, key values
   - behavioral: content preferences, platforms they use, buying process (impulse/considered/committee)
   - confidence: 0-100 how confident you are in this inference

   B2B signals: mentions of "teams", "enterprise", job titles, integrations, ROI language
   B2C signals: lifestyle imagery, personal benefits, emotional language, individual pricing

16. **Brand Voice Summary**: Write 1-2 sentences as a brand strategist describing this brand's voice and visual identity. Be specific and opinionated — reference what you actually see (colors, typography, imagery style, copy tone). Example: "Your brand projects quiet confidence through clean typography and muted earth tones. The voice is composed and professional — approachable without ever being casual." Do NOT be generic.

17. **Competitors** (1-5 competitors inferred from the website content):
   Look for comparison pages, "vs" content, differentiator language, or named competitors.
   For each competitor provide:
   - name: Company name
   - website: URL if mentioned
   - positioning: How they position themselves relative to this brand
   - strengths: What they do well
   - weaknesses: Where this brand beats them

18. **Positioning**:
   - uvp: Unique Value Proposition — extract from hero section, main headline, or key benefit statements
   - missionStatement: From "About" page content or mission/vision sections
   - positioningStatement: How the brand positions itself in the market
   - differentiators: 2-5 key things that make this brand unique (from features, benefits, USP sections)
   - targetMarket: Who this brand primarily serves (derived from content, pricing, language)

19. **Brand Voice & Messaging**:
   - messagingPillars: 3-5 core messages repeated throughout the site (themes, key benefits)
   - toneDoList: 3-5 tone characteristics the brand USES (e.g., "Use direct, action-oriented language")
   - toneDontList: 3-5 tone characteristics the brand AVOIDS (e.g., "Avoid jargon and technical terms")
   - brandPromise: The core promise or commitment the brand makes
   - keyPhrases: 3-8 actual phrases or taglines used repeatedly on the site
   - avoidPhrases: 3-5 types of language/phrases that don't fit this brand

IMPORTANT: Do NOT default all personality values to 50 and DO NOT always pick generic options. Analyze the actual visual design:
- A tech startup with bold colors and playful copy should have visualStyle "playful-vibrant" or "tech-futuristic", brandTone "bold-confident" or "playful-witty"
- A law firm with serif fonts and dark colors should have visualStyle "corporate-professional" or "elegant-refined", brandTone "authoritative-expert"
- An investment firm with clean design should have visualStyle "minimal-clean" or "modern-sleek", brandTone "professional-trustworthy" or "sophisticated-refined"
- A luxury fashion brand should have visualStyle "elegant-refined", brandTone "premium-exclusive" or "sophisticated-refined"
- A kids' product brand should have visualStyle "playful-vibrant", brandTone "friendly-approachable" or "playful-witty"

Return ONLY a valid JSON object with this exact structure:
{
  "name": "string",
  "description": "string",
  "tagline": "string or null",
  "industry": "string or null",
  "industryArchetype": "hospitality | blue-collar | white-collar | e-commerce | tech",
  "logoUrl": "string or null",
  "faviconUrl": "string or null",
  "primaryColor": "#hex",
  "secondaryColor": "#hex or null",
  "accentColor": "#hex or null",
  "backgroundColor": "#hex",
  "textColor": "#hex",
  "brandColors": ["#hex", "#hex"],
  "primaryFont": "string or null",
  "secondaryFont": "string or null",
  "socialLinks": {
    "twitter": "url or undefined",
    "linkedin": "url or undefined",
    "facebook": "url or undefined",
    "instagram": "url or undefined",
    "youtube": "url or undefined"
  },
  "contactEmail": "string or null",
  "contactPhone": "string or null",
  "keywords": ["keyword1", "keyword2"],
  "visualStyle": "one of the visual style values above",
  "brandTone": "one of the brand tone values above",
  "feelPlayfulSerious": number,
  "feelBoldMinimal": number,
  "feelExperimentalClassic": number,
  "feelFriendlyProfessional": number,
  "feelPremiumAccessible": number,
  "signalTone": number,
  "signalDensity": number,
  "signalWarmth": number,
  "signalEnergy": number,
  "brandVoiceSummary": "string (1-2 sentences)",
  "audiences": [
    {
      "name": "string (e.g., 'Enterprise HR Directors')",
      "isPrimary": true,
      "demographics": {
        "ageRange": { "min": 30, "max": 55 },
        "income": "high | enterprise"
      },
      "firmographics": {
        "companySize": ["201-500", "500+"],
        "industries": ["Technology", "Finance"],
        "jobTitles": ["HR Director", "VP of People"],
        "departments": ["Human Resources"],
        "decisionMakingRole": "decision-maker"
      },
      "psychographics": {
        "painPoints": ["Scaling hiring", "Reducing time-to-hire"],
        "goals": ["Build great teams", "Improve retention"],
        "values": ["Efficiency", "Quality"]
      },
      "behavioral": {
        "contentPreferences": ["case studies", "ROI reports"],
        "platforms": ["LinkedIn", "Email"],
        "buyingProcess": "committee"
      },
      "confidence": 85
    }
  ],
  "competitors": [
    {
      "name": "string",
      "website": "url or undefined",
      "positioning": "string or undefined",
      "strengths": "string or undefined",
      "weaknesses": "string or undefined"
    }
  ],
  "positioning": {
    "uvp": "string or undefined",
    "missionStatement": "string or undefined",
    "positioningStatement": "string or undefined",
    "differentiators": ["string"],
    "targetMarket": "string or undefined"
  },
  "brandVoice": {
    "messagingPillars": ["string"],
    "toneDoList": ["string"],
    "toneDontList": ["string"],
    "brandPromise": "string or undefined",
    "keyPhrases": ["string"],
    "avoidPhrases": ["string"]
  }
}`

  // Try to include screenshot, but be prepared to retry without it if it fails
  let useScreenshot = !!screenshot
  let brandData: BrandExtraction | null = null
  let lastError: Error | null = null

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      contentParts.length = 0 // Clear array

      // Only add screenshot on first attempt
      if (useScreenshot && attempt === 0 && screenshot) {
        contentParts.push({
          type: 'image',
          source: {
            type: 'url',
            url: screenshot,
          },
        })
      }

      contentParts.push({
        type: 'text',
        text: textPrompt,
      })

      const response = await getAnthropic().messages.create(
        {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 3000,
          messages: [
            {
              role: 'user',
              content: contentParts,
            },
          ],
        },
        { timeout: 30_000 }
      )

      // Extract JSON from Claude's response
      const responseText = response.content
        .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('')

      // Parse the JSON response — sanitize common LLM output issues first
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      let jsonStr = jsonMatch[0]
      // Replace JS-style `undefined` values with `null`
      jsonStr = jsonStr.replace(/:\s*undefined\b/g, ': null')
      // Remove trailing commas before } or ]
      jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1')
      brandData = JSON.parse(jsonStr)
      break // Success, exit retry loop
    } catch (error) {
      lastError = error as Error
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: unknown }).message)
            : String(error)
      logger.error(
        { err: errorMessage, status: (error as { status?: number }).status, attempt: attempt + 1 },
        'Claude analysis attempt failed'
      )
      if (
        useScreenshot &&
        (errorMessage.includes('8000 pixels') ||
          errorMessage.includes('image') ||
          errorMessage.includes('dimension'))
      ) {
        logger.info('Image too large, retrying without screenshot')
        useScreenshot = false
        continue
      }

      // For other errors, still retry once without screenshot as a general fallback
      if (attempt === 0 && useScreenshot) {
        logger.info('Claude analysis failed, retrying without screenshot')
        useScreenshot = false
        continue
      }

      break
    }
  }

  // If Claude analysis failed entirely, use fallback data
  if (!brandData) {
    logger.error(
      { err: lastError instanceof Error ? lastError.message : String(lastError) },
      'All Claude analysis attempts failed, using fallback data'
    )
    brandData = createDefaultBrandData(metadata, branding, links, normalizedUrl)
  }

  // Sanitize non-Latin text from key fields (handles sites that serve localized content)
  const hasNonLatin = (text: string) => /[^\u0000-\u024F\u1E00-\u1EFF]/.test(text)
  const stripNonLatin = (text: string) => {
    // If text has parenthetical English translation like "中文 (English)", extract the English
    const parenMatch = text.match(/\(([^)]+)\)/)
    if (parenMatch && !hasNonLatin(parenMatch[1])) return parenMatch[1].trim()
    // Otherwise strip non-Latin chars and clean up
    const cleaned = text
      .replace(/[^\u0000-\u024F\u1E00-\u1EFF]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return cleaned || null
  }

  if (brandData.name && hasNonLatin(brandData.name)) {
    brandData.name =
      stripNonLatin(brandData.name) || extractNameFromDomain(normalizedUrl) || 'Unknown Company'
  }
  if (brandData.description && hasNonLatin(brandData.description)) {
    brandData.description = stripNonLatin(brandData.description) || ''
  }
  if (brandData.tagline && hasNonLatin(brandData.tagline)) {
    brandData.tagline = stripNonLatin(brandData.tagline)
  }

  // If Firecrawl had good branding colors (high confidence), prefer those over Claude's guesses
  // This gives us the best of both worlds: accurate colors from Firecrawl + audiences from Claude
  if (firecrawlBrandData && hasBrandingColors) {
    brandData.primaryColor = firecrawlBrandData.primaryColor
    brandData.secondaryColor = firecrawlBrandData.secondaryColor
    brandData.accentColor = firecrawlBrandData.accentColor
    brandData.backgroundColor = firecrawlBrandData.backgroundColor
    brandData.textColor = firecrawlBrandData.textColor
    if (firecrawlBrandData.brandColors.length > 0) {
      brandData.brandColors = firecrawlBrandData.brandColors
    }
    logger.info("Using high-confidence Firecrawl colors with Claude's audience analysis")
  } else {
    // Only enhance with Firecrawl branding data if Claude returned default values AND Firecrawl has some confidence
    // This prevents low-confidence Firecrawl colors from overriding Claude's analysis
    const firecrawlColorConfidence = branding?.confidence?.colors ?? 0
    if (branding?.colors && firecrawlColorConfidence >= 0.1) {
      // Only use Firecrawl colors as fallback when Claude returned defaults
      if (branding.colors.primary && brandData.primaryColor === '#6366f1') {
        brandData.primaryColor = branding.colors.primary
      }
      // Use Firecrawl accent as secondary since they don't have a 'secondary' key
      if (branding.colors.accent && !brandData.secondaryColor) {
        brandData.secondaryColor = branding.colors.accent
      }
      if (
        branding.colors.link &&
        !brandData.accentColor &&
        branding.colors.link !== brandData.secondaryColor
      ) {
        brandData.accentColor = branding.colors.link
      }
      if (branding.colors.background && brandData.backgroundColor === '#ffffff') {
        brandData.backgroundColor = branding.colors.background
      }
      if (branding.colors.textPrimary && brandData.textColor === '#1f2937') {
        brandData.textColor = branding.colors.textPrimary
      }
      if (brandData.brandColors.length === 0) {
        brandData.brandColors = Object.values(branding.colors).filter(
          (c): c is string => typeof c === 'string' && c.startsWith('#')
        )
      }
    }
  }

  if (branding?.typography?.fontFamilies?.primary && !brandData.primaryFont) {
    brandData.primaryFont = branding.typography.fontFamilies.primary
  } else if (branding?.fonts?.[0]?.family && !brandData.primaryFont) {
    brandData.primaryFont = branding.fonts[0].family
  }

  // Add favicon and logo from branding/metadata if not found
  if (!brandData.faviconUrl) {
    brandData.faviconUrl = branding?.images?.favicon || metadata?.favicon || null
  }
  if (!brandData.logoUrl) {
    brandData.logoUrl = branding?.images?.logo || metadata?.ogImage || null
  }

  // Merge social links - ensure empty object if none found
  const extractedSocial = extractSocialLinks(links)
  const claudeSocial = brandData.socialLinks || {}
  brandData.socialLinks = { ...extractedSocial, ...claudeSocial }

  // Remove any undefined/null/empty string values from social links
  if (brandData.socialLinks) {
    Object.keys(brandData.socialLinks).forEach((key) => {
      const value = brandData.socialLinks[key as keyof typeof brandData.socialLinks]
      if (!value || value.trim() === '') {
        delete brandData.socialLinks[key as keyof typeof brandData.socialLinks]
      }
    })
  }

  // Ensure feel values have defaults if Claude didn't return them
  // Use type assertion since brandData may be a parsed JSON that doesn't have all fields
  const brandDataWithFeels = brandData as BrandExtraction
  brandDataWithFeels.feelPlayfulSerious = brandData.feelPlayfulSerious ?? 50
  brandDataWithFeels.feelBoldMinimal = brandData.feelBoldMinimal ?? 50
  brandDataWithFeels.feelExperimentalClassic = brandData.feelExperimentalClassic ?? 50
  brandDataWithFeels.feelFriendlyProfessional = brandData.feelFriendlyProfessional ?? 50
  brandDataWithFeels.feelPremiumAccessible = brandData.feelPremiumAccessible ?? 50
  brandDataWithFeels.signalTone = brandData.signalTone ?? 50
  brandDataWithFeels.signalDensity = brandData.signalDensity ?? 50
  brandDataWithFeels.signalWarmth = brandData.signalWarmth ?? 50
  brandDataWithFeels.signalEnergy = brandData.signalEnergy ?? 50
  brandDataWithFeels.brandVoiceSummary = brandData.brandVoiceSummary || ''

  // Validate and set defaults for visualStyle, brandTone, and industryArchetype
  const isValidVisualStyle = VISUAL_STYLE_VALUES.includes(
    brandData.visualStyle as (typeof VISUAL_STYLE_VALUES)[number]
  )
  const isValidBrandTone = BRAND_TONE_VALUES.includes(
    brandData.brandTone as (typeof BRAND_TONE_VALUES)[number]
  )
  const isValidIndustryArchetype = INDUSTRY_ARCHETYPE_VALUES.includes(
    brandData.industryArchetype as (typeof INDUSTRY_ARCHETYPE_VALUES)[number]
  )

  brandDataWithFeels.visualStyle = isValidVisualStyle ? brandData.visualStyle : 'modern-sleek'
  brandDataWithFeels.brandTone = isValidBrandTone ? brandData.brandTone : 'professional-trustworthy'
  brandDataWithFeels.industryArchetype = isValidIndustryArchetype
    ? brandData.industryArchetype
    : null

  // Ensure audiences is an array and validate each audience
  const rawAudiences = brandData.audiences || []
  brandDataWithFeels.audiences = Array.isArray(rawAudiences)
    ? rawAudiences.map((audience: InferredAudience) => ({
        name: audience.name || 'Unknown Audience',
        isPrimary: !!audience.isPrimary,
        demographics: audience.demographics || {},
        firmographics: audience.firmographics || {},
        psychographics: audience.psychographics || {},
        behavioral: audience.behavioral || {},
        confidence:
          typeof audience.confidence === 'number'
            ? Math.min(100, Math.max(0, audience.confidence))
            : 50,
      }))
    : []

  // Ensure strategic brand fields have defaults
  brandDataWithFeels.competitors = Array.isArray(brandData.competitors) ? brandData.competitors : []
  brandDataWithFeels.positioning = brandData.positioning || {}
  brandDataWithFeels.brandVoice = brandData.brandVoice || {}

  // Ensure exactly one primary audience if audiences exist
  if (brandDataWithFeels.audiences.length > 0) {
    const hasPrimary = brandDataWithFeels.audiences.some((a) => a.isPrimary)
    if (!hasPrimary) {
      brandDataWithFeels.audiences[0].isPrimary = true
    }
  }

  return successResponse({
    ...brandDataWithFeels,
    website: normalizedUrl,
    screenshotUrl: screenshot || null,
  })
}
