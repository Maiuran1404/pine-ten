// =============================================================================
// STYLE DIRECTIVE BUILDER — pre-computes the `imageGenDirective` field from
// deliverableStyleReference metadata. Computed once when a style is
// created/updated, stored in the `image_gen_directive` column, and used
// directly at generation time with zero prompt assembly overhead.
//
// No `server-only` — can be used by admin tools and server routes.
// =============================================================================

import { mapStyleAxis, mapDensity, mapEnergy, inferLighting } from './cinematic-vocabulary'

interface StyleFields {
  promptGuide?: string | null
  colorSamples?: string[] | null
  moodKeywords?: string[] | null
  visualElements?: string[] | null
  styleAxis?: string | null
  colorTemperature?: string | null
  energyLevel?: string | null
  densityLevel?: string | null
}

/**
 * Build a pre-computed style directive from a deliverableStyleReference's fields.
 * This is stored in `imageGenDirective` and injected directly into prompts.
 */
export function buildStyleDirective(fields: StyleFields): string {
  const sections: string[] = []

  // Primary style direction from promptGuide
  if (fields.promptGuide) {
    sections.push(`STYLE: ${fields.promptGuide}`)
  }

  // Style character from axis + density + energy + visual elements
  const characterParts: string[] = []
  if (fields.styleAxis) {
    const mapped = mapStyleAxis(fields.styleAxis)
    if (mapped) characterParts.push(mapped)
  }
  if (fields.densityLevel) {
    const mapped = mapDensity(fields.densityLevel)
    if (mapped) characterParts.push(mapped)
  }
  if (fields.energyLevel) {
    const mapped = mapEnergy(fields.energyLevel)
    if (mapped) characterParts.push(mapped)
  }
  if (fields.visualElements && fields.visualElements.length > 0) {
    characterParts.push(`Visual approach: ${fields.visualElements.join(', ')}`)
  }
  if (characterParts.length > 0) {
    sections.push(`CHARACTER: ${characterParts.join('. ')}`)
  }

  // Color palette
  if (fields.colorSamples && fields.colorSamples.length > 0) {
    sections.push(`PALETTE: ${fields.colorSamples.slice(0, 6).join(', ')}`)
  }

  // Mood + lighting from keywords and temperature
  if (fields.moodKeywords && fields.moodKeywords.length > 0) {
    sections.push(`MOOD: ${fields.moodKeywords.join(', ')}`)

    const lighting = inferLighting({
      moodKeywords: fields.moodKeywords,
      colorTemperature: fields.colorTemperature ?? undefined,
    })
    sections.push(`LIGHTING: ${lighting}`)
  } else if (fields.colorTemperature) {
    const lighting = inferLighting({
      colorTemperature: fields.colorTemperature,
    })
    sections.push(`LIGHTING: ${lighting}`)
  }

  return sections.join('\n')
}
