import { NextRequest } from 'next/server'
import { db } from '@/db'
import { users, deliverableStyleReferences } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'

// Color distance calculation (simple RGB euclidean)
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

function colorDistance(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1)
  const rgb2 = hexToRgb(hex2)
  if (!rgb1 || !rgb2) return Infinity

  return Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) + Math.pow(rgb1.g - rgb2.g, 2) + Math.pow(rgb1.b - rgb2.b, 2)
  )
}

// Color family classification for grouping
type ColorFamily =
  | 'red_pink'
  | 'orange_yellow'
  | 'green'
  | 'blue_teal'
  | 'purple'
  | 'neutral'
  | 'mixed'

function getColorFamily(hex: string): ColorFamily {
  const rgb = hexToRgb(hex)
  if (!rgb) return 'neutral'

  const { r, g, b } = rgb
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const chroma = max - min

  // If very low chroma, it's neutral (gray/white/black)
  if (chroma < 30) return 'neutral'

  // Calculate hue
  let hue = 0
  if (chroma > 0) {
    if (max === r) {
      hue = ((g - b) / chroma) % 6
    } else if (max === g) {
      hue = (b - r) / chroma + 2
    } else {
      hue = (r - g) / chroma + 4
    }
    hue = Math.round(hue * 60)
    if (hue < 0) hue += 360
  }

  // Map hue to color family
  if (hue >= 345 || hue < 15) return 'red_pink'
  if (hue >= 15 && hue < 45) return 'orange_yellow'
  if (hue >= 45 && hue < 75) return 'orange_yellow'
  if (hue >= 75 && hue < 165) return 'green'
  if (hue >= 165 && hue < 255) return 'blue_teal'
  if (hue >= 255 && hue < 285) return 'purple'
  if (hue >= 285 && hue < 345) return 'red_pink' // Magenta/Pink range

  return 'neutral'
}

// Get dominant color family from array of colors
function getDominantColorFamily(colors: string[]): ColorFamily {
  if (colors.length === 0) return 'neutral'

  const families = colors.map(getColorFamily)
  const counts: Record<ColorFamily, number> = {
    red_pink: 0,
    orange_yellow: 0,
    green: 0,
    blue_teal: 0,
    purple: 0,
    neutral: 0,
    mixed: 0,
  }

  families.forEach((f) => counts[f]++)

  // Find the dominant non-neutral family
  let maxFamily: ColorFamily = 'neutral'
  let maxCount = 0
  const nonNeutralFamilies: ColorFamily[] = [
    'red_pink',
    'orange_yellow',
    'green',
    'blue_teal',
    'purple',
  ]

  for (const family of nonNeutralFamilies) {
    if (counts[family] > maxCount) {
      maxCount = counts[family]
      maxFamily = family
    }
  }

  // If multiple families have same count, it's mixed
  const familiesWithMaxCount = nonNeutralFamilies.filter(
    (f) => counts[f] === maxCount && maxCount > 0
  )
  if (familiesWithMaxCount.length > 1) return 'mixed'

  return maxCount > 0 ? maxFamily : 'neutral'
}

// Check if a color is very close to white or black (neutral)
function isNeutralColor(hex: string): boolean {
  const rgb = hexToRgb(hex)
  if (!rgb) return true

  const { r, g, b } = rgb
  // White-ish (all values high and similar)
  if (r > 220 && g > 220 && b > 220) return true
  // Black-ish (all values low)
  if (r < 35 && g < 35 && b < 35) return true
  // Gray-ish (all values similar)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max - min < 30 && max < 200 && min > 55) return true

  return false
}

