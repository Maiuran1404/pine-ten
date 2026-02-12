import { describe, it, expect } from 'vitest'
import {
  chatMessageSchema,
  chatStreamSchema,
  creativeIntakeSchema,
  generateOutlineSchema,
  analyzeFeedbackSchema,
  createCheckoutSchema,
} from './index'

describe('Chat & Creative Schemas', () => {
  describe('chatMessageSchema', () => {
    it('should accept valid chat message', () => {
      const result = chatMessageSchema.safeParse({
        messages: [{ role: 'user', content: 'Hello, I need a logo design' }],
      })
      expect(result.success).toBe(true)
    })

    it('should accept multiple messages', () => {
      const result = chatMessageSchema.safeParse({
        messages: [
          { role: 'user', content: 'I need a logo' },
          { role: 'assistant', content: 'What style do you prefer?' },
          { role: 'user', content: 'Something modern' },
        ],
      })
      expect(result.success).toBe(true)
    })

    it('should reject empty content in messages', () => {
      const result = chatMessageSchema.safeParse({
        messages: [{ role: 'user', content: '' }],
      })
      expect(result.success).toBe(false)
    })

    it('should reject content over 10000 chars', () => {
      const result = chatMessageSchema.safeParse({
        messages: [{ role: 'user', content: 'a'.repeat(10001) }],
      })
      expect(result.success).toBe(false)
    })

    it('should only accept user and assistant roles', () => {
      expect(
        chatMessageSchema.safeParse({
          messages: [{ role: 'user', content: 'hi' }],
        }).success
      ).toBe(true)

      expect(
        chatMessageSchema.safeParse({
          messages: [{ role: 'assistant', content: 'hi' }],
        }).success
      ).toBe(true)

      expect(
        chatMessageSchema.safeParse({
          messages: [{ role: 'system', content: 'hi' }],
        }).success
      ).toBe(false)
    })

    it('should accept optional draftId as UUID', () => {
      const result = chatMessageSchema.safeParse({
        messages: [{ role: 'user', content: 'hello' }],
        draftId: '550e8400-e29b-41d4-a716-446655440000',
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid draftId', () => {
      const result = chatMessageSchema.safeParse({
        messages: [{ role: 'user', content: 'hello' }],
        draftId: 'not-a-uuid',
      })
      expect(result.success).toBe(false)
    })

    it('should accept nullable draftId', () => {
      const result = chatMessageSchema.safeParse({
        messages: [{ role: 'user', content: 'hello' }],
        draftId: null,
      })
      expect(result.success).toBe(true)
    })

    it('should accept optional attachments', () => {
      const result = chatMessageSchema.safeParse({
        messages: [{ role: 'user', content: 'hello' }],
        attachments: [
          {
            fileName: 'ref.png',
            fileUrl: 'https://example.com/ref.png',
            fileType: 'image/png',
            fileSize: 2048,
          },
        ],
      })
      expect(result.success).toBe(true)
    })

    it('should reject attachments with invalid URL', () => {
      const result = chatMessageSchema.safeParse({
        messages: [{ role: 'user', content: 'hello' }],
        attachments: [
          {
            fileName: 'ref.png',
            fileUrl: 'not-a-url',
            fileType: 'image/png',
            fileSize: 2048,
          },
        ],
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing messages', () => {
      const result = chatMessageSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('chatStreamSchema', () => {
    it('should accept valid chat stream', () => {
      const result = chatStreamSchema.safeParse({
        messages: [{ role: 'user', content: 'Design a banner' }],
      })
      expect(result.success).toBe(true)
    })

    it('should require at least one message', () => {
      const result = chatStreamSchema.safeParse({ messages: [] })
      expect(result.success).toBe(false)
    })

    it('should reject empty content', () => {
      const result = chatStreamSchema.safeParse({
        messages: [{ role: 'user', content: '' }],
      })
      expect(result.success).toBe(false)
    })

    it('should reject content over 10000 chars', () => {
      const result = chatStreamSchema.safeParse({
        messages: [{ role: 'user', content: 'a'.repeat(10001) }],
      })
      expect(result.success).toBe(false)
    })

    it('should accept user and assistant roles', () => {
      const result = chatStreamSchema.safeParse({
        messages: [
          { role: 'user', content: 'Hi' },
          { role: 'assistant', content: 'Hello!' },
        ],
      })
      expect(result.success).toBe(true)
    })

    it('should reject system role', () => {
      const result = chatStreamSchema.safeParse({
        messages: [{ role: 'system', content: 'You are a helper' }],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('creativeIntakeSchema', () => {
    const validIntake = {
      serviceType: 'static-ads',
      currentStep: 'requirements',
      messages: [{ role: 'user' as const, content: 'I need ad banners' }],
      userMessage: 'I need ad banners for my product launch',
    }

    it('should accept valid creative intake', () => {
      const result = creativeIntakeSchema.safeParse(validIntake)
      expect(result.success).toBe(true)
    })

    it('should reject empty serviceType', () => {
      const result = creativeIntakeSchema.safeParse({ ...validIntake, serviceType: '' })
      expect(result.success).toBe(false)
    })

    it('should reject serviceType over 100 chars', () => {
      const result = creativeIntakeSchema.safeParse({
        ...validIntake,
        serviceType: 'a'.repeat(101),
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty currentStep', () => {
      const result = creativeIntakeSchema.safeParse({ ...validIntake, currentStep: '' })
      expect(result.success).toBe(false)
    })

    it('should reject empty userMessage', () => {
      const result = creativeIntakeSchema.safeParse({ ...validIntake, userMessage: '' })
      expect(result.success).toBe(false)
    })

    it('should reject userMessage over 5000 chars', () => {
      const result = creativeIntakeSchema.safeParse({
        ...validIntake,
        userMessage: 'a'.repeat(5001),
      })
      expect(result.success).toBe(false)
    })

    it('should accept system role in messages', () => {
      const result = creativeIntakeSchema.safeParse({
        ...validIntake,
        messages: [{ role: 'system', content: 'System context' }],
      })
      expect(result.success).toBe(true)
    })

    it('should default currentData to empty object', () => {
      const result = creativeIntakeSchema.safeParse(validIntake)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.currentData).toEqual({})
      }
    })

    it('should accept currentData object', () => {
      const result = creativeIntakeSchema.safeParse({
        ...validIntake,
        currentData: { platform: 'instagram', format: 'story' },
      })
      expect(result.success).toBe(true)
    })
  })

  describe('generateOutlineSchema', () => {
    const validOutline = {
      topic: 'Product Launch Campaign',
      platform: 'instagram',
      intent: 'awareness',
      durationDays: 30,
    }

    it('should accept valid outline request', () => {
      const result = generateOutlineSchema.safeParse(validOutline)
      expect(result.success).toBe(true)
    })

    it('should reject empty topic', () => {
      const result = generateOutlineSchema.safeParse({ ...validOutline, topic: '' })
      expect(result.success).toBe(false)
    })

    it('should reject topic over 500 chars', () => {
      const result = generateOutlineSchema.safeParse({ ...validOutline, topic: 'a'.repeat(501) })
      expect(result.success).toBe(false)
    })

    it('should reject empty platform', () => {
      const result = generateOutlineSchema.safeParse({ ...validOutline, platform: '' })
      expect(result.success).toBe(false)
    })

    it('should reject empty intent', () => {
      const result = generateOutlineSchema.safeParse({ ...validOutline, intent: '' })
      expect(result.success).toBe(false)
    })

    it('should accept durationDays between 1 and 365', () => {
      expect(generateOutlineSchema.safeParse({ ...validOutline, durationDays: 1 }).success).toBe(
        true
      )
      expect(generateOutlineSchema.safeParse({ ...validOutline, durationDays: 365 }).success).toBe(
        true
      )
    })

    it('should reject durationDays outside 1-365', () => {
      expect(generateOutlineSchema.safeParse({ ...validOutline, durationDays: 0 }).success).toBe(
        false
      )
      expect(generateOutlineSchema.safeParse({ ...validOutline, durationDays: 366 }).success).toBe(
        false
      )
    })

    it('should reject non-integer durationDays', () => {
      const result = generateOutlineSchema.safeParse({ ...validOutline, durationDays: 7.5 })
      expect(result.success).toBe(false)
    })

    it('should default contentType to post', () => {
      const result = generateOutlineSchema.safeParse(validOutline)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.contentType).toBe('post')
      }
    })

    it('should accept optional audience fields', () => {
      const result = generateOutlineSchema.safeParse({
        ...validOutline,
        audienceName: 'Tech Professionals',
        audienceDescription: '25-45 year olds in tech industry',
      })
      expect(result.success).toBe(true)
    })

    it('should accept optional brand fields', () => {
      const result = generateOutlineSchema.safeParse({
        ...validOutline,
        brandName: 'Acme Corp',
        brandIndustry: 'Technology',
        brandTone: 'Professional',
      })
      expect(result.success).toBe(true)
    })

    it('should reject audienceName over 200 chars', () => {
      const result = generateOutlineSchema.safeParse({
        ...validOutline,
        audienceName: 'a'.repeat(201),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('analyzeFeedbackSchema', () => {
    it('should accept valid feedback', () => {
      const result = analyzeFeedbackSchema.safeParse({
        feedback: 'The colors need to be more vibrant',
      })
      expect(result.success).toBe(true)
    })

    it('should reject empty feedback', () => {
      const result = analyzeFeedbackSchema.safeParse({ feedback: '' })
      expect(result.success).toBe(false)
    })

    it('should reject feedback over 5000 chars', () => {
      const result = analyzeFeedbackSchema.safeParse({ feedback: 'a'.repeat(5001) })
      expect(result.success).toBe(false)
    })

    it('should accept optional originalRequirements', () => {
      const result = analyzeFeedbackSchema.safeParse({
        feedback: 'The colors need changes',
        originalRequirements: { style: 'modern', colors: ['blue'] },
      })
      expect(result.success).toBe(true)
    })

    it('should accept null originalRequirements', () => {
      const result = analyzeFeedbackSchema.safeParse({
        feedback: 'Need changes',
        originalRequirements: null,
      })
      expect(result.success).toBe(true)
    })

    it('should accept optional description', () => {
      const result = analyzeFeedbackSchema.safeParse({
        feedback: 'Color changes needed',
        description: 'Banner ad for product launch',
      })
      expect(result.success).toBe(true)
    })

    it('should reject description over 5000 chars', () => {
      const result = analyzeFeedbackSchema.safeParse({
        feedback: 'Needs revision',
        description: 'a'.repeat(5001),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('createCheckoutSchema (expanded)', () => {
    it('should accept all valid package IDs', () => {
      const validIds = ['credits_5', 'credits_10', 'credits_25', 'credits_50']
      for (const packageId of validIds) {
        const result = createCheckoutSchema.safeParse({ packageId })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid package IDs', () => {
      const invalidIds = ['credits_1', 'credits_100', 'free', '', 'credits_5 ']
      for (const packageId of invalidIds) {
        const result = createCheckoutSchema.safeParse({ packageId })
        expect(result.success).toBe(false)
      }
    })

    it('should reject missing packageId', () => {
      const result = createCheckoutSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })
})
