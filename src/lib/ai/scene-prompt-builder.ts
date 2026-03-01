// =============================================================================
// SCENE PROMPT BUILDER — shared module for building DALL-E prompts from scenes
// Used by both production API routes and admin storyboard image tool.
// No `server-only` import so it can be used in client components (admin tool).
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

/**
 * Build a DALL-E prompt from scene data and style context.
 * Style context is placed FIRST so DALL-E treats it as the dominant aesthetic
 * direction. Scene content follows as the subject matter within that style.
 *
 * Title, voiceover, and transition are included for differentiation —
 * each scene should produce a visually unique image even when descriptions
 * are similar.
 */
export function buildScenePrompt(scene: ScenePromptInput, styleContext: string): string {
  const parts: string[] = []

  // Style context goes FIRST — DALL-E weights earlier tokens more heavily.
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

  return parts.join('. ').slice(0, 4000) // DALL-E prompt limit
}
