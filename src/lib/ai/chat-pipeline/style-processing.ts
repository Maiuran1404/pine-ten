/**
 * Style processing for the chat pipeline.
 * Handles: style shortcut early-return, deliverable style fetching, video references.
 */
import 'server-only'

import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getBrandAwareStyles, getBrandAwareStylesOfAxis } from '@/lib/ai/brand-style-scoring'
import {
  searchStylesByQuery,
  aiEnhancedStyleSearch,
  refineStyleSearch,
} from '@/lib/ai/semantic-style-search'
import { searchStyleImages, type SearchedDeliverableStyle } from '@/lib/ai/style-image-search'
import { autoDetectStyleMarker } from '@/lib/ai/style-filter'
import type { StyleAxis } from '@/lib/constants/reference-libraries'
import { normalizeDeliverableType } from '@/lib/constants/reference-libraries'
import {
  getVideoReferencesForChat,
  isVideoDeliverableType,
  type VideoReference,
  type VideoMatchContext,
} from '@/lib/ai/video-references'
import { extractStyleContext } from '@/lib/ai/chat-context'
import { db } from '@/db'
import { deliverableStyleReferences } from '@/db/schema'
import { eq, ilike, and, asc, isNotNull } from 'drizzle-orm'
import type { SerializedBriefingState } from '@/lib/ai/briefing-state-machine'
import type { StyleContext } from '@/lib/ai/brand-style-scoring'
import type { ChatRequestBody } from './types'

/** Handle style shortcut early-return (client requesting more/different styles directly) */
export async function handleStyleShortcut(
  body: ChatRequestBody,
  userId: string
): Promise<NextResponse | null> {
  const {
    messages,
    selectedStyles,
    styleOffset,
    excludeStyleAxes,
    deliverableStyleMarker: clientStyleMarker,
  } = body

  if (
    !clientStyleMarker ||
    (clientStyleMarker.type !== 'more' &&
      clientStyleMarker.type !== 'different' &&
      clientStyleMarker.type !== 'initial')
  ) {
    return null
  }

  const styleContext = extractStyleContext(messages || [])
  let deliverableStyles: SearchedDeliverableStyle[] | undefined = undefined
  let videoRefsResult: VideoReference[] | undefined = undefined
  const { type, deliverableType, styleAxis } = clientStyleMarker
  const normalizedType = normalizeDeliverableType(deliverableType)
  const isVideoType = isVideoDeliverableType(normalizedType)

  try {
    if (type === 'initial' && isVideoType) {
      // For video initial, load curated presets from DB first
      deliverableStyles = await getVideoStylePresets(normalizedType)
      if (!deliverableStyles?.length) {
        // Fallback to brand-aware styles
        deliverableStyles = await getBrandAwareStyles(normalizedType, userId, {
          includeAllAxes: true,
          context: styleContext,
        })
      }
    } else if (type === 'initial') {
      // For non-video initial, search for styles
      deliverableStyles = await searchStyleImages(
        { searchTerms: clientStyleMarker.searchTerms, deliverableType: normalizedType },
        { count: 6, styleContext }
      )
      if (!deliverableStyles || deliverableStyles.length === 0) {
        deliverableStyles = await getBrandAwareStyles(normalizedType, userId, {
          includeAllAxes: true,
          context: styleContext,
        })
      }
    } else if (isVideoType) {
      const lastUserMessage = messages[messages.length - 1]?.content || ''
      const videoOffset = styleOffset || 0
      const fetchLimit = videoOffset + 3
      const allVideoRefs = await getVideoReferencesForChat(
        normalizedType,
        lastUserMessage,
        fetchLimit
      )
      videoRefsResult = allVideoRefs.slice(videoOffset)
      if (videoRefsResult.length === 0 && allVideoRefs.length > 0) {
        videoRefsResult = allVideoRefs.slice(0, 3)
      }
    } else if (type === 'more') {
      const searchTerms = clientStyleMarker.searchTerms
      deliverableStyles = await searchStyleImages(
        { searchTerms, deliverableType: normalizedType, styleAxis },
        { count: 6, offset: styleOffset || 0, styleContext }
      )
      if ((!deliverableStyles || deliverableStyles.length === 0) && styleAxis) {
        deliverableStyles = await getBrandAwareStylesOfAxis(
          normalizedType,
          styleAxis as StyleAxis,
          userId,
          styleOffset || 0
        )
      }
    } else if (type === 'different') {
      deliverableStyles = await searchStyleImages(
        { searchTerms: clientStyleMarker.searchTerms, deliverableType: normalizedType },
        { count: 6, styleContext, excludeTerms: excludeStyleAxes }
      )
      if (!deliverableStyles || deliverableStyles.length === 0) {
        deliverableStyles = await getBrandAwareStyles(normalizedType, userId, {
          includeAllAxes: true,
          limit: 4,
          context: styleContext,
        })
        if (excludeStyleAxes?.length) {
          deliverableStyles = deliverableStyles.filter(
            (s) => !excludeStyleAxes.includes(s.styleAxis)
          )
        }
      }
    }
  } catch (err) {
    logger.error({ err }, 'Error fetching deliverable styles')
  }

  return NextResponse.json({
    content: '',
    deliverableStyles,
    videoReferences: videoRefsResult,
    deliverableStyleMarker: clientStyleMarker,
    selectedStyles,
  })
}

