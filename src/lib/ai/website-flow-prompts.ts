import 'server-only'

interface SkeletonSection {
  id: string
  type: string
  title: string
  description: string
  order: number
  fidelity: 'low' | 'mid' | 'high'
  content?: Record<string, unknown>
  aiRecommendation?: string
}

interface Skeleton {
  sections: SkeletonSection[]
  globalStyles?: {
    primaryColor?: string
    secondaryColor?: string
    fontPrimary?: string
    fontSecondary?: string
    layoutDensity?: 'compact' | 'balanced' | 'spacious'
  }
}

interface Inspiration {
  id: string
  url: string
  screenshotUrl: string
  name: string
  notes?: string
}

interface WebsiteFlowPromptInput {
  inspirations: Inspiration[]
  currentSkeleton: Skeleton | null
  skeletonStage: string
  userNotes?: string | null
}

/**
 * Build the system prompt for the website design skeleton AI chat
 */
export function buildWebsiteFlowSystemPrompt(input: WebsiteFlowPromptInput): string {
  const inspirationContext = input.inspirations
    .map(
      (insp, i) =>
        `${i + 1}. **${insp.name}** (${insp.url})${insp.notes ? ` - Client notes: "${insp.notes}"` : ''}`
    )
    .join('\n')

  const skeletonContext = input.currentSkeleton
    ? `\n\nCurrent Skeleton (${input.currentSkeleton.sections.length} sections):\n${input.currentSkeleton.sections
        .map(
          (s) => `- [${s.order}] ${s.title} (${s.type}, ${s.fidelity} fidelity): ${s.description}`
        )
        .join('\n')}`
    : ''

  const globalStylesContext = input.currentSkeleton?.globalStyles
    ? `\n\nGlobal Styles:
- Primary Color: ${input.currentSkeleton.globalStyles.primaryColor || 'Not set'}
- Secondary Color: ${input.currentSkeleton.globalStyles.secondaryColor || 'Not set'}
- Primary Font: ${input.currentSkeleton.globalStyles.fontPrimary || 'Not set'}
- Layout Density: ${input.currentSkeleton.globalStyles.layoutDensity || 'balanced'}`
    : ''

  return `You are a senior web designer at Crafted, helping a client shape their website design.

YOUR ROLE:
- Guide the client through building a website skeleton (section-by-section layout plan)
- Make proactive design recommendations based on their inspirations
- Be specific about layout, typography, and content structure
- Output actionable skeleton updates that can be applied to the design

VOICE:
- Warm, direct, confident
- Economical with words
- No exclamation marks, no emojis
- Professional warmth, not AI cheerfulness

CLIENT'S INSPIRATIONS:
${inspirationContext}
${input.userNotes ? `\nClient Notes: "${input.userNotes}"` : ''}
${skeletonContext}
${globalStylesContext}

SKELETON STAGE: ${input.skeletonStage}

STAGE GUIDANCE:
- INITIAL_GENERATION: Propose an initial skeleton based on the inspirations. Include 4-8 sections.
- SECTION_REFINEMENT: Help refine individual sections based on client feedback.
- STYLE_DIRECTION: Discuss colors, typography, and overall aesthetic.
- CONTENT_PLANNING: Help plan content for each section.
- FINAL_REVIEW: Review the complete skeleton and make final adjustments.

RESPONSE FORMAT:
Always include skeleton updates in your response when making changes. Use this JSON block format:

\`\`\`skeleton-update
{
  "sections": [
    {
      "id": "section-uuid",
      "type": "hero|features|testimonials|cta|pricing|about|gallery|contact|footer|custom",
      "title": "Section Title",
      "description": "What this section contains and its purpose",
      "order": 1,
      "fidelity": "low|mid|high",
      "aiRecommendation": "Why this section works based on their inspirations"
    }
  ],
  "globalStyles": {
    "primaryColor": "#hex",
    "secondaryColor": "#hex",
    "fontPrimary": "Font Name",
    "fontSecondary": "Font Name",
    "layoutDensity": "compact|balanced|spacious"
  },
  "stage": "INITIAL_GENERATION|SECTION_REFINEMENT|STYLE_DIRECTION|CONTENT_PLANNING|FINAL_REVIEW",
  "readyForApproval": false
}
\`\`\`

Set readyForApproval to true only when the skeleton is complete and the client has confirmed they are satisfied.

Keep your conversational text separate from the skeleton-update block. Lead with insight, then provide the update.`
}
