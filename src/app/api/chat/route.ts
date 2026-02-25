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
import { getBrandAwareStyles, getBrandAwareStylesOfAxis } from '@/lib/ai/brand-style-scoring'
import {
  searchStylesByQuery,
  aiEnhancedStyleSearch,
  refineStyleSearch,
} from '@/lib/ai/semantic-style-search'
import { searchStyleImages } from '@/lib/ai/style-image-search'
import {
  inferFromMessage,
  applyInferenceToBrief,
  detectBrandMention,
  analyzeRequestCompleteness,
} from '@/lib/ai/inference-engine'
import {
  getVideoReferencesForChat,
  isVideoDeliverableType,
  type VideoReference,
  type VideoMatchContext,
} from '@/lib/ai/video-references'
import { extractStyleContext } from '@/lib/ai/chat-context'
import { autoDetectStyleMarker } from '@/lib/ai/style-filter'
import type { StyleAxis } from '@/lib/constants/reference-libraries'
import { normalizeDeliverableType } from '@/lib/constants/reference-libraries'
import { db } from '@/db'
import { users, audiences as audiencesTable } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/require-auth'
import { withErrorHandling } from '@/lib/errors'
// State machine imports
import {
  type BriefingState,
  type DeliverableCategory,
  type SerializedBriefingState,
  deserialize,
  serialize,
  evaluateTransitions,
  getLegalTransitions,
} from '@/lib/ai/briefing-state-machine'
import { inferStageFromResponse } from '@/lib/ai/briefing-stage-inferrer'
import { calibrateTone } from '@/lib/ai/briefing-tone'
import { buildSystemPrompt, type BrandContext } from '@/lib/ai/briefing-prompts'
import { deriveToneOfVoice } from '@/lib/ai/brand-utils'
import {
  extractStyleKeywords,
  extractInspirationReferences,
  extractAudienceSignals,
  extractIndustrySignals,
  resolveDeliverableCategory,
} from '@/lib/ai/briefing-extractors'
import {
  parseStructuredOutput,
  parseStrategicReview,
  parseBriefMeta,
  parseGlobalStyles,
  getFormatReinforcement,
  getStrategicReviewReinforcement,
  type StructureType,
} from '@/lib/ai/briefing-response-parser'
import { searchStoryboardImages, type SceneImageMatch } from '@/lib/ai/storyboard-image-search'
import { searchPexelsForScene } from '@/lib/ai/pexels-image-search'
import type { InferredAudience } from '@/components/onboarding/types'

