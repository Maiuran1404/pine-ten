import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { chatTestRuns } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { generateSyntheticReply, isRunComplete } from '@/lib/ai/chat-test-engine'
import { getEnv } from '@/lib/env'
import { logger } from '@/lib/logger'
import {
  createInitialBriefingState,
  serialize,
  type SerializedBriefingState,
  type StrategicReviewData,
  type StructureData,
  type DeliverableCategory,
  type BriefingStage,
} from '@/lib/ai/briefing-state-machine'
import type { ChatTestScenario } from '@/lib/ai/chat-test-scenarios'

// =============================================================================
// CONSTANTS
// =============================================================================

/** After this many user turns stuck in the same stage, force advance to next stage */
const FORCE_ADVANCE_AFTER_TURNS = 8

/** Max messages to send to /api/chat to prevent AI context pollution */
const MAX_MESSAGES_TO_SEND = 16

const stepSchema = z.object({
  runId: z.string().uuid(),
})

// =============================================================================
// PENDING ACTION TYPES
// Mirrors what the real client does between turns (style selection, etc.)
// =============================================================================

interface PendingStyleSelection {
  type: 'style_selection'
  styleName: string
  styleId: string
  styleData: Record<string, unknown>
}

interface PendingVideoSelection {
  type: 'video_selection'
  videoName: string
  videoId: string
  videoData: Record<string, unknown>
}

type PendingAction = PendingStyleSelection | PendingVideoSelection

/**
 * Determine if there's a pending client-side action based on the last response.
 * Mirrors what the real client does — when deliverableStyles or videoReferences
 * are returned, the next step should select one.
 */
function determinePendingAction(
  chatData: Record<string, unknown>,
  moodboardHasStyles: boolean
): PendingAction | null {
  // Style selection (mirrors handleConfirmStyleSelection)
  if (!moodboardHasStyles && chatData.deliverableStyles) {
    const styles = chatData.deliverableStyles as Array<{
      id: string
      name: string
      [key: string]: unknown
    }>
    if (styles.length > 0) {
      const style = styles[0]
      return {
        type: 'style_selection',
        styleName: style.name,
        styleId: style.id,
        styleData: style as Record<string, unknown>,
      }
    }
  }

  // Video selection (mirrors handleSelectVideo)
  if (!moodboardHasStyles && chatData.videoReferences) {
    const videos = chatData.videoReferences as Array<{
      id: string
      name: string
      [key: string]: unknown
    }>
    if (videos.length > 0) {
      const video = videos[0]
      return {
        type: 'video_selection',
        videoName: video.name,
        videoId: video.id,
        videoData: video as Record<string, unknown>,
      }
    }
  }

  return null
}

/**
 * Merge structureData into briefingState (mirrors client local state merge).
 */
function mergeStructureData(
  briefingState: SerializedBriefingState,
  structureData: StructureData
): SerializedBriefingState {
  return {
    ...briefingState,
    structure: structureData,
  }
}

/**
 * Merge strategicReviewData and advance to MOODBOARD
 * (mirrors dispatch({ type: 'STAGE_RESPONSE', response: 'accept' })).
 */
function mergeStrategicReviewAndAdvance(
  briefingState: SerializedBriefingState,
  reviewData: StrategicReviewData
): SerializedBriefingState {
  return {
    ...briefingState,
    strategicReview: reviewData,
    stage: 'MOODBOARD',
    turnsInCurrentStage: 0,
  }
}

/**
 * Add style to visualDirection in briefingState
 * (mirrors addStyleToVisualDirection from use-brief).
 */
