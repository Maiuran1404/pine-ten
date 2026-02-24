import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '@/db'
import { websiteProjects } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireClient } from '@/lib/require-auth'
import { skeletonChatSchema } from '@/lib/validations/website-flow-schemas'
import { buildWebsiteFlowSystemPrompt } from '@/lib/ai/website-flow-prompts'
import {
  shouldAdvanceStage,
  advanceSkeletonStage,
  WEBSITE_SKELETON_STAGES,
  type WebsiteSkeletonStage,
  type WebsiteSkeletonState,
} from '@/lib/ai/website-state-machine'
import { generateSkeletonFromTemplate } from '@/lib/website/skeleton-generator'
import { logger } from '@/lib/logger'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * Parse skeleton updates from AI response text
 */
function parseSkeletonUpdates(responseText: string): {
  cleanedContent: string
  skeletonUpdates: Record<string, unknown> | null
  styleUpdate: Record<string, unknown> | null
  readyForApproval: boolean
  stage: string | null
} {
  let cleanedContent = responseText
  let skeletonUpdates: Record<string, unknown> | null = null
  let styleUpdate: Record<string, unknown> | null = null
  let readyForApproval = false
  let stage: string | null = null

  // Extract skeleton-update JSON block
  const skeletonMatch = responseText.match(/```skeleton-update\s*([\s\S]*?)```/)
  if (skeletonMatch) {
    try {
      const parsed = JSON.parse(skeletonMatch[1].trim())
      if (parsed.sections) {
        skeletonUpdates = { sections: parsed.sections }
      }
      if (parsed.globalStyles) {
        styleUpdate = parsed.globalStyles
      }
      if (parsed.readyForApproval) {
        readyForApproval = true
      }
      if (parsed.stage) {
        stage = parsed.stage
      }

      // Remove the skeleton-update block from the conversational content
      cleanedContent = responseText.replace(/```skeleton-update\s*[\s\S]*?```/, '').trim()
    } catch (parseError) {
      logger.warn({ err: parseError }, 'Failed to parse skeleton-update block from AI response')
    }
  }

  return { cleanedContent, skeletonUpdates, styleUpdate, readyForApproval, stage }
}

function isValidStage(stage: string): stage is WebsiteSkeletonStage {
  return (WEBSITE_SKELETON_STAGES as readonly string[]).includes(stage)
}

