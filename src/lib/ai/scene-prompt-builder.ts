// =============================================================================
// SCENE PROMPT BUILDER — builds rich cinematic image generation prompts from
// scene data + style metadata + brand context. Used by both production API
// routes and admin storyboard image tool.
//
// No `server-only` import so it can be used in client components.
//
// Prompt structure (newline-separated labeled sections):
//  1. SUBJECT            — concrete subject anchor extracted from scene fields
//  2. SCENE CONTENT      — AI's imageGenerationPrompt OR assembled fields
//  3. CASTING            — default demographic guidance for depicted people
//  4. VISUAL CONTINUITY  — batch non-hero only
//  5. STYLE DIRECTION    — from StyleMetadata.promptGuides (as modifier)
//  6. STYLE CHARACTER    — styleAxis + density + energy + visualElements
//  7. COLOR PALETTE      — merged style colorSamples + brand colors
//  8. ATMOSPHERE         — moodKeywords + colorTemperature -> lighting + mood
//  9. CAMERA             — enriched shot type + lens spec
// 10. LIGHTING           — inferred from mood + color temp
// 11. MOOD               — voiceover as atmospheric direction (NOT text)
// 12. TRANSITION         — enriched transition continuity
// 13. QUALITY DIRECTIVE  — film quality benchmark
// =============================================================================

import type { StyleMetadata, BrandContextForPrompt } from './image-providers/types'
import {
  inferShotSpecs,
  inferLighting,
  buildColorGrading,
  mapStyleAxis,
  mapDensity,
  mapEnergy,
  enrichTransition,
} from './cinematic-vocabulary'

export interface ScenePromptInput {
  description?: string
  visualNote?: string
  cameraNote?: string
  title?: string
  voiceover?: string
  transition?: string
  imageGenerationPrompt?: string
  sceneNumber?: number
}

/** Batch context for cross-scene visual consistency */
export interface BatchContext {
  totalScenes: number
  sceneIndex: number
  /** Whether this is the hero frame (scene 1 in hero-first strategy) */
  isHeroFrame?: boolean
}

/**
 * Extract a concrete subject anchor from scene fields.
 * Prioritizes `imageGenerationPrompt` first sentence, then assembles from
 * title + visualNote + description. Capped at 150 characters.
 */
export function extractSubjectAnchor(scene: ScenePromptInput): string | undefined {
  if (scene.imageGenerationPrompt) {
    // Take the first sentence (up to first period, or the whole thing if no period)
    const firstSentence = scene.imageGenerationPrompt.split(/\.\s/)[0]
    return firstSentence.slice(0, 150)
  }

  const parts: string[] = []
  if (scene.title) parts.push(scene.title)
  if (scene.visualNote) parts.push(scene.visualNote)
  if (scene.description) parts.push(scene.description)

  if (parts.length === 0) return undefined
  return parts.join(' — ').slice(0, 150)
}

/**
 * Build a rich cinematic image generation prompt from scene data,
 * style metadata, and brand context.
 *
 * When `StyleMetadata` is provided, leverages all available rich data:
 * - promptGuides as primary style anchors
 * - colorSamples as explicit hex palette
 * - moodKeywords for lighting and atmosphere
 * - styleAxis/density/energy for composition
 * - visualElements for technique guidance
 *
 * Falls back to legacy flat-string behavior when StyleMetadata is absent
 * (backward compatible with existing callers passing styleContext string).
 */