function addStyleToVisualDirection(
  briefingState: SerializedBriefingState,
  styleData: Record<string, unknown>
): SerializedBriefingState {
  const currentVD = briefingState.brief.visualDirection ?? {
    selectedStyles: [],
    moodKeywords: [],
    colorPalette: [],
    typography: { primary: '', secondary: '' },
    avoidElements: [],
  }

  // Don't add if already exists
  if (currentVD.selectedStyles.some((s: { id: string }) => s.id === styleData.id)) {
    return briefingState
  }

  return {
    ...briefingState,
    brief: {
      ...briefingState.brief,
      visualDirection: {
        ...currentVD,
        selectedStyles: [
          ...currentVD.selectedStyles,
          {
            id: (styleData.id as string) ?? '',
            name: (styleData.name as string) ?? '',
            description: (styleData.description as string | null) ?? null,
            imageUrl: (styleData.imageUrl as string) ?? '',
            deliverableType: (styleData.deliverableType as string) ?? '',
            styleAxis: (styleData.styleAxis as string) ?? '',
            subStyle: (styleData.subStyle as string | null) ?? null,
            semanticTags: (styleData.semanticTags as string[]) ?? [],
          },
        ],
      },
    },
  }
}

/**
 * Map scenario contentType to a DeliverableCategory.
 */
function scenarioToCategory(scenario: ChatTestScenario): DeliverableCategory {
  const ct = scenario.contentType?.toLowerCase() ?? ''
  if (['video', 'reel'].includes(ct)) return 'video'
  if (['banner', 'thumbnail', 'flyer', 'post', 'carousel'].includes(ct)) return 'design'
  if (ct === 'website') return 'website'
  return 'content'
}

/**
 * Ensure briefingState has scenario data seeded for fields the inference engine
 * may not have detected. The real client provides these via conversation, but
 * the synthetic test client's messages may lack sufficient signal.
 *
 * This is called before sending to /api/chat to prevent infinite loops where
 * the state machine can't advance because inference missed key fields.
 */
function ensureScenarioDataSeeded(
  state: SerializedBriefingState,
  scenario: ChatTestScenario,
  turnsInStage: number
): SerializedBriefingState {
  const updated = { ...state, brief: { ...state.brief } }

  // After 3+ turns in any stage, force-seed missing fields from scenario
  if (turnsInStage < 3) return updated

  // Seed taskType if missing
  if (!updated.brief.taskType.value || updated.brief.taskType.confidence < 0.75) {
    if (scenario.contentType) {
      updated.brief = {
        ...updated.brief,
        taskType: {
          value: 'single_asset' as const,
          confidence: 0.9,
          source: 'inferred' as const,
        },
      }
    }
  }

  // Seed intent if missing (map scenario intent to valid Intent type)
  if (!updated.brief.intent.value || updated.brief.intent.confidence < 0.75) {
    if (scenario.intent) {
      type ValidIntent =
        | 'signups'
        | 'authority'
        | 'awareness'
        | 'sales'
        | 'engagement'
        | 'education'
        | 'announcement'
      const intentMap: Record<string, ValidIntent> = {
        signups: 'signups',
        authority: 'authority',
        awareness: 'awareness',
        sales: 'sales',
        engagement: 'engagement',
        education: 'education',
        announcement: 'announcement',
      }
      const mappedIntent = intentMap[scenario.intent]
      if (mappedIntent) {
        updated.brief = {
          ...updated.brief,
          intent: {
            value: mappedIntent,
            confidence: 0.9,
            source: 'inferred' as const,
          },
        }
      }
    }
  }

  // Seed platform if missing (map scenario platform to valid Platform type)
  if (!updated.brief.platform.value) {
    if (scenario.platform) {
      const validPlatforms = [
        'instagram',
        'linkedin',
        'facebook',
        'twitter',
        'youtube',
        'tiktok',
        'print',
        'web',
        'email',
        'presentation',
      ] as const
      type ValidPlatform = (typeof validPlatforms)[number]
      const platformLower = scenario.platform.toLowerCase()
      if (validPlatforms.includes(platformLower as ValidPlatform)) {
        updated.brief = {
          ...updated.brief,
          platform: {
            value: platformLower as ValidPlatform,
            confidence: 0.9,
            source: 'inferred' as const,
          },
        }
      }
    }
  }

  // Seed deliverableCategory if missing
  if (!updated.deliverableCategory || updated.deliverableCategory === 'unknown') {
    updated.deliverableCategory = scenarioToCategory(scenario)
  }

  return updated
}

