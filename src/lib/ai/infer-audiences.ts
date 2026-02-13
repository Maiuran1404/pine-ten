/**
 * Infer target audiences from brand onboarding data
 * Used when no website is provided or when website extraction didn't produce audiences
 */

import Anthropic from '@anthropic-ai/sdk'
import { logger } from '@/lib/logger'

// Lazy initialization to avoid errors during build
let anthropic: Anthropic | null = null

function getAnthropic(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    })
  }
  return anthropic
}

export interface InferredAudience {
  name: string
  isPrimary: boolean
  demographics?: {
    ageRange?: { min: number; max: number }
    gender?: 'all' | 'male' | 'female' | 'other'
    income?: 'low' | 'middle' | 'high' | 'enterprise'
  }
  firmographics?: {
    companySize?: string[]
    industries?: string[]
    jobTitles?: string[]
    departments?: string[]
    decisionMakingRole?: 'decision-maker' | 'influencer' | 'end-user'
  }
  psychographics?: {
    painPoints?: string[]
    goals?: string[]
    values?: string[]
  }
  behavioral?: {
    contentPreferences?: string[]
    platforms?: string[]
    buyingProcess?: 'impulse' | 'considered' | 'committee'
  }
  confidence: number
}

interface BrandData {
  name: string
  industry?: string | null
  industryArchetype?: string | null
  description?: string | null
  creativeFocus?: string[]
}

/**
 * Infer target audiences from brand data using AI
 * Returns 1-3 audience segments based on the brand information
 */
export async function inferAudiencesFromBrand(brandData: BrandData): Promise<InferredAudience[]> {
  // Don't attempt inference if we have no useful data
  if (!brandData.name && !brandData.industry && !brandData.description) {
    return []
  }

  const prompt = `Based on the following brand/company information, infer the most likely target audience(s).

Company Name: ${brandData.name || 'Unknown'}
Industry: ${brandData.industry || 'Not specified'}
Industry Archetype: ${brandData.industryArchetype || 'Not specified'}
Description: ${brandData.description || 'Not provided'}
Creative Focus Areas: ${brandData.creativeFocus?.join(', ') || 'Not specified'}

Using the information above, infer 1-3 target audience segments. Consider:
- What industry is this? Who typically buys in this industry?
- Is this B2B or B2C? Or both?
- What job titles or demographics would be interested?
- What are typical pain points for buyers in this space?

Industry Archetype hints:
- "hospitality": Restaurant owners, hotel managers, food & beverage directors, event planners
- "blue-collar": Business owners, project managers, property managers, contractors in construction/trade services
- "white-collar": Executives, HR directors, finance managers, professionals in corporate settings
- "e-commerce": Online shoppers, retail managers, e-commerce managers, marketing managers
- "tech": CTOs, developers, product managers, IT directors, startup founders

For each audience, provide:
- name: Short descriptive name (e.g., "HR Directors at Mid-size Companies", "Small Restaurant Owners")
- isPrimary: boolean (mark only ONE as primary)
- demographics: age range, income level
- firmographics (for B2B): company sizes, industries, job titles, departments, decision-making role
- psychographics: 2-3 pain points, 2-3 goals, key values
- behavioral: content preferences, platforms they use, buying process
- confidence: 0-100 (be conservative - this is inferred from limited data, typically 40-70)

Return ONLY a valid JSON array:
[
  {
    "name": "string",
    "isPrimary": true,
    "demographics": {
      "ageRange": { "min": 25, "max": 55 },
      "income": "middle | high | enterprise"
    },
    "firmographics": {
      "companySize": ["11-50", "51-200"],
      "industries": ["Industry 1", "Industry 2"],
      "jobTitles": ["Title 1", "Title 2"],
      "departments": ["Department 1"],
      "decisionMakingRole": "decision-maker | influencer | end-user"
    },
    "psychographics": {
      "painPoints": ["Pain 1", "Pain 2"],
      "goals": ["Goal 1", "Goal 2"],
      "values": ["Value 1", "Value 2"]
    },
    "behavioral": {
      "contentPreferences": ["case studies", "video"],
      "platforms": ["LinkedIn", "Email"],
      "buyingProcess": "impulse | considered | committee"
    },
    "confidence": 55
  }
]`

  try {
    const response = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    // Extract JSON from response
    const responseText = response.content
      .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')

    // Parse the JSON response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      logger.error('No JSON array found in audience inference response')
      return []
    }

    const audiences: InferredAudience[] = JSON.parse(jsonMatch[0])

    // Validate and normalize the audiences
    const validatedAudiences = audiences
      .filter((a) => a.name && typeof a.name === 'string')
      .map((audience) => ({
        name: audience.name,
        isPrimary: !!audience.isPrimary,
        demographics: audience.demographics || {},
        firmographics: audience.firmographics || {},
        psychographics: audience.psychographics || {},
        behavioral: audience.behavioral || {},
        confidence: Math.min(
          100,
          Math.max(0, typeof audience.confidence === 'number' ? audience.confidence : 50)
        ),
      }))

    // Ensure exactly one primary audience
    if (validatedAudiences.length > 0) {
      const hasPrimary = validatedAudiences.some((a) => a.isPrimary)
      if (!hasPrimary) {
        validatedAudiences[0].isPrimary = true
      }
    }

    return validatedAudiences
  } catch (error) {
    logger.error({ err: error }, 'Failed to infer audiences from brand data')
    return []
  }
}
