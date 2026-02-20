import 'server-only'
import type { StoryboardImage } from '@/lib/ai/storyboard-image-types'
import { TECHNIQUE_MAP, type EyecannndyTechnique } from '@/lib/ai/eyecannndy-techniques'

// =============================================================================
// EYECANNNDY CLIENT — local technique lookup (synchronous, no API calls)
// =============================================================================

/**
 * Match AI-suggested visual techniques against Eyecannndy's technique library.
 * Returns technique references as StoryboardImage entries with mediaType 'gif'.
 *
 * For v1: technique page URLs are used as `url`. The UI renders these as
 * technique badges linking to Eyecannndy rather than inline GIFs.
 */
export function getEyecannndyForScene(visualTechniques: string[]): StoryboardImage[] {
  if (!visualTechniques || visualTechniques.length === 0) return []

  const matched = new Set<string>() // Avoid duplicate slugs
  const results: StoryboardImage[] = []

  for (const technique of visualTechniques) {
    const normalised = technique.toLowerCase().trim()
    const match = findBestMatch(normalised)
    if (match && !matched.has(match.slug)) {
      matched.add(match.slug)
      results.push({
        id: `eyecannndy_${match.slug}`,
        url: match.pageUrl,
        source: 'eyecannndy',
        mediaType: 'gif',
        alt: `${match.name} technique reference`,
        attribution: {
          sourceName: 'Eyecannndy',
          sourceUrl: match.pageUrl,
          techniqueName: match.name,
        },
      })
    }
  }

  return results
}

/**
 * Fuzzy match: first try exact slug, then keyword includes.
 */
function findBestMatch(input: string): EyecannndyTechnique | null {
  // Exact slug match
  const exactSlug = TECHNIQUE_MAP.find((t) => t.slug === input)
  if (exactSlug) return exactSlug

  // Exact name match (case-insensitive)
  const exactName = TECHNIQUE_MAP.find((t) => t.name.toLowerCase() === input)
  if (exactName) return exactName

  // Keyword contains — score by how many keywords match
  let bestMatch: EyecannndyTechnique | null = null
  let bestScore = 0

  for (const technique of TECHNIQUE_MAP) {
    let score = 0
    for (const keyword of technique.keywords) {
      if (input.includes(keyword) || keyword.includes(input)) {
        score++
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestMatch = technique
    }
  }

  return bestScore > 0 ? bestMatch : null
}