// =============================================================================
// FORCE STAGE ADVANCEMENT (for stuck conversations)
// =============================================================================

const STAGE_ORDER: BriefingStage[] = [
  'EXTRACT',
  'TASK_TYPE',
  'INTENT',
  'INSPIRATION',
  'STRUCTURE',
  'STRATEGIC_REVIEW',
  'MOODBOARD',
  'REVIEW',
  'DEEPEN',
  'SUBMIT',
]

/**
 * Force advance to the next stage when stuck for too many turns.
 * Populates required fields with placeholder data so the state machine
 * doesn't reject the advancement.
 */
function forceAdvanceStage(
  state: SerializedBriefingState,
  scenario: ChatTestScenario
): SerializedBriefingState {
  const currentIdx = STAGE_ORDER.indexOf(state.stage)
  if (currentIdx === -1 || currentIdx >= STAGE_ORDER.length - 1) return state

  const nextStage = STAGE_ORDER[currentIdx + 1]
  let updated: SerializedBriefingState = {
    ...state,
    stage: nextStage,
    turnsInCurrentStage: 0,
  }

  // Populate required fields for the transition
  switch (state.stage) {
    case 'INSPIRATION': {
      // STRUCTURE requires selectedStyles.length > 0
      if (
        !updated.brief.visualDirection ||
        updated.brief.visualDirection.selectedStyles.length === 0
      ) {
        updated = {
          ...updated,
          brief: {
            ...updated.brief,
            visualDirection: {
              selectedStyles: [
                {
                  id: 'placeholder-style',
                  name: 'Modern Minimal',
                  description: 'Clean, modern aesthetic',
                  imageUrl: '',
                  deliverableType: scenarioToCategory(scenario),
                  styleAxis: 'modern',
                  subStyle: null,
                  semanticTags: ['minimal', 'clean'],
                },
              ],
              moodKeywords: ['modern', 'clean'],
              colorPalette: [],
              typography: { primary: '', secondary: '' },
              avoidElements: [],
            },
          },
        }
      }
      break
    }
    case 'STRUCTURE': {
      // STRATEGIC_REVIEW requires structure !== null
      if (!updated.structure) {
        const category = updated.deliverableCategory ?? scenarioToCategory(scenario)
        updated.structure = createPlaceholderStructure(category)
      }
      break
    }
    case 'STRATEGIC_REVIEW': {
      // MOODBOARD advancement via dispatch (not automatic)
      if (!updated.strategicReview) {
        updated.strategicReview = {
          strengths: ['Strong brand alignment', 'Clear target audience'],
          risks: ['Timeline may be tight'],
          optimizationSuggestion: 'Consider A/B testing the creative approach',
          inspirationFitScore: 'aligned',
          inspirationFitNote: null,
          userOverride: false,
        }
      }
      break
    }
  }

  // Also ensure deliverableCategory is set
  if (!updated.deliverableCategory || updated.deliverableCategory === 'unknown') {
    updated.deliverableCategory = scenarioToCategory(scenario)
  }

  return updated
}

/**
 * Create minimal placeholder structure data for a given deliverable category.
 */
