import { describe, it, expect } from 'vitest'
import {
  createTaskSchema,
  updateUserSettingsSchema,
  createCheckoutSchema,
  taskMessageSchema,
  createTemplateImageSchema,
  onboardingRequestSchema,
  extractBrandRequestSchema,
} from './index'

describe('Validation Schemas', () => {
  describe('createTaskSchema', () => {
    it('should validate a valid task', () => {
      const validTask = {
        title: 'Design a logo',
        description: 'Create a minimalist logo for our startup',
        creditsRequired: 2,
      }

      const result = createTaskSchema.safeParse(validTask)
      expect(result.success).toBe(true)
    })

    it('should reject a task with short title', () => {
      const invalidTask = {
        title: 'Hi',
        description: 'Create a minimalist logo for our startup',
        creditsRequired: 2,
      }

      const result = createTaskSchema.safeParse(invalidTask)
      expect(result.success).toBe(false)
    })

    it('should reject a task with too few credits', () => {
      const invalidTask = {
        title: 'Design a logo',
        description: 'Create a minimalist logo for our startup',
        creditsRequired: 0,
      }

      const result = createTaskSchema.safeParse(invalidTask)
      expect(result.success).toBe(false)
    })

    it('should allow optional fields', () => {
      const minimalTask = {
        title: 'Design a logo',
        description: 'Create a minimalist logo for our startup',
        creditsRequired: 1,
      }

      const result = createTaskSchema.safeParse(minimalTask)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.attachments).toEqual([])
        expect(result.data.styleReferences).toEqual([])
      }
    })

    it('should validate attachments', () => {
      const taskWithAttachment = {
        title: 'Design a logo',
        description: 'Create a minimalist logo for our startup',
        creditsRequired: 1,
        attachments: [
          {
            fileName: 'reference.png',
            fileUrl: 'https://example.com/reference.png',
            fileType: 'image/png',
            fileSize: 1024,
          },
        ],
      }

      const result = createTaskSchema.safeParse(taskWithAttachment)
      expect(result.success).toBe(true)
    })
  })

  describe('updateUserSettingsSchema', () => {
    it('should validate valid settings', () => {
      const validSettings = {
        name: 'John Doe',
        phone: '+14155551234',
      }

      const result = updateUserSettingsSchema.safeParse(validSettings)
      expect(result.success).toBe(true)
    })

    it('should allow empty updates', () => {
      const result = updateUserSettingsSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should reject invalid phone numbers', () => {
      const invalidSettings = {
        phone: 'not-a-phone',
      }

      const result = updateUserSettingsSchema.safeParse(invalidSettings)
      expect(result.success).toBe(false)
    })
  })

  describe('createCheckoutSchema', () => {
    it('should accept valid package IDs', () => {
      const validPackages = ['credits_5', 'credits_10', 'credits_25', 'credits_50']

      validPackages.forEach((packageId) => {
        const result = createCheckoutSchema.safeParse({ packageId })
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid package IDs', () => {
      const result = createCheckoutSchema.safeParse({
        packageId: 'invalid_package',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('taskMessageSchema', () => {
    it('should validate a valid message', () => {
      const validMessage = {
        content: 'Here is my feedback on the design',
      }

      const result = taskMessageSchema.safeParse(validMessage)
      expect(result.success).toBe(true)
    })

    it('should reject empty messages', () => {
      const invalidMessage = {
        content: '',
      }

      const result = taskMessageSchema.safeParse(invalidMessage)
      expect(result.success).toBe(false)
    })

    it('should trim whitespace from content', () => {
      const messageWithWhitespace = {
        content: '  Hello world  ',
      }

      const result = taskMessageSchema.safeParse(messageWithWhitespace)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.content).toBe('Hello world')
      }
    })
  })

  describe('createTemplateImageSchema', () => {
    it('should validate a valid template image', () => {
      const result = createTemplateImageSchema.safeParse({
        categoryKey: 'launch-videos',
        imageUrl: 'https://example.com/image.png',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.displayOrder).toBe(0)
      }
    })

    it('should validate with all optional fields', () => {
      const result = createTemplateImageSchema.safeParse({
        categoryKey: 'social-media',
        optionKey: 'instagram-post',
        imageUrl: 'https://example.com/image.png',
        sourceUrl: 'https://source.com/original.png',
        displayOrder: 5,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.optionKey).toBe('instagram-post')
        expect(result.data.sourceUrl).toBe('https://source.com/original.png')
        expect(result.data.displayOrder).toBe(5)
      }
    })

    it('should reject when categoryKey is missing', () => {
      const result = createTemplateImageSchema.safeParse({
        imageUrl: 'https://example.com/image.png',
      })
      expect(result.success).toBe(false)
    })

    it('should reject when imageUrl is missing', () => {
      const result = createTemplateImageSchema.safeParse({
        categoryKey: 'launch-videos',
      })
      expect(result.success).toBe(false)
    })

    it('should reject an invalid imageUrl', () => {
      const result = createTemplateImageSchema.safeParse({
        categoryKey: 'launch-videos',
        imageUrl: 'not-a-url',
      })
      expect(result.success).toBe(false)
    })

    it('should reject an invalid sourceUrl', () => {
      const result = createTemplateImageSchema.safeParse({
        categoryKey: 'launch-videos',
        imageUrl: 'https://example.com/image.png',
        sourceUrl: 'bad-url',
      })
      expect(result.success).toBe(false)
    })

    it('should allow null optionKey', () => {
      const result = createTemplateImageSchema.safeParse({
        categoryKey: 'launch-videos',
        optionKey: null,
        imageUrl: 'https://example.com/image.png',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.optionKey).toBeNull()
      }
    })

    it('should reject empty categoryKey', () => {
      const result = createTemplateImageSchema.safeParse({
        categoryKey: '',
        imageUrl: 'https://example.com/image.png',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('onboardingRequestSchema', () => {
    it('should validate a valid client onboarding request', () => {
      const result = onboardingRequestSchema.safeParse({
        type: 'client',
        data: {
          brand: {
            name: 'Acme Corp',
          },
        },
      })
      expect(result.success).toBe(true)
    })

    it('should validate a client onboarding with full brand data', () => {
      const result = onboardingRequestSchema.safeParse({
        type: 'client',
        data: {
          brand: {
            name: 'Acme Corp',
            website: 'https://acme.com',
            industry: 'Technology',
            industryArchetype: 'tech',
            description: 'A tech company',
            logoUrl: 'https://example.com/logo.png',
            primaryColor: '#3B82F6',
            secondaryColor: '#1E40AF',
            brandColors: ['#3B82F6', '#1E40AF'],
            primaryFont: 'Inter',
            tagline: 'Building the future',
            keywords: ['tech', 'saas'],
            creativeFocus: ['social-media'],
          },
          hasWebsite: true,
        },
      })
      expect(result.success).toBe(true)
    })

    it('should validate a valid freelancer onboarding request', () => {
      const result = onboardingRequestSchema.safeParse({
        type: 'freelancer',
        data: {
          whatsappNumber: '+14155551234',
          bio: 'Professional designer',
          skills: ['Graphic Design', 'UI/UX'],
          specializations: ['Static Ads'],
          portfolioUrls: ['https://portfolio.example.com'],
        },
      })
      expect(result.success).toBe(true)
    })

    it('should validate a freelancer with minimal data', () => {
      const result = onboardingRequestSchema.safeParse({
        type: 'freelancer',
        data: {},
      })
      expect(result.success).toBe(true)
      if (result.success && result.data.type === 'freelancer') {
        const data = result.data.data as {
          skills: string[]
          specializations: string[]
          portfolioUrls: string[]
        }
        expect(data.skills).toEqual([])
        expect(data.specializations).toEqual([])
        expect(data.portfolioUrls).toEqual([])
      }
    })

    it('should reject when type is missing', () => {
      const result = onboardingRequestSchema.safeParse({
        data: {
          brand: { name: 'Test' },
        },
      })
      expect(result.success).toBe(false)
    })

    it('should reject an invalid role/type', () => {
      const result = onboardingRequestSchema.safeParse({
        type: 'admin',
        data: {
          brand: { name: 'Test' },
        },
      })
      expect(result.success).toBe(false)
    })

    it('should reject client type with missing brand name', () => {
      const result = onboardingRequestSchema.safeParse({
        type: 'client',
        data: {
          brand: {},
        },
      })
      expect(result.success).toBe(false)
    })

    it('should reject when data field is missing', () => {
      const result = onboardingRequestSchema.safeParse({
        type: 'client',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('extractBrandRequestSchema', () => {
    it('should validate a valid URL string', () => {
      const result = extractBrandRequestSchema.safeParse({
        websiteUrl: 'https://example.com',
      })
      expect(result.success).toBe(true)
    })

    it('should validate a URL without protocol', () => {
      // The schema only requires min(1), not .url()
      const result = extractBrandRequestSchema.safeParse({
        websiteUrl: 'example.com',
      })
      expect(result.success).toBe(true)
    })

    it('should reject an empty websiteUrl', () => {
      const result = extractBrandRequestSchema.safeParse({
        websiteUrl: '',
      })
      expect(result.success).toBe(false)
    })

    it('should reject when websiteUrl is missing', () => {
      const result = extractBrandRequestSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('should reject a URL that exceeds max length', () => {
      const result = extractBrandRequestSchema.safeParse({
        websiteUrl: 'https://example.com/' + 'a'.repeat(2000),
      })
      expect(result.success).toBe(false)
    })
  })
})