interface StyleProcessingInput {
  responseContent: string
  aiStyleMarker?: {
    type: string
    deliverableType: string
    styleAxis?: string
    searchTerms?: string[]
    searchQuery?: string
    baseStyleId?: string
    refinementQuery?: string
  }
  isStyleEligible: boolean
  moodboardHasStyles: boolean
  currentStage?: string
  updatedBriefingState?: SerializedBriefingState
  styleContext: StyleContext
  styleOffset?: number
  excludeStyleAxes?: string[]
  userId: string
  lastUserMessage: string
  confirmedFields?: {
    intent?: string
    platform?: string
    topic?: string
    audience?: string
  }
  brief?: ChatRequestBody['brief']
}

export interface StyleProcessingResult {
  deliverableStyles: SearchedDeliverableStyle[] | undefined
  deliverableStyleMarker:
    | {
        type: string
        deliverableType: string
        styleAxis?: string
        searchTerms?: string[]
        searchQuery?: string
        baseStyleId?: string
        refinementQuery?: string
      }
    | undefined
  videoReferences: VideoReference[] | undefined
}

/** Process deliverable styles and video references after AI response */
export async function processStylesAndVideo(
  input: StyleProcessingInput
): Promise<StyleProcessingResult> {
  const {
    responseContent,
    isStyleEligible,
    moodboardHasStyles,
    currentStage,
    updatedBriefingState,
    styleContext,
    styleOffset,
    excludeStyleAxes,
    userId,
    lastUserMessage,
    confirmedFields,
    brief,
  } = input

  let deliverableStyles: SearchedDeliverableStyle[] | undefined = undefined
  let deliverableStyleMarker = input.aiStyleMarker

  // FALLBACK: Auto-detect marker if AI didn't include one
  // Only at style-eligible stages; suppress when AI is asking a question
  // Exception: at INSPIRATION stage, allow auto-detect even when AI ends with `?`
  const isInspirationStage = currentStage === 'INSPIRATION'
  const aiResponseEndsWithQuestion =
    currentStage &&
    responseContent
      .replace(/\[QUICK_OPTIONS\][\s\S]*?\[\/QUICK_OPTIONS\]/g, '')
      .trim()
      .endsWith('?')

  if (
    !deliverableStyleMarker &&
    isStyleEligible &&
    (!aiResponseEndsWithQuestion || isInspirationStage)
  ) {
    deliverableStyleMarker = autoDetectStyleMarker(responseContent, lastUserMessage)
  }

  // Last-resort: at INSPIRATION, create marker from briefing state deliverable category
  if (!deliverableStyleMarker && isInspirationStage && isStyleEligible && updatedBriefingState) {
    const category = updatedBriefingState.deliverableCategory
    if (category === 'video') {
      deliverableStyleMarker = {
        type: 'initial',
        deliverableType: 'launch_video',
      }
      logger.debug('Created fallback style marker from briefing state (video)')
    }
  }

  // Suppress marker at non-eligible stages
  if (!isStyleEligible) {
    deliverableStyleMarker = undefined
  }

  if (deliverableStyleMarker) {
    const { type, deliverableType, styleAxis } = deliverableStyleMarker
    const normalizedType = normalizeDeliverableType(deliverableType)
    const isVideoType = isVideoDeliverableType(normalizedType)

    try {
      switch (type) {
        case 'initial':
          // SKIP showing styles if moodboard already has style items
          if (moodboardHasStyles) {
            logger.debug('Skipping style grid - moodboard already has styles')
            deliverableStyleMarker = undefined
            break
          }
          // For video types at INSPIRATION, load curated presets from DB
          if (isVideoType) {
            if (isInspirationStage) {
              deliverableStyles = await getVideoStylePresets(normalizedType)
              logger.debug(
                { count: deliverableStyles?.length, deliverableType: normalizedType },
                'Loaded curated video style presets from DB'
              )
            } else {
              // Non-INSPIRATION: use existing web search logic
              deliverableStyles = await searchStyleImages(
                {
                  searchTerms: deliverableStyleMarker.searchTerms,
                  deliverableType: normalizedType,
                },
                { count: 6, styleContext }
              )
            }
            if (!deliverableStyles?.length) {
              // Fallback to brand-aware styles if no presets found
              deliverableStyles = await getBrandAwareStyles(normalizedType, userId, {
                includeAllAxes: true,
                context: styleContext,
              })
            }
            if (!deliverableStyles?.length) {
              deliverableStyleMarker = undefined
            }
            break
          }
          {
            // Enrich search terms with accumulated style context from briefing state
            let enrichedSearchTerms = deliverableStyleMarker.searchTerms
            if (updatedBriefingState) {
              const contextTerms: string[] = []
              if (updatedBriefingState.styleKeywords?.length) {
                contextTerms.push(...updatedBriefingState.styleKeywords.slice(0, 3))
              }
              if (updatedBriefingState.inspirationRefs?.length) {
                contextTerms.push(...updatedBriefingState.inspirationRefs.slice(0, 2))
              }
              if (contextTerms.length > 0 && enrichedSearchTerms) {
                enrichedSearchTerms = [...enrichedSearchTerms, ...contextTerms]
              }
            }

            // Dynamic web image search using AI-provided search terms or context
            deliverableStyles = await searchStyleImages(
              { searchTerms: enrichedSearchTerms, deliverableType: normalizedType },
              { count: 6, styleContext }
            )
            // Fallback to DB styles if dynamic search returns nothing
            if (!deliverableStyles || deliverableStyles.length === 0) {
              deliverableStyles = await getBrandAwareStyles(normalizedType, userId, {
                includeAllAxes: true,
                context: styleContext,
              })
            }
          }
          break
        case 'more':
          // Skip image styles for video types
          if (isVideoType) break
          // Dynamic search for more of the same style
          deliverableStyles = await searchStyleImages(
            {
              searchTerms: deliverableStyleMarker.searchTerms,
              deliverableType: normalizedType,
              styleAxis,
            },
            { count: 6, offset: styleOffset || 0, styleContext }
          )
          // Fallback to DB
          if ((!deliverableStyles || deliverableStyles.length === 0) && styleAxis) {
            deliverableStyles = await getBrandAwareStylesOfAxis(
              normalizedType,
              styleAxis as StyleAxis,
              userId,
              styleOffset || 0
            )
          }
          break
        case 'different':
          // Skip image styles for video types
          if (isVideoType) break
          // Dynamic search with different style terms
          deliverableStyles = await searchStyleImages(
            {
              searchTerms: deliverableStyleMarker.searchTerms,
              deliverableType: normalizedType,
            },
            { count: 6, styleContext, excludeTerms: excludeStyleAxes }
          )
          // Fallback to DB
          if (!deliverableStyles || deliverableStyles.length === 0) {
            deliverableStyles = await getBrandAwareStyles(normalizedType, userId, {
              includeAllAxes: true,
              limit: 4,
              context: styleContext,
            })
            if (excludeStyleAxes?.length) {
              deliverableStyles = deliverableStyles.filter(
                (s) => !excludeStyleAxes.includes(s.styleAxis)
              )
            }
          }
          break
        case 'semantic': {
          // Skip image styles for video types
          if (isVideoType) break
          const { searchQuery } = deliverableStyleMarker
          if (searchQuery) {
            // First try keyword-based semantic search
            const semanticResults = await searchStylesByQuery(searchQuery, normalizedType, 8)

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
        }
        case 'refine': {
          // Skip image styles for video types
          if (isVideoType) break
          const { baseStyleId, refinementQuery } = deliverableStyleMarker
          if (baseStyleId && refinementQuery) {
            // Try to find by ID first, then by name
            let baseStyles = await db
              .select()
              .from(deliverableStyleReferences)
              .where(eq(deliverableStyleReferences.id, baseStyleId))
              .limit(1)

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
              const fallbackResults = await searchStylesByQuery(refinementQuery, normalizedType, 6)
              deliverableStyles = fallbackResults.map((s) => ({
                ...s,
                brandMatchScore: s.semanticScore,
                matchReason: 'Matched to your refinement',
              }))
            }
          }
          break
        }
      }
    } catch (err) {
      logger.error({ err }, 'Error fetching deliverable styles')
    }

    // Clear empty styles (preserve marker for video types for downstream video ref logic)
    if (!deliverableStyles || deliverableStyles.length === 0) {
      const markerIsVideoType =
        deliverableStyleMarker &&
        isVideoDeliverableType(normalizeDeliverableType(deliverableStyleMarker.deliverableType))
      if (!markerIsVideoType) {
        logger.debug(
          { deliverableType: deliverableStyleMarker?.deliverableType },
          'No styles found for deliverable type - clearing marker'
        )
        deliverableStyleMarker = undefined
      }
      deliverableStyles = undefined
    }
  }

  // ── Video references ──
  let videoReferences: VideoReference[] | undefined = undefined

  const lastUserMessageLower = lastUserMessage.toLowerCase()
  const responseContentLower = responseContent.toLowerCase()
  const combinedVideoContext = `${lastUserMessageLower} ${responseContentLower}`

  const isVideoRequest =
    combinedVideoContext.includes('video') ||
    combinedVideoContext.includes('cinematic') ||
    combinedVideoContext.includes('motion') ||
    combinedVideoContext.includes('animation') ||
    combinedVideoContext.includes('commercial') ||
    combinedVideoContext.includes('reel')

  const hasVideoMarker =
    deliverableStyleMarker &&
    isVideoDeliverableType(normalizeDeliverableType(deliverableStyleMarker.deliverableType))

  logger.debug({ isVideoRequest, hasVideoMarker, deliverableStyleMarker }, 'Video detection check')

  // Only fetch video refs when there's a video-type marker AND stage is eligible
  // At INSPIRATION, preserve deliverableStyles (curated presets) — don't clear them
  if (isStyleEligible && !moodboardHasStyles && hasVideoMarker) {
    if (!isInspirationStage || !deliverableStyles?.length) {
      deliverableStyles = undefined
    }
    logger.debug(
      { preservedStyles: isInspirationStage && !!deliverableStyles?.length },
      'Video marker detected - processing video refs'
    )

    try {
      const deliverableType = deliverableStyleMarker?.deliverableType
        ? normalizeDeliverableType(deliverableStyleMarker.deliverableType)
        : 'launch_video'

      const videoMatchContext: VideoMatchContext = {
        intent: confirmedFields?.intent || brief?.intent?.value,
        platform: confirmedFields?.platform || brief?.platform?.value,
        topic: confirmedFields?.topic || brief?.topic?.value,
        audience: confirmedFields?.audience || brief?.audience?.value?.name,
        aiResponse: responseContent,
      }

      videoReferences = await getVideoReferencesForChat(
        deliverableType,
        lastUserMessage,
        3,
        videoMatchContext
      )
      logger.debug(
        { count: videoReferences.length, deliverableType, context: videoMatchContext },
        'Fetched video references with smart matching'
      )
    } catch (err) {
      logger.error({ err }, 'Error fetching video references')
    }
  } else if (isStyleEligible && moodboardHasStyles && hasVideoMarker) {
    deliverableStyles = undefined
    logger.debug('Video request with moodboard styles - skipping video grid')
  }

  return { deliverableStyles, deliverableStyleMarker, videoReferences }
}

// ── Helper: Load curated video style presets from DB ──

async function getVideoStylePresets(
  deliverableType: string
): Promise<SearchedDeliverableStyle[] | undefined> {
  try {
    // Only return curated presets (those with a promptGuide) for reliable visual direction
    const presets = await db
      .select()
      .from(deliverableStyleReferences)
      .where(
        and(
          eq(deliverableStyleReferences.deliverableType, deliverableType),
          eq(deliverableStyleReferences.isActive, true),
          isNotNull(deliverableStyleReferences.promptGuide)
        )
      )
      .orderBy(asc(deliverableStyleReferences.displayOrder))

    if (presets.length === 0) return undefined

    return presets.map((preset) => ({
      id: preset.id,
      name: preset.name,
      description: preset.description,
      imageUrl: preset.imageUrl,
      deliverableType: preset.deliverableType,
      styleAxis: preset.styleAxis,
      subStyle: preset.subStyle,
      semanticTags: preset.semanticTags || [],
      promptGuide: preset.promptGuide ?? undefined,
      attribution: {
        source: 'db' as const,
        domain: 'crafted',
        sourceUrl: '',
      },
    }))
  } catch (err) {
    logger.error({ err }, 'Error loading video style presets from DB')
    return undefined
  }
}
