/**
 * Shared prompt builder for style preview image generation.
 * Used by both the batch generate-style-images route and the individual style-preview route.
 */

/**
 * Extract hex color codes from a prompt guide text.
 * Matches patterns like #0047AB, #E63946, etc.
 */
export function extractHexColors(text: string): string[] {
  const hexRegex = /#[0-9A-Fa-f]{6}\b/g
  const matches = text.match(hexRegex) || []
  // Deduplicate and limit to 8 colors
  return [...new Set(matches.map((c) => c.toUpperCase()))].slice(0, 8)
}

/**
 * Condense a prompt guide into a focused image generation prompt.
 * Extracts key visual characteristics: color palette, lighting, mood, textures, composition.
 *
 * When `subject` is provided, the prompt opens with the subject as scene content,
 * then applies the style's visual direction from the prompt guide.
 * When absent, falls back to a standalone mood image.
 */
export function buildStylePreviewPrompt(
  name: string,
  promptGuide: string,
  subject?: string,
  hasReferenceImages?: boolean
): string {
  // Extract the most visually descriptive sentences
  const sentences = promptGuide
    .split(/\.\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10)

  // Prioritize sentences with visual keywords
  const visualKeywords =
    /color|light|shadow|texture|gradient|palette|tone|mood|surface|grain|lens|camera|shot|photograph|background|foreground|atmosphere|warm|cool|contrast|matte|gloss|metallic|organic|soft|hard|bright|dark|minimal|rich|clean|raw|polished/i
  const visualSentences = sentences.filter((s) => visualKeywords.test(s))

  // Take the most relevant visual descriptions, capped at ~150 words
  const selectedSentences: string[] = []
  let wordCount = 0
  for (const sentence of visualSentences) {
    const words = sentence.split(/\s+/).length
    if (wordCount + words > 150) break
    selectedSentences.push(sentence)
    wordCount += words
  }

  // If we didn't get enough from visual-keyword filtering, add more
  if (wordCount < 80) {
    for (const sentence of sentences) {
      if (selectedSentences.includes(sentence)) continue
      const words = sentence.split(/\s+/).length
      if (wordCount + words > 150) break
      selectedSentences.push(sentence)
      wordCount += words
    }
  }

  const visualDescription = selectedSentences.join('. ').replace(/\.\./g, '.')

  const refImageHint = hasReferenceImages
    ? ' Reference images are provided showing the target visual style. Match their aesthetic, color palette, lighting, and mood closely.'
    : ''

  if (subject) {
    return `Create a professional visual of: ${subject}. Apply the "${name}" style direction: ${visualDescription}.${refImageHint} Photorealistic, editorial quality, 16:10 aspect ratio.`
  }

  return `Create a professional visual reference image for the "${name}" style direction. ${visualDescription}.${refImageHint} This is a standalone atmospheric mood image showcasing this aesthetic. Photorealistic, editorial quality, 16:10 aspect ratio.`
}
