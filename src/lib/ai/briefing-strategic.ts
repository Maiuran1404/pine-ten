/**
 * Strategic Review Logic for Briefing State Machine
 *
 * Provides inspiration fit checking at the STRATEGIC_REVIEW stage.
 * All functions are pure — no side effects, no API calls.
 */

import type { StrategicReviewData, DeliverableCategory } from './briefing-state-machine'

// =============================================================================
// FIT CHECK TYPES
// =============================================================================

export interface FitCheckResult {
  fitScore: StrategicReviewData['inspirationFitScore']
  note: string | null
}

// =============================================================================
// BRAND / AUDIENCE AFFINITY DATA
// =============================================================================

interface BrandAffinityRule {
  brand: string[]
  audiences: string[]
  industries: string[]
  categories: DeliverableCategory[]
}

/**
 * Maps brand/inspiration references to their natural audience affinity.
 * Used to detect mismatches between inspiration and target audience.
 */
const BRAND_AFFINITY: BrandAffinityRule[] = [
  {
    brand: ['stripe', 'linear', 'vercel', 'notion', 'figma'],
    audiences: ['developer', 'cto', 'engineer', 'technical', 'b2b', 'saas', 'startup'],
    industries: ['saas', 'b2b', 'technology', 'fintech', 'developer tools'],
    categories: ['video', 'website', 'design'],
  },
  {
    brand: ['gymshark', 'nike', 'under armour', 'lululemon'],
    audiences: ['consumer', 'fitness', 'athlete', 'gym', 'young'],
    industries: ['fitness', 'sports', 'consumer', 'health', 'dtc'],
    categories: ['video', 'content', 'design'],
  },
  {
    brand: ['apple', 'tesla'],
    audiences: ['consumer', 'premium', 'mainstream'],
    industries: ['technology', 'consumer', 'premium'],
    categories: ['video', 'website', 'design', 'brand'],
  },
  {
    brand: ['patagonia', 'everlane', 'allbirds'],
    audiences: ['consumer', 'sustainability', 'millennial', 'eco-conscious'],
    industries: ['fashion', 'sustainable', 'retail', 'eco'],
    categories: ['content', 'design', 'brand'],
  },
  {
    brand: ['goldman sachs', 'jp morgan', 'bloomberg'],
    audiences: ['enterprise', 'executive', 'investor', 'institutional'],
    industries: ['finance', 'banking', 'fintech'],
    categories: ['website', 'design', 'brand'],
  },
]

/**
 * Style axis affinity to audience segments.
 * Used when no specific brand is referenced but style names suggest a direction.
 */
const STYLE_AUDIENCE_AFFINITY: Record<string, { natural: string[]; friction: string[] }> = {
  brutalist: {
    natural: ['design', 'creative', 'tech', 'avant-garde'],
    friction: ['wellness', 'health', 'beauty', 'family', 'conservative', 'enterprise'],
  },
  playful: {
    natural: ['consumer', 'kids', 'education', 'food', 'entertainment'],
    friction: ['enterprise', 'finance', 'legal', 'executive', 'b2b'],
  },
  corporate: {
    natural: ['enterprise', 'b2b', 'finance', 'legal', 'consulting'],
    friction: ['gen z', 'consumer', 'creative', 'youth'],
  },
  organic: {
    natural: ['wellness', 'health', 'sustainability', 'food', 'beauty'],
    friction: ['tech', 'fintech', 'enterprise', 'gaming'],
  },
  premium: {
    natural: ['luxury', 'fashion', 'hospitality', 'automotive', 'real estate'],
    friction: ['budget', 'student', 'diy'],
  },
  tech: {
    natural: ['developer', 'saas', 'ai', 'fintech', 'startup'],
    friction: ['wellness', 'beauty', 'lifestyle', 'fashion'],
  },
  bold: {
    natural: ['fitness', 'sports', 'entertainment', 'gaming', 'retail'],
    friction: ['healthcare', 'finance', 'legal'],
  },
}

// =============================================================================
// INSPIRATION FIT CHECK
// =============================================================================

/**
 * Check how well the selected inspiration/styles match the audience and intent.
 * Returns a fit score with an optional conversational note.
 *
 * - 'aligned': inspiration naturally matches audience expectations
 * - 'minor_mismatch': usable but may need tonal adjustment
 * - 'significant_mismatch': notable tension between inspiration and audience
 */