function createPlaceholderStructure(category: DeliverableCategory): StructureData {
  switch (category) {
    case 'video':
      return {
        type: 'storyboard',
        scenes: [
          {
            sceneNumber: 1,
            title: 'Hook',
            description: 'Opening hook',
            duration: '3s',
            visualNote: 'Eye-catching opening',
          },
          {
            sceneNumber: 2,
            title: 'Problem',
            description: 'Present the problem',
            duration: '5s',
            visualNote: 'Relatable scenario',
          },
          {
            sceneNumber: 3,
            title: 'Solution',
            description: 'Present the solution',
            duration: '10s',
            visualNote: 'Product showcase',
          },
          {
            sceneNumber: 4,
            title: 'CTA',
            description: 'Call to action',
            duration: '3s',
            visualNote: 'Clear CTA overlay',
          },
        ],
      }
    case 'website':
      return {
        type: 'layout',
        sections: [
          {
            sectionName: 'Hero',
            purpose: 'First impression',
            contentGuidance: 'Headline + CTA',
            order: 1,
          },
          {
            sectionName: 'Features',
            purpose: 'Value proposition',
            contentGuidance: 'Key benefits',
            order: 2,
          },
          {
            sectionName: 'Social Proof',
            purpose: 'Trust building',
            contentGuidance: 'Testimonials',
            order: 3,
          },
          {
            sectionName: 'CTA',
            purpose: 'Conversion',
            contentGuidance: 'Final call to action',
            order: 4,
          },
        ],
      }
    case 'design':
    case 'brand':
      return {
        type: 'single_design',
        specification: {
          format: 'Digital',
          dimensions: [{ width: 1080, height: 1080, label: 'Square', aspectRatio: '1:1' }],
          keyElements: ['Logo', 'Headline', 'CTA'],
          copyGuidance: 'Keep messaging concise and action-oriented',
        },
      }
    case 'content':
    default:
      return {
        type: 'calendar',
        outline: {
          totalDuration: '4 weeks',
          postingCadence: '3 times per week',
          platforms: ['instagram'],
          distributionLogic: 'Spread across week',
          contentPillars: [
            { name: 'Education', description: 'Informative content', percentage: 40 },
            { name: 'Engagement', description: 'Interactive content', percentage: 30 },
            { name: 'Promotion', description: 'Product-focused content', percentage: 30 },
          ],
          weeks: [
            {
              weekNumber: 1,
              narrativeArc: 'Introduction',
              theme: 'Getting started',
              posts: [
                {
                  dayOfWeek: 'Monday',
                  pillarType: 'pillar',
                  topic: 'Intro post',
                  format: 'carousel',
                  cta: 'Follow for more',
                  engagementTrigger: 'Question in caption',
                },
                {
                  dayOfWeek: 'Wednesday',
                  pillarType: 'support',
                  topic: 'Tips',
                  format: 'reel',
                  cta: 'Save this',
                  engagementTrigger: 'Poll in stories',
                },
                {
                  dayOfWeek: 'Friday',
                  pillarType: 'pillar',
                  topic: 'Feature spotlight',
                  format: 'single image',
                  cta: 'Learn more',
                  engagementTrigger: 'Tag a friend',
                },
              ],
            },
          ],
          ctaEscalation: {
            awarenessPhase: { weeks: [1, 2], ctaStyle: 'Soft - follow/save' },
            engagementPhase: { weeks: [3], ctaStyle: 'Medium - comment/share' },
            conversionPhase: { weeks: [4], ctaStyle: 'Hard - shop now/sign up' },
          },
        },
      }
  }
}

