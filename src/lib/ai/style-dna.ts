import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import {
  analyzeColorBucketFromHex,
  type ColorBucket,
  type StyleAxis,
} from '@/lib/constants/reference-libraries'

/**
 * Style DNA Extraction
 *
 * Extracts visual DNA from a brand's assets to create a comprehensive
 * style profile that can be used for intelligent style matching.
 */

/**
 * Color characteristics derived from brand colors
 */
export interface ColorDNA {
  temperature: ColorBucket // warm, cool, neutral
  temperatureScore: number // 0-100 how strongly it leans
  saturation: 'vibrant' | 'muted' | 'balanced'
  saturationScore: number
  contrast: 'high' | 'low' | 'medium'
  contrastScore: number
  dominantHue: string | null // e.g., "blue", "green", "orange"
}

/**
 * Typography characteristics
 */
export interface TypographyDNA {
  primaryStyle: 'serif' | 'sans-serif' | 'display' | 'handwritten' | 'unknown'
  secondaryStyle: 'serif' | 'sans-serif' | 'display' | 'handwritten' | 'unknown'
  personality: 'professional' | 'modern' | 'elegant' | 'playful' | 'neutral'
}

/**
 * Overall brand energy and style preferences
 */
export interface StyleDNA {
  // Core DNA components
  colorDNA: ColorDNA
  typographyDNA: TypographyDNA

  // Derived style preferences (0-100)
  energyLevel: number // 0=calm, 100=energetic
  densityLevel: number // 0=minimal, 100=rich
  formalityLevel: number // 0=casual, 100=formal
  modernityLevel: number // 0=traditional, 100=cutting-edge

  // Recommended style axes in order of fit
  recommendedAxes: {
    axis: StyleAxis
    confidence: number // 0-100
    reason: string
  }[]

  // Industry-based insights
  industryInsights: {
    industry: string
    commonStyles: StyleAxis[]
    avoidStyles: StyleAxis[]
  } | null

  // Overall brand personality
  brandPersonality: string[] // e.g., ["professional", "innovative", "trustworthy"]

  // Quality score for the DNA extraction (based on data completeness)
  dataQualityScore: number // 0-100
}

/**
 * Analyze hex color to extract hue name
 */
function getHueName(hex: string): string | null {
  const cleanHex = hex.replace('#', '')
  const r = parseInt(cleanHex.slice(0, 2), 16)
  const g = parseInt(cleanHex.slice(2, 4), 16)
  const b = parseInt(cleanHex.slice(4, 6), 16)

  // Convert to HSL
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2 / 255

  if (max === min) {
    // Achromatic (gray/black/white)
    return l > 0.9 ? 'white' : l < 0.1 ? 'black' : 'gray'
  }

  const d = max - min
  let h = 0

  if (max === r) {
    h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  } else if (max === g) {
    h = ((b - r) / d + 2) / 6
  } else {
    h = ((r - g) / d + 4) / 6
  }

  // Convert hue to color name
  const hDeg = h * 360
  if (hDeg < 15 || hDeg >= 345) return 'red'
  if (hDeg < 45) return 'orange'
  if (hDeg < 75) return 'yellow'
  if (hDeg < 150) return 'green'
  if (hDeg < 210) return 'cyan'
  if (hDeg < 270) return 'blue'
  if (hDeg < 330) return 'purple'
  return 'pink'
}

/**
 * Calculate color saturation from hex
 */
function getColorSaturation(hex: string): number {
  const cleanHex = hex.replace('#', '')
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  if (max === min) return 0

  const d = max - min
  return l > 0.5 ? d / (2 - max - min) : d / (max + min)
}

/**
 * Calculate color lightness from hex
 */
function getColorLightness(hex: string): number {
  const cleanHex = hex.replace('#', '')
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255

  return (Math.max(r, g, b) + Math.min(r, g, b)) / 2
}

/**
 * Analyze color DNA from brand colors
 */