export function buildScenePrompt(
  scene: ScenePromptInput,
  styleContextOrMetadata: string | StyleMetadata,
  brandContext?: BrandContextForPrompt,
  batchContext?: BatchContext
): string {
  // Legacy path: if styleContext is a plain string, use simplified builder
  if (typeof styleContextOrMetadata === 'string') {
    return buildLegacyPrompt(scene, styleContextOrMetadata, batchContext)
  }

  const style = styleContextOrMetadata
  const sections: string[] = []

  // 1. SUBJECT — concrete subject anchor (front-loaded for FLUX.2 Pro attention)
  const subjectAnchor = extractSubjectAnchor(scene)
  if (subjectAnchor) {
    sections.push(
      `SUBJECT: ${subjectAnchor}. ` +
        'This is the PRIMARY subject of the image. All style, lighting, and composition must serve this subject. ' +
        'Do NOT replace this subject with generic objects, still-life arrangements, or abstract compositions.'
    )
  }

  // 2. SCENE CONTENT — moved up to front-load narrative before style
  if (scene.imageGenerationPrompt) {
    sections.push(`SCENE CONTENT: ${scene.imageGenerationPrompt}`)
  }

  if (!scene.imageGenerationPrompt) {
    const contentParts: string[] = []
    if (scene.title) {
      const prefix = scene.sceneNumber ? `Scene ${scene.sceneNumber}` : 'Scene'
      contentParts.push(`${prefix}: ${scene.title}`)
    }
    if (scene.visualNote) contentParts.push(scene.visualNote)
    if (scene.description) contentParts.push(scene.description)
    if (contentParts.length > 0) {
      sections.push(`SCENE CONTENT: ${contentParts.join('. ')}`)
    }
  }

  // 3. CASTING — default demographic guidance for people in scenes
  sections.push(
    'CASTING: When depicting people, show diverse professionals aged 25-35 with modern, ' +
      'polished appearances. Favor contemporary styling and natural expressions.'
  )

  // 4. VISUAL CONTINUITY — non-hero batch scenes reference the hero frame
  if (batchContext && batchContext.totalScenes > 1 && !batchContext.isHeroFrame) {
    sections.push(
      `VISUAL CONTINUITY: This is scene ${batchContext.sceneIndex + 1} of ${batchContext.totalScenes}. ` +
        'Maintain the same color palette, lighting temperature, and cinematic grade as the hero frame (scene 1), ' +
        'but create a distinctly different composition, camera angle, and subject arrangement for this scene.\n\n' +
        'SCENE DISTINCTION: Each scene must have its own unique framing, perspective, and focal subject. ' +
        'Vary the camera distance, angle, and environment between scenes to create visual storytelling progression.'
    )
  }

  // 5. STYLE DIRECTION — from promptGuides, applied as modifier to the subject above
  if (style.promptGuides.length > 0) {
    const guides = style.promptGuides.filter(Boolean).join('. ')
    if (guides) {
      sections.push(
        `STYLE DIRECTION: Apply the following style AS A MODIFIER to the subject above — ` +
          `do not let style override the scene's narrative content. ${guides}`
      )
    }
  }

  // 6. STYLE CHARACTER — styleAxis + density + energy + visualElements
  const characterParts: string[] = []
  for (const axis of style.styleAxes) {
    const mapped = mapStyleAxis(axis)
    if (mapped) characterParts.push(mapped)
  }
  const density = mapDensity(style.densityLevel)
  if (density) characterParts.push(density)
  const energy = mapEnergy(style.energyLevel)
  if (energy) characterParts.push(energy)
  if (style.visualElements.length > 0) {
    characterParts.push(`Visual approach: ${style.visualElements.join(', ')}`)
  }
  if (characterParts.length > 0) {
    sections.push(`STYLE CHARACTER: ${characterParts.join('. ')}`)
  }

  // 7. COLOR PALETTE — merged style colorSamples + brand colors
  const colorGrading = buildColorGrading(
    style.colorPalette,
    brandContext?.colors,
    brandContext?.industry
  )
  if (colorGrading) {
    sections.push(`COLOR PALETTE: ${colorGrading}`)
  }

  // 8. ATMOSPHERE — moodKeywords + colorTemperature -> mood direction
  if (style.moodKeywords.length > 0) {
    const moodStr = style.moodKeywords.join(', ')
    const tempStr = style.colorTemperature
      ? `. ${style.colorTemperature.charAt(0).toUpperCase() + style.colorTemperature.slice(1)}-toned atmosphere.`
      : '.'
    sections.push(`ATMOSPHERE: ${moodStr} mood${tempStr}`)
  }

  // 9. CAMERA — enriched shot type + lens spec
  const shotSpec = inferShotSpecs(scene.cameraNote, scene.visualNote)
  sections.push(`CAMERA: ${shotSpec}`)

  // 10. LIGHTING — inferred from moodKeywords + colorTemperature + voiceover
  const lighting = inferLighting({
    moodKeywords: style.moodKeywords,
    voiceover: scene.voiceover,
    colorTemperature: style.colorTemperature,
  })
  sections.push(`LIGHTING: ${lighting}`)

  // 11. MOOD — voiceover as atmospheric direction (NOT rendered as text)
  if (scene.voiceover) {
    sections.push(
      `MOOD: Convey the following emotional tone purely through visual composition, color, and lighting. ` +
        `Do NOT render any words, letters, or readable text from this content: "${scene.voiceover}"`
    )
  }

  // 12. TRANSITION
  if (scene.transition) {
    const enriched = enrichTransition(scene.transition)
    sections.push(`TRANSITION: ${enriched}`)
  }

  // 13. QUALITY DIRECTIVE
  sections.push(
    'CRITICAL RULE: This image must contain absolutely zero text, zero letters, zero words, zero numbers, zero typography of any kind. ' +
      'Do not render any readable characters, captions, subtitles, titles, buttons, labels, watermarks, or overlay text.\n\n' +
      'QUALITY DIRECTIVE: Shot on ARRI Alexa 35. 4K. Professional production quality, photorealistic. ' +
      'Pure visual imagery only — no text, watermarks, logos, UI elements, call-to-action buttons, or overlaid graphics.'
  )

  // Join with newlines (models parse labeled sections better with line breaks)
  // FLUX.2 Pro handles long prompts well — 8000 char limit
  return sections.join('\n\n').slice(0, 8000)
}

