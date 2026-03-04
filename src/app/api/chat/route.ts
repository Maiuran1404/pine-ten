import { NextRequest, NextResponse } from 'next/server'
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
import { logger } from '@/lib/logger'
import { chatRouteSchema } from '@/lib/validations'
// Stock image search removed — DALL-E generation now handled client-side after INSPIRATION stage
import { buildPipelineContext } from '@/lib/ai/chat-pipeline/pre-process'
import { runPostAiPipeline } from '@/lib/ai/chat-pipeline/post-process'
import { deduplicateResponse, stripMarkers } from '@/lib/ai/chat-pipeline/response-builder'
import { handleStyleShortcut, processStylesAndVideo } from '@/lib/ai/chat-pipeline/style-processing'
import type { PostProcessResult } from '@/lib/ai/chat-pipeline/types'

async function handler(request: NextRequest) {
  return withErrorHandling(
    async () => {
      const session = await requireAuth()
      const body = chatRouteSchema.parse(await request.json())

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
        ctx.stateMachineOverride,
        ctx.brandContext
      )
      response.content = deduplicateResponse(response.content)

      // Parse task proposal from AI response
      const taskProposal = parseTaskFromChat(response.content)

      // Run independent post-AI pipelines in parallel:
      // - Style reference lookup
      // - Style + video processing
      // - Post-AI pipeline (marker parsing, retry, stage derivation)
      const [styleReferences, stylesAndVideo, postResult] = await Promise.all([
        // Get style reference images if categories were mentioned
        (response.styleReferences && response.styleReferences.length > 0
          ? getStyleReferencesByCategory(response.styleReferences)
          : Promise.resolve(undefined)
        ).catch(() => undefined),

        // Style + video processing (deliverable styles, auto-detect, video references)
        processStylesAndVideo({
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
        }).catch((err) => {
          logger.error(err, 'Style/video processing failed')
          return {
            deliverableStyles: undefined,
            deliverableStyleMarker: undefined,
            videoReferences: undefined,
          }
        }),

        // Post-AI pipeline: marker parsing, retry, stage derivation
        (ctx.body.briefingState
          ? runPostAiPipeline({
              responseContent: response.content,
              messages: ctx.body.messages,
              clientBriefingState: ctx.body.briefingState,
              updatedBriefingState: ctx.updatedBriefingState,
              clientLatestStoryboard: ctx.body.latestStoryboard,
              brandContext: ctx.brandContext,
              chatContext: ctx.chatContext,
              userId: session.user.id,
            })
          : Promise.resolve({} as PostProcessResult)
        ).catch((err) => {
          logger.error(err, 'Post-AI pipeline failed')
          return {} as PostProcessResult
        }),
      ])

      const { deliverableStyles, deliverableStyleMarker, videoReferences } = stylesAndVideo

      // Strip structured markers from displayed content
      const cleanContent = stripMarkers(response.content, {
        structureData: postResult.structureData,
        clientStage: ctx.body.briefingState?.stage,
        clientCategory: ctx.body.briefingState?.deliverableCategory ?? undefined,
      })

      return NextResponse.json({
        content: cleanContent,
        taskProposal,
        styleReferences,
        deliverableStyles,
        deliverableStyleMarker,
        selectedStyles: ctx.body.selectedStyles,
        videoReferences,
        structureData: postResult.structureData,
        strategicReviewData: postResult.strategicReviewData,
        globalStyles: postResult.globalStyles,
        videoNarrativeData: postResult.videoNarrativeData,
        scenesToRegenerate: postResult.scenesToRegenerate,
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
