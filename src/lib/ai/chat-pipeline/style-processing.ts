/**
 * Style processing for the chat pipeline.
 * Handles: style shortcut early-return, deliverable style fetching, video references.
 */
import 'server-only'

import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import {
  getBrandAwareStyles,
  getBrandAwareStylesOfAxis,
  calculateContextScore,
} from '@/lib/ai/brand-style-scoring'
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
  type VideoReference,
  type VideoMatchContext,
} from '@/lib/ai/video-references'
import { extractStyleContext } from '@/lib/ai/chat-context'
import { resolveStyleDisplayImage } from '@/lib/ai/deliverable-styles'
import { db } from '@/db'
import { deliverableStyleReferences } from '@/db/schema'
import { eq, ilike, and, asc } from 'drizzle-orm'
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
  const { type, deliverableType, styleAxis } = clientStyleMarker
  const normalizedType = normalizeDeliverableType(deliverableType)

  try {
    if (type === 'initial') {
      // For ALL initial requests, try curated DB presets first (visual styles only)
      deliverableStyles = await getStylePresets(normalizedType, styleContext)
      if (!deliverableStyles?.length) {
        // No curated presets — fall through to web search + brand-aware fallback
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
    videoReferences: undefined,
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

  // Suppress marker at non-eligible stages
  if (!isStyleEligible) {
    deliverableStyleMarker = undefined
  }

  if (deliverableStyleMarker) {
    const { type, deliverableType, styleAxis } = deliverableStyleMarker
    const normalizedType = normalizeDeliverableType(deliverableType)

    try {
      switch (type) {
        case 'initial':
          // SKIP showing styles if moodboard already has style items
          if (moodboardHasStyles) {
            logger.debug('Skipping style grid - moodboard already has styles')
            deliverableStyleMarker = undefined
            break
          }
          // For ALL types at INSPIRATION, try curated DB presets first
          if (isInspirationStage) {
            deliverableStyles = await getStylePresets(normalizedType, styleContext)
            logger.debug(
              { count: deliverableStyles?.length, deliverableType: normalizedType },
              'Loaded curated style presets from DB'
            )
          }
          // If no curated presets, fall through to enriched web search
          if (!deliverableStyles?.length) {
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
            deliverableStyles = await searchStyleImages(
              { searchTerms: enrichedSearchTerms, deliverableType: normalizedType },
              { count: 6, styleContext }
            )
            if (!deliverableStyles || deliverableStyles.length === 0) {
              deliverableStyles = await getBrandAwareStyles(normalizedType, userId, {
                includeAllAxes: true,
                context: styleContext,
              })
            }
          }
          if (!deliverableStyles?.length) {
            deliverableStyleMarker = undefined
          }
          break
        case 'more':
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

    // Clear empty styles
    if (!deliverableStyles || deliverableStyles.length === 0) {
      logger.debug(
        { deliverableType: deliverableStyleMarker?.deliverableType },
        'No styles found for deliverable type - clearing marker'
      )
      deliverableStyleMarker = undefined
      deliverableStyles = undefined
    }
  }

  // ── Video references (only for explicit animated/product animated video requests) ──
  let videoReferences: VideoReference[] | undefined = undefined

  const lastUserMessageLower = lastUserMessage.toLowerCase()

  // Only show video references when user explicitly asks for animated/product animated content
  const isAnimatedVideoRequest =
    lastUserMessageLower.includes('animated') ||
    lastUserMessageLower.includes('animation') ||
    lastUserMessageLower.includes('motion graphics') ||
    lastUserMessageLower.includes('product animated')

  if (isStyleEligible && !moodboardHasStyles && isAnimatedVideoRequest) {
    logger.debug('Animated video request detected - fetching video references')

    try {
      const videoMatchContext: VideoMatchContext = {
        intent: confirmedFields?.intent || brief?.intent?.value,
        platform: confirmedFields?.platform || brief?.platform?.value,
        topic: confirmedFields?.topic || brief?.topic?.value,
        audience: confirmedFields?.audience || brief?.audience?.value?.name,
        aiResponse: responseContent,
      }

      videoReferences = await getVideoReferencesForChat(
        'launch_video',
        lastUserMessage,
        3,
        videoMatchContext
      )
      logger.debug(
        { count: videoReferences.length, context: videoMatchContext },
        'Fetched video references for animated video request'
      )
    } catch (err) {
      logger.error({ err }, 'Error fetching video references')
    }
  }

  return { deliverableStyles, deliverableStyleMarker, videoReferences }
}

// ── Helper: Load curated style presets from DB (all deliverable types) ──

async function getStylePresets(
  deliverableType: string,
  styleContext?: StyleContext
): Promise<SearchedDeliverableStyle[] | undefined> {
  try {
    // Load admin-uploaded reference styles from DB (real curated images)
    const presets = await db
      .select()
      .from(deliverableStyleReferences)
      .where(
        and(
          eq(deliverableStyleReferences.deliverableType, deliverableType),
          eq(deliverableStyleReferences.isActive, true)
        )
      )
      .orderBy(asc(deliverableStyleReferences.displayOrder))
      .limit(30)

    if (presets.length === 0) return undefined

    // Filter out video-specific entries (those with videoUrl) — visual styles only
    const visualPresets = presets.filter((p) => !p.videoUrl)
    if (visualPresets.length === 0) return undefined

    const mapped = visualPresets.map((preset, index) => {
      // Score against conversation context when available
      let brandMatchScore: number | undefined
      let matchReason: string | undefined

      if (styleContext) {
        brandMatchScore = calculateContextScore(
          {
            semanticTags: preset.semanticTags,
            industries: preset.industries,
            moodKeywords: preset.moodKeywords,
            targetAudience: preset.targetAudience,
            styleAxis: preset.styleAxis,
          },
          styleContext
        )
        matchReason =
          brandMatchScore >= 70
            ? 'Matches your topic'
            : brandMatchScore >= 40
              ? 'Related style'
              : undefined
      }

      return {
        id: preset.id,
        name: preset.name,
        description: preset.description,
        imageUrl: resolveStyleDisplayImage(preset),
        deliverableType: preset.deliverableType,
        styleAxis: preset.styleAxis,
        subStyle: preset.subStyle,
        semanticTags: preset.semanticTags || [],
        colorSamples: preset.colorSamples || [],
        promptGuide: preset.promptGuide ?? undefined,
        brandMatchScore,
        matchReason,
        attribution: {
          source: 'db' as const,
          domain: 'crafted',
          sourceUrl: '',
        },
        _displayOrder: index, // preserve original DB order as tiebreaker
      }
    })

    // Sort by context score when available; fall back to DB displayOrder
    if (styleContext) {
      mapped.sort((a, b) => {
        const scoreA = a.brandMatchScore ?? 0
        const scoreB = b.brandMatchScore ?? 0
        if (scoreB !== scoreA) return scoreB - scoreA
        return a._displayOrder - b._displayOrder
      })
    }

    // Strip internal tiebreaker before returning
    return mapped.map(({ _displayOrder, ...rest }) => rest)
  } catch (err) {
    logger.error({ err }, 'Error loading style presets from DB')
    return undefined
  }
}