function analyzeColorDNA(colors: {
  primaryColor: string | null
  secondaryColor: string | null
  accentColor: string | null
  brandColors: string[] | null
}): ColorDNA {
  const allColors: string[] = []
  if (colors.primaryColor) allColors.push(colors.primaryColor)
  if (colors.secondaryColor) allColors.push(colors.secondaryColor)
  if (colors.accentColor) allColors.push(colors.accentColor)
  if (colors.brandColors) allColors.push(...colors.brandColors)

  if (allColors.length === 0) {
    return {
      temperature: 'neutral',
      temperatureScore: 50,
      saturation: 'balanced',
      saturationScore: 50,
      contrast: 'medium',
      contrastScore: 50,
      dominantHue: null,
    }
  }

  // Analyze temperature
  const temperatures = allColors.map((c) => analyzeColorBucketFromHex(c))
  const tempCounts = { warm: 0, cool: 0, neutral: 0 }
  temperatures.forEach((t) => tempCounts[t]++)

  const dominantTemp = Object.entries(tempCounts).sort((a, b) => b[1] - a[1])[0][0] as ColorBucket
  const temperatureScore = Math.round((tempCounts[dominantTemp] / allColors.length) * 100)

  // Analyze saturation
  const saturations = allColors.map((c) => getColorSaturation(c))
  const avgSaturation = saturations.reduce((a, b) => a + b, 0) / saturations.length
  const saturationScore = Math.round(avgSaturation * 100)
  const saturation = avgSaturation > 0.6 ? 'vibrant' : avgSaturation < 0.3 ? 'muted' : 'balanced'

  // Analyze contrast (lightness variance)
  const lightnesses = allColors.map((c) => getColorLightness(c))
  const minLight = Math.min(...lightnesses)
  const maxLight = Math.max(...lightnesses)
  const contrastRange = maxLight - minLight
  const contrastScore = Math.round(contrastRange * 100)
  const contrast = contrastRange > 0.5 ? 'high' : contrastRange < 0.25 ? 'low' : 'medium'

  // Get dominant hue from primary color
  const dominantHue = colors.primaryColor ? getHueName(colors.primaryColor) : null

  return {
    temperature: dominantTemp,
    temperatureScore,
    saturation,
    saturationScore,
    contrast,
    contrastScore,
    dominantHue,
  }
}

/**
 * Common serif fonts
 */
const SERIF_FONTS = [
  'times',
  'georgia',
  'garamond',
  'playfair',
  'merriweather',
  'lora',
  'libre baskerville',
  'crimson',
  'pt serif',
  'noto serif',
]

/**
 * Common sans-serif fonts
 */
const SANS_SERIF_FONTS = [
  'arial',
  'helvetica',
  'roboto',
  'open sans',
  'lato',
  'montserrat',
  'poppins',
  'inter',
  'nunito',
  'raleway',
  'source sans',
  'work sans',
  'dm sans',
  'satoshi',
  'geist',
]

/**
 * Display/decorative fonts
 */
const DISPLAY_FONTS = [
  'impact',
  'bebas',
  'oswald',
  'archivo',
  'anton',
  'righteous',
  'bangers',
  'lobster',
]

/**
 * Handwritten/script fonts
 */
const HANDWRITTEN_FONTS = [
  'brush',
  'script',
  'dancing',
  'pacifico',
  'sacramento',
  'satisfy',
  'caveat',
  'indie flower',
]

/**
 * Analyze typography DNA from font names
 */
function analyzeTypographyDNA(fonts: {
  primaryFont: string | null
  secondaryFont: string | null
}): TypographyDNA {
  const classifyFont = (
    font: string | null
  ): 'serif' | 'sans-serif' | 'display' | 'handwritten' | 'unknown' => {
    if (!font) return 'unknown'
    const lower = font.toLowerCase()

    if (SERIF_FONTS.some((f) => lower.includes(f))) return 'serif'
    if (SANS_SERIF_FONTS.some((f) => lower.includes(f))) return 'sans-serif'
    if (DISPLAY_FONTS.some((f) => lower.includes(f))) return 'display'
    if (HANDWRITTEN_FONTS.some((f) => lower.includes(f))) return 'handwritten'

    // Default heuristics
    if (lower.includes('sans')) return 'sans-serif'
    if (lower.includes('serif')) return 'serif'

    return 'unknown'
  }

  const primaryStyle = classifyFont(fonts.primaryFont)
  const secondaryStyle = classifyFont(fonts.secondaryFont)

  // Derive personality from font combination
  let personality: 'professional' | 'modern' | 'elegant' | 'playful' | 'neutral' = 'neutral'

  if (primaryStyle === 'serif') {
    personality = 'elegant'
  } else if (primaryStyle === 'sans-serif') {
    personality = 'modern'
  } else if (primaryStyle === 'display') {
    personality = 'professional'
  } else if (primaryStyle === 'handwritten') {
    personality = 'playful'
  }

  // Refine based on combination
  if (primaryStyle === 'serif' && secondaryStyle === 'sans-serif') {
    personality = 'professional'
  }

  return {
    primaryStyle,
    secondaryStyle,
    personality,
  }
}

