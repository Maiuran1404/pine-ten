import Anthropic from '@anthropic-ai/sdk'
import type {
  ToneBucket,
  EnergyBucket,
  DensityBucket,
  ColorBucket,
} from '@/lib/constants/reference-libraries'
import { logger } from '@/lib/logger'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface BrandClassification {
  name: string
  description: string
  toneBucket: ToneBucket
  energyBucket: EnergyBucket
  densityBucket: DensityBucket
  colorBucket: ColorBucket
  colorSamples: string[] // hex colors
  confidence: number // 0-1
}

const CLASSIFICATION_PROMPT = `You are a brand design expert. Analyze this brand reference image and classify it across 4 visual personality axes.

For each axis, choose ONE value:

1. **Tone** (overall mood/personality):
   - "playful" = Fun, whimsical, friendly, lighthearted, uses illustrations/mascots
   - "balanced" = Neutral, versatile, neither too playful nor too serious
   - "serious" = Professional, corporate, formal, trustworthy, authoritative

2. **Energy** (visual dynamism):
   - "calm" = Quiet, subdued, peaceful, gentle, slow pace
   - "balanced" = Moderate energy, neither too calm nor too energetic
   - "energetic" = Dynamic, bold, high-impact, active, vibrant movement

3. **Density** (visual complexity):
   - "minimal" = Clean, sparse, lots of whitespace, simple layouts
   - "balanced" = Moderate amount of visual elements
   - "rich" = Dense, detailed, layered, lots of visual information

4. **Color Temperature**:
   - "cool" = Blues, greens, purples, teals - cool color palette
   - "neutral" = Grays, blacks, whites, beiges - muted/achromatic
   - "warm" = Reds, oranges, yellows, pinks - warm color palette

Also:
- Extract a brand name from the image if visible (or suggest one based on the style)
- Write a brief 1-sentence description of the brand's visual style
- Extract 3-5 dominant hex colors from the image

Respond in this exact JSON format (no markdown, no explanation):
{
  "name": "Brand Name",
  "description": "Brief description of visual style",
  "toneBucket": "playful" | "balanced" | "serious",
  "energyBucket": "calm" | "balanced" | "energetic",
  "densityBucket": "minimal" | "balanced" | "rich",
  "colorBucket": "cool" | "neutral" | "warm",
  "colorSamples": ["#hex1", "#hex2", "#hex3"],
  "confidence": 0.85
}`

export async function classifyBrandImage(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/png'
): Promise<BrandClassification> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: CLASSIFICATION_PROMPT,
            },
          ],
        },
      ],
    })

    // Extract text from response
    const textContent = response.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    // Parse JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const classification = JSON.parse(jsonMatch[0]) as BrandClassification

    // Validate required fields
    if (
      !classification.toneBucket ||
      !classification.energyBucket ||
      !classification.densityBucket ||
      !classification.colorBucket
    ) {
      throw new Error('Missing required classification fields')
    }

    return classification
  } catch (error) {
    logger.error({ err: error }, 'Failed to classify brand image')
    // Return default classification on error
    return {
      name: 'Unknown Brand',
      description: 'Brand reference image',
      toneBucket: 'balanced',
      energyBucket: 'balanced',
      densityBucket: 'balanced',
      colorBucket: 'neutral',
      colorSamples: [],
      confidence: 0,
    }
  }
}

export async function classifyBrandImageFromUrl(imageUrl: string): Promise<BrandClassification> {
  try {
    // Fetch image and convert to base64
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type') || 'image/png'
    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // Determine media type
    let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/png'
    if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      mediaType = 'image/jpeg'
    } else if (contentType.includes('gif')) {
      mediaType = 'image/gif'
    } else if (contentType.includes('webp')) {
      mediaType = 'image/webp'
    }

    return classifyBrandImage(base64, mediaType)
  } catch (error) {
    logger.error({ err: error }, 'Failed to classify brand image from URL')
    throw error
  }
}
