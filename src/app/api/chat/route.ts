import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import {
  chat,
  parseTaskFromChat,
  getStyleReferencesByCategory,
  type ChatContext,
} from '@/lib/ai/chat'
import { withRateLimit } from '@/lib/rate-limit'
import { config } from '@/lib/config'
import {
  getBrandAwareStyles,
  getBrandAwareStylesOfAxis,
  type StyleContext,
} from '@/lib/ai/brand-style-scoring'
import {
  searchStylesByQuery,
  aiEnhancedStyleSearch,
  refineStyleSearch,
} from '@/lib/ai/semantic-style-search'
import {
  inferFromMessage,
  detectBrandMention,
  analyzeRequestCompleteness,
} from '@/lib/ai/inference-engine'
import {
  getVideoReferencesForChat,
  isVideoDeliverableType,
  type VideoReference,
  type VideoMatchContext,
} from '@/lib/ai/video-references'
import type { StyleAxis } from '@/lib/constants/reference-libraries'
import { normalizeDeliverableType } from '@/lib/constants/reference-libraries'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/require-auth'

// Industry detection from message content
const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  food_beverage: [
    'coffee',
    'cafe',
    'restaurant',
    'bakery',
    'food',
    'drinks',
    'menu',
    'recipe',
    'catering',
    'bar',
    'kitchen',
    'chef',
    'brew',
    'roast',
    'dining',
  ],
  fitness: [
    'gym',
    'fitness',
    'workout',
    'exercise',
    'yoga',
    'wellness',
    'training',
    'athletic',
    'sports',
    'running',
    'crossfit',
  ],
  technology: [
    'tech',
    'software',
    'app',
    'saas',
    'ai',
    'api',
    'platform',
    'startup',
    'developer',
    'engineering',
    'data',
    'cloud',
    'machine learning',
  ],
  finance: [
    'bank',
    'finance',
    'fintech',
    'investment',
    'insurance',
    'payment',
    'crypto',
    'trading',
    'accounting',
  ],
  fashion: [
    'fashion',
    'clothing',
    'apparel',
    'boutique',
    'style',
    'designer',
    'wear',
    'outfit',
    'accessories',
  ],
  beauty: ['beauty', 'skincare', 'cosmetics', 'spa', 'salon', 'makeup', 'skin', 'hair', 'nails'],
  real_estate: [
    'real estate',
    'property',
    'home',
    'apartment',
    'rental',
    'house',
    'realtor',
    'housing',
  ],
  education: [
    'education',
    'course',
    'learning',
    'school',
    'university',
    'teach',
    'tutor',
    'academy',
    'training',
  ],
  healthcare: [
    'health',
    'medical',
    'clinic',
    'doctor',
    'patient',
    'care',
    'hospital',
    'therapy',
    'dental',
  ],
  entertainment: [
    'entertainment',
    'music',
    'gaming',
    'movie',
    'film',
    'video',
    'streaming',
    'podcast',
  ],
  retail: ['retail', 'shop', 'store', 'ecommerce', 'shopping', 'product', 'merchandise'],
  luxury: ['luxury', 'premium', 'exclusive', 'high-end', 'upscale', 'boutique', 'designer'],
}

/**
 * Detect industry from conversation messages
 */
function detectIndustryFromMessage(messages: { role: string; content: string }[]): string | null {
  const recentText = messages
    .filter((m) => m.role === 'user')
    .slice(-3)
    .map((m) => m.content.toLowerCase())
    .join(' ')

  // Count keyword matches per industry
  const industryScores: Record<string, number> = {}

  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    let score = 0
    for (const keyword of keywords) {
      if (recentText.includes(keyword)) {
        score++
      }
    }
    if (score > 0) {
      industryScores[industry] = score
    }
  }

  // Return the industry with the highest score
  const sortedIndustries = Object.entries(industryScores).sort((a, b) => b[1] - a[1])
  return sortedIndustries.length > 0 ? sortedIndustries[0][0] : null
}

/**
 * Extract context from conversation messages for style filtering
 */
