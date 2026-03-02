// =============================================================================
// IMAGE PROVIDER TYPES — shared types for the image generation provider system
// =============================================================================

/** Rich style metadata aggregated from deliverableStyleReferences */
export interface StyleMetadata {
  promptGuides: string[] // From deliverableStyleReferences.promptGuide
  colorPalette: string[] // Hex values from deliverableStyleReferences.colorSamples
  moodKeywords: string[] // From deliverableStyleReferences.moodKeywords
  visualElements: string[] // From deliverableStyleReferences.visualElements
  styleAxes: string[] // From deliverableStyleReferences.styleAxis
  colorTemperature?: string // "warm" | "cool" | "neutral"
  energyLevel?: string // "calm" | "balanced" | "energetic"
  densityLevel?: string // "minimal" | "balanced" | "rich"
}

/** Brand context passed from client for color/tone integration */
export interface BrandContextForPrompt {
  colors?: {
    primary?: string
    secondary?: string
    accent?: string
  }
  industry?: string
  toneOfVoice?: string
  brandDescription?: string
}

/** Strategy determines which provider chain to use */
export type ProviderStrategy = 'hero' | 'consistency' | 'standard' | 'fallback'

/** Provider names for logging and metrics */
export type ProviderName = 'flux2-pro' | 'flux-kontext' | 'imagen4-fast' | 'imagen3'

/** Request to generate a single image */
export interface ImageGenerationRequest {
  prompt: string
  aspectRatio?: '3:2' | '1:1' | '2:3'
  /** Style reference images for multi-ref providers (FLUX.2 Pro supports up to 9) */
  referenceImages?: Array<{ base64: string; mimeType: string }>
  /** Anchor image for consistency providers (Flux Kontext) */
  anchorImage?: { base64: string; mimeType: string }
  /** Negative prompt (not all providers support it) */
  negativePrompt?: string
}

/** Response from a provider */
export interface ImageGenerationResponse {
  base64: string
  format: 'png' | 'webp' | 'jpeg'
  provider: ProviderName
  latencyMs: number
}

/** A single image generation provider */
export interface ImageProvider {
  name: ProviderName
  /** Whether this provider is currently available (API key configured) */
  isAvailable(): boolean
  /** Generate an image. Throws on failure. */
  generate(request: ImageGenerationRequest): Promise<ImageGenerationResponse>
}
