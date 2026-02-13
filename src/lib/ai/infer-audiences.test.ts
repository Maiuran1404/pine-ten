import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Anthropic SDK
const mockCreate = vi.fn()
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

import { inferAudiencesFromBrand } from './infer-audiences'

function makeTextResponse(text: string) {
  return {
    content: [{ type: 'text' as const, text }],
  }
}

const VALID_AUDIENCES = [
  {
    name: 'HR Directors at Mid-size Companies',
    isPrimary: true,
    demographics: { ageRange: { min: 35, max: 55 }, income: 'high' },
    firmographics: {
      companySize: ['51-200', '201-500'],
      industries: ['Technology', 'Finance'],
      jobTitles: ['HR Director', 'VP of People'],
      departments: ['Human Resources'],
      decisionMakingRole: 'decision-maker',
    },
    psychographics: {
      painPoints: ['High turnover', 'Slow hiring'],
      goals: ['Reduce time-to-hire', 'Improve retention'],
      values: ['Efficiency', 'Employee satisfaction'],
    },
    behavioral: {
      contentPreferences: ['case studies', 'webinars'],
      platforms: ['LinkedIn', 'Email'],
      buyingProcess: 'committee',
    },
    confidence: 65,
  },
  {
    name: 'Small Business Owners',
    isPrimary: false,
    demographics: { ageRange: { min: 28, max: 50 }, income: 'middle' },
    psychographics: {
      painPoints: ['Limited budget'],
      goals: ['Growth'],
    },
    confidence: 45,
  },
]