async function handler(request: NextRequest) {
  return withErrorHandling(
    async () => {
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
        briefingState: clientBriefingState, // Serialized state machine state (Phase 2)
        latestStoryboard: clientLatestStoryboard, // Client-side storyboard with local edits
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
        let videoRefsResult: VideoReference[] | undefined = undefined
        const { type, deliverableType, styleAxis } = clientStyleMarker
        // Normalize deliverable type in case AI generated an alias
        const normalizedType = normalizeDeliverableType(deliverableType)
        const isVideoType = isVideoDeliverableType(normalizedType)

        try {
          if (isVideoType) {
            // Video type: fetch video references instead of image styles
            // Fetch more than needed and offset to get fresh results for "more" requests
            const lastUserMessage = messages[messages.length - 1]?.content || ''
            const videoOffset = styleOffset || 0
            const fetchLimit = videoOffset + 3
            const allVideoRefs = await getVideoReferencesForChat(
              normalizedType,
              lastUserMessage,
              fetchLimit
            )
            videoRefsResult = allVideoRefs.slice(videoOffset)
            // If we've exhausted the pool, wrap around to the top results
            if (videoRefsResult.length === 0 && allVideoRefs.length > 0) {
              videoRefsResult = allVideoRefs.slice(0, 3)
            }
          } else if (type === 'more') {
            // Dynamic web search for more styles
            const searchTerms = clientStyleMarker.searchTerms
            deliverableStyles = await searchStyleImages(
              {
                searchTerms,
                deliverableType: normalizedType,
                styleAxis: styleAxis,
              },
              {
                count: 6,
                offset: styleOffset || 0,
                styleContext,
              }
            )
            // Fallback to DB if dynamic search returns nothing
            if ((!deliverableStyles || deliverableStyles.length === 0) && styleAxis) {
              deliverableStyles = await getBrandAwareStylesOfAxis(
                normalizedType,
                styleAxis as StyleAxis,
                session.user.id,
                styleOffset || 0
              )
            }
          } else if (type === 'different') {
            // Dynamic web search with different terms
            deliverableStyles = await searchStyleImages(
              {
                searchTerms: clientStyleMarker.searchTerms,
                deliverableType: normalizedType,
              },
              {
                count: 6,
                styleContext,
                excludeTerms: excludeStyleAxes,
              }
            )
            // Fallback to DB if dynamic search returns nothing
            if (!deliverableStyles || deliverableStyles.length === 0) {
              deliverableStyles = await getBrandAwareStyles(normalizedType, session.user.id, {
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

      // ====================================================================
      // STATE MACHINE PIPELINE
      // When client provides briefingState, runs the pipeline alongside
      // the existing chat() call.
      // ====================================================================

      // ── Pre-build brand context (used by all state machine branches) ──
      const brandAudiences: InferredAudience[] = company?.id
        ? (
            await db.select().from(audiencesTable).where(eq(audiencesTable.companyId, company.id))
          ).map((a) => ({
            name: a.name,
            isPrimary: a.isPrimary,
            demographics: a.demographics as InferredAudience['demographics'],
            psychographics: a.psychographics as InferredAudience['psychographics'],
            confidence: 1.0,
          }))
        : []

      const brandContext: BrandContext = {
        companyName: company?.name,
        industry: company?.industry ?? undefined,
        toneOfVoice: deriveToneOfVoice(company ?? null),
        brandDescription: company?.description ?? undefined,
        tagline: company?.tagline ?? undefined,
        industryArchetype: company?.industryArchetype ?? undefined,
        keywords: company?.keywords ?? undefined,
        colors: company
          ? {
              primary: company.primaryColor ?? undefined,
              secondary: company.secondaryColor ?? undefined,
              accent: company.accentColor ?? undefined,
            }
          : undefined,
        typography: company
          ? {
              primary: company.primaryFont ?? undefined,
              secondary: company.secondaryFont ?? undefined,
            }
          : undefined,
        audiences: brandAudiences.map((a) => ({
          name: a.name,
          isPrimary: a.isPrimary,
          demographics: a.demographics as Record<string, unknown> | undefined,
          psychographics: a.psychographics as
            | { painPoints?: string[]; goals?: string[]; values?: string[] }
            | undefined,
        })),
        competitors: (company?.competitors as BrandContext['competitors']) ?? undefined,
        positioning: company?.positioning
          ? {
              uvp: (company.positioning as Record<string, string>).uvp,
              differentiators: (company.positioning as Record<string, string[]>).differentiators,
              targetMarket: (company.positioning as Record<string, string>).targetMarket,
            }
          : undefined,
        brandVoice: (company?.brandVoice as BrandContext['brandVoice']) ?? undefined,
      }

      let updatedBriefingState: SerializedBriefingState | undefined
      let stateMachineOverride: { systemPrompt: string; stage?: string } | undefined
      let preAiInference: ReturnType<typeof inferFromMessage> | undefined
      let styleHint: string | undefined

      if (clientBriefingState) {
        try {
          const lastUserMessage = messages[messages.length - 1]?.content || ''
          const briefingState: BriefingState = deserialize(clientBriefingState)

          // Sync client-side storyboard edits into briefingState so the server has the latest
          if (
            clientLatestStoryboard?.type === 'storyboard' &&
            Array.isArray(clientLatestStoryboard.scenes) &&
            clientLatestStoryboard.scenes.length > 0
          ) {
            briefingState.structure = clientLatestStoryboard
          }

          // 1. Run inference on latest user message (field population only, NOT for transitions)
          const inference = inferFromMessage({
            message: lastUserMessage,
            conversationHistory: messages.slice(0, -1).map((m: { content: string }) => m.content),
          })
          preAiInference = inference // Store for post-AI fallback

          // 2. Apply inference to LiveBrief
          briefingState.brief = applyInferenceToBrief(
            briefingState.brief,
            inference,
            brandAudiences,
            lastUserMessage,
            briefingState.deliverableCategory
          )

          // 4. Extract additional signals
          const styleKw = extractStyleKeywords(lastUserMessage)
          if (styleKw.length > 0) {
            briefingState.styleKeywords = [...new Set([...briefingState.styleKeywords, ...styleKw])]
          }
          const inspirationRefs = extractInspirationReferences(lastUserMessage)
          if (inspirationRefs.length > 0) {
            briefingState.inspirationRefs = [
              ...new Set([...briefingState.inspirationRefs, ...inspirationRefs]),
            ]
          }

          // Inject "launch" keyword when user mentions launching
          if (/\b(launch|launching)\b/i.test(lastUserMessage)) {
            briefingState.styleKeywords = [...new Set([...briefingState.styleKeywords, 'launch'])]
          }

          // 5. Resolve deliverable category
          if (
            !briefingState.deliverableCategory ||
            briefingState.deliverableCategory === 'unknown'
          ) {
            const category = resolveDeliverableCategory(inference)
            if (category !== 'unknown') {
              briefingState.deliverableCategory = category
            }
          }

          // 5b. Sync visualDirection from moodboard — the useBrief hook updates its own
          // brief.visualDirection but the state machine's brief is separate. When client
          // indicates moodboard has styles, populate state machine's visualDirection
          // so INSPIRATION → ELABORATE transition works.
          if (moodboardHasStyles && briefingState.stage === 'INSPIRATION') {
            if (
              !briefingState.brief.visualDirection ||
              briefingState.brief.visualDirection.selectedStyles.length === 0
            ) {
              briefingState.brief.visualDirection = {
                selectedStyles: [
                  {
                    id: 'moodboard-synced',
                    name: 'User selected styles',
                    description: null,
                    imageUrl: '',
                    deliverableType: briefingState.deliverableCategory || 'unknown',
                    styleAxis: 'reference',
                    subStyle: null,
                    semanticTags: [],
                  },
                ],
                moodKeywords: [],
                colorPalette: [],
                typography: { primary: '', secondary: '' },
                avoidElements: [],
              }
            }
          }

          // 6. Calibrate tone
          const audienceSignals = extractAudienceSignals(lastUserMessage)
          const industrySignals = extractIndustrySignals(lastUserMessage)

          if (industrySignals.length > 0 && !briefingState.industry) {
            briefingState.industry = {
              value: industrySignals[0],
              confidence: 0.8,
              source: 'inferred',
            }
          }

          const shouldRecalibrateTone =
            !briefingState.toneProfile || audienceSignals.length > 0 || industrySignals.length > 0
          if (shouldRecalibrateTone) {
            const audience =
              audienceSignals.length > 0
                ? audienceSignals[0].label
                : (briefingState.brief.audience.value?.name ?? null)
            const industry = briefingState.industry?.value ?? null
            const platform = briefingState.brief.platform.value ?? null
            const intent = briefingState.brief.intent.value ?? null

            if (audience || industry) {
              briefingState.toneProfile = calibrateTone(audience, industry, platform, intent)
            }
          }

          // 7. Increment message count — stage transitions are now handled post-AI via BRIEF_META
          briefingState.messageCount += 1

          // 8. Build system prompt from state (includes legal transitions + BRIEF_META instruction)
          let systemPrompt = buildSystemPrompt(briefingState, brandContext)

          // Add scene feedback hint: when user gives feedback on specific scenes during STRUCTURE,
          // instruct the AI to regenerate the full storyboard with changes applied.
          // Include the current storyboard state so the AI can preserve and improve existing text.
          const lastUserContent = messages[messages.length - 1]?.content || ''
          if (
            (briefingState.stage === 'STRUCTURE' || briefingState.stage === 'ELABORATE') &&
            /\[Feedback on Scene/.test(lastUserContent)
          ) {
            let feedbackHint =
              '\n\nCRITICAL REQUIREMENT — YOU MUST OUTPUT A [STORYBOARD] BLOCK: The user is giving feedback on specific storyboard scenes. ' +
              'IMPROVE the existing text based on their feedback — do NOT blank out, remove, or shorten existing content. ' +
              'Preserve all existing fields (title, description, voiceover, visualNote, duration, transition, cameraNote, hookData, fullScript, directorNotes) for scenes the user did NOT mention. ' +
              'For scenes the user DID mention, apply their feedback while keeping any fields they did not specifically ask to change. ' +
              'You MUST regenerate the FULL [STORYBOARD]...[/STORYBOARD] block with valid JSON in your response — without it the storyboard panel will not update. ' +
              'If the user asked to merge, combine, remove, or reduce scenes, output ONLY the resulting scenes (fewer than before). ' +
              "If the user asked to add or split scenes, include the new scenes. Always output the complete updated storyboard reflecting the user's changes."

            // Prefer client-sent storyboard (includes local edits) over server briefingState
            const storyboardForHint =
              (clientLatestStoryboard?.type === 'storyboard' && clientLatestStoryboard) ||
              (briefingState.structure?.type === 'storyboard' && briefingState.structure) ||
              null

            // Include current storyboard state so the AI has existing content to work with
            if (
              storyboardForHint &&
              'scenes' in storyboardForHint &&
              (storyboardForHint as { scenes?: unknown[] }).scenes?.length
            ) {
              feedbackHint +=
                '\n\nHere is the current storyboard that you must use as the base (preserve all fields, only modify what the user requested):\n' +
                `[STORYBOARD]${JSON.stringify(storyboardForHint)}[/STORYBOARD]`
            }

            systemPrompt += feedbackHint
          }

          stateMachineOverride = { systemPrompt, stage: briefingState.stage }

          // 9. Serialize updated state for response
          updatedBriefingState = serialize(briefingState)

          // 9b. Build style hint for style-aware image search
          const styleHintParts: string[] = []
          const selectedStyles = briefingState.brief.visualDirection?.selectedStyles
          if (selectedStyles && selectedStyles.length > 0) {
            styleHintParts.push(...selectedStyles.map((s) => s.name))
          }
          if (briefingState.styleKeywords.length > 0) {
            styleHintParts.push(...briefingState.styleKeywords)
          }
          if (briefingState.inspirationRefs.length > 0) {
            styleHintParts.push(...briefingState.inspirationRefs)
          }
          if (styleHintParts.length > 0) {
            styleHint = styleHintParts.join(' ')
          }
        } catch (err) {
          logger.error({ err }, 'State machine pipeline failed — using default AI prompt')
          // On error, clear override so default prompt is used
          stateMachineOverride = undefined
          updatedBriefingState = undefined
        }
      }

      // Stage-based gating: only attach style/video data at eligible stages
      const STYLE_ELIGIBLE_STAGES = new Set(['INSPIRATION', 'MOODBOARD'])
      const currentStage = updatedBriefingState?.stage ?? clientBriefingState?.stage
      const isStyleEligible = !currentStage || STYLE_ELIGIBLE_STAGES.has(currentStage)

      // Get AI response with context (+ optional state machine override)
      const response = await chat(messages, session.user.id, chatContext, stateMachineOverride)

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
      // automatically detect and show styles to ensure user sees visual options.
      // Only at style-eligible stages to prevent misaligned CTAs.
      // When state machine is active, also suppress auto-detect when the AI is
      // asking a question (ending with ?) — it means the AI is gathering info,
      // not presenting visual references.
      const aiResponseEndsWithQuestion =
        currentStage &&
        response.content
          .replace(/\[QUICK_OPTIONS\][\s\S]*?\[\/QUICK_OPTIONS\]/g, '')
          .trim()
          .endsWith('?')

      if (!deliverableStyleMarker && isStyleEligible && !aiResponseEndsWithQuestion) {
        const lastUserMsg = messages[messages.length - 1]?.content || ''
        deliverableStyleMarker = autoDetectStyleMarker(response.content, lastUserMsg)
      }

      // Suppress marker at non-eligible stages (safety net)
      if (!isStyleEligible) {
        deliverableStyleMarker = undefined
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
              // Dynamic web image search using AI-provided search terms or context
              deliverableStyles = await searchStyleImages(
                {
                  searchTerms: deliverableStyleMarker.searchTerms,
                  deliverableType: normalizedType,
                },
                { count: 6, styleContext }
              )
              // Fallback to DB styles if dynamic search returns nothing
              if (!deliverableStyles || deliverableStyles.length === 0) {
                deliverableStyles = await getBrandAwareStyles(normalizedType, session.user.id, {
                  includeAllAxes: true,
                  context: styleContext,
                })
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
                  styleAxis: styleAxis,
                },
                { count: 6, offset: styleOffset || 0, styleContext }
              )
              // Fallback to DB
              if ((!deliverableStyles || deliverableStyles.length === 0) && styleAxis) {
                deliverableStyles = await getBrandAwareStylesOfAxis(
                  normalizedType,
                  styleAxis as StyleAxis,
                  session.user.id,
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
                deliverableStyles = await getBrandAwareStyles(normalizedType, session.user.id, {
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
        // BUT preserve the marker for video types — video references need it downstream
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

      // Get video references for video deliverable types
      let videoReferences: VideoReference[] | undefined = undefined

      // Check for video-related content in the conversation (used only for clearing
      // image styles when we know this is a video project, not for triggering video fetch)
      const lastUserMessage = messages[messages.length - 1]?.content || ''
      const lastUserMessageLower = lastUserMessage.toLowerCase()
      const responseContentLower = response.content.toLowerCase()
      const combinedVideoContext = `${lastUserMessageLower} ${responseContentLower}`

      const isVideoRequest =
        combinedVideoContext.includes('video') ||
        combinedVideoContext.includes('cinematic') ||
        combinedVideoContext.includes('motion') ||
        combinedVideoContext.includes('animation') ||
        combinedVideoContext.includes('commercial') ||
        combinedVideoContext.includes('reel')

      // Video references require a deliverable style marker that indicates a video type.
      // Keyword-only detection (isVideoRequest) is NOT sufficient to trigger video refs
      // because user messages like "product launch video" would match at every stage,
      // causing videos to appear while the AI is still asking about audience/intent.
      const hasVideoMarker =
        deliverableStyleMarker &&
        isVideoDeliverableType(normalizeDeliverableType(deliverableStyleMarker.deliverableType))

      logger.debug(
        { isVideoRequest, hasVideoMarker, deliverableStyleMarker },
        'Video detection check'
      )

      // Only fetch video refs when there's a video-type marker AND stage is eligible.
      // Skip if user already selected styles (moodboardHasStyles).
      if (isStyleEligible && !moodboardHasStyles && hasVideoMarker) {
        // For video requests, clear image styles - we only want to show video references
        deliverableStyles = undefined
        logger.debug('Video marker detected - cleared image styles, fetching video refs')

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
      } else if (isStyleEligible && moodboardHasStyles && hasVideoMarker) {
        // Still clear image styles for video marker when skipping video references
        deliverableStyles = undefined
        logger.debug('Video request with moodboard styles - skipping video grid')
      }

      // Use AI-generated quick options only — style fallback removed as it fires
      // indiscriminately at all stages and duplicates the style grid cards
      let quickOptions = response.quickOptions

      // Parse structured output from AI response when state machine is at STRUCTURE or STRATEGIC_REVIEW
      let structureData = undefined
      let strategicReviewData = undefined
      let globalStyles = undefined

      if (clientBriefingState) {
        try {
          const briefingState: BriefingState = deserialize(
            updatedBriefingState ?? clientBriefingState
          )

          // Sync client-side storyboard edits into briefingState (post-AI path)
          if (
            clientLatestStoryboard?.type === 'storyboard' &&
            Array.isArray(clientLatestStoryboard.scenes) &&
            clientLatestStoryboard.scenes.length > 0 &&
            (!briefingState.structure ||
              briefingState.structure.type !== 'storyboard' ||
              !('scenes' in briefingState.structure))
          ) {
            briefingState.structure = clientLatestStoryboard
          }

          // ================================================================
          // 10. Parse [BRIEF_META] from AI response for stage transitions
          // ================================================================
          // Snapshot turn count before BRIEF_META processing increments it,
          // so retry guards can check whether this was truly the first turn.
          const turnsBeforeBriefMeta = briefingState.turnsInCurrentStage
          const stageBeforeBriefMeta = briefingState.stage
          const lastContent = messages[messages.length - 1]?.content || ''
          const isSceneFeedback = /\[Feedback on Scene/.test(lastContent)
          const isRegenerationRequest = /regenerate.*storyboard/i.test(lastContent)

          let briefMetaResult = parseBriefMeta(response.content)

          // BRIEF_META retry: if missing, attempt a single retry with reinforcement
          if (!briefMetaResult.success) {
            logger.debug('BRIEF_META not found — attempting single retry with reinforcement')
            try {
              const metaRetryResponse = await chat(
                [
                  ...messages,
                  { role: 'assistant', content: response.content },
                  {
                    role: 'user',
                    content: `You forgot the required [BRIEF_META] block. Reply with ONLY the block. Format: [BRIEF_META]{"stage":"${briefingState.stage}","fieldsExtracted":{}}[/BRIEF_META]`,
                  },
                ],
                session.user.id,
                chatContext,
                stateMachineOverride
              )
              const retryMetaResult = parseBriefMeta(metaRetryResponse.content)
              if (retryMetaResult.success) {
                briefMetaResult = retryMetaResult
                logger.debug('BRIEF_META retry succeeded')
              } else {
                logger.debug('BRIEF_META retry did not produce valid meta — using tiered fallback')
              }
            } catch (retryErr) {
              logger.warn({ err: retryErr }, 'BRIEF_META retry failed')
            }
          }

          if (briefMetaResult.success && briefMetaResult.data) {
            // 11. Validate declared stage against legal transitions
            const declaredStage = briefMetaResult.data.stage
            // STRATEGIC_REVIEW is temporarily disabled — remap to MOODBOARD
            const effectiveStage =
              declaredStage === 'STRATEGIC_REVIEW' ? 'MOODBOARD' : declaredStage
            const legal = getLegalTransitions(briefingState.stage)
            if (legal.includes(effectiveStage)) {
              // Guard: Don't skip ahead past INSPIRATION on the first turn.
              const blockingAdvance =
                briefingState.stage === 'STRUCTURE' &&
                effectiveStage === 'INSPIRATION' &&
                briefingState.turnsInCurrentStage === 0

              if (blockingAdvance) {
                // Stay in current stage — the advance will happen on the next user turn
                briefingState.turnsInCurrentStage += 1
              } else if (effectiveStage !== briefingState.stage) {
                briefingState.stage = effectiveStage
                briefingState.turnsInCurrentStage = 0
              } else {
                briefingState.turnsInCurrentStage += 1
              }
            } else {
              // Illegal transition — log warning, keep current stage
              logger.warn(
                { declaredStage, currentStage: briefingState.stage, legal },
                'AI declared illegal stage transition — keeping current stage'
              )
              briefingState.turnsInCurrentStage += 1
            }

            // 12. Apply AI-extracted fieldsExtracted to boost brief field confidence to 0.9
            const fields = briefMetaResult.data.fieldsExtracted
            if (fields.taskType && briefingState.brief.taskType.confidence < 0.9) {
              briefingState.brief.taskType = {
                value: fields.taskType as typeof briefingState.brief.taskType.value,
                confidence: 0.9,
                source: 'inferred',
              }
            }
            if (fields.intent && briefingState.brief.intent.confidence < 0.9) {
              briefingState.brief.intent = {
                value: fields.intent as typeof briefingState.brief.intent.value,
                confidence: 0.9,
                source: 'inferred',
              }
            }
            if (fields.platform && briefingState.brief.platform.confidence < 0.9) {
              briefingState.brief.platform = {
                value: fields.platform as typeof briefingState.brief.platform.value,
                confidence: 0.9,
                source: 'inferred',
              }
            }
            if (fields.topic && briefingState.brief.topic.confidence < 0.9) {
              briefingState.brief.topic = {
                value: fields.topic,
                confidence: 0.9,
                source: 'inferred',
              }
            }
            if (
              fields.deliverableCategory &&
              (!briefingState.deliverableCategory ||
                briefingState.deliverableCategory === 'unknown')
            ) {
              const catMap: Record<string, DeliverableCategory> = {
                video: 'video',
                website: 'website',
                content: 'content',
                design: 'design',
                brand: 'brand',
              }
              const mapped = catMap[fields.deliverableCategory]
              if (mapped) briefingState.deliverableCategory = mapped
            }
          } else {
            // BRIEF_META missing or failed — tiered fallback
            console.warn(
              `[chat/route] BRIEF_META missing from AI response at stage=${briefingState.stage}, turn=${briefingState.turnsInCurrentStage}. Using tiered fallback.`
            )
            logger.debug(
              { parseError: briefMetaResult.parseError },
              'BRIEF_META not found — using tiered fallback'
            )

            // Tier 1: Content-based stage inference
            const stageInference = inferStageFromResponse(response.content, briefingState.stage)
            if (stageInference) {
              logger.debug(
                {
                  inferredStage: stageInference.stage,
                  confidence: stageInference.confidence,
                  reason: stageInference.reason,
                },
                'Stage inferred from response content (Tier 1)'
              )
              if (stageInference.stage !== briefingState.stage) {
                // STRATEGIC_REVIEW is temporarily disabled — skip it entirely
                const inferredStage =
                  stageInference.stage === 'STRATEGIC_REVIEW' ? 'MOODBOARD' : stageInference.stage
                // Preserve blocking guards for STRUCTURE/INSPIRATION transitions
                const blockingAdvance =
                  briefingState.stage === 'STRUCTURE' && inferredStage === 'INSPIRATION'
                if (blockingAdvance) {
                  briefingState.turnsInCurrentStage += 1
                } else if (inferredStage !== briefingState.stage) {
                  briefingState.stage = inferredStage
                  briefingState.turnsInCurrentStage = 0
                } else {
                  briefingState.turnsInCurrentStage += 1
                }
              } else {
                briefingState.turnsInCurrentStage += 1
              }
            } else if (preAiInference) {
              // Tier 2: Data-driven evaluateTransitions()
              const nextStage = evaluateTransitions(briefingState, preAiInference)
              if (nextStage !== briefingState.stage) {
                briefingState.stage = nextStage
                briefingState.turnsInCurrentStage = 0
              } else {
                briefingState.turnsInCurrentStage += 1
                // Tier 3: Force-advance if stuck in the same stage for too many turns
                if (briefingState.turnsInCurrentStage >= 3) {
                  const forceNext = evaluateTransitions(
                    { ...briefingState, turnsInCurrentStage: 999 },
                    preAiInference
                  )
                  if (forceNext !== briefingState.stage) {
                    console.warn(
                      `[chat/route] Force-advancing from ${briefingState.stage} to ${forceNext} after ${briefingState.turnsInCurrentStage} turns`
                    )
                    briefingState.stage = forceNext
                    briefingState.turnsInCurrentStage = 0
                  }
                }
              }
            } else {
              briefingState.turnsInCurrentStage += 1
            }

            // Detect explicit submit intent as additional fallback
            const lastMsg = messages[messages.length - 1]?.content || ''
            const isVideoWithoutStoryboard =
              briefingState.deliverableCategory === 'video' &&
              (!briefingState.structure ||
                briefingState.structure.type !== 'storyboard' ||
                !('scenes' in briefingState.structure) ||
                (briefingState.structure as { scenes?: unknown[] }).scenes?.length === 0)
            if (
              (briefingState.stage === 'REVIEW' || briefingState.stage === 'DEEPEN') &&
              /\b(yes|yeah|yep|sure|go ahead|do it|ready|let'?s?\s*(go|submit|do)|submit\s*(this|it|now|the|my)?|send\s*(this|it)|confirm|looks?\s*good)\b/i.test(
                lastMsg
              )
            ) {
              if (isVideoWithoutStoryboard) {
                // Don't advance to SUBMIT — force storyboard generation first
                briefingState.stage = 'STRUCTURE'
                briefingState.turnsInCurrentStage = 0
              } else {
                briefingState.stage = 'SUBMIT'
                briefingState.turnsInCurrentStage = 0
              }
            }
          }

          // ================================================================
          // 13. Parse structure/review/task markers from AI response
          // ================================================================
          const categoryToStructureType: Record<string, StructureType> = {
            video: 'storyboard',
            website: 'layout',
            content: 'calendar',
            design: 'single_design',
            brand: 'single_design',
          }

          // Determine structure type from category, with marker-based fallback
          let structureType: StructureType | undefined = briefingState.deliverableCategory
            ? categoryToStructureType[briefingState.deliverableCategory]
            : undefined
          if (!structureType) {
            if (response.content.includes('[STORYBOARD]')) structureType = 'storyboard'
            else if (response.content.includes('[LAYOUT]')) structureType = 'layout'
            else if (response.content.includes('[CALENDAR]')) structureType = 'calendar'
            else if (response.content.includes('[DESIGN_SPEC]')) structureType = 'single_design'
          }

          // Parse structure data — always attempt regardless of stage
          if (structureType) {
            const parsed = parseStructuredOutput(response.content, structureType)
            if (parsed.success && parsed.data) {
              structureData = parsed.data
              briefingState.structure = parsed.data

              // Category fallback: infer deliverableCategory from structure type
              // when structure was parsed but category is still unknown
              if (
                !briefingState.deliverableCategory ||
                briefingState.deliverableCategory === 'unknown'
              ) {
                const typeToCategory: Record<string, DeliverableCategory> = {
                  storyboard: 'video',
                  layout: 'website',
                  calendar: 'content',
                  single_design: 'design',
                }
                const inferred = typeToCategory[parsed.data.type]
                if (inferred) {
                  briefingState.deliverableCategory = inferred
                }
              }
            }
          }

          // Parse strategic review
          const reviewParsed = parseStrategicReview(response.content)
          if (reviewParsed.success && reviewParsed.data) {
            strategicReviewData = reviewParsed.data
            briefingState.strategicReview = reviewParsed.data
          }

          // ================================================================
          // 13b. Parse [GLOBAL_STYLES] for website projects
          // ================================================================
          if (briefingState.deliverableCategory === 'website') {
            const parsedGlobalStyles = parseGlobalStyles(response.content)
            if (parsedGlobalStyles) {
              globalStyles = parsedGlobalStyles
              briefingState.websiteGlobalStyles = parsedGlobalStyles
            }
          }

          // ================================================================
          // 14-15. Auto-advance on structure/review parse
          // ================================================================

          // Auto-advance STRUCTURE -> INSPIRATION when structure data was just parsed
          // on a non-first turn (first turn stays in STRUCTURE for user interaction)
          if (briefingState.stage === 'STRUCTURE' && structureData && turnsBeforeBriefMeta > 0) {
            briefingState.stage = 'INSPIRATION'
            briefingState.turnsInCurrentStage = 0
          }

          // Auto-advance STRATEGIC_REVIEW -> MOODBOARD when review data is parsed
          if (briefingState.stage === 'STRATEGIC_REVIEW' && strategicReviewData) {
            briefingState.stage = 'MOODBOARD'
            briefingState.turnsInCurrentStage = 0
          }

          // ================================================================
          // 16. Structure retry with format reinforcement (single attempt)
          // ================================================================
          if (
            briefingState.stage === 'STRUCTURE' &&
            stageBeforeBriefMeta === 'STRUCTURE' &&
            !structureData &&
            structureType
          ) {
            logger.debug(
              { structureType },
              'Structure not parsed at STRUCTURE stage — retrying with format reinforcement'
            )
            try {
              const reinforcement = getFormatReinforcement(structureType)
              // Rebuild system prompt for STRUCTURE stage (stateMachineOverride has stale pre-transition prompt)
              const structureRetryOverride = {
                systemPrompt: buildSystemPrompt(briefingState, brandContext),
                stage: briefingState.stage,
              }
              const retryResponse = await chat(
                [
                  ...messages,
                  { role: 'assistant', content: response.content },
                  { role: 'user', content: reinforcement },
                ],
                session.user.id,
                chatContext,
                structureRetryOverride
              )
              const retryParsed = parseStructuredOutput(retryResponse.content, structureType)
              if (retryParsed.success && retryParsed.data) {
                structureData = retryParsed.data
                briefingState.structure = retryParsed.data
                logger.debug(
                  {
                    structureType,
                    itemCount:
                      'scenes' in retryParsed.data
                        ? retryParsed.data.scenes.length
                        : 'sections' in retryParsed.data
                          ? retryParsed.data.sections.length
                          : undefined,
                  },
                  'Structure retry succeeded'
                )
                // Stay in STRUCTURE — user should interact with the structure first
              } else {
                logger.warn(
                  { structureType, parseError: retryParsed.parseError },
                  'Structure retry also failed — no storyboard data'
                )
              }
            } catch (retryErr) {
              logger.warn({ err: retryErr }, 'Structure format reinforcement retry failed')
            }
          }

          // ================================================================
          // 16a. ELABORATE retry with format reinforcement (single attempt)
          // ================================================================
          if (
            briefingState.stage === 'ELABORATE' &&
            !structureData &&
            structureType &&
            (turnsBeforeBriefMeta === 0 || stageBeforeBriefMeta !== 'ELABORATE')
          ) {
            logger.debug(
              { structureType },
              'Structure not parsed at ELABORATE stage — retrying with format reinforcement'
            )
            try {
              const reinforcement = getFormatReinforcement(structureType)
              const elaborateRetryOverride = {
                systemPrompt: buildSystemPrompt(briefingState, brandContext),
                stage: briefingState.stage,
              }
              const retryResponse = await chat(
                [
                  ...messages,
                  { role: 'assistant', content: response.content },
                  { role: 'user', content: reinforcement },
                ],
                session.user.id,
                chatContext,
                elaborateRetryOverride
              )
              const retryParsed = parseStructuredOutput(retryResponse.content, structureType)
              if (retryParsed.success && retryParsed.data) {
                structureData = retryParsed.data
                briefingState.structure = retryParsed.data
                logger.debug({ structureType }, 'ELABORATE structure retry succeeded')
              } else {
                logger.warn(
                  { structureType, parseError: retryParsed.parseError },
                  'ELABORATE structure retry also failed'
                )
              }
            } catch (retryErr) {
              logger.warn({ err: retryErr }, 'ELABORATE format reinforcement retry failed')
            }
          }

          // ================================================================
          // 16a-2. Scene feedback retry: always retry when scene feedback
          // was given but no storyboard was returned, regardless of turn count
          // ================================================================
          if (isSceneFeedback && !structureData && structureType) {
            logger.debug(
              { structureType },
              'Scene feedback detected but no storyboard returned — retrying with storyboard context'
            )
            try {
              // Build a retry prompt that includes the current storyboard + user feedback
              // so the AI can apply the changes and return the full updated storyboard
              const storyboardForRetry =
                (clientLatestStoryboard?.type === 'storyboard' && clientLatestStoryboard) ||
                (briefingState.structure?.type === 'storyboard' && briefingState.structure) ||
                null
              const retryPrompt = storyboardForRetry
                ? `The user gave feedback on specific scenes but you didn't include the updated storyboard in your response. ` +
                  `Apply the changes from your previous response to the current storyboard and output the FULL updated storyboard wrapped in [STORYBOARD]...[/STORYBOARD] markers with valid JSON.\n\n` +
                  `Current storyboard to update:\n[STORYBOARD]${JSON.stringify(storyboardForRetry)}[/STORYBOARD]`
                : getFormatReinforcement(structureType)
              const feedbackRetryOverride = {
                systemPrompt: buildSystemPrompt(briefingState, brandContext),
                stage: briefingState.stage,
              }
              const retryResponse = await chat(
                [
                  ...messages,
                  { role: 'assistant', content: response.content },
                  { role: 'user', content: retryPrompt },
                ],
                session.user.id,
                chatContext,
                feedbackRetryOverride
              )
              const retryParsed = parseStructuredOutput(retryResponse.content, structureType)
              if (retryParsed.success && retryParsed.data) {
                structureData = retryParsed.data
                briefingState.structure = retryParsed.data
                logger.debug({ structureType }, 'Scene feedback structure retry succeeded')
              } else {
                logger.warn(
                  { structureType, parseError: retryParsed.parseError },
                  'Scene feedback structure retry also failed — no storyboard data'
                )
              }
            } catch (retryErr) {
              logger.warn({ err: retryErr }, 'Scene feedback format reinforcement retry failed')
            }
          }

          // ================================================================
          // 16a-3. Regeneration retry: always retry when user requested
          // storyboard regeneration but no storyboard was returned
          // ================================================================
          if (isRegenerationRequest && !structureData && structureType) {
            logger.debug(
              { structureType },
              'Regeneration request detected but no storyboard returned — retrying with format reinforcement'
            )
            try {
              const reinforcement = getFormatReinforcement(structureType)
              const regenRetryOverride = {
                systemPrompt: buildSystemPrompt(briefingState, brandContext),
                stage: briefingState.stage,
              }
              const retryResponse = await chat(
                [
                  ...messages,
                  { role: 'assistant', content: response.content },
                  { role: 'user', content: reinforcement },
                ],
                session.user.id,
                chatContext,
                regenRetryOverride
              )
              const retryParsed = parseStructuredOutput(retryResponse.content, structureType)
              if (retryParsed.success && retryParsed.data) {
                structureData = retryParsed.data
                briefingState.structure = retryParsed.data
                logger.debug({ structureType }, 'Regeneration structure retry succeeded')
              } else {
                logger.warn(
                  { structureType, parseError: retryParsed.parseError },
                  'Regeneration structure retry also failed — no storyboard data'
                )
              }
            } catch (retryErr) {
              logger.warn({ err: retryErr }, 'Regeneration format reinforcement retry failed')
            }
          }

          // ================================================================
          // 16b. Strategic review retry with format reinforcement (single attempt)
          // ================================================================
          if (
            briefingState.stage === 'STRATEGIC_REVIEW' &&
            !strategicReviewData &&
            (turnsBeforeBriefMeta === 0 || stageBeforeBriefMeta !== 'STRATEGIC_REVIEW')
          ) {
            // Check if the AI wrote strategic assessment text without the marker
            const hasReviewText =
              response.content.includes('strategic') ||
              response.content.includes('assessment') ||
              response.content.includes('strengths') ||
              response.content.includes('risks')
            if (hasReviewText) {
              logger.debug(
                'Strategic review text found but no marker — retrying with format reinforcement'
              )
              try {
                const reinforcement = getStrategicReviewReinforcement()
                // Rebuild system prompt for STRATEGIC_REVIEW stage (stateMachineOverride has stale pre-AI prompt)
                const reviewRetryOverride = {
                  systemPrompt: buildSystemPrompt(briefingState, brandContext),
                  stage: briefingState.stage,
                }
                const retryResponse = await chat(
                  [
                    ...messages,
                    { role: 'assistant', content: response.content },
                    { role: 'user', content: reinforcement },
                  ],
                  session.user.id,
                  chatContext,
                  reviewRetryOverride
                )
                const retryParsed = parseStrategicReview(retryResponse.content)
                if (retryParsed.success && retryParsed.data) {
                  strategicReviewData = retryParsed.data
                  briefingState.strategicReview = retryParsed.data
                  logger.debug('Strategic review retry succeeded')
                  // Auto-advance after successful retry
                  briefingState.stage = 'MOODBOARD'
                  briefingState.turnsInCurrentStage = 0
                } else {
                  logger.warn(
                    { parseError: retryParsed.parseError },
                    'Strategic review retry also failed — no review data'
                  )
                }
              } catch (retryErr) {
                logger.warn({ err: retryErr }, 'Strategic review format reinforcement retry failed')
              }
            }
          }

          // 18. Always re-serialize state (client always gets latest state)
          updatedBriefingState = serialize(briefingState)
        } catch (postAiErr) {
          logger.error({ err: postAiErr }, 'Post-AI state machine pipeline failed')
          // Fallback: return client state as-is so it's not lost
          if (!updatedBriefingState) {
            updatedBriefingState = clientBriefingState
          }
        }
      }

      // ================================================================
      // 17a. Multi-source scene image search (non-blocking, storyboard only)
      // ================================================================
      let sceneImageMatches: SceneImageMatch[] | undefined = undefined
      const scenesHaveSearchData =
        structureData?.type === 'storyboard' &&
        structureData.scenes.some(
          (s: { imageSearchTerms?: string[]; filmTitleSuggestions?: string[] }) =>
            (s.imageSearchTerms && s.imageSearchTerms.length > 0) ||
            (s.filmTitleSuggestions && s.filmTitleSuggestions.length > 0)
        )
      if (
        structureData?.type === 'storyboard' &&
        structureData.scenes.length > 0 &&
        scenesHaveSearchData
      ) {
        try {
          const imageResult = await searchStoryboardImages(structureData.scenes, { styleHint })
          if (imageResult.sceneMatches.length > 0) {
            sceneImageMatches = imageResult.sceneMatches
            logger.debug(
              {
                matchCount: sceneImageMatches.length,
                sourcesUsed: imageResult.sourcesUsed,
                duration: imageResult.totalDuration,
              },
              'Multi-source scene images attached to response'
            )
          }
        } catch (imageErr) {
          logger.warn(
            { err: imageErr },
            'Storyboard image search failed — continuing without scene images'
          )
        }
      }

      // ================================================================
      // 17. Strip markers from displayed content (including BRIEF_META)
      // ================================================================
      let cleanContent = response.content.replace(/\[TASK_READY\][\s\S]*?\[\/TASK_READY\]/, '')
      cleanContent = cleanContent
        .replace(/\[STORYBOARD\][\s\S]*?\[\/STORYBOARD\]/g, '')
        .replace(/\[LAYOUT\][\s\S]*?\[\/LAYOUT\]/g, '')
        .replace(/\[CALENDAR\][\s\S]*?\[\/CALENDAR\]/g, '')
        .replace(/\[DESIGN_SPEC\][\s\S]*?\[\/DESIGN_SPEC\]/g, '')
        .replace(/\[STRATEGIC_REVIEW\][\s\S]*?\[\/STRATEGIC_REVIEW\]/g, '')
        .replace(/\[STYLE_CARDS\][\s\S]*?\[\/STYLE_CARDS\]/g, '')
        .replace(/\[DELIVERABLE_STYLES[^\]]*\]/g, '')
        .replace(/\[ASSET_REQUEST\][\s\S]*?\[\/ASSET_REQUEST\]/g, '')
        .replace(/\[\/ASSET_REQUEST\]/g, '') // Orphaned closing tags
        .replace(/\[BRIEF_META\][\s\S]*?\[\/BRIEF_META\]/g, '')
        .replace(/\[\/BRIEF_META\]/g, '') // Orphaned closing tags
        .replace(/\[GLOBAL_STYLES\][\s\S]*?\[\/GLOBAL_STYLES\]/g, '')
        .replace(/\[\/GLOBAL_STYLES\]/g, '') // Orphaned closing tags
        .trim()

      // Enrich style-direction quick options with representative Pexels images.
      // Detection is content-based (not stage-based) because the state machine
      // can advance past INSPIRATION in a single turn.
      const isStyleDirection =
        quickOptions &&
        quickOptions.options.length >= 2 &&
        (() => {
          // Only enrich with images when the question explicitly asks about
          // style, visual direction, aesthetic, or inspiration — NOT for
          // general questions like target audience, goals, etc.
          const q = (quickOptions.question || '').toLowerCase()
          return /style|visual direction|aesthetic|look and feel|inspiration|mood|vibe/.test(q)
        })()
      if (isStyleDirection && quickOptions) {
        try {
          const enriched = await Promise.all(
            quickOptions.options.map(async (option) => {
              const label = typeof option === 'string' ? option : option.label
              // Skip non-style options (confirmations like "That works", "Skip")
              if (/^(that works|skip|yes|no|sure|go ahead|sounds good)/i.test(label)) {
                return option
              }
              const query = `${label} design style aesthetic`
              const photos = await searchPexelsForScene(query, 1)
              if (photos.length > 0) {
                return { label, imageUrl: photos[0].url }
              }
              return option
            })
          )
          const hasImages = enriched.some(
            (o) => typeof o === 'object' && o !== null && 'imageUrl' in o && o.imageUrl
          )
          if (hasImages) {
            quickOptions = { question: quickOptions.question, options: enriched }
          }
        } catch (enrichErr) {
          logger.debug({ err: enrichErr }, 'Quick option image enrichment failed — using text-only')
        }
      }

      return NextResponse.json({
        content: cleanContent,
        taskProposal,
        styleReferences,
        deliverableStyles,
        deliverableStyleMarker,
        selectedStyles,
        quickOptions,
        videoReferences,
        structureData,
        strategicReviewData,
        globalStyles,
        sceneImageMatches,
        assetRequest: response.assetRequest,
        briefingState: updatedBriefingState ?? clientBriefingState,
      })
    },
    { endpoint: 'POST /api/chat' }
  )
}

// Apply chat rate limiting (30 req/min)
export const POST = withRateLimit(handler, 'chat', config.rateLimits.chat)