/**
 * POST /api/admin/chat-tests/step — Execute one conversation turn
 *
 * Mirrors the real client flow (useBriefingStateMachine + useChatInterfaceData):
 * 1. Load run state from DB
 * 2. Initialize BriefingState on first turn (like createInitialBriefingState)
 * 3. Check for pending actions (style/video selection from previous turn)
 * 4. Generate synthetic user message (quick option / template / Haiku)
 * 5. Call the real POST /api/chat endpoint with admin's cookies
 * 6. Process response: merge structure/review data, determine next pending action
 * 7. Save state to DB, return progress
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const body = stepSchema.parse(await request.json())

      // 1. Load the run
      const [run] = await db
        .select()
        .from(chatTestRuns)
        .where(eq(chatTestRuns.id, body.runId))
        .limit(1)

      if (!run) throw Errors.notFound('Chat test run')

      // Check if already complete
      const completionCheck = isRunComplete(run.finalStage, run.totalTurns, run.status)
      if (completionCheck.complete) {
        return successResponse({
          run,
          isComplete: true,
          reason: completionCheck.reason,
        })
      }

      // Mark as running on first step
      if (run.status === 'pending') {
        await db
          .update(chatTestRuns)
          .set({ status: 'running', startedAt: new Date() })
          .where(eq(chatTestRuns.id, run.id))
      }

      const turnStart = Date.now()

      // 2. Initialize BriefingState on first turn (Fix 1)
      // Mirrors: createInitialBriefingState() in useBriefingStateMachine
      const isFirstTurn = run.messages.length === 0
      let currentBriefingState = run.briefingState as SerializedBriefingState | null
      if (isFirstTurn && !currentBriefingState) {
        currentBriefingState = serialize(createInitialBriefingState())
      }

      // Load pending action and moodboardHasStyles from run metadata
      // These are stored as extra fields in the briefingState wrapper
      const runMeta = (run.briefingState as Record<string, unknown>) ?? {}
      let pendingAction: PendingAction | null =
        (runMeta._pendingAction as PendingAction | null) ?? null
      let moodboardHasStyles: boolean = (runMeta._moodboardHasStyles as boolean) ?? false

      // Strip our metadata keys from the briefing state before sending to /api/chat
      if (currentBriefingState && '_pendingAction' in currentBriefingState) {
        const {
          _pendingAction: _,
          _moodboardHasStyles: __,
          ...cleanState
        } = currentBriefingState as SerializedBriefingState & {
          _pendingAction?: unknown
          _moodboardHasStyles?: unknown
        }
        currentBriefingState = cleanState as SerializedBriefingState
      }

      // 3. Determine user message
      const lastAssistantMsg =
        run.messages.length > 0 ? (run.messages[run.messages.length - 1]?.content ?? '') : ''
      const lastQuickOptions =
        run.messages.length > 0 ? run.messages[run.messages.length - 1]?.quickOptions : null

      // Count turns in current stage (Fix 6: only count user messages)
      const currentStage = run.finalStage ?? 'EXTRACT'
      let turnsInStage = 0
      for (let i = run.messages.length - 1; i >= 0; i--) {
        if (run.messages[i].stage === currentStage) {
          if (run.messages[i].role === 'user') {
            turnsInStage++
          }
        } else {
          break
        }
      }

      let userContent: string
      let generatedBy: 'quick_option' | 'template' | 'haiku'
      let extraRequestBody: Record<string, unknown> = {}

      // Fix 2: Check for pending action from previous turn
      if (pendingAction) {
        if (pendingAction.type === 'style_selection') {
          // Mirrors handleConfirmStyleSelection: "Style selected: {name}"
          userContent = `Style selected: ${pendingAction.styleName}`
          generatedBy = 'template'
          extraRequestBody = {
            selectedDeliverableStyles: [pendingAction.styleId],
            moodboardHasStyles: true,
          }
          // Update state: add style to visual direction (mirrors addStyleToVisualDirection)
          if (currentBriefingState) {
            currentBriefingState = addStyleToVisualDirection(
              currentBriefingState,
              pendingAction.styleData
            )
          }
          moodboardHasStyles = true
        } else if (pendingAction.type === 'video_selection') {
          // Mirrors handleSelectVideo: "Video style selected: {name}"
          userContent = `Video style selected: ${pendingAction.videoName}`
          generatedBy = 'template'
          extraRequestBody = {
            selectedDeliverableStyles: [pendingAction.videoId],
            moodboardHasStyles: true,
          }
          if (currentBriefingState) {
            currentBriefingState = addStyleToVisualDirection(
              currentBriefingState,
              pendingAction.videoData
            )
          }
          moodboardHasStyles = true
        } else {
          // Unknown action, proceed normally
          userContent = ''
          generatedBy = 'template'
        }
        // Clear the pending action
        pendingAction = null
      } else if (isFirstTurn) {
        userContent = run.scenarioConfig.openingMessage
        generatedBy = 'template'
      } else {
        const reply = await generateSyntheticReply(
          run.scenarioConfig,
          lastAssistantMsg,
          lastQuickOptions,
          currentStage,
          turnsInStage,
          run.totalTurns
        )
        userContent = reply.content
        generatedBy = reply.generatedBy
      }

      // 4. Build the messages array for /api/chat
      // Trim to prevent AI context pollution from too many repetitive turns.
      // Keep first 4 messages (project context) + last messages up to limit.
      const allMsgs = run.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))
      let chatMessages: typeof allMsgs
      if (allMsgs.length > MAX_MESSAGES_TO_SEND) {
        const contextMsgs = allMsgs.slice(0, 4)
        const recentMsgs = allMsgs.slice(-(MAX_MESSAGES_TO_SEND - 4))
        chatMessages = [...contextMsgs, ...recentMsgs]
      } else {
        chatMessages = allMsgs
      }
      chatMessages.push({ role: 'user' as const, content: userContent })

      // Seed scenario data into briefingState when stuck (prevents infinite loops)
      if (currentBriefingState && turnsInStage >= 3) {
        currentBriefingState = ensureScenarioDataSeeded(
          currentBriefingState,
          run.scenarioConfig as ChatTestScenario,
          turnsInStage
        )
      }

      // 5. Call the real /api/chat endpoint (Fix 3+4: send full body like real client)
      const env = getEnv()
      const cookie = request.headers.get('cookie') ?? ''

      let chatResponse: Response
      try {
        chatResponse = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookie,
          },
          body: JSON.stringify({
            messages: chatMessages,
            briefingState: currentBriefingState ?? undefined,
            selectedStyles: [],
            moodboardHasStyles,
            ...extraRequestBody,
          }),
        })
      } catch (err) {
        logger.error({ err, runId: run.id }, 'Failed to call /api/chat')
        await db
          .update(chatTestRuns)
          .set({
            status: 'failed',
            errorMessage: `Network error calling /api/chat: ${err instanceof Error ? err.message : String(err)}`,
            completedAt: new Date(),
          })
          .where(eq(chatTestRuns.id, run.id))

        const failedRun = await db
          .select()
          .from(chatTestRuns)
          .where(eq(chatTestRuns.id, run.id))
          .limit(1)
        return successResponse({ run: failedRun[0], isComplete: true, reason: 'error' })
      }

      if (!chatResponse.ok) {
        const errorText = await chatResponse.text().catch(() => 'Unknown error')
        logger.error(
          { runId: run.id, status: chatResponse.status, errorText },
          '/api/chat returned error'
        )
        await db
          .update(chatTestRuns)
          .set({
            status: 'failed',
            errorMessage: `/api/chat returned ${chatResponse.status}: ${errorText.slice(0, 500)}`,
            completedAt: new Date(),
          })
          .where(eq(chatTestRuns.id, run.id))

        const failedRun = await db
          .select()
          .from(chatTestRuns)
          .where(eq(chatTestRuns.id, run.id))
          .limit(1)
        return successResponse({ run: failedRun[0], isComplete: true, reason: 'error' })
      }

      // 6. Parse response
      const chatData = await chatResponse.json()
      const turnDuration = Date.now() - turnStart

      const assistantContent: string = chatData.content ?? ''
      let newBriefingState: SerializedBriefingState | null =
        (chatData.briefingState as SerializedBriefingState | null) ?? currentBriefingState
      const quickOptions = chatData.quickOptions ?? null
      const deliverableStyleCount = chatData.deliverableStyles?.length ?? 0
      const videoReferenceCount = chatData.videoReferences?.length ?? 0
      const hasStructureData = !!chatData.structureData
      const hasStrategicReview = !!chatData.strategicReviewData

      // Fix 2B: Merge structureData into state (mirrors client local state merge)
      if (hasStructureData && newBriefingState) {
        newBriefingState = mergeStructureData(
          newBriefingState,
          chatData.structureData as StructureData
        )
      }

      // Fix 2C: Merge strategicReviewData and advance to MOODBOARD
      // (mirrors dispatch({ type: 'STAGE_RESPONSE', response: 'accept' }))
      if (hasStrategicReview && newBriefingState && newBriefingState.stage === 'STRATEGIC_REVIEW') {
        newBriefingState = mergeStrategicReviewAndAdvance(
          newBriefingState,
          chatData.strategicReviewData as StrategicReviewData
        )
      }

      // Determine current stage from briefing state
      let updatedStage = newBriefingState?.stage ?? currentStage

      // Force advance if stuck in the same stage for too many turns
      if (
        newBriefingState &&
        updatedStage === currentStage &&
        turnsInStage >= FORCE_ADVANCE_AFTER_TURNS
      ) {
        logger.warn(
          {
            scenario: run.scenarioName,
            stage: currentStage,
            turnsInStage,
            totalTurns: run.totalTurns,
          },
          'Chat test force-advancing stage due to stall'
        )
        newBriefingState = forceAdvanceStage(
          newBriefingState,
          run.scenarioConfig as ChatTestScenario
        )
        updatedStage = newBriefingState.stage
      }

      // Fix 2A: Determine pending action for next turn
      const nextPendingAction = determinePendingAction(chatData, moodboardHasStyles)

      // Store metadata alongside briefingState for next step
      const briefingStateToStore = newBriefingState
        ? {
            ...newBriefingState,
            _pendingAction: nextPendingAction,
            _moodboardHasStyles: moodboardHasStyles,
          }
        : null

      // Build new message entries
      const turnNumber = Math.floor(run.messages.length / 2) + 1
      const userMessage = {
        turn: turnNumber,
        role: 'user' as const,
        content: userContent,
        stage: currentStage,
        quickOptions: null,
        hasStructureData: false,
        hasStrategicReview: false,
        deliverableStyleCount: 0,
        videoReferenceCount: 0,
        generatedBy,
        durationMs: undefined as number | undefined,
      }
      const assistantMessage = {
        turn: turnNumber,
        role: 'assistant' as const,
        content: assistantContent,
        stage: updatedStage,
        quickOptions,
        hasStructureData,
        hasStrategicReview,
        structureData: (chatData.structureData as StructureData) ?? null,
        strategicReviewData: (chatData.strategicReviewData as StrategicReviewData) ?? null,
        deliverableStyleCount,
        videoReferenceCount,
        durationMs: turnDuration,
      }

      const updatedMessages = [...run.messages, userMessage, assistantMessage]
      const newTotalTurns = turnNumber

      // Check if we've reached completion
      const reachedReview =
        updatedStage === 'REVIEW' || updatedStage === 'DEEPEN' || updatedStage === 'SUBMIT'
      const { complete, reason } = isRunComplete(updatedStage, newTotalTurns, 'running')

      const newStatus = complete
        ? reason === 'safety_cap_exceeded'
          ? 'failed'
          : 'completed'
        : 'running'

      // 7. Update DB
      await db
        .update(chatTestRuns)
        .set({
          messages: updatedMessages,
          briefingState: briefingStateToStore,
          finalStage: updatedStage,
          totalTurns: newTotalTurns,
          reachedReview,
          status: newStatus,
          ...(complete && {
            completedAt: new Date(),
            durationMs: run.startedAt ? Date.now() - new Date(run.startedAt).getTime() : undefined,
          }),
          ...(reason === 'safety_cap_exceeded' && {
            errorMessage: `Conversation did not reach SUBMIT within ${newTotalTurns} turns (stuck at ${updatedStage})`,
          }),
        })
        .where(eq(chatTestRuns.id, run.id))

      // Fetch updated run
      const [updatedRun] = await db
        .select()
        .from(chatTestRuns)
        .where(eq(chatTestRuns.id, run.id))
        .limit(1)

      return successResponse({
        run: updatedRun,
        isComplete: complete,
        reason,
        latestMessages: [userMessage, assistantMessage],
      })
    },
    { endpoint: 'POST /api/admin/chat-tests/step' }
  )
}
