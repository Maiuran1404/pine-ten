// =============================================================================
// SCENE PROMPT BUILDER — builds rich cinematic image generation prompts from
// scene data + style metadata + brand context. Used by both production API
// routes and admin storyboard image tool.
//
// No `server-only` import so it can be used in client components.
//
// Prompt structure (newline-separated labeled sections):
//  1. VISUAL CONTINUITY  — batch non-hero only
//  2. STYLE DIRECTION    — from StyleMetadata.promptGuides
//  3. STYLE CHARACTER    — styleAxis + density + energy + visualElements
//  4. COLOR PALETTE      — merged style colorSamples + brand colors
//  5. ATMOSPHERE         — moodKeywords + colorTemperature -> lighting + mood
//  6. SCENE CONTENT      — AI's imageGenerationPrompt OR assembled fields
//  7. CAMERA             — enriched shot type + lens spec
//  8. LIGHTING           — inferred from mood + color temp
//  9. MOOD               — voiceover as atmospheric direction (NOT text)
// 10. TRANSITION         — enriched transition continuity
// 11. QUALITY DIRECTIVE  — film quality benchmark
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

  // 1. VISUAL CONTINUITY — non-hero batch scenes reference the hero frame
  if (batchContext && batchContext.totalScenes > 1 && !batchContext.isHeroFrame) {
    sections.push(
      `VISUAL CONTINUITY: This is scene ${batchContext.sceneIndex + 1} of ${batchContext.totalScenes}. ` +
        'Match the hero frame (scene 1) color grading, lighting style, and visual treatment exactly. ' +
        'Maintain unified palette, mood, and cinematic style throughout all frames.'
    )
  }

  // 2. STYLE DIRECTION — from promptGuides (expert-crafted visual direction)
  if (style.promptGuides.length > 0) {
    const guides = style.promptGuides.filter(Boolean).join('. ')
    if (guides) {
      sections.push(`STYLE DIRECTION: ${guides}`)
    }
  }

  // 3. STYLE CHARACTER — styleAxis + density + energy + visualElements
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

  // 4. COLOR PALETTE — merged style colorSamples + brand colors
  const colorGrading = buildColorGrading(
    style.colorPalette,
    brandContext?.colors,
    brandContext?.industry
  )
  if (colorGrading) {
    sections.push(`COLOR PALETTE: ${colorGrading}`)
  }

  // 5. ATMOSPHERE — moodKeywords + colorTemperature -> mood direction
  if (style.moodKeywords.length > 0) {
    const moodStr = style.moodKeywords.join(', ')
    const tempStr = style.colorTemperature
      ? `. ${style.colorTemperature.charAt(0).toUpperCase() + style.colorTemperature.slice(1)}-toned atmosphere.`
      : '.'
    sections.push(`ATMOSPHERE: ${moodStr} mood${tempStr}`)
  }

  // 6. SCENE CONTENT
  if (scene.imageGenerationPrompt) {
    sections.push(`SCENE CONTENT: ${scene.imageGenerationPrompt}`)
  } else {
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

  // 7. CAMERA — enriched shot type + lens spec
  const shotSpec = inferShotSpecs(scene.cameraNote, scene.visualNote)
  sections.push(`CAMERA: ${shotSpec}`)

  // 8. LIGHTING — inferred from moodKeywords + colorTemperature + voiceover
  const lighting = inferLighting({
    moodKeywords: style.moodKeywords,
    voiceover: scene.voiceover,
    colorTemperature: style.colorTemperature,
  })
  sections.push(`LIGHTING: ${lighting}`)

  // 9. MOOD — voiceover as atmospheric direction (NOT rendered as text)
  if (scene.voiceover) {
    sections.push(
      `MOOD: Convey this feeling visually (do NOT render as text): "${scene.voiceover}"`
    )
  }

  // 10. TRANSITION
  if (scene.transition) {
    const enriched = enrichTransition(scene.transition)
    sections.push(`TRANSITION: ${enriched}`)
  }

  // 11. QUALITY DIRECTIVE
  sections.push(
    'QUALITY DIRECTIVE: Shot on ARRI Alexa 35. 4K. Professional production quality, photorealistic. ' +
      'No text, watermarks, logos, UI elements, or overlaid graphics in the image.'
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

  if (batchContext && batchContext.totalScenes > 1) {
    parts.push(
      `VISUAL CONSISTENCY: This is scene ${batchContext.sceneIndex + 1} of ${batchContext.totalScenes} in a single storyboard. Maintain consistent color grading, lighting style, and visual treatment across all frames.`
    )
  }

  if (styleContext) {
    parts.push(`STYLE DIRECTION: ${styleContext}`)
  }

  if (scene.imageGenerationPrompt) {
    parts.push(scene.imageGenerationPrompt)
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

  parts.push(
    'Shot on ARRI Alexa 35. 4K. Professional production quality, photorealistic. No text, watermarks, or UI elements.'
  )

  return parts.join('\n\n').slice(0, 8000)
}