/**
 * Legacy prompt builder — backward compatible with callers that pass a flat string.
 * Used when StyleMetadata is not available (e.g., admin tools, simple regeneration).
 */
function buildLegacyPrompt(
  scene: ScenePromptInput,
  styleContext: string,
  batchContext?: BatchContext
): string {
  const parts: string[] = []

  // Subject anchor first — front-load narrative content
  const subjectAnchor = extractSubjectAnchor(scene)
  if (subjectAnchor) {
    parts.push(`SUBJECT: ${subjectAnchor}. This is the PRIMARY subject of the image.`)
  }

  // Scene content before style
  if (scene.imageGenerationPrompt) {
    parts.push(`SCENE CONTENT: ${scene.imageGenerationPrompt}`)
  } else {
    if (scene.title) {
      const prefix = scene.sceneNumber ? `Scene ${scene.sceneNumber}` : 'Scene'
      parts.push(`${prefix}: ${scene.title}`)
    }
    if (scene.visualNote) parts.push(scene.visualNote)
    if (scene.description) parts.push(scene.description)

    const shotSpec = inferShotSpecs(scene.cameraNote, scene.visualNote)
    parts.push(`Camera: ${shotSpec}`)

    if (scene.voiceover) {
      parts.push(
        `Mood context (convey this feeling visually, do NOT render as text): ${scene.voiceover}`
      )
    }
    if (scene.transition) {
      parts.push(`Transition: ${enrichTransition(scene.transition)}`)
    }
  }

  // CASTING — default demographic guidance
  parts.push(
    'CASTING: When depicting people, show diverse professionals aged 25-35 with modern, ' +
      'polished appearances. Favor contemporary styling and natural expressions.'
  )

  // Visual consistency after content
  if (batchContext && batchContext.totalScenes > 1) {
    parts.push(
      `VISUAL CONSISTENCY: This is scene ${batchContext.sceneIndex + 1} of ${batchContext.totalScenes} in a single storyboard. Maintain consistent color grading, lighting style, and visual treatment across all frames.`
    )
  }

  // Style as modifier, not primary direction
  if (styleContext) {
    parts.push(`STYLE DIRECTION: Apply as modifier to the subject above — ${styleContext}`)
  }

  parts.push(
    'Shot on ARRI Alexa 35. 4K. Professional production quality, photorealistic. No text, watermarks, or UI elements.'
  )

  return parts.join('\n\n').slice(0, 8000)
}
