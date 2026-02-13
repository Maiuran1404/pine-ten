import { describe, it, expect } from 'vitest'
import { validateEarlyAccessCodeSchema, joinWaitlistSchema } from './index'

describe('Early Access Schemas', () => {
  describe('validateEarlyAccessCodeSchema', () => {
    it('should accept a valid code', () => {
      const result = validateEarlyAccessCodeSchema.safeParse({ code: 'ABC123' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.code).toBe('ABC123')
      }
    })

    it('should trim whitespace', () => {
      const result = validateEarlyAccessCodeSchema.safeParse({ code: '  abc123  ' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.code).toBe('ABC123')
      }
    })

    it('should uppercase the code', () => {
      const result = validateEarlyAccessCodeSchema.safeParse({ code: 'hello' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.code).toBe('HELLO')
      }
    })

    it('should reject empty code', () => {
      const result = validateEarlyAccessCodeSchema.safeParse({ code: '' })
      expect(result.success).toBe(false)
    })

    it('should reject code over 50 chars', () => {
      const result = validateEarlyAccessCodeSchema.safeParse({
        code: 'A'.repeat(51),
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing code field', () => {
      const result = validateEarlyAccessCodeSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('joinWaitlistSchema', () => {
    it('should accept valid email only', () => {
      const result = joinWaitlistSchema.safeParse({ email: 'test@example.com' })
      expect(result.success).toBe(true)
    })

    it('should accept email with optional fields', () => {
      const result = joinWaitlistSchema.safeParse({
        email: 'test@example.com',
        name: 'John Doe',
        referralSource: 'Twitter',
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const result = joinWaitlistSchema.safeParse({ email: 'not-an-email' })
      expect(result.success).toBe(false)
    })

    it('should reject missing email', () => {
      const result = joinWaitlistSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('should reject name over 100 chars', () => {
      const result = joinWaitlistSchema.safeParse({
        email: 'test@example.com',
        name: 'A'.repeat(101),
      })
      expect(result.success).toBe(false)
    })

    it('should reject referralSource over 200 chars', () => {
      const result = joinWaitlistSchema.safeParse({
        email: 'test@example.com',
        referralSource: 'A'.repeat(201),
      })
      expect(result.success).toBe(false)
    })
  })
})
