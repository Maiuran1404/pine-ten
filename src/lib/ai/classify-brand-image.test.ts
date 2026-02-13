import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Anthropic SDK - use vi.hoisted so mockCreate is available during vi.mock hoisting
const { mockCreate } = vi.hoisted(() => {
  const mockCreate = vi.fn()
  return { mockCreate }
})
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate }
    },
  }
})

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

import { classifyBrandImage, classifyBrandImageFromUrl } from './classify-brand-image'

function makeTextResponse(text: string) {
  return {
    content: [{ type: 'text' as const, text }],
  }
}

const VALID_CLASSIFICATION = {
  name: 'TechCorp',
  description: 'Clean and modern tech brand',
  toneBucket: 'serious',
  energyBucket: 'calm',
  densityBucket: 'minimal',
  colorBucket: 'cool',
  colorSamples: ['#1a73e8', '#34a853', '#ffffff'],
  confidence: 0.85,
}

describe('classifyBrandImage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should parse a valid JSON classification response', async () => {
    mockCreate.mockResolvedValueOnce(makeTextResponse(JSON.stringify(VALID_CLASSIFICATION)))

    const result = await classifyBrandImage('base64data')

    expect(result).toEqual(VALID_CLASSIFICATION)
    expect(mockCreate).toHaveBeenCalledOnce()
  })

  it('should pass image base64 and media type to the API', async () => {
    mockCreate.mockResolvedValueOnce(makeTextResponse(JSON.stringify(VALID_CLASSIFICATION)))

    await classifyBrandImage('mybase64', 'image/jpeg')

    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs.model).toBe('claude-sonnet-4-20250514')
    expect(callArgs.max_tokens).toBe(1024)

    const imageContent = callArgs.messages[0].content[0]
    expect(imageContent.type).toBe('image')
    expect(imageContent.source.type).toBe('base64')
    expect(imageContent.source.media_type).toBe('image/jpeg')
    expect(imageContent.source.data).toBe('mybase64')
  })

  it('should default media type to image/png', async () => {
    mockCreate.mockResolvedValueOnce(makeTextResponse(JSON.stringify(VALID_CLASSIFICATION)))

    await classifyBrandImage('data')

    const callArgs = mockCreate.mock.calls[0][0]
    const imageContent = callArgs.messages[0].content[0]
    expect(imageContent.source.media_type).toBe('image/png')
  })

  it('should extract JSON from response with surrounding text', async () => {
    const wrappedResponse = `Here is the classification:\n${JSON.stringify(VALID_CLASSIFICATION)}\nDone.`
    mockCreate.mockResolvedValueOnce(makeTextResponse(wrappedResponse))

    const result = await classifyBrandImage('base64data')

    expect(result.name).toBe('TechCorp')
    expect(result.toneBucket).toBe('serious')
  })

  it('should return default classification when response has no text content', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'tool_use', id: 'x', name: 'y', input: {} }],
    })

    const result = await classifyBrandImage('base64data')

    expect(result.name).toBe('Unknown Brand')
    expect(result.confidence).toBe(0)
    expect(result.toneBucket).toBe('balanced')
  })

  it('should return default classification when response has no JSON', async () => {
    mockCreate.mockResolvedValueOnce(makeTextResponse('I cannot classify this image.'))

    const result = await classifyBrandImage('base64data')

    expect(result.name).toBe('Unknown Brand')
    expect(result.confidence).toBe(0)
  })

  it('should return default classification when JSON is malformed', async () => {
    mockCreate.mockResolvedValueOnce(makeTextResponse('{invalid json}}}'))

    const result = await classifyBrandImage('base64data')

    expect(result.name).toBe('Unknown Brand')
    expect(result.confidence).toBe(0)
  })

  it('should return default classification when required fields are missing', async () => {
    const incomplete = { name: 'Test', description: 'desc' }
    mockCreate.mockResolvedValueOnce(makeTextResponse(JSON.stringify(incomplete)))

    const result = await classifyBrandImage('base64data')

    expect(result.name).toBe('Unknown Brand')
    expect(result.confidence).toBe(0)
  })

  it('should return default classification on API timeout', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Request timed out'))

    const result = await classifyBrandImage('base64data')

    expect(result.name).toBe('Unknown Brand')
    expect(result.confidence).toBe(0)
  })

  it('should return default classification on rate limit error', async () => {
    const rateLimitErr = new Error('Rate limit exceeded')
    ;(rateLimitErr as Record<string, unknown>).status = 429
    mockCreate.mockRejectedValueOnce(rateLimitErr)

    const result = await classifyBrandImage('base64data')

    expect(result.name).toBe('Unknown Brand')
    expect(result.confidence).toBe(0)
  })

  it('should return default classification on network failure', async () => {
    mockCreate.mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const result = await classifyBrandImage('base64data')

    expect(result.name).toBe('Unknown Brand')
    expect(result.confidence).toBe(0)
  })
})

describe('classifyBrandImageFromUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('should fetch image and call classifyBrandImage with base64', async () => {
    const imageBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]) // PNG magic bytes
    const mockResponse = new Response(imageBytes, {
      status: 200,
      headers: { 'content-type': 'image/png' },
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse)
    mockCreate.mockResolvedValueOnce(makeTextResponse(JSON.stringify(VALID_CLASSIFICATION)))

    const result = await classifyBrandImageFromUrl('https://example.com/image.png')

    expect(globalThis.fetch).toHaveBeenCalledWith('https://example.com/image.png')
    expect(result.name).toBe('TechCorp')
  })

  it('should detect jpeg content type', async () => {
    const imageBytes = new Uint8Array([0xff, 0xd8])
    const mockResponse = new Response(imageBytes, {
      status: 200,
      headers: { 'content-type': 'image/jpeg' },
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse)
    mockCreate.mockResolvedValueOnce(makeTextResponse(JSON.stringify(VALID_CLASSIFICATION)))

    await classifyBrandImageFromUrl('https://example.com/photo.jpg')

    const callArgs = mockCreate.mock.calls[0][0]
    const imageContent = callArgs.messages[0].content[0]
    expect(imageContent.source.media_type).toBe('image/jpeg')
  })

  it('should detect webp content type', async () => {
    const imageBytes = new Uint8Array([0x52, 0x49])
    const mockResponse = new Response(imageBytes, {
      status: 200,
      headers: { 'content-type': 'image/webp' },
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse)
    mockCreate.mockResolvedValueOnce(makeTextResponse(JSON.stringify(VALID_CLASSIFICATION)))

    await classifyBrandImageFromUrl('https://example.com/photo.webp')

    const callArgs = mockCreate.mock.calls[0][0]
    const imageContent = callArgs.messages[0].content[0]
    expect(imageContent.source.media_type).toBe('image/webp')
  })

  it('should throw when image fetch fails', async () => {
    const mockResponse = new Response(null, { status: 404, statusText: 'Not Found' })
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse)

    await expect(classifyBrandImageFromUrl('https://example.com/missing.png')).rejects.toThrow(
      'Failed to fetch image'
    )
  })

  it('should throw on network error during fetch', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'))

    await expect(classifyBrandImageFromUrl('https://example.com/image.png')).rejects.toThrow(
      'Network error'
    )
  })
})
