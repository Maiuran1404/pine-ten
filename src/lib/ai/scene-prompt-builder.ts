// =============================================================================
// SCENE PROMPT BUILDER — builds concise, focused image generation prompts from
// scene data + style metadata + brand context. Used by both production API
// routes and admin storyboard image tool.
//
// No `server-only` import so it can be used in client components.
//
// Prompt structure (5 parts, ~500-1000 chars total):
//  1. VISUAL DNA PREFIX  — batch-wide consistency anchor (same for all scenes)
//  2. SUBJECT + CONTENT  — concrete scene description (1-2 sentences)
//  3. STYLE + CAMERA     — style modifiers, camera, lighting (1-2 lines)
//  4. COLOR PALETTE      — hex palette (1 line, if available)
//  5. QUALITY FOOTER     — production quality + minimal negative embedding
// =============================================================================

import type { StyleMetadata, BrandContextForPrompt } from './image-providers/types'
import type { ImagePipelineConfig } from './image-pipeline-config'
import {
  inferShotSpecs,
  inferLighting,
  buildColorGrading,
  mapStyleAxis,
  mapDensity,
  mapEnergy,
} from './cinematic-vocabulary'

const DEFAULT_QUALITY_FOOTER =
  'Captured on location with a cinema-grade camera. Subtle natural film grain, authentic lens characteristics with slight chromatic aberration at edges. Practical lighting from real on-set sources. Lived-in composition — natural skin texture, creased fabrics, real environmental reflections. No text overlays.'
const DEFAULT_BATCH_PREFIX =
  'Consistent photo series from the same production shoot — matching color grade, same camera and lens setup, identical lighting rig across all frames.'
const PHOTOGRAPHIC_ANCHOR = '35mm film photograph, shot on ARRI Alexa Mini with Cooke S4 lenses.'
const DEFAULT_PROMPT_CAP = 1500
const DEFAULT_SUBJECT_ANCHOR_CAP = 150

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
 * title + visualNote + description. Capped at subjectAnchorCap characters.
 */
export function extractSubjectAnchor(
  scene: ScenePromptInput,
  config?: ImagePipelineConfig
): string | undefined {
  const cap = config?.prompts.subjectAnchorCap ?? DEFAULT_SUBJECT_ANCHOR_CAP

  if (scene.imageGenerationPrompt) {
    // Take the first sentence (up to first period, or the whole thing if no period)
    const firstSentence = scene.imageGenerationPrompt.split(/\.\s/)[0]
    return firstSentence.slice(0, cap)
  }

  const parts: string[] = []
  if (scene.title) parts.push(scene.title)
  if (scene.visualNote) parts.push(scene.visualNote)
  if (scene.description) parts.push(scene.description)

  if (parts.length === 0) return undefined
  return parts.join(' — ').slice(0, cap)
}

/**
 * Build a concise, focused image generation prompt from scene data,
 * style metadata, and brand context.
 *
 * Designed for FLUX.2 Pro which responds best to ~500-1000 char prompts
 * with positive descriptive language (not instruction-heavy "DO NOT" rules).
 *
 * Falls back to legacy flat-string behavior when StyleMetadata is absent
 * (backward compatible with existing callers passing styleContext string).
 */
export function buildScenePrompt(
  scene: ScenePromptInput,
  styleContextOrMetadata: string | StyleMetadata,
  brandContext?: BrandContextForPrompt,
  batchContext?: BatchContext,
  config?: ImagePipelineConfig
): string {
  const qualityFooter = config?.prompts.qualityFooter ?? DEFAULT_QUALITY_FOOTER
  const promptCap = config?.prompts.promptCap ?? DEFAULT_PROMPT_CAP

  // Legacy path: if styleContext is a plain string, use simplified builder
  if (typeof styleContextOrMetadata === 'string') {
    return buildLegacyPrompt(scene, styleContextOrMetadata, batchContext, config)
  }

  const style = styleContextOrMetadata
  const parts: string[] = []

  // ── 1. VISUAL DNA PREFIX — same for all scenes in a batch ──
  const dnaPrefix = buildVisualDnaPrefix(style, batchContext, config)
  if (dnaPrefix) {
    parts.push(dnaPrefix)
  }

  // ── 1b. PHOTOGRAPHIC ANCHOR — primes model for film-like output ──
  parts.push(PHOTOGRAPHIC_ANCHOR)

  // ── 2. SUBJECT + CONTENT — the actual scene (1-2 sentences) ──
  if (scene.imageGenerationPrompt) {
    parts.push(scene.imageGenerationPrompt)
  } else {
    const contentParts: string[] = []
    if (scene.title) contentParts.push(scene.title)
    if (scene.visualNote) contentParts.push(scene.visualNote)
    if (scene.description) contentParts.push(scene.description)
    if (contentParts.length > 0) {
      parts.push(contentParts.join('. '))
    }
  }

  // ── 3. STYLE + CAMERA + LIGHTING — merged into 1-2 concise lines ──
  const styleLine = buildStyleLine(style, scene, config)
  if (styleLine) {
    parts.push(styleLine)
  }

  // ── 4. COLOR PALETTE — 1 line if available ──
  const colorGrading = buildColorGrading(
    style.colorPalette,
    brandContext?.colors,
    brandContext?.industry,
    config?.vocabulary.industry
  )
  if (colorGrading) {
    parts.push(colorGrading)
  }

  // ── 5. QUALITY FOOTER ──
  parts.push(qualityFooter)

  return parts.join('\n').slice(0, promptCap)
}