// GET - Fetch style references that match user's brand
export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAuth()

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20')

    // Get user with company
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      with: {
        company: true,
      },
    })

    // Get all active style references (increased limit to show more per category)
    const allReferences = await db.query.deliverableStyleReferences.findMany({
      where: eq(deliverableStyleReferences.isActive, true),
      limit: 500,
    })

    if (!user?.company || allReferences.length === 0) {
      // Return references grouped by color family if no brand data
      return successResponse(groupByColorFamilyData(allReferences, limit, null))
    }

    const company = user.company

    // Collect brand colors (excluding pure white/black which match everything)
    const brandColors: string[] = []
    const brandColorsForMatching: string[] = []
    if (company.primaryColor) {
      brandColors.push(company.primaryColor)
      if (!isNeutralColor(company.primaryColor)) {
        brandColorsForMatching.push(company.primaryColor)
      }
    }
    if (company.secondaryColor) {
      brandColors.push(company.secondaryColor)
      if (!isNeutralColor(company.secondaryColor)) {
        brandColorsForMatching.push(company.secondaryColor)
      }
    }
    if (company.accentColor) {
      brandColors.push(company.accentColor)
      if (!isNeutralColor(company.accentColor)) {
        brandColorsForMatching.push(company.accentColor)
      }
    }
    if (company.brandColors && Array.isArray(company.brandColors)) {
      const filtered = company.brandColors.filter((c): c is string => typeof c === 'string')
      brandColors.push(...filtered)
      brandColorsForMatching.push(...filtered.filter((c) => !isNeutralColor(c)))
    }

    if (brandColorsForMatching.length === 0) {
      // Return references grouped by color family if no meaningful colors
      return successResponse(groupByColorFamilyData(allReferences, limit, brandColors))
    }

    // Get brand color families for matching
    const brandColorFamilies = new Set(brandColorsForMatching.map(getColorFamily))

    // STRICT color matching: only match if reference has a color very close to brand colors
    // Distance threshold: ~50 (fairly close in RGB space)
    const STRICT_DISTANCE_THRESHOLD = 60

    const scoredReferences = allReferences.map((ref) => {
      const refColors = ref.colorSamples as string[] | null
      let bestMatchDistance = Infinity
      let matchedBrandColor: string | null = null
      let refDominantFamily: ColorFamily = 'neutral'

      if (refColors && Array.isArray(refColors) && refColors.length > 0) {
        // Get dominant color family of the reference
        refDominantFamily = getDominantColorFamily(refColors)

        // Check for strict color matches
        for (const brandColor of brandColorsForMatching) {
          for (const refColor of refColors) {
            const distance = colorDistance(brandColor, refColor)
            if (distance < bestMatchDistance) {
              bestMatchDistance = distance
              matchedBrandColor = brandColor
            }
          }
        }
      } else {
        // If no color samples, use colorTemperature field to determine family
        const temp = ref.colorTemperature as string | null
        if (temp === 'warm') refDominantFamily = 'orange_yellow'
        else if (temp === 'cool') refDominantFamily = 'blue_teal'
        else refDominantFamily = 'neutral'
      }

      return {
        ...ref,
        matchDistance: bestMatchDistance,
        matchedBrandColor,
        refDominantFamily,
        isBrandMatch: bestMatchDistance < STRICT_DISTANCE_THRESHOLD,
      }
    })

    // Separate into brand matches and others
    const brandMatches = scoredReferences
      .filter((r) => r.isBrandMatch)
      .sort((a, b) => a.matchDistance - b.matchDistance)

    const otherRefs = scoredReferences.filter((r) => !r.isBrandMatch)

    // Group others by their dominant color family
    const colorFamilyGroups: Record<ColorFamily, typeof scoredReferences> = {
      red_pink: [],
      orange_yellow: [],
      green: [],
      blue_teal: [],
      purple: [],
      neutral: [],
      mixed: [],
    }

    for (const ref of otherRefs) {
      colorFamilyGroups[ref.refDominantFamily].push(ref)
    }

    // Group by deliverable type instead of color
    const deliverableTypeGroups: Record<string, typeof scoredReferences> = {}

    for (const ref of scoredReferences) {
      const type = ref.deliverableType || 'other'
      if (!deliverableTypeGroups[type]) {
        deliverableTypeGroups[type] = []
      }
      deliverableTypeGroups[type].push(ref)
    }

    // Sort within each group: brand matches first, then by popularity
    for (const type in deliverableTypeGroups) {
      deliverableTypeGroups[type].sort((a, b) => {
        // Brand matches first
        if (a.isBrandMatch && !b.isBrandMatch) return -1
        if (!a.isBrandMatch && b.isBrandMatch) return 1
        // Then by color distance (closer to brand = better)
        if (a.isBrandMatch && b.isBrandMatch) {
          return a.matchDistance - b.matchDistance
        }
        // Then shuffle for variety
        return 0.5 - Math.random()
      })
    }

    // Define display order for deliverable types
    const typeOrder = [
      'instagram_post',
      'instagram_story',
      'linkedin_post',
      'static_ad',
      'facebook_ad',
      'twitter_post',
      'instagram_reel',
      'youtube_thumbnail',
      'email_header',
      'web_banner',
      'presentation_slide',
      'video_ad',
    ]

    // Build result grouped by deliverable type
    const result: Array<(typeof scoredReferences)[0] & { contentCategory: string }> = []

    for (const type of typeOrder) {
      const typeRefs = deliverableTypeGroups[type] || []
      for (const ref of typeRefs) {
        if (result.length >= limit) break
        result.push({ ...ref, contentCategory: type })
      }
    }

    // Add any remaining types not in the predefined order
    for (const type in deliverableTypeGroups) {
      if (!typeOrder.includes(type)) {
        const typeRefs = deliverableTypeGroups[type]
        for (const ref of typeRefs) {
          if (result.length >= limit) break
          result.push({ ...ref, contentCategory: type })
        }
      }
    }

    // Clean up internal scoring fields from response
    const cleanResult = result.map(
      ({
        matchDistance: _matchDistance,
        matchedBrandColor: _matchedBrandColor,
        refDominantFamily: _refDominantFamily,
        isBrandMatch: _isBrandMatch,
        ...ref
      }) => ref
    )

    return successResponse({
      data: cleanResult,
      matchMethod: 'content_category',
      brandColors,
      brandColorFamilies: Array.from(brandColorFamilies),
      groups: {
        matchesBrand: brandMatches.length,
        total: allReferences.length,
      },
    })
  })
}

