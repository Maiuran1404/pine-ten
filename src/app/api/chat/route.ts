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
import { calibrateTone } from '@/lib/ai/briefing-tone'
import { buildSystemPrompt, type BrandContext } from '@/lib/ai/briefing-prompts'
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
  getFormatReinforcement,
  getStrategicReviewReinforcement,
  type StructureType,
} from '@/lib/ai/briefing-response-parser'
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

      // ====================================================================
      // STATE MACHINE PIPELINE
      // When client provides briefingState, runs the pipeline alongside
      // the existing chat() call.
      // ====================================================================

      let updatedBriefingState: SerializedBriefingState | undefined
      let stateMachineOverride: { systemPrompt: string; stage?: string } | undefined
      let preAiInference: ReturnType<typeof inferFromMessage> | undefined

      if (clientBriefingState) {
        try {
          const lastUserMessage = messages[messages.length - 1]?.content || ''
          const briefingState: BriefingState = deserialize(clientBriefingState)

          // 1. Run inference on latest user message (field population only, NOT for transitions)
          const inference = inferFromMessage({
            message: lastUserMessage,
            conversationHistory: messages.slice(0, -1).map((m: { content: string }) => m.content),
          })
          preAiInference = inference // Store for post-AI fallback

          // 2. Fetch brand audiences for inference
          const brandAudiences: InferredAudience[] = company?.id
            ? (
                await db
                  .select()
                  .from(audiencesTable)
                  .where(eq(audiencesTable.companyId, company.id))
              ).map((a) => ({
                name: a.name,
                isPrimary: a.isPrimary,
                demographics: a.demographics as InferredAudience['demographics'],
                psychographics: a.psychographics as InferredAudience['psychographics'],
                confidence: 1.0,
              }))
            : []

          // 3. Apply inference to LiveBrief
          briefingState.brief = applyInferenceToBrief(
            briefingState.brief,
            inference,
            brandAudiences,
            lastUserMessage
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
          // so INSPIRATION → STRUCTURE transition works.
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
          const brandContext: BrandContext = {
            companyName: company?.name,
            industry: company?.industry ?? undefined,
            brandDescription: company?.description ?? undefined,
          }
          let systemPrompt = buildSystemPrompt(briefingState, brandContext)

          // Add scene feedback hint: when user gives feedback on specific scenes during STRUCTURE,
          // instruct the AI to regenerate the full storyboard with changes applied
          const lastUserContent = messages[messages.length - 1]?.content || ''
          if (briefingState.stage === 'STRUCTURE' && /\[Feedback on Scene/.test(lastUserContent)) {
            systemPrompt +=
              '\n\nIMPORTANT: The user is giving feedback on specific storyboard scenes. ' +
              'Apply their feedback and regenerate the FULL [STORYBOARD] block with all scenes, ' +
              'incorporating the requested changes. Always output the complete updated storyboard.'
          }

          stateMachineOverride = { systemPrompt, stage: briefingState.stage }

          // 9. Serialize updated state for response
          updatedBriefingState = serialize(briefingState)
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
      const quickOptions = response.quickOptions

      // Parse structured output from AI response when state machine is at STRUCTURE or STRATEGIC_REVIEW
      let structureData = undefined
      let strategicReviewData = undefined

      if (clientBriefingState) {
        try {
          const briefingState: BriefingState = deserialize(
            updatedBriefingState ?? clientBriefingState
          )

          // ================================================================
          // 10. Parse [BRIEF_META] from AI response for stage transitions
          // ================================================================
          const briefMetaResult = parseBriefMeta(response.content)
          if (briefMetaResult.success && briefMetaResult.data) {
            // 11. Validate declared stage against legal transitions
            const declaredStage = briefMetaResult.data.stage
            const legal = getLegalTransitions(briefingState.stage)
            if (legal.includes(declaredStage)) {
              // Guard: Don't auto-advance to STRATEGIC_REVIEW in the same response
              // that outputs structure data. User should interact with structure first.
              const blockingAdvance =
                briefingState.stage === 'STRUCTURE' && declaredStage === 'STRATEGIC_REVIEW'

              if (blockingAdvance) {
                // Stay in STRUCTURE — the advance will happen on the next user turn
                briefingState.turnsInCurrentStage += 1
              } else if (declaredStage !== briefingState.stage) {
                briefingState.stage = declaredStage
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
            // BRIEF_META missing or failed — fallback to evaluateTransitions()
            console.warn(
              `[chat/route] BRIEF_META missing from AI response at stage=${briefingState.stage}, turn=${briefingState.turnsInCurrentStage}. Falling back to evaluateTransitions.`
            )
            logger.debug(
              { parseError: briefMetaResult.parseError },
              'BRIEF_META not found — falling back to evaluateTransitions'
            )
            if (preAiInference) {
              const nextStage = evaluateTransitions(briefingState, preAiInference)
              if (nextStage !== briefingState.stage) {
                briefingState.stage = nextStage
                briefingState.turnsInCurrentStage = 0
              } else {
                briefingState.turnsInCurrentStage += 1
                // Force-advance if stuck in the same stage for too many turns
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
            if (
              (briefingState.stage === 'REVIEW' || briefingState.stage === 'DEEPEN') &&
              /\b(yes|yeah|yep|sure|go ahead|do it|ready|let'?s?\s*(go|submit|do)|submit\s*(this|it|now|the|my)?|send\s*(this|it)|confirm|looks?\s*good)\b/i.test(
                lastMsg
              )
            ) {
              briefingState.stage = 'SUBMIT'
              briefingState.turnsInCurrentStage = 0
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
            }
          }

          // Parse strategic review
          const reviewParsed = parseStrategicReview(response.content)
          if (reviewParsed.success && reviewParsed.data) {
            strategicReviewData = reviewParsed.data
            briefingState.strategicReview = reviewParsed.data
          }

          // ================================================================
          // 14-15. Auto-advance on structure/review parse
          // ================================================================

          // NOTE: We intentionally do NOT auto-advance STRUCTURE -> STRATEGIC_REVIEW here.
          // The structure response should stay in STRUCTURE stage so the user can interact
          // with the storyboard/layout first. STRATEGIC_REVIEW comes on the next user turn.

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
            !structureData &&
            structureType &&
            briefingState.turnsInCurrentStage === 0
          ) {
            logger.debug(
              { structureType },
              'Structure not parsed at STRUCTURE stage — retrying with format reinforcement'
            )
            try {
              const reinforcement = getFormatReinforcement(structureType)
              const retryResponse = await chat(
                [
                  ...messages,
                  { role: 'assistant', content: response.content },
                  { role: 'user', content: reinforcement },
                ],
                session.user.id,
                chatContext,
                stateMachineOverride
              )
              const retryParsed = parseStructuredOutput(retryResponse.content, structureType)
              if (retryParsed.success && retryParsed.data) {
                structureData = retryParsed.data
                briefingState.structure = retryParsed.data
                // Stay in STRUCTURE — user should interact with the structure first
              }
            } catch (retryErr) {
              logger.warn({ err: retryErr }, 'Structure format reinforcement retry failed')
            }
          }

          // ================================================================
          // 16b. Strategic review retry with format reinforcement (single attempt)
          // ================================================================
          if (
            briefingState.stage === 'STRATEGIC_REVIEW' &&
            !strategicReviewData &&
            briefingState.turnsInCurrentStage === 0
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
                const retryResponse = await chat(
                  [
                    ...messages,
                    { role: 'assistant', content: response.content },
                    { role: 'user', content: reinforcement },
                  ],
                  session.user.id,
                  chatContext,
                  stateMachineOverride
                )
                const retryParsed = parseStrategicReview(retryResponse.content)
                if (retryParsed.success && retryParsed.data) {
                  strategicReviewData = retryParsed.data
                  briefingState.strategicReview = retryParsed.data
                  // Auto-advance after successful retry
                  briefingState.stage = 'MOODBOARD'
                  briefingState.turnsInCurrentStage = 0
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
        .replace(/\[BRIEF_META\][\s\S]*?\[\/BRIEF_META\]/g, '')
        .replace(/\[\/BRIEF_META\]/g, '') // Orphaned closing tags
        .trim()

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
        briefingState: updatedBriefingState ?? clientBriefingState,
      })
    },
    { endpoint: 'POST /api/chat' }
  )
}

// Apply chat rate limiting (30 req/min)
export const POST = withRateLimit(handler, 'chat', config.rateLimits.chat)