/**
 * Industry style mappings
 */
const INDUSTRY_STYLE_MAP: Record<
  string,
  {
    commonStyles: StyleAxis[]
    avoidStyles: StyleAxis[]
  }
> = {
  technology: {
    commonStyles: ['tech', 'minimal', 'corporate'],
    avoidStyles: ['organic', 'playful'],
  },
  saas: { commonStyles: ['tech', 'minimal', 'corporate'], avoidStyles: ['organic', 'playful'] },
  finance: { commonStyles: ['corporate', 'minimal', 'premium'], avoidStyles: ['playful', 'bold'] },
  fintech: { commonStyles: ['tech', 'corporate', 'minimal'], avoidStyles: ['playful', 'organic'] },
  healthcare: {
    commonStyles: ['minimal', 'corporate', 'organic'],
    avoidStyles: ['bold', 'playful'],
  },
  wellness: { commonStyles: ['organic', 'minimal', 'premium'], avoidStyles: ['corporate', 'bold'] },
  beauty: { commonStyles: ['premium', 'editorial', 'organic'], avoidStyles: ['corporate', 'tech'] },
  fashion: { commonStyles: ['editorial', 'premium', 'bold'], avoidStyles: ['corporate', 'tech'] },
  luxury: { commonStyles: ['premium', 'editorial', 'minimal'], avoidStyles: ['playful', 'bold'] },
  food: { commonStyles: ['organic', 'playful', 'bold'], avoidStyles: ['corporate', 'tech'] },
  restaurant: {
    commonStyles: ['organic', 'editorial', 'playful'],
    avoidStyles: ['corporate', 'tech'],
  },
  education: {
    commonStyles: ['playful', 'minimal', 'corporate'],
    avoidStyles: ['premium', 'bold'],
  },
  entertainment: {
    commonStyles: ['bold', 'playful', 'editorial'],
    avoidStyles: ['corporate', 'minimal'],
  },
  gaming: { commonStyles: ['bold', 'tech', 'playful'], avoidStyles: ['corporate', 'premium'] },
  sports: { commonStyles: ['bold', 'playful', 'tech'], avoidStyles: ['premium', 'editorial'] },
  retail: { commonStyles: ['playful', 'bold', 'organic'], avoidStyles: ['corporate', 'tech'] },
  ecommerce: {
    commonStyles: ['minimal', 'playful', 'bold'],
    avoidStyles: ['corporate', 'premium'],
  },
  media: { commonStyles: ['editorial', 'bold', 'minimal'], avoidStyles: ['corporate', 'organic'] },
  consulting: {
    commonStyles: ['corporate', 'minimal', 'premium'],
    avoidStyles: ['playful', 'bold'],
  },
  legal: {
    commonStyles: ['corporate', 'minimal', 'premium'],
    avoidStyles: ['playful', 'bold', 'organic'],
  },
  realestate: {
    commonStyles: ['premium', 'corporate', 'editorial'],
    avoidStyles: ['playful', 'tech'],
  },
  startup: { commonStyles: ['tech', 'minimal', 'bold'], avoidStyles: ['corporate', 'premium'] },
  nonprofit: { commonStyles: ['organic', 'minimal', 'playful'], avoidStyles: ['premium', 'bold'] },
}

/**
 * Match industry to style recommendations
 */
function getIndustryInsights(industry: string | null): {
  industry: string
  commonStyles: StyleAxis[]
  avoidStyles: StyleAxis[]
} | null {
  if (!industry) return null

  const normalizedIndustry = industry.toLowerCase().replace(/[^a-z]/g, '')

  for (const [key, value] of Object.entries(INDUSTRY_STYLE_MAP)) {
    if (normalizedIndustry.includes(key) || key.includes(normalizedIndustry)) {
      return {
        industry,
        ...value,
      }
    }
  }

  return null
}

/**
 * Calculate recommended style axes based on DNA
 */