function extractStyleContext(messages: { role: string; content: string }[]): StyleContext {
  // Combine recent messages for context extraction
  const recentUserMessages = messages
    .filter((m) => m.role === 'user')
    .slice(-3) // Last 3 user messages
    .map((m) => m.content)
    .join(' ')

  const contextText = recentUserMessages.toLowerCase()

  // Extract topic keywords
  const topicKeywords: string[] = []
  const keywords: string[] = []

  // Industry-related keywords
  const industryKeywords = [
    'tech',
    'technology',
    'ai',
    'artificial intelligence',
    'machine learning',
    'ml',
    'fitness',
    'health',
    'wellness',
    'finance',
    'fintech',
    'crypto',
    'blockchain',
    'food',
    'restaurant',
    'retail',
    'ecommerce',
    'fashion',
    'beauty',
    'travel',
    'education',
    'gaming',
    'entertainment',
    'music',
    'sports',
    'automotive',
    'real estate',
    'healthcare',
    'saas',
    'startup',
    'b2b',
    'b2c',
    'luxury',
    'developer',
    'developers',
    'api',
    'software',
    'engineering',
    'data',
    'cloud',
  ]

  for (const keyword of industryKeywords) {
    if (contextText.includes(keyword)) {
      keywords.push(keyword)
    }
  }

  // Visual style keywords
  const styleKeywords = [
    'minimal',
    'minimalist',
    'bold',
    'vibrant',
    'colorful',
    'elegant',
    'premium',
    'playful',
    'fun',
    'professional',
    'corporate',
    'modern',
    'classic',
    'vintage',
    'retro',
    'clean',
    'simple',
    'complex',
    'detailed',
    'sleek',
    'fresh',
    'dynamic',
    'energetic',
    'calm',
    'serene',
    'sophisticated',
    'luxurious',
    'organic',
    'natural',
  ]

  for (const keyword of styleKeywords) {
    if (contextText.includes(keyword)) {
      keywords.push(keyword)
    }
  }

  // Extract topic from context (product/service mentions)
  const productPatterns = [
    /\b(app|application|platform|software|product|service|tool|solution)\b/gi,
    /\b(launch|launching|promote|promoting|announcing|announcement)\s+(?:a|an|the|my|our)\s+(\w+)/gi,
    /\bfor\s+(?:a|an|the|my|our)\s+(\w+(?:\s+\w+)?)\s+(?:app|product|service|platform|company|brand)/gi,
  ]

  for (const pattern of productPatterns) {
    const matches = contextText.match(pattern)
    if (matches) {
      topicKeywords.push(...matches.slice(0, 2).map((m) => m.trim()))
    }
  }

  // Detect platform preferences
  let platform: string | undefined
  if (contextText.includes('youtube')) platform = 'youtube'
  else if (contextText.includes('tiktok')) platform = 'tiktok'
  else if (contextText.includes('linkedin')) platform = 'linkedin'
  else if (contextText.includes('instagram')) platform = 'instagram'
  else if (contextText.includes('twitter') || contextText.includes('x.com')) platform = 'twitter'
  else if (contextText.includes('facebook')) platform = 'facebook'

  // Build topic string
  const topic = topicKeywords.length > 0 ? topicKeywords.join(' ') : undefined

  // Detect industry from messages
  const detectedIndustry = detectIndustryFromMessage(messages)

  return {
    topic,
    keywords: keywords.length > 0 ? keywords : undefined,
    platform,
    industry: detectedIndustry || undefined,
  }
}

