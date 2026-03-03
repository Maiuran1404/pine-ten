import 'server-only'
import type {
  ImageProvider,
  ImageGenerationRequest,
  ImageGenerationResponse,
  ProviderStrategy,
} from './types'
import { flux2ProProvider } from './flux2-pro'
import { fluxKontextProvider } from './flux-kontext'
import { imagen4FastProvider } from './imagen4-fast'
import { imagen3Provider } from './imagen3'
import { logger } from '@/lib/logger'

// =============================================================================
// PROVIDER REGISTRY — manages provider chains and fallback logic
// =============================================================================

/** Provider chain ordering by strategy */
const PROVIDER_CHAINS: Record<ProviderStrategy, ImageProvider[]> = {
  // Hero frame: best quality, supports multi-reference
  hero: [flux2ProProvider, imagen4FastProvider, imagen3Provider],
  // Consistency scenes: FLUX.2 Pro primary for visual diversity, Kontext as fallback
  consistency: [flux2ProProvider, fluxKontextProvider, imagen4FastProvider, imagen3Provider],
  // Single scene regeneration without anchor
  standard: [flux2ProProvider, imagen4FastProvider, imagen3Provider],
  // Cheapest/fastest path
  fallback: [imagen4FastProvider, imagen3Provider],
}

/** Get the provider chain for a strategy, filtered to available providers */
export function getProviderChain(strategy: ProviderStrategy): ImageProvider[] {
  return PROVIDER_CHAINS[strategy].filter((p) => p.isAvailable())
}

/**
 * Simplify a prompt for retry attempts (strip to core sections).
 * Removes detailed sections and keeps only essential content.
 */
function simplifyPrompt(prompt: string): string {
  const lines = prompt.split('\n')
  const essentialSections = ['SUBJECT', 'SCENE CONTENT', 'STYLE DIRECTION', 'QUALITY DIRECTIVE']
  const simplified: string[] = []
  let currentSection = ''
  let includeSection = true

  for (const line of lines) {
    const sectionMatch = line.match(/^([A-Z][A-Z\s]+):/)
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim()
      includeSection = essentialSections.some((s) => currentSection.includes(s))
    }
    if (includeSection) {
      simplified.push(line)
    }
  }

  return simplified.join('\n').trim() || prompt.slice(0, 2000)
}

/**
 * Rephrase quality directive to avoid triggering same safety filter on retry.
 */
function rephraseQualityDirective(prompt: string): string {
  return prompt
    .replace(
      /Shot on ARRI Alexa 35\./g,
      'Cinema-grade production quality, shot on professional digital cinema camera.'
    )
    .replace(/4K\./g, 'Ultra-high resolution.')
    .replace(/photorealistic/gi, 'hyperrealistic')
}

/**
 * Generate an image with automatic fallback through the provider chain.
 *
 * For each provider, attempts up to `maxRetries` times with prompt variation:
 * - Attempt 1: original prompt
 * - Attempt 2: rephrased quality directive (avoids same safety filter)
 * - Attempt 3: simplified prompt (core sections only)
 *
 * Then moves to next provider in chain.
 */
export async function generateWithFallback(
  strategy: ProviderStrategy,
  request: ImageGenerationRequest,
  maxRetries: number = 3
): Promise<ImageGenerationResponse> {
  const chain = getProviderChain(strategy)

  if (chain.length === 0) {
    throw new Error(
      `No available image providers for strategy "${strategy}". Check FAL_KEY and GEMINI_API_KEY.`
    )
  }

  const errors: Array<{ provider: string; attempt: number; error: string }> = []

  for (const provider of chain) {
    // Skip Kontext if no anchor image is provided
    if (provider.name === 'flux-kontext' && !request.anchorImage) {
      continue
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        let currentPrompt = request.prompt

        if (attempt === 2) {
          currentPrompt = rephraseQualityDirective(request.prompt)
        } else if (attempt === 3) {
          currentPrompt = simplifyPrompt(request.prompt)
        }

        logger.info(
          { provider: provider.name, strategy, attempt, promptLength: currentPrompt.length },
          'Attempting image generation'
        )

        const result = await provider.generate({
          ...request,
          prompt: currentPrompt,
        })

        logger.info(
          { provider: provider.name, strategy, latencyMs: result.latencyMs },
          'Image generation succeeded'
        )

        return result
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err)
        errors.push({ provider: provider.name, attempt, error: errMsg })

        logger.warn(
          { provider: provider.name, strategy, attempt, error: errMsg },
          'Image generation attempt failed'
        )

        // Don't retry on certain terminal errors
        if (errMsg.includes('API key') || errMsg.includes('not configured')) {
          break // Skip remaining retries for this provider
        }
      }
    }
  }

  // All providers and retries exhausted
  const errorSummary = errors.map((e) => `${e.provider}[${e.attempt}]: ${e.error}`).join('; ')

  throw new Error(`All image providers failed for strategy "${strategy}". Errors: ${errorSummary}`)
}

// Re-export types for convenience
export type {
  ImageProvider,
  ImageGenerationRequest,
  ImageGenerationResponse,
  ProviderStrategy,
  StyleMetadata,
  BrandContextForPrompt,
} from './types'