/**
 * Build the visual DNA prefix that anchors all scenes in a batch
 * to the same visual style. This is the key consistency mechanism
 * in the prompt (complementing the hero anchor image in FLUX.2 Pro).
 */
function buildVisualDnaPrefix(
  style: StyleMetadata,
  batchContext?: BatchContext,
  config?: ImagePipelineConfig
): string {
  const dnaParts: string[] = []

  // Batch consistency anchor
  if (batchContext && batchContext.totalScenes > 1) {
    dnaParts.push(config?.prompts.batchPrefix ?? DEFAULT_BATCH_PREFIX)
  }

  // Style keywords from axes (compact)
  const styleKeywords: string[] = []
  for (const axis of style.styleAxes) {
    const mapped = mapStyleAxis(axis, config?.vocabulary.styleAxes)
    if (mapped) {
      // Extract just the first clause (before the comma) for brevity
      const short = mapped.split(',')[0]
      styleKeywords.push(short)
    }
  }
  const density = mapDensity(style.densityLevel, config?.vocabulary.density)
  if (density) styleKeywords.push(density.split(',')[0])
  const energy = mapEnergy(style.energyLevel, config?.vocabulary.energy)
  if (energy) styleKeywords.push(energy.split(',')[0])

  if (styleKeywords.length > 0) {
    dnaParts.push(styleKeywords.join(', ') + '.')
  }

  // Mood keywords (compact)
  if (style.moodKeywords.length > 0) {
    dnaParts.push(style.moodKeywords.join(', ') + ' mood.')
  }

  return dnaParts.join(' ')
}

/**
 * Build a compact style + camera + lighting line.
 * Merges what were previously 4+ separate sections into 1-2 lines.
 */
function buildStyleLine(
  style: StyleMetadata,
  scene: ScenePromptInput,
  config?: ImagePipelineConfig
): string {
  const lineParts: string[] = []

  // Style guides (take first one, truncated)
  if (style.promptGuides.length > 0) {
    const guide = style.promptGuides[0]
    if (guide) lineParts.push(guide.slice(0, 200))
  }

  // Visual elements (compact list)
  if (style.visualElements.length > 0) {
    lineParts.push(style.visualElements.slice(0, 4).join(', '))
  }

  // Camera
  const shotSpec = inferShotSpecs(
    scene.cameraNote,
    scene.visualNote,
    config?.vocabulary.cameraShots
  )
  lineParts.push(shotSpec)

  // Lighting (compact)
  const lighting = inferLighting(
    {
      moodKeywords: style.moodKeywords,
      voiceover: scene.voiceover,
      colorTemperature: style.colorTemperature,
    },
    config?.vocabulary.moodLighting,
    config?.vocabulary.colorTemperature
  )
  lineParts.push(lighting)

  return lineParts.join('. ')
}

/**
 * Legacy prompt builder — backward compatible with callers that pass a flat string.
 * Used when StyleMetadata is not available (e.g., admin tools, simple regeneration).
 */
function buildLegacyPrompt(
  scene: ScenePromptInput,
  styleContext: string,
  batchContext?: BatchContext,
  config?: ImagePipelineConfig
): string {
  const qualityFooter = config?.prompts.qualityFooter ?? DEFAULT_QUALITY_FOOTER
  const promptCap = config?.prompts.promptCap ?? DEFAULT_PROMPT_CAP
  const parts: string[] = []

  // Visual DNA for batch consistency
  if (batchContext && batchContext.totalScenes > 1) {
    parts.push(config?.prompts.batchPrefix ?? DEFAULT_BATCH_PREFIX)
  }

  // Photographic anchor — primes model for film-like output
  parts.push(PHOTOGRAPHIC_ANCHOR)

  // Subject + content
  const subjectAnchor = extractSubjectAnchor(scene, config)
  if (subjectAnchor) {
    parts.push(subjectAnchor)
  }

  if (scene.imageGenerationPrompt) {
    parts.push(scene.imageGenerationPrompt)
  } else {
    const contentParts: string[] = []
    if (scene.title) contentParts.push(scene.title)
    if (scene.visualNote) contentParts.push(scene.visualNote)
    if (scene.description) contentParts.push(scene.description)
    if (contentParts.length > 0) {
      parts.push(contentParts.join('. '))
    }

    const shotSpec = inferShotSpecs(
      scene.cameraNote,
      scene.visualNote,
      config?.vocabulary.cameraShots
    )
    parts.push(shotSpec)
  }

  // Style as modifier
  if (styleContext) {
    parts.push(styleContext)
  }

  parts.push(qualityFooter)

  return parts.join('\n').slice(0, promptCap)
}
