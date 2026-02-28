import { NextRequest } from 'next/server'
import Firecrawl from '@mendable/firecrawl-js'
import Anthropic from '@anthropic-ai/sdk'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Lazy initialization to avoid errors during build
let firecrawl: Firecrawl | null = null
let anthropic: Anthropic | null = null

function getFirecrawl() {
  if (!firecrawl) {
    firecrawl = new Firecrawl({
      apiKey: process.env.FIRECRAWL_API_KEY || '',
    })
  }
  return firecrawl
}

function getAnthropic(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    })
  }
  return anthropic
}

const extractPdfSchema = z.object({
  pdfUrl: z.string().url('Valid PDF URL is required'),
})

interface PdfBrandExtraction {
  primaryColor: string | null
  secondaryColor: string | null
  accentColor: string | null
  brandColors: string[]
  primaryFont: string | null
  secondaryFont: string | null
  headingFont: string | null
  visualStyle: string | null
  brandTone: string | null
  tagline: string | null
  description: string | null
  keywords: string[]
  brandVoice: {
    messagingPillars?: string[]
    toneDoList?: string[]
    toneDontList?: string[]
    brandPromise?: string
    keyPhrases?: string[]
    avoidPhrases?: string[]
  } | null
}

const PDF_TIMEOUT_MS = 90_000

export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAuth()

      const body = await request.json()
      const { pdfUrl } = extractPdfSchema.parse(body)

      // Parse the PDF with Firecrawl's Rust-based PDF parser
      let markdown: string | null = null
      try {
        const result = await Promise.race([
          getFirecrawl().scrape(pdfUrl, {
            formats: ['markdown'],
            parsers: [{ type: 'pdf', mode: 'auto' }],
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('PDF parsing timed out')), PDF_TIMEOUT_MS)
          ),
        ])
        markdown = result.markdown || null
      } catch (error) {
        logger.error({ error, pdfUrl }, 'Failed to parse PDF')
        throw Errors.badRequest(
          'Failed to parse PDF. Please ensure the URL points to a valid, accessible PDF file.'
        )
      }

      if (!markdown || markdown.trim().length < 50) {
        throw Errors.badRequest(
          'PDF content too short or empty. The file may be image-only — try uploading a text-based brand guidelines PDF.'
        )
      }

      logger.info(
        { pdfUrl, markdownLength: markdown.length },
        'PDF parsed successfully, sending to Claude for brand extraction'
      )

      // Send to Claude for structured brand data extraction
      const response = await getAnthropic().messages.create(
        {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: `Extract brand guidelines from this PDF content. This is a brand guidelines document — extract all relevant brand data you can find.

PDF Content:
${markdown.slice(0, 10000)}

Return ONLY a valid JSON object with these fields (set to null if not found in the document):
{
  "primaryColor": "#hex or null",
  "secondaryColor": "#hex or null",
  "accentColor": "#hex or null",
  "brandColors": ["#hex", "#hex"],
  "primaryFont": "font name or null",
  "secondaryFont": "font name or null",
  "headingFont": "font name or null",
  "visualStyle": "one of: minimal-clean, bold-impactful, elegant-refined, modern-sleek, playful-vibrant, organic-natural, tech-futuristic, classic-timeless, artistic-expressive, corporate-professional, warm-inviting, edgy-disruptive — or null",
  "brandTone": "one of: friendly-approachable, professional-trustworthy, playful-witty, bold-confident, sophisticated-refined, innovative-visionary, empathetic-caring, authoritative-expert, casual-relaxed, inspiring-motivational, premium-exclusive, rebellious-edgy — or null",
  "tagline": "string or null",
  "description": "string or null",
  "keywords": ["keyword1", "keyword2"],
  "brandVoice": {
    "messagingPillars": ["string"],
    "toneDoList": ["string"],
    "toneDontList": ["string"],
    "brandPromise": "string or null",
    "keyPhrases": ["string"],
    "avoidPhrases": ["string"]
  }
}

Only include data that is explicitly stated in the PDF. Do not guess or infer.`,
            },
          ],
        },
        { timeout: 30_000 }
      )

      // Parse response
      const responseText = response.content
        .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('')

      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw Errors.badRequest('Failed to extract brand data from PDF content.')
      }

      let jsonStr = jsonMatch[0]
      jsonStr = jsonStr.replace(/:\s*undefined\b/g, ': null')
      jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1')

      const extracted: PdfBrandExtraction = JSON.parse(jsonStr)

      // Filter out null fields to only return actual data found
      const nonNullFields = Object.entries(extracted).filter(
        ([, value]) =>
          value !== null && value !== undefined && (Array.isArray(value) ? value.length > 0 : true)
      )

      return successResponse({
        extracted,
        fieldsFound: nonNullFields.length,
        pdfLength: markdown.length,
      })
    },
    { endpoint: 'POST /api/brand/extract-pdf' }
  )
}
