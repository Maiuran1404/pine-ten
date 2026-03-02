// =============================================================================
// SCENE PROMPT BUILDER — shared module for building image generation prompts
// from scene data. Used by both production API routes and admin storyboard
// image tool. No `server-only` import so it can be used in client components.
// =============================================================================

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

/** Optional batch context for cross-scene visual consistency */
export interface BatchContext {
  totalScenes: number
  sceneIndex: number
}

/**
 * Build an image generation prompt from scene data and style context.
 * Style context is placed FIRST so the model treats it as the dominant
 * aesthetic direction. Scene content follows as the subject matter.
 *
 * When BatchContext is provided, a consistency preamble is prepended so
 * all scenes in a storyboard share coherent visual treatment.
 *
 * Title, voiceover, and transition are included for differentiation —
 * each scene should produce a visually unique image even when descriptions
 * are similar.
 */
export function buildScenePrompt(
  scene: ScenePromptInput,
  styleContext: string,
  batchContext?: BatchContext
): string {
  const parts: string[] = []

  // Cross-scene consistency directive (when generating as part of a batch)
  if (batchContext && batchContext.totalScenes > 1) {
    parts.push(
      `VISUAL CONSISTENCY: This is scene ${batchContext.sceneIndex + 1} of ${batchContext.totalScenes} in a single storyboard. Maintain consistent color grading, lighting style, and visual treatment across all frames. Use a unified color palette and mood throughout.`
    )
  }

  // Style context goes FIRST — the model weights earlier tokens more heavily.
  // This ensures the selected visual style (e.g. "Clean & Minimal") shapes
  // the entire image rather than being an afterthought.
  if (styleContext) {
    parts.push(`STYLE DIRECTION: ${styleContext}`)
  }

  // Scene content — what to depict within the style
  if (scene.imageGenerationPrompt) {
    parts.push(scene.imageGenerationPrompt)
  } else {
    // Title with scene number prefix for positional differentiation
    if (scene.title) {
      const prefix = scene.sceneNumber ? `Scene ${scene.sceneNumber}` : 'Scene'
      parts.push(`${prefix}: ${scene.title}`)
    }

    if (scene.visualNote) parts.push(scene.visualNote)
    if (scene.description) parts.push(scene.description)
    if (scene.cameraNote) parts.push(`Camera: ${scene.cameraNote}`)

    // Voiceover informs mood/emotion but must NOT be rendered as text
    if (scene.voiceover) {
      parts.push(
        `Mood context (convey this feeling visually, do NOT render as text): ${scene.voiceover}`
      )
    }

    // Transition informs visual pacing/mood
    if (scene.transition) {
      parts.push(`Transition feel: ${scene.transition}`)
    }
  }

  // Quality directive — no "cinematic lighting" which conflicts with minimal styles
  parts.push('Professional production quality, photorealistic.')

  return parts.join('. ').slice(0, 4000)
}