// Helper function to group references by content category when no brand data
function groupByColorFamilyData(
  references: (typeof deliverableStyleReferences.$inferSelect)[],
  limit: number,
  brandColors: string[] | null
) {
  // Group by deliverable type
  const deliverableTypeGroups: Record<string, typeof references> = {}

  for (const ref of references) {
    const type = ref.deliverableType || 'other'
    if (!deliverableTypeGroups[type]) {
      deliverableTypeGroups[type] = []
    }
    deliverableTypeGroups[type].push(ref)
  }

  // Shuffle within each group for variety
  for (const type in deliverableTypeGroups) {
    deliverableTypeGroups[type].sort(() => 0.5 - Math.random())
  }

  // Define display order for deliverable types
  const typeOrder = [
    'instagram_post',
    'instagram_story',
    'linkedin_post',
    'static_ad',
    'facebook_ad',
    'twitter_post',
    'instagram_reel',
    'youtube_thumbnail',
    'email_header',
    'web_banner',
    'presentation_slide',
    'video_ad',
  ]

  const result: Array<(typeof references)[0] & { contentCategory: string }> = []

  for (const type of typeOrder) {
    const typeRefs = deliverableTypeGroups[type] || []
    for (const ref of typeRefs) {
      if (result.length >= limit) break
      result.push({ ...ref, contentCategory: type })
    }
  }

  // Add any remaining types
  for (const type in deliverableTypeGroups) {
    if (!typeOrder.includes(type)) {
      const typeRefs = deliverableTypeGroups[type]
      for (const ref of typeRefs) {
        if (result.length >= limit) break
        result.push({ ...ref, contentCategory: type })
      }
    }
  }

  return {
    data: result,
    matchMethod: 'content_category',
    brandColors,
  }
}
