/**
 * Derive tone of voice from brand attributes.
 * Shared between server (chat route) and client (brand data hook).
 */
export function deriveToneOfVoice(
  brand: {
    industry?: string | null
    industryArchetype?: string | null
    keywords?: string[] | null
  } | null
): string {
  if (!brand) return 'Professional'

  const { industry, industryArchetype, keywords } = brand

  // Check keywords for tone indicators
  const keywordsLower = (keywords || []).map((k) => k.toLowerCase())

  if (keywordsLower.some((k) => ['playful', 'fun', 'creative', 'vibrant'].includes(k))) {
    return 'Playful & Creative'
  }
  if (keywordsLower.some((k) => ['luxury', 'premium', 'exclusive', 'elegant'].includes(k))) {
    return 'Premium & Sophisticated'
  }
  if (keywordsLower.some((k) => ['friendly', 'approachable', 'warm', 'welcoming'].includes(k))) {
    return 'Friendly & Approachable'
  }
  if (keywordsLower.some((k) => ['bold', 'innovative', 'disruptive', 'cutting-edge'].includes(k))) {
    return 'Bold & Innovative'
  }

  // Derive from archetype
  if (industryArchetype) {
    const archetypeTones: Record<string, string> = {
      hospitality: 'Warm & Welcoming',
      'blue-collar': 'Direct & Trustworthy',
      'white-collar': 'Professional & Authoritative',
      'e-commerce': 'Engaging & Persuasive',
      tech: 'Modern & Innovative',
    }
    if (archetypeTones[industryArchetype.toLowerCase()]) {
      return archetypeTones[industryArchetype.toLowerCase()]
    }
  }

  // Derive from industry
  if (industry) {
    const industryTones: Record<string, string> = {
      technology: 'Modern & Innovative',
      saas: 'Clear & Solution-focused',
      finance: 'Trustworthy & Professional',
      healthcare: 'Caring & Authoritative',
      education: 'Informative & Encouraging',
      'food & beverage': 'Appetizing & Inviting',
      'fashion & apparel': 'Trendy & Aspirational',
      entertainment: 'Exciting & Engaging',
    }
    const industryLower = industry.toLowerCase()
    for (const [key, tone] of Object.entries(industryTones)) {
      if (industryLower.includes(key)) {
        return tone
      }
    }
  }

  return 'Professional & Clear'
}
