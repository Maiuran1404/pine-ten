import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { requireAdmin } from '@/lib/require-auth'
import { pitchDeckSchema, type PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'
import { defaultPitchDeckContent } from '@/lib/pitch-deck/default-content'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1),
  currentFormData: pitchDeckSchema.optional(),
})

const SYSTEM_PROMPT = `You are an AI assistant that helps create pitch deck content for a creative agency called Crafted AI. When the user describes a project or client, generate complete pitch deck data as JSON.

The JSON must match this exact TypeScript schema:

interface PitchDeckFormData {
  clientName: string
  primaryColor: string        // hex color for cover background
  accentColor: string         // hex color for buttons/highlights
  coverDate: string           // e.g. "Feb 2026"
  aboutTitle: string          // headline for about slide
  aboutBody: string           // paragraph describing the agency
  projectDetailsTitle: string // e.g. "Project Details"
  projectDetailsColumns: Array<{ title: string; description: string }>  // 2-3 columns
  overviewTitle: string       // e.g. "Project Overview"
  overviewBody: string        // paragraph overview of the project
  scopeTitle: string          // e.g. "Scope Of Work"
  scopeCategories: Array<{ title: string; items: string[] }>  // 2-4 categories
  timelineTitle: string       // e.g. "Timeline"
  milestones: Array<{ date: string; description: string }>  // 3-5 milestones
  pricingTitle: string        // e.g. "Pricing"
  pricingSubtitle: string     // e.g. "For projects"
  pricingCards: Array<{
    label: string
    price: string             // e.g. "50 000 NOK" — always use Norwegian Krone (NOK) unless the user specifies otherwise
    priceDescription: string
    ctaText: string
    includedItems: string[]   // 3-5 items
  }>                          // 1-3 cards — generate one card per distinct service/price the user mentions
  backCoverMessage: string    // e.g. "Thank you"
  backCoverBody: string
  contactName: string
  contactEmail: string
  contactPhone: string
  contactWebsite: string
}

Here is an example of valid output for reference:
${JSON.stringify(defaultPitchDeckContent, null, 2)}

IMPORTANT RULES:
- Always respond with a brief conversational message followed by the complete JSON
- Wrap the JSON in a \`\`\`json code block
- Fill in ALL fields — do not leave any empty
- Keep the aboutTitle short and punchy (under 10 words)
- Keep the aboutBody as a description of Crafted AI (the agency), not the client
- Generate realistic pricing, timeline, and scope based on the project description
- If the user provides partial info, make reasonable assumptions for missing fields
- Use the current form data as context if provided, updating only what the user asks to change
- contactName should default to "Maiuran Loganthan", contactEmail to "Maiuran@getcrafted.ai", contactPhone to "+47 48198693", contactWebsite to "getcrafted.ai" unless specified`

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin()

    const body = await request.json()
    const { messages, currentFormData } = requestSchema.parse(body)

    const userMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    // If we have current form data, include it as context in the system prompt
    const systemPrompt = currentFormData
      ? `${SYSTEM_PROMPT}\n\nCurrent form data (update based on user request):\n${JSON.stringify(currentFormData, null, 2)}`
      : SYSTEM_PROMPT

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: userMessages,
    })

    const textContent = response.content.find((block) => block.type === 'text')
    const responseText = textContent?.type === 'text' ? textContent.text : ''

    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim())
        const formData = pitchDeckSchema.parse(parsed) as PitchDeckFormData
        // Return the message text (everything before the JSON block) plus the form data
        const messageText = responseText.replace(/```json[\s\S]*?```/, '').trim()
        return successResponse({
          type: 'form_update' as const,
          content: messageText || "I've updated the pitch deck with your changes.",
          formData,
        })
      } catch {
        // JSON parsing or validation failed — fall through to message-only response
      }
    }

    return successResponse({
      type: 'message' as const,
      content: responseText,
      formData: null,
    })
  })
}