export function inspirationFitCheck(
  inspirationRefs: string[],
  selectedStyles: Array<{ styleAxis: string; name: string }>,
  audience: string | null,
  industry: string | null,
  intent: string | null,
  category: DeliverableCategory | null
): FitCheckResult {
  // If no inspiration refs and no selected styles, nothing to check
  if (inspirationRefs.length === 0 && selectedStyles.length === 0) {
    return { fitScore: 'aligned', note: null }
  }

  const context = [audience, industry, intent].filter(Boolean).join(' ').toLowerCase()

  // Check brand-level fit
  const brandFit = checkBrandFit(inspirationRefs, context, category)
  if (brandFit) return brandFit

  // Check style axis fit
  const styleFit = checkStyleFit(selectedStyles, context)
  if (styleFit) return styleFit

  // Default: aligned
  return { fitScore: 'aligned', note: null }
}

function checkBrandFit(
  inspirationRefs: string[],
  context: string,
  _category: DeliverableCategory | null
): FitCheckResult | null {
  for (const ref of inspirationRefs) {
    const refLower = ref.toLowerCase()

    for (const rule of BRAND_AFFINITY) {
      const matchesBrand = rule.brand.some((b) => refLower.includes(b))
      if (!matchesBrand) continue

      // Check if the target audience/industry overlaps with brand's natural audience
      const hasAudienceOverlap = rule.audiences.some((a) => context.includes(a))
      const hasIndustryOverlap = rule.industries.some((i) => context.includes(i))

      if (hasAudienceOverlap || hasIndustryOverlap) {
        return { fitScore: 'aligned', note: null }
      }

      // No overlap — determine severity
      // If the brand is consumer-focused but audience is enterprise (or vice versa)
      const brandIsConsumer = rule.audiences.some((a) =>
        ['consumer', 'fitness', 'athlete', 'young', 'gym'].includes(a)
      )
      const contextIsEnterprise = ['enterprise', 'b2b', 'cto', 'executive', 'corporate'].some(
        (term) => context.includes(term)
      )
      const contextIsConsumer = ['consumer', 'fitness', 'gen z', 'young', 'dtc'].some((term) =>
        context.includes(term)
      )
      const brandIsEnterprise = rule.audiences.some((a) =>
        ['enterprise', 'executive', 'institutional'].includes(a)
      )

      if ((brandIsConsumer && contextIsEnterprise) || (brandIsEnterprise && contextIsConsumer)) {
        const brandName = rule.brand[0].charAt(0).toUpperCase() + rule.brand[0].slice(1)
        return {
          fitScore: 'significant_mismatch',
          note: `${brandName}'s visual energy is ${brandIsConsumer ? 'consumer' : 'enterprise'}-coded. For ${contextIsEnterprise ? 'enterprise buyers' : 'consumer audiences'}, consider borrowing the pacing but dialing back the ${brandIsConsumer ? 'lifestyle intensity' : 'corporate formality'}.`,
        }
      }

      // Minor mismatch — different but not opposing
      const brandName = rule.brand[0].charAt(0).toUpperCase() + rule.brand[0].slice(1)
      return {
        fitScore: 'minor_mismatch',
        note: `${brandName}'s style works but may need tonal adjustment for your audience. Borrow the core visual language while adapting the messaging weight.`,
      }
    }
  }

  return null
}

function checkStyleFit(
  selectedStyles: Array<{ styleAxis: string; name: string }>,
  context: string
): FitCheckResult | null {
  for (const style of selectedStyles) {
    const axisLower = style.styleAxis.toLowerCase()
    const affinity = STYLE_AUDIENCE_AFFINITY[axisLower]
    if (!affinity) continue

    // Check for friction
    const hasFriction = affinity.friction.some((f) => context.includes(f))
    const hasNatural = affinity.natural.some((n) => context.includes(n))

    if (hasFriction && !hasNatural) {
      const axisLabel = style.styleAxis.charAt(0).toUpperCase() + style.styleAxis.slice(1)
      return {
        fitScore: 'significant_mismatch',
        note: `${axisLabel} aesthetics can feel ${axisLower === 'brutalist' ? 'confrontational' : 'misaligned'} for your target audience. Consider a softer interpretation or a different direction.`,
      }
    }

    if (hasFriction && hasNatural) {
      return {
        fitScore: 'minor_mismatch',
        note: `This style has some tension with parts of your audience but could work with careful execution.`,
      }
    }
  }

  return null
}