function calculateRecommendedAxes(
  colorDNA: ColorDNA,
  typographyDNA: TypographyDNA,
  industryInsights: ReturnType<typeof getIndustryInsights>
): StyleDNA['recommendedAxes'] {
  const axisScores: Record<StyleAxis, { score: number; reasons: string[] }> = {
    minimal: { score: 50, reasons: [] },
    bold: { score: 50, reasons: [] },
    editorial: { score: 50, reasons: [] },
    corporate: { score: 50, reasons: [] },
    playful: { score: 50, reasons: [] },
    premium: { score: 50, reasons: [] },
    organic: { score: 50, reasons: [] },
    tech: { score: 50, reasons: [] },
  }

  // Color-based scoring
  if (colorDNA.temperature === 'cool') {
    axisScores.tech.score += 20
    axisScores.tech.reasons.push('Cool color palette')
    axisScores.minimal.score += 15
    axisScores.minimal.reasons.push('Cool tones suit minimal design')
    axisScores.corporate.score += 15
    axisScores.corporate.reasons.push('Cool colors convey professionalism')
  } else if (colorDNA.temperature === 'warm') {
    axisScores.organic.score += 20
    axisScores.organic.reasons.push('Warm color palette')
    axisScores.playful.score += 15
    axisScores.playful.reasons.push('Warm tones feel approachable')
    axisScores.bold.score += 10
    axisScores.bold.reasons.push('Warm colors can be bold')
  }

  if (colorDNA.saturation === 'vibrant') {
    axisScores.bold.score += 20
    axisScores.bold.reasons.push('Vibrant colors')
    axisScores.playful.score += 15
    axisScores.playful.reasons.push('High saturation feels playful')
  } else if (colorDNA.saturation === 'muted') {
    axisScores.minimal.score += 15
    axisScores.minimal.reasons.push('Muted tones')
    axisScores.premium.score += 15
    axisScores.premium.reasons.push('Understated palette')
    axisScores.organic.score += 10
    axisScores.organic.reasons.push('Natural, muted tones')
  }

  if (colorDNA.contrast === 'high') {
    axisScores.bold.score += 15
    axisScores.bold.reasons.push('High contrast')
    axisScores.editorial.score += 10
    axisScores.editorial.reasons.push('Editorial contrast')
  } else if (colorDNA.contrast === 'low') {
    axisScores.minimal.score += 10
    axisScores.minimal.reasons.push('Subtle contrast')
    axisScores.premium.score += 10
    axisScores.premium.reasons.push('Refined contrast')
  }

  // Typography-based scoring
  if (typographyDNA.primaryStyle === 'serif') {
    axisScores.editorial.score += 20
    axisScores.editorial.reasons.push('Serif typography')
    axisScores.premium.score += 15
    axisScores.premium.reasons.push('Classic typography')
  } else if (typographyDNA.primaryStyle === 'sans-serif') {
    axisScores.minimal.score += 15
    axisScores.minimal.reasons.push('Sans-serif typography')
    axisScores.tech.score += 15
    axisScores.tech.reasons.push('Modern sans-serif')
  } else if (typographyDNA.primaryStyle === 'handwritten') {
    axisScores.playful.score += 20
    axisScores.playful.reasons.push('Handwritten typography')
    axisScores.organic.score += 15
    axisScores.organic.reasons.push('Natural feel from typography')
  }

  // Industry-based scoring
  if (industryInsights) {
    industryInsights.commonStyles.forEach((style, i) => {
      const bonus = 25 - i * 5
      axisScores[style].score += bonus
      axisScores[style].reasons.push(`Common in ${industryInsights.industry}`)
    })

    industryInsights.avoidStyles.forEach((style) => {
      axisScores[style].score -= 15
    })
  }

  // Convert to sorted array
  return Object.entries(axisScores)
    .map(([axis, data]) => ({
      axis: axis as StyleAxis,
      confidence: Math.min(100, Math.max(0, data.score)),
      reason: data.reasons.length > 0 ? data.reasons[0] : 'General fit',
    }))
    .sort((a, b) => b.confidence - a.confidence)
}

/**
 * Calculate data quality score based on completeness
 */
function calculateDataQualityScore(company: {
  primaryColor: string | null
  secondaryColor: string | null
  accentColor: string | null
  primaryFont: string | null
  secondaryFont: string | null
  industry: string | null
  logoUrl: string | null
}): number {
  let score = 0
  const weights = {
    primaryColor: 20,
    secondaryColor: 10,
    accentColor: 10,
    primaryFont: 15,
    secondaryFont: 10,
    industry: 20,
    logoUrl: 15,
  }

  if (company.primaryColor) score += weights.primaryColor
  if (company.secondaryColor) score += weights.secondaryColor
  if (company.accentColor) score += weights.accentColor
  if (company.primaryFont) score += weights.primaryFont
  if (company.secondaryFont) score += weights.secondaryFont
  if (company.industry) score += weights.industry
  if (company.logoUrl) score += weights.logoUrl

  return score
}

