/**
 * Pre-processing pipeline for the chat API route.
 * Handles: auth context, brand context, state machine inference, prompt building.
 */
import 'server-only'

import { logger } from '@/lib/logger'
import { db } from '@/db'
import { users, audiences as audiencesTable, deliverableStyleReferences } from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'
import type { ChatContext } from '@/lib/ai/chat'
import {
  inferFromMessage,
  applyInferenceToBrief,
  detectBrandMention,
  analyzeRequestCompleteness,
} from '@/lib/ai/inference-engine'
import {
  type BriefingState,
  type SerializedBriefingState,
  deserialize,
  serialize,
  deriveStage,
} from '@/lib/ai/briefing-state-machine'
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
import { extractStyleContext } from '@/lib/ai/chat-context'
import type { InferredAudience } from '@/components/onboarding/types'
import type { ChatRequestBody, PipelineContext } from './types'

/** Build brand context from user's company data */
export async function buildBrandContext(userId: string): Promise<{
  brandContext: BrandContext
  brandAudiences: InferredAudience[]
  company: Record<string, unknown> | null
}> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { company: true },
  })
  const company = user?.company as Record<string, unknown> | null

  const brandAudiences: InferredAudience[] = company?.id
    ? (
        await db
          .select()
          .from(audiencesTable)
          .where(eq(audiencesTable.companyId, company.id as string))
      ).map((a) => ({
        name: a.name,
        isPrimary: a.isPrimary,
        demographics: a.demographics as InferredAudience['demographics'],
        psychographics: a.psychographics as InferredAudience['psychographics'],
        confidence: 1.0,
      }))
    : []

  const brandContext: BrandContext = {
    companyName: company?.name as string | undefined,
    industry: (company?.industry as string) ?? undefined,
    toneOfVoice: deriveToneOfVoice(company as Parameters<typeof deriveToneOfVoice>[0]),
    brandDescription: (company?.description as string) ?? undefined,
    tagline: (company?.tagline as string) ?? undefined,
    industryArchetype: (company?.industryArchetype as string) ?? undefined,
    keywords: (company?.keywords as string[]) ?? undefined,
    colors: company
      ? {
          primary: (company.primaryColor as string) ?? undefined,
          secondary: (company.secondaryColor as string) ?? undefined,
          accent: (company.accentColor as string) ?? undefined,
        }
      : undefined,
    typography: company
      ? {
          primary: (company.primaryFont as string) ?? undefined,
          secondary: (company.secondaryFont as string) ?? undefined,
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

  return { brandContext, brandAudiences, company }
}

/** Build chat context from first message analysis */
export function buildChatContext(
  body: ChatRequestBody,
  company: Record<string, unknown> | null
): ChatContext {
  const chatContext: ChatContext = {}
  const { messages, brief } = body

  const isFirstMessage = messages?.length === 1
  if (isFirstMessage && messages?.[0]?.role === 'user') {
    const firstMessage = messages[0].content
    if (company?.name) {
      const brandDetection = detectBrandMention(
        firstMessage,
        company.name as string,
        (company.keywords as string[]) || []
      )
      if (brandDetection.detected) {
        chatContext.brandDetection = brandDetection
      }
    }
    const inference = inferFromMessage({ message: firstMessage })
    chatContext.requestCompleteness = analyzeRequestCompleteness(inference)
  }

  if (brief) {
    chatContext.confirmedFields = {
      platform: brief.platform?.source === 'confirmed' ? brief.platform.value : undefined,
      intent: brief.intent?.source === 'confirmed' ? brief.intent.value : undefined,
      topic: brief.topic?.source === 'confirmed' ? brief.topic.value : undefined,
      audience: brief.audience?.value?.name,
      contentType: brief.contentType?.source === 'confirmed' ? brief.contentType.value : undefined,
    }
  }

  return chatContext
}

/** Run the pre-AI state machine pipeline: inference, extraction, tone, prompt building */
export function runPreAiPipeline(
  body: ChatRequestBody,
  brandContext: BrandContext,
  brandAudiences: InferredAudience[]
): {
  updatedBriefingState?: SerializedBriefingState
  stateMachineOverride?: { systemPrompt: string; stage?: string }
  styleHint?: string
} {
  const {
    messages,
    briefingState: clientBriefingState,
    latestStoryboard: clientLatestStoryboard,
  } = body

  if (!clientBriefingState) return {}

  try {
    const lastUserMessage = messages[messages.length - 1]?.content || ''
    const briefingState: BriefingState = deserialize(clientBriefingState)

    // Sync client-side storyboard edits
    if (
      clientLatestStoryboard?.type === 'storyboard' &&
      Array.isArray(clientLatestStoryboard.scenes) &&
      (clientLatestStoryboard.scenes as unknown[]).length > 0
    ) {
      briefingState.structure = clientLatestStoryboard as BriefingState['structure']
    }

    // 1. Run inference on latest user message
    const inference = inferFromMessage({
      message: lastUserMessage,
      conversationHistory: messages.slice(0, -1).map((m) => m.content),
    })

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

    // Inject "launch" keyword
    if (/\b(launch|launching)\b/i.test(lastUserMessage)) {
      briefingState.styleKeywords = [...new Set([...briefingState.styleKeywords, 'launch'])]
    }

    // 4b. Extract target video duration from user message
    if (!briefingState.targetDurationSeconds) {
      const durationMatch = lastUserMessage.match(/(\d+)\s*[-–]?\s*(?:second|sec|s)\b/i)
      if (durationMatch) {
        briefingState.targetDurationSeconds = parseInt(durationMatch[1], 10)
      }
    }

    // 5. Resolve deliverable category
    const shouldResolveCategory =
      !briefingState.deliverableCategory ||
      briefingState.deliverableCategory === 'unknown' ||
      briefingState.stage === 'TASK_TYPE'
    if (shouldResolveCategory) {
      const category = resolveDeliverableCategory(inference)
      if (category !== 'unknown') {
        briefingState.deliverableCategory = category
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

    // 7. Increment message count
    briefingState.messageCount += 1

    // 8. Build system prompt
    let systemPrompt = buildSystemPrompt(briefingState, brandContext)

    // Add scene feedback hint
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

      const storyboardForHint =
        (clientLatestStoryboard?.type === 'storyboard' && clientLatestStoryboard) ||
        (briefingState.structure?.type === 'storyboard' && briefingState.structure) ||
        null

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

    const stateMachineOverride = { systemPrompt, stage: briefingState.stage }
    const updatedBriefingState = serialize(briefingState)

    // 9b. Build style hint
    let styleHint: string | undefined
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

    return { updatedBriefingState, stateMachineOverride, styleHint }
  } catch (err) {
    logger.error({ err }, 'State machine pipeline failed — using default AI prompt')
    return {}
  }
}

/** Build full pipeline context for use by downstream modules */
export async function buildPipelineContext(
  userId: string,
  body: ChatRequestBody
): Promise<PipelineContext> {
  const { brandContext, brandAudiences, company } = await buildBrandContext(userId)
  const chatContext = buildChatContext(body, company)
  const styleContext = extractStyleContext(body.messages || [])

  // Apply confirmed style selections to briefing state before running the pipeline.
  // When the user confirms a style in the UI, the client sends selectedDeliverableStyles
  // (style IDs) but hasn't updated brief.visualDirection.selectedStyles yet (it does so
  // after the API response). Without this injection, deriveStage() can't advance past
  // INSPIRATION and the AI keeps asking style questions instead of generating the storyboard.
  if (body.selectedDeliverableStyles?.length && body.briefingState) {
    const existingStyles = body.briefingState.brief?.visualDirection?.selectedStyles ?? []
    const newIds = body.selectedDeliverableStyles.filter(
      (id) => !existingStyles.some((s) => s.id === id)
    )
    if (newIds.length > 0) {
      try {
        const styles = await db
          .select()
          .from(deliverableStyleReferences)
          .where(inArray(deliverableStyleReferences.id, newIds))
        if (styles.length > 0) {
          const mapped = styles.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            imageUrl: s.imageUrl,
            deliverableType: s.deliverableType,
            styleAxis: s.styleAxis,
            subStyle: s.subStyle,
            semanticTags: s.semanticTags || [],
            promptGuide: s.promptGuide ?? undefined,
          }))
          body.briefingState = {
            ...body.briefingState,
            brief: {
              ...body.briefingState.brief,
              visualDirection: {
                selectedStyles: [...existingStyles, ...mapped],
                moodKeywords: body.briefingState.brief?.visualDirection?.moodKeywords ?? [],
                colorPalette: body.briefingState.brief?.visualDirection?.colorPalette ?? [],
                typography: body.briefingState.brief?.visualDirection?.typography ?? {
                  primary: '',
                  secondary: '',
                },
                avoidElements: body.briefingState.brief?.visualDirection?.avoidElements ?? [],
              },
            },
          }
          // Derive the new stage so the AI prompt reflects the advancement.
          // Without this, the AI would still get the INSPIRATION prompt even though
          // styles are populated, because the client-sent stage is stale.
          const tempState = deserialize(body.briefingState)
          const derivedStage = deriveStage(tempState)
          if (derivedStage !== body.briefingState.stage) {
            body.briefingState = {
              ...body.briefingState,
              stage: derivedStage,
              turnsInCurrentStage: 0,
            }
            logger.debug(
              { from: tempState.stage, to: derivedStage },
              'Advanced stage after style injection'
            )
          }

          logger.debug(
            { count: mapped.length, ids: newIds },
            'Injected confirmed styles into briefing state before pipeline'
          )
        }
      } catch (err) {
        logger.error({ err }, 'Failed to look up confirmed styles')
      }
    }
  }

  const { updatedBriefingState, stateMachineOverride, styleHint } = runPreAiPipeline(
    body,
    brandContext,
    brandAudiences
  )

  // Stage-based gating
  const STYLE_ELIGIBLE_STAGES = new Set(['INSPIRATION', 'MOODBOARD'])
  const POST_STYLE_STAGES = new Set(['REVIEW', 'DEEPEN', 'SUBMIT'])
  const currentStage = updatedBriefingState?.stage ?? body.briefingState?.stage
  const isStyleEligible = currentStage
    ? STYLE_ELIGIBLE_STAGES.has(currentStage) && !POST_STYLE_STAGES.has(currentStage)
    : true

  return {
    userId,
    body,
    chatContext,
    brandContext,
    brandAudiences,
    styleContext,
    updatedBriefingState,
    stateMachineOverride,
    styleHint,
    isStyleEligible,
  }
}
