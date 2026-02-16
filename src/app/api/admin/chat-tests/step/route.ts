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

const stepSchema = z.object({
  runId: z.string().uuid(),
})

/**
 * POST /api/admin/chat-tests/step — Execute one conversation turn
 *
 * 1. Load run state from DB
 * 2. Generate synthetic user message (quick option / template / Haiku)
 * 3. Call the real POST /api/chat endpoint with admin's cookies
 * 4. Save user + assistant messages to the run record
 * 5. Return progress
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

      // 2. Generate synthetic user message
      const isFirstTurn = run.messages.length === 0
      const lastAssistantMsg =
        run.messages.length > 0 ? (run.messages[run.messages.length - 1]?.content ?? '') : ''
      const lastQuickOptions =
        run.messages.length > 0 ? run.messages[run.messages.length - 1]?.quickOptions : null

      // Count turns in current stage
      const currentStage = run.finalStage ?? 'EXTRACT'
      let turnsInStage = 0
      for (let i = run.messages.length - 1; i >= 0; i--) {
        if (run.messages[i].stage === currentStage) {
          turnsInStage++
        } else {
          break
        }
      }

      let userContent: string
      let generatedBy: 'quick_option' | 'template' | 'haiku'

      if (isFirstTurn) {
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

      // 3. Build the messages array for /api/chat
      const chatMessages = run.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))
      chatMessages.push({ role: 'user' as const, content: userContent })

      // 4. Call the real /api/chat endpoint
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
            briefingState: run.briefingState ?? undefined,
            selectedStyles: [],
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

      // 5. Parse response
      const chatData = await chatResponse.json()
      const turnDuration = Date.now() - turnStart

      const assistantContent: string = chatData.content ?? ''
      const newBriefingState = chatData.briefingState ?? run.briefingState
      const quickOptions = chatData.quickOptions ?? null
      const deliverableStyleCount = chatData.deliverableStyles?.length ?? 0
      const videoReferenceCount = chatData.videoReferences?.length ?? 0
      const hasStructureData = !!chatData.structureData
      const hasStrategicReview = !!chatData.strategicReviewData

      // Determine current stage from briefing state
      const updatedStage = newBriefingState?.stage ?? currentStage

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
        deliverableStyleCount,
        videoReferenceCount,
        durationMs: turnDuration,
      }

      const updatedMessages = [...run.messages, userMessage, assistantMessage]
      const newTotalTurns = turnNumber

      // Check if we've reached completion
      const reachedReview = updatedStage === 'REVIEW'
      const { complete, reason } = isRunComplete(updatedStage, newTotalTurns, 'running')

      const newStatus = complete
        ? reason === 'max_turns_exceeded'
          ? 'failed'
          : 'completed'
        : 'running'

      // 6. Update DB
      await db
        .update(chatTestRuns)
        .set({
          messages: updatedMessages,
          briefingState: newBriefingState,
          finalStage: updatedStage,
          totalTurns: newTotalTurns,
          reachedReview,
          status: newStatus,
          ...(complete && {
            completedAt: new Date(),
            durationMs: run.startedAt ? Date.now() - new Date(run.startedAt).getTime() : undefined,
          }),
          ...(reason === 'max_turns_exceeded' && {
            errorMessage: `Conversation did not reach REVIEW within ${newTotalTurns} turns (stuck at ${updatedStage})`,
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
