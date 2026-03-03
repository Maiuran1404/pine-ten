/**
 * Post-AI processing pipeline for the chat API route.
 * Handles: marker parsing, BRIEF_META extraction, retry, stage derivation.
 */
import 'server-only'

import { logger } from '@/lib/logger'
import {
  type BriefingState,
  type BriefingStage,
  type DeliverableCategory,
  type StructureData,
  type SerializedBriefingState,
  deserialize,
  serialize,
  deriveStage,
  getLegalTransitions,
} from '@/lib/ai/briefing-state-machine'
import {
  parseStructuredOutput,
  parseStrategicReview,
  parseBriefMeta,
  parseGlobalStyles,
  parseVideoNarrative,
  type StructureType,
} from '@/lib/ai/briefing-response-parser'
import { parseWithRetry } from './parse-with-retry'
import type { BrandContext } from '@/lib/ai/briefing-prompts'
import type { ChatContext, ChatMessage } from '@/lib/ai/chat'
import type { PostProcessResult } from './types'

interface PostProcessInput {
  responseContent: string
  messages: Array<{ role: string; content: string; attachments?: unknown[] }>
  clientBriefingState: SerializedBriefingState
  updatedBriefingState?: SerializedBriefingState
  clientLatestStoryboard?: { type: string; scenes?: unknown[] }
  brandContext: BrandContext
  chatContext: ChatContext
  userId: string
}

