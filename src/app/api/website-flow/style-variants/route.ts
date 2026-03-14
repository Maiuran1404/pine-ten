import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'
import { logger } from '@/lib/logger'
import type { WebsiteStyleVariant } from '@/lib/ai/briefing-state-machine'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// --- Zod schemas ---

const sectionSchema = z.object({
  sectionName: z.string(),
  purpose: z.string(),
  contentGuidance: z.string(),
  order: z.number(),
})

const brandContextSchema = z.object({
  companyName: z.string().optional(),
  industry: z.string().optional(),
  toneOfVoice: z.string().optional(),
})

const inspirationSchema = z.object({
  url: z.string(),
  name: z.string(),
  notes: z.string().optional(),
})

const styleVariantsRequestSchema = z.object({
  sections: z.array(sectionSchema).min(1),
  brandContext: brandContextSchema.optional(),
  inspirations: z.array(inspirationSchema).optional(),
})

const styleVariantResponseSchema = z.object({
  variants: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      globalStyles: z.object({
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        fontPrimary: z.string().optional(),
        fontSecondary: z.string().optional(),
        layoutDensity: z.enum(['compact', 'balanced', 'spacious']).optional(),
      }),
    })
  ),
})

// --- Route handler ---

export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAuth()

      const body = styleVariantsRequestSchema.parse(await request.json())

      const sectionsDescription = body.sections
        .sort((a, b) => a.order - b.order)
        .map((s) => `- ${s.sectionName}: ${s.purpose}`)
        .join('\n')

      const brandDescription = body.brandContext
        ? [
            body.brandContext.companyName && `Company: ${body.brandContext.companyName}`,
            body.brandContext.industry && `Industry: ${body.brandContext.industry}`,
            body.brandContext.toneOfVoice && `Tone: ${body.brandContext.toneOfVoice}`,
          ]
            .filter(Boolean)
            .join('. ')
        : 'No specific brand context provided.'

      const inspirationDescription =
        body.inspirations && body.inspirations.length > 0
          ? body.inspirations
              .map((i) => `- ${i.name} (${i.url})${i.notes ? `: ${i.notes}` : ''}`)
              .join('\n')
          : 'No inspiration websites provided.'

      const prompt = `Generate 3 distinct visual style variants for this website layout. Each variant should feel cohesive and professional, but offer meaningfully different aesthetic directions.

Website sections:
${sectionsDescription}

Brand context: ${brandDescription}

Inspiration websites:
${inspirationDescription}

For each variant, provide:
- id: a unique kebab-case identifier (e.g., "bold-minimal")
- name: a short, evocative name (2-3 words)
- description: a one-line description of the visual direction
- globalStyles:
  - primaryColor: hex color code (e.g., "#2563eb")
  - secondaryColor: hex color code
  - fontPrimary: a web-safe or Google Fonts font name for headings
  - fontSecondary: a web-safe or Google Fonts font name for body text
  - layoutDensity: one of "compact", "balanced", or "spacious"

Respond with ONLY valid JSON in this exact format:
{
  "variants": [
    {
      "id": "...",
      "name": "...",
      "description": "...",
      "globalStyles": {
        "primaryColor": "...",
        "secondaryColor": "...",
        "fontPrimary": "...",
        "fontSecondary": "...",
        "layoutDensity": "..."
      }
    }
  ]
}

Make each variant distinctly different: one could be bold and modern, another warm and editorial, and the third clean and minimal. Ensure color pairs have good contrast and feel premium.`

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      })

      const responseText = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('')

      // Extract JSON from the response (handle possible markdown code fences)
      let jsonString = responseText.trim()
      const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonString = jsonMatch[1].trim()
      }

      let parsedVariants: WebsiteStyleVariant[]
      try {
        const parsed = JSON.parse(jsonString)
        const validated = styleVariantResponseSchema.parse(parsed)
        parsedVariants = validated.variants
      } catch (parseError) {
        logger.error({ err: parseError, responseText }, 'Failed to parse style variants from AI')
        // Return fallback variants so the UI is never empty
        parsedVariants = generateFallbackVariants()
      }

      return successResponse({ variants: parsedVariants })
    },
    { endpoint: 'POST /api/website-flow/style-variants' }
  )
}

/** Fallback variants when AI parsing fails */
function generateFallbackVariants(): WebsiteStyleVariant[] {
  return [
    {
      id: 'bold-modern',
      name: 'Bold Modern',
      description: 'High contrast with strong typography and punchy accents',
      globalStyles: {
        primaryColor: '#1a1a2e',
        secondaryColor: '#e94560',
        fontPrimary: 'Inter',
        fontSecondary: 'Inter',
        layoutDensity: 'balanced',
      },
    },
    {
      id: 'warm-editorial',
      name: 'Warm Editorial',
      description: 'Earthy tones with serif typography and generous whitespace',
      globalStyles: {
        primaryColor: '#2d3436',
        secondaryColor: '#d4a373',
        fontPrimary: 'Playfair Display',
        fontSecondary: 'Source Sans Pro',
        layoutDensity: 'spacious',
      },
    },
    {
      id: 'clean-minimal',
      name: 'Clean Minimal',
      description: 'Light palette with subtle accents and tight grid alignment',
      globalStyles: {
        primaryColor: '#1e293b',
        secondaryColor: '#3b82f6',
        fontPrimary: 'DM Sans',
        fontSecondary: 'DM Sans',
        layoutDensity: 'compact',
      },
    },
  ]
}