/**
 * Extract Style DNA for a user's company
 */
export async function extractStyleDNA(userId: string): Promise<StyleDNA | null> {
  // Fetch user and company data
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { company: true },
  })

  const company = user?.company
  if (!company) return null

  // Analyze color DNA
  const colorDNA = analyzeColorDNA({
    primaryColor: company.primaryColor,
    secondaryColor: company.secondaryColor,
    accentColor: company.accentColor,
    brandColors: company.brandColors,
  })

  // Analyze typography DNA
  const typographyDNA = analyzeTypographyDNA({
    primaryFont: company.primaryFont,
    secondaryFont: company.secondaryFont,
  })

  // Get industry insights
  const industryInsights = getIndustryInsights(company.industry)

  // Calculate recommended axes
  const recommendedAxes = calculateRecommendedAxes(colorDNA, typographyDNA, industryInsights)

  // Calculate derived levels (0-100)
  const energyLevel =
    colorDNA.saturation === 'vibrant' ? 70 : colorDNA.saturation === 'muted' ? 30 : 50

  const densityLevel = colorDNA.contrast === 'high' ? 70 : colorDNA.contrast === 'low' ? 30 : 50

  const formalityLevel =
    typographyDNA.personality === 'professional'
      ? 80
      : typographyDNA.personality === 'elegant'
        ? 70
        : typographyDNA.personality === 'playful'
          ? 20
          : typographyDNA.personality === 'modern'
            ? 50
            : 50

  const modernityLevel =
    typographyDNA.primaryStyle === 'sans-serif'
      ? 70
      : typographyDNA.primaryStyle === 'serif'
        ? 30
        : colorDNA.temperature === 'cool'
          ? 60
          : 50

  // Generate brand personality tags
  const brandPersonality: string[] = []

  if (formalityLevel >= 70) brandPersonality.push('professional')
  if (formalityLevel <= 30) brandPersonality.push('approachable')
  if (modernityLevel >= 70) brandPersonality.push('innovative')
  if (modernityLevel <= 30) brandPersonality.push('classic')
  if (energyLevel >= 70) brandPersonality.push('dynamic')
  if (energyLevel <= 30) brandPersonality.push('calm')
  if (colorDNA.temperature === 'warm') brandPersonality.push('friendly')
  if (colorDNA.temperature === 'cool') brandPersonality.push('trustworthy')
  if (typographyDNA.personality === 'elegant') brandPersonality.push('refined')

  // Calculate data quality
  const dataQualityScore = calculateDataQualityScore(company)

  return {
    colorDNA,
    typographyDNA,
    energyLevel,
    densityLevel,
    formalityLevel,
    modernityLevel,
    recommendedAxes,
    industryInsights,
    brandPersonality,
    dataQualityScore,
  }
}

/**
 * Get a summary of the Style DNA for display
 */
export function getStyleDNASummary(dna: StyleDNA): {
  headline: string
  description: string
  topStyles: string[]
  personality: string[]
} {
  const topStyles = dna.recommendedAxes.slice(0, 3).map((a) => a.axis)

  let headline = 'Your Brand Style'
  let description = ''

  // Generate headline based on top characteristics
  if (dna.modernityLevel >= 70 && dna.energyLevel >= 60) {
    headline = 'Modern & Dynamic'
    description = 'Your brand has a contemporary feel with energetic visual elements.'
  } else if (dna.formalityLevel >= 70) {
    headline = 'Professional & Refined'
    description = 'Your brand conveys trust and expertise through polished design.'
  } else if (dna.energyLevel <= 30 && dna.densityLevel <= 40) {
    headline = 'Clean & Minimal'
    description = 'Your brand embraces simplicity and whitespace for impact.'
  } else if (dna.colorDNA.temperature === 'warm' && dna.energyLevel >= 50) {
    headline = 'Warm & Approachable'
    description = 'Your brand feels inviting and friendly through warm tones.'
  } else if (dna.colorDNA.saturation === 'vibrant') {
    headline = 'Bold & Vibrant'
    description = 'Your brand makes a statement with high-energy colors.'
  } else {
    headline = 'Balanced & Versatile'
    description = 'Your brand has a well-rounded visual identity.'
  }

  return {
    headline,
    description,
    topStyles,
    personality: dna.brandPersonality,
  }
}