async function handler(request: NextRequest) {
  try {
    const session = await requireAuth()

    const body = await request.json()
    const {
      messages,
      selectedStyles,
      excludeStyleAxes,
      styleOffset,
      deliverableStyleMarker: clientStyleMarker,
      moodboardHasStyles, // Client indicates if moodboard already has style items
      brief, // Brief data for confirmed fields
    } = body

    // Extract context from messages for content-aware style filtering
    const styleContext = extractStyleContext(messages || [])

    // Build chat context for smarter responses
    const chatContext: ChatContext = {}

    // Fetch user's company for brand detection
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      with: {
        company: true,
      },
    })
    const company = user?.company

    // Analyze first message for brand detection and request completeness
    const isFirstMessage = messages?.length === 1
    if (isFirstMessage && messages?.[0]?.role === 'user') {
      const firstMessage = messages[0].content

      // Detect brand mentions
      if (company?.name) {
        const brandDetection = detectBrandMention(
          firstMessage,
          company.name,
          company.keywords || []
        )
        if (brandDetection.detected) {
          chatContext.brandDetection = brandDetection
        }
      }

      // Analyze request completeness
      const inference = inferFromMessage({ message: firstMessage })
      chatContext.requestCompleteness = analyzeRequestCompleteness(inference)
    }

    // Extract confirmed fields from brief to prevent re-asking
    if (brief) {
      chatContext.confirmedFields = {
        platform: brief.platform?.source === 'confirmed' ? brief.platform.value : undefined,
        intent: brief.intent?.source === 'confirmed' ? brief.intent.value : undefined,
        topic: brief.topic?.source === 'confirmed' ? brief.topic.value : undefined,
        audience: brief.audience?.value?.name,
        contentType:
          brief.contentType?.source === 'confirmed' ? brief.contentType.value : undefined,
      }
    }

    // If client is requesting more/different styles directly, skip AI call
    if (
      clientStyleMarker &&
      (clientStyleMarker.type === 'more' || clientStyleMarker.type === 'different')
    ) {
      let deliverableStyles = undefined
      const { type, deliverableType, styleAxis } = clientStyleMarker
      // Normalize deliverable type in case AI generated an alias
      const normalizedType = normalizeDeliverableType(deliverableType)

      try {
        if (type === 'more' && styleAxis) {
          // Use brand-aware scoring for more styles
          deliverableStyles = await getBrandAwareStylesOfAxis(
            normalizedType,
            styleAxis as StyleAxis,
            session.user.id,
            styleOffset || 0
          )
        } else if (type === 'different') {
          // For different styles, get brand-aware styles excluding already shown axes
          deliverableStyles = await getBrandAwareStyles(normalizedType, session.user.id, {
            includeAllAxes: true,
            limit: 4,
            context: styleContext,
          })
          // Filter out excluded axes
          if (excludeStyleAxes?.length) {
            deliverableStyles = deliverableStyles.filter(
              (s) => !excludeStyleAxes.includes(s.styleAxis)
            )
          }
        }
      } catch (err) {
        logger.error({ err }, 'Error fetching deliverable styles')
      }

      return NextResponse.json({
        content: '',
        deliverableStyles,
        deliverableStyleMarker: clientStyleMarker,
        selectedStyles,
      })
    }

    // Get AI response with context
    const response = await chat(messages, session.user.id, chatContext)

    // Check if a task proposal was generated
    const taskProposal = parseTaskFromChat(response.content)

    // Get style reference images if categories were mentioned
    let styleReferences = undefined
    if (response.styleReferences && response.styleReferences.length > 0) {
      styleReferences = await getStyleReferencesByCategory(response.styleReferences)
    }

    // Get deliverable styles if marker was present from AI response
    // Now using brand-aware scoring for personalized recommendations
    let deliverableStyles = undefined
    let deliverableStyleMarker = response.deliverableStyleMarker

    // FALLBACK: If AI didn't include marker but mentions a deliverable type,
    // automatically detect and show styles to ensure user sees visual options
    if (!deliverableStyleMarker) {
      const contentLower = response.content.toLowerCase()
      const lastUserMessage = messages[messages.length - 1]?.content?.toLowerCase() || ''
      const combinedContext = `${lastUserMessage} ${contentLower}`

      // Detect deliverable type from context
      let detectedType: string | null = null
      if (
        combinedContext.includes('instagram') &&
        (combinedContext.includes('post') ||
          combinedContext.includes('carousel') ||
          combinedContext.includes('feed'))
      ) {
        detectedType = 'instagram_post'
      } else if (combinedContext.includes('instagram') && combinedContext.includes('story')) {
        detectedType = 'instagram_story'
      } else if (combinedContext.includes('instagram') && combinedContext.includes('reel')) {
        detectedType = 'instagram_reel'
      } else if (combinedContext.includes('linkedin') && combinedContext.includes('post')) {
        detectedType = 'linkedin_post'
      } else if (
        combinedContext.includes('launch video') ||
        combinedContext.includes('product video') ||
        combinedContext.includes('promo video') ||
        combinedContext.includes('promotional video') ||
        combinedContext.includes('marketing video') ||
        combinedContext.includes('brand video') ||
        combinedContext.includes('commercial') ||
        combinedContext.includes('cinematic video') ||
        combinedContext.includes('intro video') ||
        combinedContext.includes('introduction video') ||
        combinedContext.includes('explainer video') ||
        combinedContext.includes('teaser video') ||
        combinedContext.includes('announcement video') ||
        combinedContext.includes('brand film') ||
        combinedContext.includes('company video') ||
        combinedContext.includes('startup video') ||
        combinedContext.includes('saas video') ||
        combinedContext.includes('walkthrough video') ||
        combinedContext.includes('app walkthrough') ||
        combinedContext.includes('demo video') ||
        combinedContext.includes('tutorial video') ||
        combinedContext.includes('onboarding video') ||
        combinedContext.includes('showcase video') ||
        combinedContext.includes('overview video') ||
        combinedContext.includes('guided tour') ||
        // Generic video requests with product/brand context
        (combinedContext.includes('video') &&
          (combinedContext.includes('product') ||
            combinedContext.includes('introduces') ||
            combinedContext.includes('launch') ||
            combinedContext.includes('brand') ||
            combinedContext.includes('company') ||
            combinedContext.includes('startup') ||
            combinedContext.includes('saas') ||
            combinedContext.includes('cinematic') ||
            combinedContext.includes('professional') ||
            combinedContext.includes('polished') ||
            combinedContext.includes('walkthrough') ||
            combinedContext.includes('demo') ||
            combinedContext.includes('tutorial') ||
            combinedContext.includes('onboarding') ||
            combinedContext.includes('showcase') ||
            combinedContext.includes('app') ||
            combinedContext.includes('software') ||
            combinedContext.includes('platform') ||
            combinedContext.includes('guided') ||
            combinedContext.includes('tour') ||
            combinedContext.includes('overview')))
      ) {
        detectedType = 'launch_video'
      } else if (
        combinedContext.includes('video ad') ||
        combinedContext.includes('video advertisement')
      ) {
        detectedType = 'video_ad'
      } else if (
        combinedContext.includes('ad') ||
        combinedContext.includes('banner') ||
        combinedContext.includes('promotion')
      ) {
        detectedType = 'static_ad'
      }

      if (detectedType) {
        deliverableStyleMarker = {
          type: 'initial',
          deliverableType: detectedType,
        }
        logger.debug({ detectedType }, 'Auto-detected deliverable type')
      }
    }

    if (deliverableStyleMarker) {
      const { type, deliverableType, styleAxis } = deliverableStyleMarker
      // Normalize deliverable type in case AI generated an alias
      const normalizedType = normalizeDeliverableType(deliverableType)

      // Check if this is a video deliverable type - if so, skip image styles
      // as we'll show video references instead
      const isVideoType = isVideoDeliverableType(normalizedType)

      try {
        switch (type) {
          case 'initial':
            // SKIP showing styles if moodboard already has style items
            // This prevents the style grid from appearing 5+ times in a conversation
            if (moodboardHasStyles) {
              logger.debug('Skipping style grid - moodboard already has styles')
              deliverableStyleMarker = undefined // Clear the marker so no grid is shown
              break
            }
            // SKIP image styles for video types - video references will be shown instead
            if (isVideoType) {
              logger.debug('Skipping image styles for video type - will show video references')
              break
            }
            // Use brand-aware styles with one per axis, sorted by brand match
            deliverableStyles = await getBrandAwareStyles(normalizedType, session.user.id, {
              includeAllAxes: true,
              context: styleContext,
            })
            break
          case 'more':
            // Skip image styles for video types
            if (isVideoType) break
            deliverableStyles = await getBrandAwareStylesOfAxis(
              normalizedType,
              styleAxis as StyleAxis,
              session.user.id,
              styleOffset || 0
            )
            break
          case 'different':
            // Skip image styles for video types
            if (isVideoType) break
            deliverableStyles = await getBrandAwareStyles(normalizedType, session.user.id, {
              includeAllAxes: true,
              limit: 4,
              context: styleContext,
            })
            // Filter out excluded axes
            if (excludeStyleAxes?.length) {
              deliverableStyles = deliverableStyles.filter(
                (s) => !excludeStyleAxes.includes(s.styleAxis)
              )
            }
            break
          case 'semantic':
            // Skip image styles for video types
            if (isVideoType) break
            // Use semantic search based on the query
            const { searchQuery } = deliverableStyleMarker
            if (searchQuery) {
              // First try keyword-based semantic search
              const semanticResults = await searchStylesByQuery(searchQuery, normalizedType, 8)

              // If we get good results, use them; otherwise fall back to AI-enhanced search
              if (semanticResults.length >= 3 && semanticResults[0].semanticScore >= 40) {
                deliverableStyles = semanticResults.map((s) => ({
                  ...s,
                  brandMatchScore: s.semanticScore,
                  matchReason:
                    s.matchedKeywords.length > 0
                      ? `Matches: ${s.matchedKeywords.slice(0, 3).join(', ')}`
                      : 'Semantic match',
                }))
              } else {
                // Use AI-enhanced search for complex queries
                const aiResults = await aiEnhancedStyleSearch(searchQuery, normalizedType, 6)
                deliverableStyles = aiResults.map((s) => ({
                  ...s,
                  brandMatchScore: s.semanticScore,
                  matchReason: 'AI-matched to your description',
                }))
              }
            }
            break
          case 'refine':
            // Skip image styles for video types
            if (isVideoType) break
            // Use style refinement based on base style and user feedback
            const { baseStyleId, refinementQuery } = deliverableStyleMarker
            if (baseStyleId && refinementQuery) {
              // First, get the base style's details (can be ID or name)
              const { db } = await import('@/db')
              const { deliverableStyleReferences } = await import('@/db/schema')
              const { eq, ilike } = await import('drizzle-orm')

              // Try to find by ID first, then by name
              let baseStyles = await db
                .select()
                .from(deliverableStyleReferences)
                .where(eq(deliverableStyleReferences.id, baseStyleId))
                .limit(1)

              // If not found by ID, try by name (case-insensitive)
              if (baseStyles.length === 0) {
                baseStyles = await db
                  .select()
                  .from(deliverableStyleReferences)
                  .where(ilike(deliverableStyleReferences.name, `%${baseStyleId}%`))
                  .limit(1)
              }

              if (baseStyles.length > 0) {
                const baseStyle = baseStyles[0]
                const refinedResults = await refineStyleSearch(
                  {
                    id: baseStyle.id,
                    name: baseStyle.name,
                    styleAxis: baseStyle.styleAxis,
                    semanticTags: baseStyle.semanticTags || [],
                    description: baseStyle.description,
                  },
                  refinementQuery,
                  normalizedType,
                  6
                )

                deliverableStyles = refinedResults.map((s) => ({
                  ...s,
                  brandMatchScore: s.semanticScore,
                  matchReason: `Refined: ${
                    s.matchedKeywords.slice(0, 2).join(', ') || 'based on your feedback'
                  }`,
                }))
              } else {
                // Base style not found, fall back to semantic search
                const fallbackResults = await searchStylesByQuery(
                  refinementQuery,
                  normalizedType,
                  6
                )
                deliverableStyles = fallbackResults.map((s) => ({
                  ...s,
                  brandMatchScore: s.semanticScore,
                  matchReason: 'Matched to your refinement',
                }))
              }
            }
            break
        }
      } catch (err) {
        logger.error({ err }, 'Error fetching deliverable styles')
      }

      // If no styles were found, clear the marker so UI doesn't show empty style grid
      if (!deliverableStyles || deliverableStyles.length === 0) {
        logger.debug(
          { deliverableType: deliverableStyleMarker?.deliverableType },
          'No styles found for deliverable type - clearing marker'
        )
        deliverableStyleMarker = undefined
        deliverableStyles = undefined
      }
    }

    // Get video references for video deliverable types
    let videoReferences: VideoReference[] | undefined = undefined

    // Check for video-related content in the conversation
    const lastUserMessage = messages[messages.length - 1]?.content || ''
    const lastUserMessageLower = lastUserMessage.toLowerCase()
    const responseContentLower = response.content.toLowerCase()
    const combinedVideoContext = `${lastUserMessageLower} ${responseContentLower}`

    // Direct video detection - more aggressive approach
    const isVideoRequest =
      combinedVideoContext.includes('video') ||
      combinedVideoContext.includes('cinematic') ||
      combinedVideoContext.includes('motion') ||
      combinedVideoContext.includes('animation') ||
      combinedVideoContext.includes('commercial') ||
      combinedVideoContext.includes('reel')

    logger.debug({ isVideoRequest, deliverableStyleMarker }, 'Video detection check')

    // Skip video references if user has already selected a style (moodboardHasStyles)
    // This prevents showing the same video grid repeatedly after selection
    if (
      !moodboardHasStyles &&
      (isVideoRequest ||
        (deliverableStyleMarker &&
          isVideoDeliverableType(normalizeDeliverableType(deliverableStyleMarker.deliverableType))))
    ) {
      // For video requests, ALWAYS clear image styles - we only want to show video references
      // Do this BEFORE fetching video references so even if fetch fails, we don't show images
      deliverableStyles = undefined
      logger.debug('Video request detected - cleared image styles')

      try {
        const deliverableType = deliverableStyleMarker?.deliverableType
          ? normalizeDeliverableType(deliverableStyleMarker.deliverableType)
          : 'launch_video'

        // Build rich context for smart video matching
        const videoMatchContext: VideoMatchContext = {
          intent: chatContext.confirmedFields?.intent || brief?.intent?.value,
          platform: chatContext.confirmedFields?.platform || brief?.platform?.value,
          topic: chatContext.confirmedFields?.topic || brief?.topic?.value,
          audience: chatContext.confirmedFields?.audience || brief?.audience?.value?.name,
          aiResponse: response.content, // AI's response describes the video direction
        }

        videoReferences = await getVideoReferencesForChat(
          deliverableType,
          lastUserMessage,
          3, // Show only 3 videos for cleaner UX
          videoMatchContext
        )
        logger.debug(
          { count: videoReferences.length, deliverableType, context: videoMatchContext },
          'Fetched video references with smart matching'
        )
      } catch (err) {
        logger.error({ err }, 'Error fetching video references')
        // Even if video fetch fails, don't fall back to image styles for video requests
      }
    } else if (moodboardHasStyles && isVideoRequest) {
      // Still clear image styles for video requests even when skipping video references
      deliverableStyles = undefined
      logger.debug('Video request with moodboard styles - skipping video grid')
    }

    // Auto-generate quick options from deliverable styles if AI didn't provide any
    let quickOptions = response.quickOptions
    if (!quickOptions && deliverableStyles && deliverableStyles.length > 0) {
      // Generate options from the style names
      const styleOptions = deliverableStyles.slice(0, 4).map((style) => style.name)
      quickOptions = {
        question: 'Which style do you prefer?',
        options: [...styleOptions, 'Show me more options'],
      }
    }

    return NextResponse.json({
      content: response.content.replace(/\[TASK_READY\][\s\S]*?\[\/TASK_READY\]/, '').trim(),
      taskProposal,
      styleReferences,
      deliverableStyles,
      deliverableStyleMarker,
      selectedStyles,
      quickOptions,
      videoReferences, // Video style references for launch videos, video ads, etc.
    })
  } catch (error) {
    logger.error({ error }, 'Chat error')
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 })
  }
}

// Apply chat rate limiting (30 req/min)
export const POST = withRateLimit(handler, 'chat', config.rateLimits.chat)
