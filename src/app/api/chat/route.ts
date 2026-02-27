import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import {
  chat,
  parseTaskFromChat,
  getStyleReferencesByCategory,
  type ChatMessage,
} from '@/lib/ai/chat'
import { withRateLimit } from '@/lib/rate-limit'
import { config } from '@/lib/config'
import { requireAuth } from '@/lib/require-auth'
import { withErrorHandling } from '@/lib/errors'
import { searchStoryboardImages, type SceneImageMatch } from '@/lib/ai/storyboard-image-search'
import { buildPipelineContext } from '@/lib/ai/chat-pipeline/pre-process'
import { runPostAiPipeline } from '@/lib/ai/chat-pipeline/post-process'
import {
  deduplicateResponse,
  stripMarkers,
  enrichQuickOptions,
} from '@/lib/ai/chat-pipeline/response-builder'
import { handleStyleShortcut, processStylesAndVideo } from '@/lib/ai/chat-pipeline/style-processing'
import type { PostProcessResult } from '@/lib/ai/chat-pipeline/types'

async function handler(request: NextRequest) {
  return withErrorHandling(
    async () => {
      const session = await requireAuth()
      const body = await request.json()

      // Style shortcut: early return for more/different style requests (no AI call needed)
      const shortcutResponse = await handleStyleShortcut(body, session.user.id)
      if (shortcutResponse) return shortcutResponse

      // Pre-AI pipeline: brand context, inference, state machine, prompt building
      const ctx = await buildPipelineContext(session.user.id, body)

      // AI chat call with optional state machine override
      const response = await chat(
        ctx.body.messages as ChatMessage[],
        session.user.id,
        ctx.chatContext,
        ctx.stateMachineOverride
      )
      response.content = deduplicateResponse(response.content)

      // Parse task proposal from AI response
      const taskProposal = parseTaskFromChat(response.content)

      // Get style reference images if categories were mentioned
      let styleReferences = undefined
      if (response.styleReferences && response.styleReferences.length > 0) {
        styleReferences = await getStyleReferencesByCategory(response.styleReferences)
      }

      // Style + video processing (deliverable styles, auto-detect, video references)
      const { deliverableStyles, deliverableStyleMarker, videoReferences } =
        await processStylesAndVideo({
          responseContent: response.content,
          aiStyleMarker: response.deliverableStyleMarker,
          isStyleEligible: ctx.isStyleEligible,
          moodboardHasStyles: ctx.body.moodboardHasStyles ?? false,
          currentStage: ctx.updatedBriefingState?.stage ?? ctx.body.briefingState?.stage,
          updatedBriefingState: ctx.updatedBriefingState,
          styleContext: ctx.styleContext,
          styleOffset: ctx.body.styleOffset,
          excludeStyleAxes: ctx.body.excludeStyleAxes,
          userId: session.user.id,
          lastUserMessage: ctx.body.messages[ctx.body.messages.length - 1]?.content || '',
          confirmedFields: ctx.chatContext.confirmedFields,
          brief: ctx.body.brief,
        })

      // Post-AI pipeline: marker parsing, retry, stage derivation
      let postResult: PostProcessResult = {}
      if (ctx.body.briefingState) {
        postResult = await runPostAiPipeline({
          responseContent: response.content,
          messages: ctx.body.messages,
          clientBriefingState: ctx.body.briefingState,
          updatedBriefingState: ctx.updatedBriefingState,
          clientLatestStoryboard: ctx.body.latestStoryboard,
          brandContext: ctx.brandContext,
          chatContext: ctx.chatContext,
          userId: session.user.id,
        })
      }

      // Scene image search (storyboard only)
      let sceneImageMatches: SceneImageMatch[] | undefined = undefined
      const scenesHaveSearchData =
        postResult.structureData?.type === 'storyboard' &&
        postResult.structureData.scenes.some(
          (s: { imageSearchTerms?: string[]; filmTitleSuggestions?: string[] }) =>
            (s.imageSearchTerms && s.imageSearchTerms.length > 0) ||
            (s.filmTitleSuggestions && s.filmTitleSuggestions.length > 0)
        )
      if (
        postResult.structureData?.type === 'storyboard' &&
        postResult.structureData.scenes.length > 0 &&
        scenesHaveSearchData
      ) {
        try {
          const imageResult = await searchStoryboardImages(postResult.structureData.scenes, {
            styleHint: ctx.styleHint,
          })
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

      // Strip structured markers from displayed content
      const cleanContent = stripMarkers(response.content, {
        structureData: postResult.structureData,
        clientStage: ctx.body.briefingState?.stage,
        clientCategory: ctx.body.briefingState?.deliverableCategory ?? undefined,
      })

      // Enrich style-direction quick options with representative images
      const quickOptions = await enrichQuickOptions(response.quickOptions)

      return NextResponse.json({
        content: cleanContent,
        taskProposal,
        styleReferences,
        deliverableStyles,
        deliverableStyleMarker,
        selectedStyles: ctx.body.selectedStyles,
        quickOptions,
        videoReferences,
        structureData: postResult.structureData,
        strategicReviewData: postResult.strategicReviewData,
        globalStyles: postResult.globalStyles,
        videoNarrativeData: postResult.videoNarrativeData,
        sceneImageMatches,
        assetRequest: response.assetRequest,
        briefingState: postResult.updatedBriefingState ?? ctx.body.briefingState,
        ...(postResult.parseFailures?.length ? { parseFailures: postResult.parseFailures } : {}),
      })
    },
    { endpoint: 'POST /api/chat' }
  )
}

// Apply chat rate limiting (30 req/min)
export const POST = withRateLimit(handler, 'chat', config.rateLimits.chat)