/** Run all post-AI processing: parse markers, retry, derive stage */
export async function runPostAiPipeline(input: PostProcessInput): Promise<PostProcessResult> {
  const {
    messages,
    clientBriefingState,
    updatedBriefingState,
    clientLatestStoryboard,
    brandContext,
    chatContext,
    userId,
  } = input

  let { responseContent } = input

  try {
    const briefingState: BriefingState = deserialize(updatedBriefingState ?? clientBriefingState)

    // Sync client-side storyboard edits (post-AI path)
    if (
      clientLatestStoryboard?.type === 'storyboard' &&
      Array.isArray(clientLatestStoryboard.scenes) &&
      clientLatestStoryboard.scenes.length > 0 &&
      (!briefingState.structure ||
        briefingState.structure.type !== 'storyboard' ||
        !('scenes' in briefingState.structure))
    ) {
      briefingState.structure = clientLatestStoryboard as StructureData
    }

    // Track context for retry
    const lastContent = messages[messages.length - 1]?.content || ''
    const isSceneFeedback = /\[Feedback on Scene/.test(lastContent)
    const isRegenerationRequest = /regenerate.*storyboard/i.test(lastContent)
    const stageBeforePhaseA = briefingState.stage

    // Parse [BRIEF_META]
    const briefMetaResult = parseBriefMeta(responseContent)
    if (briefMetaResult.success && briefMetaResult.data) {
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
          briefingState.deliverableCategory === 'unknown' ||
          briefingState.stage === 'TASK_TYPE')
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
    }

    // Normalize variant markers
    responseContent = responseContent
      .replace(/\[VIDEO_STORYBOARD\]/g, '[STORYBOARD]')
      .replace(/\[\/VIDEO_STORYBOARD\]/g, '[/STORYBOARD]')

    // Parse structure markers
    const categoryToStructureType: Record<string, StructureType> = {
      video: 'storyboard',
      website: 'layout',
      content: 'calendar',
      design: 'single_design',
      brand: 'single_design',
    }

    let structureType: StructureType | undefined = briefingState.deliverableCategory
      ? categoryToStructureType[briefingState.deliverableCategory]
      : undefined
    if (!structureType) {
      if (responseContent.includes('[STORYBOARD]')) structureType = 'storyboard'
      else if (responseContent.includes('[LAYOUT]')) structureType = 'layout'
      else if (responseContent.includes('[CALENDAR]')) structureType = 'calendar'
      else if (responseContent.includes('[DESIGN_SPEC]')) structureType = 'single_design'
    }

    let structureData: StructureData | undefined
    if (structureType) {
      const parsed = parseStructuredOutput(responseContent, structureType)
      if (parsed.success && parsed.data) {
        structureData = parsed.data
        briefingState.structure = parsed.data

        if (!briefingState.deliverableCategory || briefingState.deliverableCategory === 'unknown') {
          const typeToCategory: Record<string, DeliverableCategory> = {
            storyboard: 'video',
            layout: 'website',
            calendar: 'content',
            single_design: 'design',
          }
          const inferred = typeToCategory[parsed.data.type]
          if (inferred) briefingState.deliverableCategory = inferred
        }
      }
    }

    // Parse strategic review
    let strategicReviewData: PostProcessResult['strategicReviewData']
    const reviewParsed = parseStrategicReview(responseContent)
    if (reviewParsed.success && reviewParsed.data) {
      strategicReviewData = reviewParsed.data
      briefingState.strategicReview = reviewParsed.data
    }

    // Parse global styles (website only)
    let globalStyles: unknown
    if (briefingState.deliverableCategory === 'website') {
      const parsedGlobalStyles = parseGlobalStyles(responseContent)
      if (parsedGlobalStyles) {
        globalStyles = parsedGlobalStyles
        briefingState.websiteGlobalStyles = parsedGlobalStyles
      }
    }

    // Parse video narrative
    let videoNarrativeData: PostProcessResult['videoNarrativeData']
    if (briefingState.deliverableCategory === 'video') {
      const narrativeParsed = parseVideoNarrative(responseContent)
      if (narrativeParsed.success && narrativeParsed.data) {
        videoNarrativeData = narrativeParsed.data
        briefingState.videoNarrative = narrativeParsed.data
      }

      // Narrative approval is set exclusively by the client-side handleApproveNarrative
      // (via stateOverride: { narrativeApproved: true }). The previous regex heuristic
      // that auto-approved based on user message content (e.g. "looks good") was removed
      // because it caused premature stage jumps — the AI could generate storyboard data
      // in a refinement response, and the pattern matcher would approve the narrative,
      // skipping the style selection step entirely.
    }

    // Parse [REGENERATE_IMAGES: X,Y] marker for explicit image regeneration
    let scenesToRegenerate: number[] | undefined
    const regenMatch = responseContent.match(/\[REGENERATE_IMAGES:\s*([\d,\s]+)\]/)
    if (regenMatch) {
      scenesToRegenerate = regenMatch[1]
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n > 0)
      if (!scenesToRegenerate.length) scenesToRegenerate = undefined
    }

    // Unified retry with shared budget
    const retryResult = await parseWithRetry({
      briefingState,
      brandContext,
      messages: messages as ChatMessage[],
      responseContent,
      userId,
      chatContext,
      stageBeforePhaseA,
      structureData,
      strategicReviewData,
      videoNarrativeData,
      structureType,
      isSceneFeedback,
      isRegenerationRequest,
      narrativeApproved: briefingState.narrativeApproved ?? false,
      clientLatestStoryboard:
        clientLatestStoryboard?.type === 'storyboard'
          ? (clientLatestStoryboard as StructureData)
          : null,
    })

    structureData = retryResult.structureData ?? undefined
    strategicReviewData = retryResult.strategicReviewData ?? undefined
    videoNarrativeData = retryResult.videoNarrativeData ?? undefined

    // Honor AI-declared stage for terminal stages (REVIEW/DEEPEN → SUBMIT).
    // deriveStage() cannot exit REVIEW (exitWhen: () => false) or DEEPEN (no exitWhen).
    // The only way to reach SUBMIT from these stages is via AI declaration or client dispatch.
    const TERMINAL_STAGES: Set<BriefingStage> = new Set(['REVIEW', 'DEEPEN'])
    if (
      briefMetaResult.success &&
      briefMetaResult.data?.stage &&
      TERMINAL_STAGES.has(briefingState.stage)
    ) {
      const declaredStage = briefMetaResult.data.stage as BriefingStage
      const legal = getLegalTransitions(briefingState.stage)
      if (legal.includes(declaredStage) && declaredStage !== briefingState.stage) {
        briefingState.stage = declaredStage
        briefingState.turnsInCurrentStage = 0
      }
    }

    // Derive stage (single call, after ALL parsing + retries)
    if (briefingState.stage !== 'SUBMIT') {
      const previousStage = briefingState.stage
      const derived = deriveStage(briefingState)
      briefingState.stage = derived
      if (briefingState.stage !== previousStage) {
        briefingState.turnsInCurrentStage = 0
      } else {
        briefingState.turnsInCurrentStage += 1
      }
    }

    return {
      structureData,
      strategicReviewData,
      globalStyles,
      videoNarrativeData,
      scenesToRegenerate,
      updatedBriefingState: serialize(briefingState),
      parseFailures: retryResult.failures?.length ? retryResult.failures : undefined,
    }
  } catch (postAiErr) {
    logger.error({ err: postAiErr }, 'Post-AI state machine pipeline failed')
    return {
      updatedBriefingState: updatedBriefingState ?? clientBriefingState,
    }
  }
}