export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      const session = await requireClient()

      const body = await request.json()
      const validated = skeletonChatSchema.parse(body)

      // Load the project and verify ownership
      const [project] = await db
        .select()
        .from(websiteProjects)
        .where(eq(websiteProjects.id, validated.projectId))
        .limit(1)

      if (!project) {
        throw Errors.notFound('Website project')
      }

      if (project.userId !== session.user.id) {
        throw Errors.forbidden('You do not have permission to modify this project')
      }

      // Template branch: generate skeleton from industry template without AI
      if (validated.useTemplate && validated.industry) {
        const templateSkeleton = generateSkeletonFromTemplate(validated.industry)

        const chatHistory = project.chatHistory ?? []
        const templateMessageId = `msg-${crypto.randomUUID()}`
        const templateAssistantId = `msg-${crypto.randomUUID()}`
        const updatedChatHistory = [
          ...chatHistory,
          {
            id: templateMessageId,
            role: 'user' as const,
            content: validated.message,
            timestamp: new Date().toISOString(),
          },
          {
            id: templateAssistantId,
            role: 'assistant' as const,
            content: `I've generated a ${validated.industry} website template with ${templateSkeleton.sections.length} sections. You can now customize each section or ask me to make changes.`,
            timestamp: new Date().toISOString(),
            skeletonDelta: { sections: templateSkeleton.sections },
          },
        ]

        await db
          .update(websiteProjects)
          .set({
            skeleton: templateSkeleton,
            skeletonStage: 'SECTION_FEEDBACK',
            chatHistory: updatedChatHistory,
            updatedAt: new Date(),
          })
          .where(eq(websiteProjects.id, validated.projectId))

        return successResponse({
          message: `I've generated a ${validated.industry} website template with ${templateSkeleton.sections.length} sections. You can now customize each section or ask me to make changes.`,
          skeletonUpdates: { sections: templateSkeleton.sections },
          styleUpdate: templateSkeleton.globalStyles ?? null,
          readyForApproval: false,
        })
      }

      // Build the system prompt
      const systemPrompt = buildWebsiteFlowSystemPrompt({
        inspirations: project.selectedInspirations ?? [],
        currentSkeleton: validated.currentSkeleton
          ? (validated.currentSkeleton as {
              sections: Array<{
                id: string
                type: string
                title: string
                description: string
                order: number
                fidelity: 'low' | 'mid' | 'high'
                content?: Record<string, unknown>
                aiRecommendation?: string
              }>
              globalStyles?: {
                primaryColor?: string
                secondaryColor?: string
                fontPrimary?: string
                fontSecondary?: string
                layoutDensity?: 'compact' | 'balanced' | 'spacious'
              }
            })
          : (project.skeleton ?? null),
        skeletonStage: project.skeletonStage ?? 'INITIAL_GENERATION',
        userNotes: project.userNotes,
      })

      // Build message history from project chat history
      const chatHistory = project.chatHistory ?? []
      const messages: Anthropic.MessageParam[] = chatHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }))

      // Add the new user message
      messages.push({
        role: 'user',
        content: validated.message,
      })

      // Call Anthropic API
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages,
        system: systemPrompt,
      })

      // Extract response text
      const responseText = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('')

      // Parse skeleton updates from the response
      const { cleanedContent, skeletonUpdates, styleUpdate, readyForApproval, stage } =
        parseSkeletonUpdates(responseText)

      // Build updated chat history
      const newMessageId = `msg-${crypto.randomUUID()}`
      const assistantMessageId = `msg-${crypto.randomUUID()}`
      const updatedChatHistory = [
        ...chatHistory,
        {
          id: newMessageId,
          role: 'user' as const,
          content: validated.message,
          timestamp: new Date().toISOString(),
        },
        {
          id: assistantMessageId,
          role: 'assistant' as const,
          content: cleanedContent,
          timestamp: new Date().toISOString(),
          skeletonDelta: skeletonUpdates ?? undefined,
        },
      ]

      // Build project update values
      const updateValues: Record<string, unknown> = {
        chatHistory: updatedChatHistory,
        updatedAt: new Date(),
      }

      // Apply skeleton updates if present
      if (skeletonUpdates) {
        const currentSkeleton = project.skeleton ?? { sections: [] }
        updateValues.skeleton = {
          sections:
            (skeletonUpdates as { sections: unknown[] }).sections ?? currentSkeleton.sections,
          globalStyles: styleUpdate ?? currentSkeleton.globalStyles,
        }
      }

      // Determine the authoritative stage using the state machine
      const currentStage: WebsiteSkeletonStage =
        project.skeletonStage && isValidStage(project.skeletonStage)
          ? project.skeletonStage
          : 'INITIAL_GENERATION'

      const currentSections = project.skeleton?.sections ?? []
      const userMessageCount = updatedChatHistory.filter((m) => m.role === 'user').length

      const skeletonState: WebsiteSkeletonState = {
        stage: currentStage,
        chatTurns: userMessageCount,
        sectionsConfirmed: currentSections.length,
        totalSections: currentSections.length,
        hasStylePreferences: !!styleUpdate || !!project.skeleton?.globalStyles?.primaryColor,
        hasFeedback: userMessageCount > 1,
      }

      // Use AI-suggested stage if valid, otherwise compute from state machine
      let nextStage = currentStage
      if (stage && isValidStage(stage)) {
        nextStage = stage
      } else if (shouldAdvanceStage(skeletonState)) {
        nextStage = advanceSkeletonStage(skeletonState).stage
      }

      if (nextStage !== currentStage) {
        updateValues.skeletonStage = nextStage
      }

      // If ready for approval, advance phase
      if (readyForApproval) {
        updateValues.phase = 'APPROVAL'
      }

      // Persist updates
      await db
        .update(websiteProjects)
        .set(updateValues)
        .where(eq(websiteProjects.id, validated.projectId))

      return successResponse({
        message: cleanedContent,
        skeletonUpdates,
        styleUpdate,
        readyForApproval,
      })
    },
    { endpoint: 'POST /api/website-flow/skeleton' }
  )
}
