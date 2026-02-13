import { NextRequest } from 'next/server'
import { db } from '@/db'
import { tasks } from '@/db/schema'
import { eq } from 'drizzle-orm'
import Anthropic from '@anthropic-ai/sdk'
import { logger } from '@/lib/logger'
import { analyzeFeedbackSchema } from '@/lib/validations'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'

const anthropic = new Anthropic()

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const session = await requireAuth()

    const { id } = await params
    const body = await request.json()
    const { feedback, originalRequirements, description } = analyzeFeedbackSchema.parse(body)

    // Get the task
    const taskResult = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)

    if (!taskResult.length) {
      throw Errors.notFound('Task')
    }

    const task = taskResult[0]

    // Only the client who owns the task can analyze feedback
    if (task.clientId !== session.user.id) {
      throw Errors.forbidden()
    }

    // If no revisions left, everything is extra
    if (task.revisionsUsed >= task.maxRevisions) {
      return successResponse({
        isRevision: false,
        reason:
          'You have used all your included revisions. Any additional changes will require extra credits.',
        estimatedCredits: 1,
      })
    }

    // Use AI to analyze the feedback
    const analysisPrompt = `You are an expert at analyzing client feedback for design tasks. Determine if the feedback is a revision (minor changes to the existing work) or new scope (significant new work beyond the original request).

ORIGINAL TASK DESCRIPTION:
${description}

ORIGINAL REQUIREMENTS:
${JSON.stringify(originalRequirements, null, 2)}

CLIENT FEEDBACK:
${feedback}

Analyze whether this feedback is:
1. A REVISION: Minor adjustments, fixes, or tweaks to the delivered work (e.g., color changes, text edits, repositioning elements, fixing errors, style adjustments)
2. NEW SCOPE: Significant new work or features not in the original request (e.g., additional deliverables, new designs, completely different direction, adding new platforms/formats)

Respond with JSON only:
{
  "isRevision": true/false,
  "reason": "Brief explanation (1-2 sentences)",
  "estimatedCredits": number (only if not a revision, estimate 1-3 based on scope)
}`

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: analysisPrompt,
          },
        ],
      })

      const content = response.content[0]
      if (content.type === 'text') {
        // Parse the JSON response
        const jsonMatch = content.text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0])
          return successResponse({
            isRevision: analysis.isRevision,
            reason: analysis.reason,
            estimatedCredits: analysis.estimatedCredits || undefined,
          })
        }
      }

      // Fallback if parsing fails
      return successResponse({
        isRevision: true,
        reason: 'This appears to be a revision request based on the original scope.',
      })
    } catch (aiError) {
      logger.error({ error: aiError }, 'AI analysis error')
      // Default to treating as revision if AI fails
      return successResponse({
        isRevision: true,
        reason: 'Unable to analyze - treating as standard revision request.',
      })
    }
  })
}
