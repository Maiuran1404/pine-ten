import { describe, it, expect, vi, beforeEach } from 'vitest'

// =============================================================================
// Mocks — vi.mock() is hoisted to top of file; factories cannot reference
// variables declared below the mock call. Use vi.hoisted() to pre-declare
// any shared state that vi.mock factories need to close over.
// =============================================================================

vi.mock('server-only', () => ({}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// Use vi.hoisted() so the mock objects are initialized before vi.mock hoisting
// ---------------------------------------------------------------------------
const { mockFlux2Pro, mockFluxKontext, mockImagen4Fast, mockImagen3 } = vi.hoisted(() => {
  function makeMockProvider(name: string) {
    return {
      name,
      isAvailable: vi.fn().mockReturnValue(true),

      generate: vi.fn(async (_req: Record<string, unknown>) => ({
        base64: 'mockbase64',
        format: 'jpeg',
        provider: name,
        latencyMs: 100,
      })),
    }
  }

  return {
    mockFlux2Pro: makeMockProvider('flux2-pro'),
    mockFluxKontext: makeMockProvider('flux-kontext'),
    mockImagen4Fast: makeMockProvider('imagen4-fast'),
    mockImagen3: makeMockProvider('imagen3'),
  }
})

vi.mock('./flux2-pro', () => ({ flux2ProProvider: mockFlux2Pro }))
vi.mock('./flux-kontext', () => ({ fluxKontextProvider: mockFluxKontext }))
vi.mock('./imagen4-fast', () => ({ imagen4FastProvider: mockImagen4Fast }))
vi.mock('./imagen3', () => ({ imagen3Provider: mockImagen3 }))

// ---------------------------------------------------------------------------
// Import after mocks are set up
// ---------------------------------------------------------------------------

import { getProviderChain, generateWithFallback } from './index'
import type { ImageGenerationRequest } from './types'

// =============================================================================
// Helpers
// =============================================================================

function makeRequest(overrides: Partial<ImageGenerationRequest> = {}): ImageGenerationRequest {
  return {
    prompt: 'A cinematic wide shot of a misty mountain range at dawn',
    aspectRatio: '3:2',
    ...overrides,
  }
}

function resetAllProviders() {
  for (const provider of [mockFlux2Pro, mockFluxKontext, mockImagen4Fast, mockImagen3]) {
    vi.mocked(provider.isAvailable).mockReset()
    vi.mocked(provider.generate).mockReset()
  }
}

// =============================================================================
// getProviderChain
// =============================================================================

describe('getProviderChain', () => {
  beforeEach(() => {
    resetAllProviders()
    // All providers available by default
    vi.mocked(mockFlux2Pro.isAvailable).mockReturnValue(true)
    vi.mocked(mockFluxKontext.isAvailable).mockReturnValue(true)
    vi.mocked(mockImagen4Fast.isAvailable).mockReturnValue(true)
    vi.mocked(mockImagen3.isAvailable).mockReturnValue(true)
  })

  it('returns [flux2-pro, imagen4-fast, imagen3] for "hero" strategy', () => {
    const chain = getProviderChain('hero')
    const names = chain.map((p) => p.name)

    expect(names).toEqual(['flux2-pro', 'imagen4-fast', 'imagen3'])
  })

  it('returns [flux2-pro, flux-kontext, imagen4-fast, imagen3] for "consistency" strategy', () => {
    const chain = getProviderChain('consistency')
    const names = chain.map((p) => p.name)

    expect(names).toEqual(['flux2-pro', 'flux-kontext', 'imagen4-fast', 'imagen3'])
  })

  it('returns [flux2-pro, imagen4-fast, imagen3] for "standard" strategy', () => {
    const chain = getProviderChain('standard')
    const names = chain.map((p) => p.name)

    expect(names).toEqual(['flux2-pro', 'imagen4-fast', 'imagen3'])
  })

  it('returns [imagen4-fast, imagen3] for "fallback" strategy', () => {
    const chain = getProviderChain('fallback')
    const names = chain.map((p) => p.name)

    expect(names).toEqual(['imagen4-fast', 'imagen3'])
  })

  it('filters out unavailable providers', () => {
    vi.mocked(mockFlux2Pro.isAvailable).mockReturnValue(false)
    vi.mocked(mockImagen4Fast.isAvailable).mockReturnValue(false)

    const chain = getProviderChain('hero')
    const names = chain.map((p) => p.name)

    expect(names).toEqual(['imagen3'])
  })

  it('returns empty array when all providers in chain are unavailable', () => {
    vi.mocked(mockFlux2Pro.isAvailable).mockReturnValue(false)
    vi.mocked(mockImagen4Fast.isAvailable).mockReturnValue(false)
    vi.mocked(mockImagen3.isAvailable).mockReturnValue(false)

    const chain = getProviderChain('hero')
    expect(chain).toHaveLength(0)
  })

  it('returns empty array for "fallback" when both imagen providers are unavailable', () => {
    vi.mocked(mockImagen4Fast.isAvailable).mockReturnValue(false)
    vi.mocked(mockImagen3.isAvailable).mockReturnValue(false)

    const chain = getProviderChain('fallback')
    expect(chain).toHaveLength(0)
  })
})

// =============================================================================
// generateWithFallback — provider chain traversal
// =============================================================================

describe('generateWithFallback', () => {
  beforeEach(() => {
    resetAllProviders()
  })

  it('throws when no providers are available for the strategy', async () => {
    vi.mocked(mockFlux2Pro.isAvailable).mockReturnValue(false)
    vi.mocked(mockImagen4Fast.isAvailable).mockReturnValue(false)
    vi.mocked(mockImagen3.isAvailable).mockReturnValue(false)

    await expect(generateWithFallback('hero', makeRequest())).rejects.toThrow(
      'No available image providers'
    )
  })

  it('returns the result from the first provider on success', async () => {
    vi.mocked(mockFlux2Pro.isAvailable).mockReturnValue(true)
    vi.mocked(mockImagen4Fast.isAvailable).mockReturnValue(true)
    vi.mocked(mockImagen3.isAvailable).mockReturnValue(true)

    const expected = {
      base64: 'abc123',
      format: 'jpeg',
      provider: 'flux2-pro',
      latencyMs: 200,
    }
    vi.mocked(mockFlux2Pro.generate).mockResolvedValue(expected as never)

    const result = await generateWithFallback('hero', makeRequest())

    expect(result).toEqual(expected)
    expect(mockFlux2Pro.generate).toHaveBeenCalledOnce()
    expect(mockImagen4Fast.generate).not.toHaveBeenCalled()
  })

  it('falls back to next provider when first provider fails', async () => {
    vi.mocked(mockFlux2Pro.isAvailable).mockReturnValue(true)
    vi.mocked(mockImagen4Fast.isAvailable).mockReturnValue(true)
    vi.mocked(mockImagen3.isAvailable).mockReturnValue(true)

    vi.mocked(mockFlux2Pro.generate).mockRejectedValue(new Error('FLUX timeout'))
    const fallbackResult = {
      base64: 'fallback64',
      format: 'png',
      provider: 'imagen4-fast',
      latencyMs: 150,
    }
    vi.mocked(mockImagen4Fast.generate).mockResolvedValue(fallbackResult as never)

    const result = await generateWithFallback('hero', makeRequest(), 1)

    expect(result).toEqual(fallbackResult)
    expect(mockFlux2Pro.generate).toHaveBeenCalledOnce()
    expect(mockImagen4Fast.generate).toHaveBeenCalledOnce()
  })

  it('falls back through the entire chain and throws when all providers fail', async () => {
    vi.mocked(mockFlux2Pro.isAvailable).mockReturnValue(true)
    vi.mocked(mockImagen4Fast.isAvailable).mockReturnValue(true)
    vi.mocked(mockImagen3.isAvailable).mockReturnValue(true)

    vi.mocked(mockFlux2Pro.generate).mockRejectedValue(new Error('FLUX error'))
    vi.mocked(mockImagen4Fast.generate).mockRejectedValue(new Error('Imagen4 error'))
    vi.mocked(mockImagen3.generate).mockRejectedValue(new Error('Imagen3 error'))

    await expect(generateWithFallback('hero', makeRequest(), 1)).rejects.toThrow(
      'All image providers failed'
    )
  })

  it('error message includes provider names and error details', async () => {
    vi.mocked(mockFlux2Pro.isAvailable).mockReturnValue(true)
    vi.mocked(mockImagen4Fast.isAvailable).mockReturnValue(false)
    vi.mocked(mockImagen3.isAvailable).mockReturnValue(false)

    vi.mocked(mockFlux2Pro.generate).mockRejectedValue(new Error('timeout error'))

    await expect(generateWithFallback('hero', makeRequest(), 1)).rejects.toThrow('flux2-pro')
  })
})

// =============================================================================
// generateWithFallback — Kontext skipped without anchor image
// =============================================================================

describe('generateWithFallback — Kontext skipped without anchor image', () => {
  beforeEach(() => {
    resetAllProviders()
    vi.mocked(mockFluxKontext.isAvailable).mockReturnValue(true)
    vi.mocked(mockFlux2Pro.isAvailable).mockReturnValue(true)
    vi.mocked(mockImagen4Fast.isAvailable).mockReturnValue(true)
    vi.mocked(mockImagen3.isAvailable).mockReturnValue(true)
  })

  it('skips flux-kontext when no anchorImage is provided', async () => {
    const successResult = {
      base64: 'flux2base64',
      format: 'jpeg',
      provider: 'flux2-pro',
      latencyMs: 120,
    }
    vi.mocked(mockFlux2Pro.generate).mockResolvedValue(successResult as never)

    const request = makeRequest({ anchorImage: undefined })
    const result = await generateWithFallback('consistency', request)

    // Kontext should have been skipped entirely
    expect(mockFluxKontext.generate).not.toHaveBeenCalled()
    // flux2-pro is next in the consistency chain
    expect(mockFlux2Pro.generate).toHaveBeenCalledOnce()
    expect(result.provider).toBe('flux2-pro')
  })

  it('uses flux2-pro first in consistency chain even when anchorImage IS provided', async () => {
    const successResult = {
      base64: 'flux2base64',
      format: 'jpeg',
      provider: 'flux2-pro',
      latencyMs: 120,
    }
    vi.mocked(mockFlux2Pro.generate).mockResolvedValue(successResult as never)

    const request = makeRequest({
      anchorImage: { base64: 'anchorbase64', mimeType: 'image/jpeg' },
    })
    const result = await generateWithFallback('consistency', request)

    // flux2-pro is now first in the consistency chain for visual diversity
    expect(mockFlux2Pro.generate).toHaveBeenCalledOnce()
    expect(result.provider).toBe('flux2-pro')
    // flux-kontext should not have been called (flux2-pro succeeded)
    expect(mockFluxKontext.generate).not.toHaveBeenCalled()
  })
})

// =============================================================================
// generateWithFallback — prompt variation on retry
// =============================================================================

describe('generateWithFallback — prompt variation on retry', () => {
  beforeEach(() => {
    resetAllProviders()
    vi.mocked(mockFlux2Pro.isAvailable).mockReturnValue(true)
    vi.mocked(mockImagen4Fast.isAvailable).mockReturnValue(false)
    vi.mocked(mockImagen3.isAvailable).mockReturnValue(false)
  })

  it('uses the original prompt on attempt 1 (maxRetries=1)', async () => {
    const captured: string[] = []
    mockFlux2Pro.generate = vi.fn(async (req: Record<string, unknown>) => {
      captured.push(req.prompt as string)
      throw new Error('fail')
    })

    await expect(generateWithFallback('hero', makeRequest(), 1)).rejects.toThrow()

    expect(captured).toHaveLength(1)
    expect(captured[0]).toBe('A cinematic wide shot of a misty mountain range at dawn')
  })

  it('rephrases quality directive on attempt 2', async () => {
    const captured: string[] = []
    const prompt =
      'SCENE CONTENT: product\n\nQUALITY DIRECTIVE: Shot on ARRI Alexa 35. 4K. photorealistic'

    mockFlux2Pro.generate = vi.fn(async (req: Record<string, unknown>) => {
      captured.push(req.prompt as string)
      throw new Error('fail')
    })

    await expect(generateWithFallback('hero', { prompt, aspectRatio: '3:2' }, 2)).rejects.toThrow()

    expect(captured).toHaveLength(2)
    // Attempt 1 — original
    expect(captured[0]).toContain('Shot on ARRI Alexa 35.')
    // Attempt 2 — rephrased
    expect(captured[1]).not.toContain('Shot on ARRI Alexa 35.')
    expect(captured[1]).toContain('Cinema-grade production quality')
    expect(captured[1]).not.toContain('4K.')
    expect(captured[1]).toContain('Ultra-high resolution.')
  })

  it('truncates prompt on attempt 3', async () => {
    const captured: string[] = []
    const prompt =
      'A scenic mountain landscape with dramatic lighting.\nCinematic style, photorealistic.\n' +
      'Extra detail that extends the prompt beyond 800 chars. '.repeat(20)

    mockFlux2Pro.generate = vi.fn(async (req: Record<string, unknown>) => {
      captured.push(req.prompt as string)
      throw new Error('fail')
    })

    await expect(generateWithFallback('hero', { prompt, aspectRatio: '3:2' }, 3)).rejects.toThrow()

    expect(captured).toHaveLength(3)
    // Attempt 3 — truncated to ~800 chars
    const attempt3 = captured[2]
    expect(attempt3.length).toBeLessThanOrEqual(850)
    // Should still contain the beginning of the prompt
    expect(attempt3).toContain('scenic mountain landscape')
    // Should contain photorealistic (from the original or appended footer)
    expect(attempt3).toContain('photorealistic')
  })
})

// =============================================================================
// generateWithFallback — terminal errors skip remaining retries
// =============================================================================

describe('generateWithFallback — terminal errors skip remaining retries', () => {
  beforeEach(() => {
    resetAllProviders()
    vi.mocked(mockFlux2Pro.isAvailable).mockReturnValue(true)
    vi.mocked(mockImagen4Fast.isAvailable).mockReturnValue(true)
    vi.mocked(mockImagen3.isAvailable).mockReturnValue(true)
  })

  it('breaks out of retries immediately when error contains "API key"', async () => {
    vi.mocked(mockFlux2Pro.generate).mockRejectedValue(new Error('FAL_KEY API key not configured'))

    const successResult = {
      base64: 'fallback64',
      format: 'png',
      provider: 'imagen4-fast',
      latencyMs: 100,
    }
    vi.mocked(mockImagen4Fast.generate).mockResolvedValue(successResult as never)

    // maxRetries=3 but API key error should short-circuit after attempt 1
    const result = await generateWithFallback('hero', makeRequest(), 3)

    // Should have called flux2-pro only once (not 3 times)
    expect(mockFlux2Pro.generate).toHaveBeenCalledTimes(1)
    // Should have fallen back to imagen4-fast
    expect(mockImagen4Fast.generate).toHaveBeenCalledOnce()
    expect(result.provider).toBe('imagen4-fast')
  })

  it('breaks out of retries immediately when error contains "not configured"', async () => {
    vi.mocked(mockFlux2Pro.generate).mockRejectedValue(new Error('GEMINI_API_KEY not configured'))

    vi.mocked(mockImagen4Fast.generate).mockResolvedValue({
      base64: 'img4',
      format: 'png',
      provider: 'imagen4-fast',
      latencyMs: 50,
    } as never)

    await generateWithFallback('hero', makeRequest(), 3)

    // Terminal error — flux2-pro called once, then moved to next provider
    expect(mockFlux2Pro.generate).toHaveBeenCalledTimes(1)
  })

  it('retries the full maxRetries count for non-terminal errors', async () => {
    vi.mocked(mockFlux2Pro.generate).mockRejectedValue(new Error('timeout'))
    vi.mocked(mockImagen4Fast.isAvailable).mockReturnValue(false)
    vi.mocked(mockImagen3.isAvailable).mockReturnValue(false)

    await expect(generateWithFallback('hero', makeRequest(), 3)).rejects.toThrow(
      'All image providers failed'
    )

    // Non-terminal error should have retried 3 times on flux2-pro
    expect(mockFlux2Pro.generate).toHaveBeenCalledTimes(3)
  })

  it('includes all provider+attempt error context in thrown message', async () => {
    vi.mocked(mockFlux2Pro.generate).mockRejectedValue(new Error('FLUX timeout'))
    vi.mocked(mockImagen4Fast.generate).mockRejectedValue(new Error('Imagen4 overload'))
    vi.mocked(mockImagen3.generate).mockRejectedValue(new Error('Imagen3 unavailable'))

    let thrownMessage = ''
    try {
      await generateWithFallback('hero', makeRequest(), 1)
    } catch (err) {
      thrownMessage = (err as Error).message
    }

    expect(thrownMessage).toContain('flux2-pro')
    expect(thrownMessage).toContain('imagen4-fast')
    expect(thrownMessage).toContain('imagen3')
    expect(thrownMessage).toContain('FLUX timeout')
    expect(thrownMessage).toContain('Imagen4 overload')
    expect(thrownMessage).toContain('Imagen3 unavailable')
  })
})