describe('inferAudiencesFromBrand', () => {
  beforeEach(() => {
    mockCreate.mockReset()
  })

  describe('prompt construction', () => {
    it('should interpolate brand data into the prompt', async () => {
      mockCreate.mockResolvedValueOnce(makeTextResponse(JSON.stringify(VALID_AUDIENCES)))

      await inferAudiencesFromBrand({
        name: 'Acme Corp',
        industry: 'Technology',
        industryArchetype: 'tech',
        description: 'SaaS platform for HR',
        creativeFocus: ['social media', 'branding'],
      })

      const callArgs = mockCreate.mock.calls[0][0]
      const promptText = callArgs.messages[0].content
      expect(promptText).toContain('Acme Corp')
      expect(promptText).toContain('Technology')
      expect(promptText).toContain('tech')
      expect(promptText).toContain('SaaS platform for HR')
      expect(promptText).toContain('social media, branding')
    })

    it('should use fallback text for missing brand fields', async () => {
      mockCreate.mockResolvedValueOnce(makeTextResponse(JSON.stringify(VALID_AUDIENCES)))

      await inferAudiencesFromBrand({ name: 'Test' })

      const callArgs = mockCreate.mock.calls[0][0]
      const promptText = callArgs.messages[0].content
      expect(promptText).toContain('Not specified')
      expect(promptText).toContain('Not provided')
    })

    it('should use correct model and max_tokens', async () => {
      mockCreate.mockResolvedValueOnce(makeTextResponse(JSON.stringify(VALID_AUDIENCES)))

      await inferAudiencesFromBrand({ name: 'Test', industry: 'Tech' })

      const callArgs = mockCreate.mock.calls[0][0]
      expect(callArgs.model).toBe('claude-sonnet-4-20250514')
      expect(callArgs.max_tokens).toBe(1500)
    })
  })

  describe('early return for insufficient data', () => {
    it('should return empty array when all key fields are missing', async () => {
      const result = await inferAudiencesFromBrand({
        name: '',
        industry: null,
        description: null,
      })

      expect(result).toEqual([])
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('should proceed when at least name is provided', async () => {
      mockCreate.mockResolvedValueOnce(makeTextResponse(JSON.stringify(VALID_AUDIENCES)))

      const result = await inferAudiencesFromBrand({ name: 'Acme' })

      expect(mockCreate).toHaveBeenCalledOnce()
      expect(result.length).toBeGreaterThan(0)
    })

    it('should proceed when at least industry is provided', async () => {
      mockCreate.mockResolvedValueOnce(makeTextResponse(JSON.stringify(VALID_AUDIENCES)))

      const result = await inferAudiencesFromBrand({ name: '', industry: 'Technology' })

      expect(mockCreate).toHaveBeenCalledOnce()
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('response parsing', () => {
    it('should parse a valid JSON array response', async () => {
      mockCreate.mockResolvedValueOnce(makeTextResponse(JSON.stringify(VALID_AUDIENCES)))

      const result = await inferAudiencesFromBrand({ name: 'Acme', industry: 'Tech' })

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('HR Directors at Mid-size Companies')
      expect(result[0].isPrimary).toBe(true)
      expect(result[1].isPrimary).toBe(false)
    })

    it('should extract JSON array from response with surrounding text', async () => {
      const wrappedResponse = `Here are the inferred audiences:\n${JSON.stringify(VALID_AUDIENCES)}\nThank you.`
      mockCreate.mockResolvedValueOnce(makeTextResponse(wrappedResponse))

      const result = await inferAudiencesFromBrand({ name: 'Acme', industry: 'Tech' })

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('HR Directors at Mid-size Companies')
    })

    it('should return empty array when no JSON array found', async () => {
      mockCreate.mockResolvedValueOnce(makeTextResponse('I could not determine the audiences.'))

      const result = await inferAudiencesFromBrand({ name: 'Acme', industry: 'Tech' })

      expect(result).toEqual([])
    })

    it('should return empty array for malformed JSON', async () => {
      mockCreate.mockResolvedValueOnce(makeTextResponse('[{invalid json}]'))

      const result = await inferAudiencesFromBrand({ name: 'Acme', industry: 'Tech' })

      expect(result).toEqual([])
    })

    it('should handle response with no text blocks', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'tool_use', id: 'x', name: 'y', input: {} }],
      })

      const result = await inferAudiencesFromBrand({ name: 'Acme', industry: 'Tech' })

      expect(result).toEqual([])
    })
  })

  describe('validation and normalization', () => {
    it('should filter out audiences without a name', async () => {
      const audiencesWithMissing = [
        { name: 'Valid Audience', isPrimary: true, confidence: 60 },
        { name: '', isPrimary: false, confidence: 50 },
        { isPrimary: false, confidence: 40 },
      ]
      mockCreate.mockResolvedValueOnce(makeTextResponse(JSON.stringify(audiencesWithMissing)))

      const result = await inferAudiencesFromBrand({ name: 'Test', industry: 'Tech' })

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Valid Audience')
    })

    it('should clamp confidence to 0-100 range', async () => {
      const audiences = [
        { name: 'High', isPrimary: true, confidence: 150 },
        { name: 'Low', isPrimary: false, confidence: -20 },
      ]
      mockCreate.mockResolvedValueOnce(makeTextResponse(JSON.stringify(audiences)))

      const result = await inferAudiencesFromBrand({ name: 'Test', industry: 'Tech' })

      expect(result[0].confidence).toBe(100)
      expect(result[1].confidence).toBe(0)
    })

    it('should default confidence to 50 when not a number', async () => {
      const audiences = [{ name: 'Test', isPrimary: true, confidence: 'high' }]
      mockCreate.mockResolvedValueOnce(makeTextResponse(JSON.stringify(audiences)))

      const result = await inferAudiencesFromBrand({ name: 'Test', industry: 'Tech' })

      expect(result[0].confidence).toBe(50)
    })

    it('should ensure exactly one primary audience when none marked', async () => {
      const audiences = [
        { name: 'A', isPrimary: false, confidence: 60 },
        { name: 'B', isPrimary: false, confidence: 50 },
      ]
      mockCreate.mockResolvedValueOnce(makeTextResponse(JSON.stringify(audiences)))

      const result = await inferAudiencesFromBrand({ name: 'Test', industry: 'Tech' })

      const primaryCount = result.filter((a) => a.isPrimary).length
      expect(primaryCount).toBe(1)
      expect(result[0].isPrimary).toBe(true)
    })

    it('should default missing sub-objects to empty objects', async () => {
      const audiences = [{ name: 'Minimal', isPrimary: true, confidence: 55 }]
      mockCreate.mockResolvedValueOnce(makeTextResponse(JSON.stringify(audiences)))

      const result = await inferAudiencesFromBrand({ name: 'Test', industry: 'Tech' })

      expect(result[0].demographics).toEqual({})
      expect(result[0].firmographics).toEqual({})
      expect(result[0].psychographics).toEqual({})
      expect(result[0].behavioral).toEqual({})
    })
  })

  describe('error handling', () => {
    it('should return empty array on API timeout', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Request timed out'))

      const result = await inferAudiencesFromBrand({ name: 'Acme', industry: 'Tech' })

      expect(result).toEqual([])
    })

    it('should return empty array on rate limit error', async () => {
      const err = new Error('Rate limited')
      ;(err as Record<string, unknown>).status = 429
      mockCreate.mockRejectedValueOnce(err)

      const result = await inferAudiencesFromBrand({ name: 'Acme', industry: 'Tech' })

      expect(result).toEqual([])
    })

    it('should return empty array on network failure', async () => {
      mockCreate.mockRejectedValueOnce(new Error('ECONNREFUSED'))

      const result = await inferAudiencesFromBrand({ name: 'Acme', industry: 'Tech' })

      expect(result).toEqual([])
    })
  })
})
