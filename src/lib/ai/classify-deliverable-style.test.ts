import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const mockCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: (...args: unknown[]) => mockCreate(...args) }
  },
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const { classifyDeliverableStyle, classifyDeliverableStyleFromUrl } =
  await import('./classify-deliverable-style')

describe('classifyDeliverableStyle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns classification from Claude response', async () => {
    const classification = {
      name: 'Bold Tech',
      description: 'A bold tech design',
      deliverableType: 'instagram_post',
      styleAxis: 'bold',
      subStyle: null,
      semanticTags: ['bold', 'tech'],
      confidence: 0.9,
      isVideoThumbnail: false,
      contentType: 'designed_graphic',
    }

    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(classification) }],
    })

    const result = await classifyDeliverableStyle('base64data')
    expect(result.name).toBe('Bold Tech')
    expect(result.deliverableType).toBe('instagram_post')
    expect(result.styleAxis).toBe('bold')
    expect(result.confidence).toBe(0.9)
  })

  it('passes media type to the API call', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            name: 'Test',
            description: 'Test',
            deliverableType: 'instagram_post',
            styleAxis: 'minimal',
            subStyle: null,
            semanticTags: [],
            confidence: 0.8,
          }),
        },
      ],
    })

    await classifyDeliverableStyle('base64data', 'image/jpeg')

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                source: expect.objectContaining({
                  media_type: 'image/jpeg',
                }),
              }),
            ]),
          }),
        ]),
      })
    )
  })

  it('returns default classification when no text response', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'image', data: 'stuff' }],
    })

    const result = await classifyDeliverableStyle('base64data')
    expect(result.name).toBe('Unknown Style')
    expect(result.confidence).toBe(0)
  })

  it('returns default classification when no JSON in response', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'No JSON here' }],
    })

    const result = await classifyDeliverableStyle('base64data')
    expect(result.name).toBe('Unknown Style')
    expect(result.confidence).toBe(0)
  })

  it('returns default classification when required fields missing', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify({ name: 'Test' }) }],
    })

    const result = await classifyDeliverableStyle('base64data')
    expect(result.name).toBe('Unknown Style')
    expect(result.confidence).toBe(0)
  })

  it('returns default classification when API throws', async () => {
    mockCreate.mockRejectedValueOnce(new Error('API error'))

    const result = await classifyDeliverableStyle('base64data')
    expect(result.name).toBe('Unknown Style')
    expect(result.confidence).toBe(0)
  })

  it('parses JSON embedded in other text', async () => {
    const classification = {
      name: 'Clean Minimal',
      description: 'Clean minimal design',
      deliverableType: 'linkedin_post',
      styleAxis: 'minimal',
      subStyle: null,
      semanticTags: ['clean'],
      confidence: 0.85,
    }

    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: `Here is my analysis: ${JSON.stringify(classification)} Hope that helps!`,
        },
      ],
    })

    const result = await classifyDeliverableStyle('base64data')
    expect(result.name).toBe('Clean Minimal')
    expect(result.deliverableType).toBe('linkedin_post')
  })
})

describe('classifyDeliverableStyleFromUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches image, converts to base64, and classifies', async () => {
    const imageBuffer = new ArrayBuffer(8)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'image/jpeg' }),
      arrayBuffer: vi.fn().mockResolvedValue(imageBuffer),
    })

    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            name: 'From URL',
            description: 'URL style',
            deliverableType: 'instagram_post',
            styleAxis: 'bold',
            subStyle: null,
            semanticTags: [],
            confidence: 0.9,
          }),
        },
      ],
    })

    const result = await classifyDeliverableStyleFromUrl('https://example.com/image.jpg')
    expect(result.name).toBe('From URL')
    expect(mockFetch).toHaveBeenCalledWith('https://example.com/image.jpg')
  })

  it('throws when fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
    })

    await expect(classifyDeliverableStyleFromUrl('https://example.com/bad.jpg')).rejects.toThrow(
      'Failed to fetch image'
    )
  })

  it('detects webp content type', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'image/webp' }),
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    })

    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            name: 'WebP',
            description: 'WebP',
            deliverableType: 'instagram_post',
            styleAxis: 'minimal',
            subStyle: null,
            semanticTags: [],
            confidence: 0.8,
          }),
        },
      ],
    })

    await classifyDeliverableStyleFromUrl('https://example.com/image.webp')

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                source: expect.objectContaining({
                  media_type: 'image/webp',
                }),
              }),
            ]),
          }),
        ]),
      })
    )
  })
})
