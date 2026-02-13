import { describe, it, expect } from 'vitest'
import {
  createTaskSchema,
  updateUserSettingsSchema,
  createCheckoutSchema,
  taskMessageSchema,
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
})
