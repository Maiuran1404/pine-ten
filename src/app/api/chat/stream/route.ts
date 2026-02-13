import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '@/db'
import { users, companies } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { chatStreamSchema } from '@/lib/validations'
import { requireAuth } from '@/lib/require-auth'
import { withErrorHandling } from '@/lib/errors'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Get system prompt (simplified for streaming)
async function getSystemPrompt(company: typeof companies.$inferSelect | null): Promise<string> {
  const today = new Date()
  const todayStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const companyContext = company
    ? `
=== CLIENT'S BRAND DNA ===
COMPANY: ${company.name} (${company.industry || 'Not specified'})
COLORS: Primary ${company.primaryColor || 'Not set'}, Secondary ${company.secondaryColor || 'Not set'}
FONTS: ${company.primaryFont || 'Not specified'}
Use this information to personalize recommendations.`
    : ''

  return `You are a senior creative operator at Crafted — a design system for founders who value taste and speed.

YOUR VOICE:
- Confident and calm — never enthusiastic or overly affirming
- Economical with words — fewer words signal higher competence
- Professional warmth, not AI cheerfulness

BANNED PHRASES - NEVER USE:
- "Perfect!" "Great!" "Excellent!" "Amazing!" "Awesome!"
- Any exclamation marks at start of sentences
- Emojis

RESPONSE FORMAT:
- **Bold** key terms sparingly
- SHORT messages (2-3 sentences max)
- One question at a time

TODAY: ${todayStr}
${companyContext}`
}

export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      const session = await requireAuth()

      const body = await request.json()
      const { messages } = chatStreamSchema.parse(body)

      // Fetch user's company for context
      const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
        with: {
          company: true,
        },
      })

      const systemPrompt = await getSystemPrompt(user?.company || null)

      // Create a streaming response
      const stream = await anthropic.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      })

      // Create a readable stream for the response
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of stream) {
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                const text = event.delta.text
                // Send as Server-Sent Event format
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
              }
            }
            // Signal completion
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
            controller.close()
          } catch (error) {
            logger.error({ error }, 'Streaming error')
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`)
            )
            controller.close()
          }
        },
      })

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    },
    { endpoint: 'POST /api/chat/stream' }
  )
}
