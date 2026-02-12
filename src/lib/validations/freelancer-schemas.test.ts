import { describe, it, expect } from 'vitest'
import {
  updateFreelancerProfileSchema,
  stripeConnectActionSchema,
  onboardingSchema,
  setRoleSchema,
  updateUserSettingsSchema,
  onboardingRequestSchema,
  createCouponSchema,
} from './index'

describe('Freelancer & User Schemas', () => {
  describe('updateFreelancerProfileSchema', () => {
    it('should accept empty object', () => {
      const result = updateFreelancerProfileSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept valid bio', () => {
      const result = updateFreelancerProfileSchema.safeParse({
        bio: 'Experienced graphic designer specializing in brand identity.',
      })
      expect(result.success).toBe(true)
    })

    it('should reject bio over 1000 chars', () => {
      const result = updateFreelancerProfileSchema.safeParse({ bio: 'a'.repeat(1001) })
      expect(result.success).toBe(false)
    })

    it('should accept valid skills array', () => {
      const result = updateFreelancerProfileSchema.safeParse({
        skills: ['Graphic Design', 'UI/UX', 'Illustration'],
      })
      expect(result.success).toBe(true)
    })

    it('should reject skill strings over 100 chars', () => {
      const result = updateFreelancerProfileSchema.safeParse({
        skills: ['a'.repeat(101)],
      })
      expect(result.success).toBe(false)
    })

    it('should accept valid specializations', () => {
      const result = updateFreelancerProfileSchema.safeParse({
        specializations: ['Static Ads', 'Social Media'],
      })
      expect(result.success).toBe(true)
    })

    it('should accept valid portfolio URLs', () => {
      const result = updateFreelancerProfileSchema.safeParse({
        portfolioUrls: ['https://portfolio.example.com', 'https://behance.net/user'],
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid portfolio URLs', () => {
      const result = updateFreelancerProfileSchema.safeParse({
        portfolioUrls: ['not-a-url'],
      })
      expect(result.success).toBe(false)
    })

    it('should accept whatsappNumber', () => {
      const result = updateFreelancerProfileSchema.safeParse({
        whatsappNumber: '+14155551234',
      })
      expect(result.success).toBe(true)
    })

    it('should reject whatsappNumber over 30 chars', () => {
      const result = updateFreelancerProfileSchema.safeParse({
        whatsappNumber: 'a'.repeat(31),
      })
      expect(result.success).toBe(false)
    })

    it('should accept availability', () => {
      const result = updateFreelancerProfileSchema.safeParse({
        availability: 'full-time',
      })
      expect(result.success).toBe(true)
    })

    it('should reject availability over 50 chars', () => {
      const result = updateFreelancerProfileSchema.safeParse({
        availability: 'a'.repeat(51),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('stripeConnectActionSchema', () => {
    it('should accept valid create action', () => {
      const result = stripeConnectActionSchema.safeParse({ action: 'create' })
      expect(result.success).toBe(true)
    })

    it('should accept valid onboarding action', () => {
      const result = stripeConnectActionSchema.safeParse({ action: 'onboarding' })
      expect(result.success).toBe(true)
    })

    it('should accept valid dashboard action', () => {
      const result = stripeConnectActionSchema.safeParse({ action: 'dashboard' })
      expect(result.success).toBe(true)
    })

    it('should reject invalid action', () => {
      const result = stripeConnectActionSchema.safeParse({ action: 'invalid' })
      expect(result.success).toBe(false)
    })

    it('should accept optional country code', () => {
      const result = stripeConnectActionSchema.safeParse({
        action: 'create',
        country: 'US',
      })
      expect(result.success).toBe(true)
    })

    it('should reject country code not exactly 2 chars', () => {
      expect(
        stripeConnectActionSchema.safeParse({ action: 'create', country: 'USA' }).success
      ).toBe(false)
      expect(stripeConnectActionSchema.safeParse({ action: 'create', country: 'U' }).success).toBe(
        false
      )
    })
  })

  describe('onboardingSchema', () => {
    it('should accept valid client onboarding', () => {
      const result = onboardingSchema.safeParse({
        role: 'CLIENT',
        companyName: 'Acme Corp',
        industry: 'Technology',
      })
      expect(result.success).toBe(true)
    })

    it('should accept valid freelancer onboarding', () => {
      const result = onboardingSchema.safeParse({
        role: 'FREELANCER',
        skills: ['Design', 'Illustration'],
        bio: 'Creative designer',
        portfolioUrls: ['https://portfolio.example.com'],
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid role', () => {
      const result = onboardingSchema.safeParse({ role: 'ADMIN' })
      expect(result.success).toBe(false)
    })

    it('should accept empty string for website', () => {
      const result = onboardingSchema.safeParse({
        role: 'CLIENT',
        website: '',
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid website URL', () => {
      const result = onboardingSchema.safeParse({
        role: 'CLIENT',
        website: 'not-a-url',
      })
      expect(result.success).toBe(false)
    })

    it('should accept valid website URL', () => {
      const result = onboardingSchema.safeParse({
        role: 'CLIENT',
        website: 'https://example.com',
      })
      expect(result.success).toBe(true)
    })

    it('should reject companyName shorter than 2 chars', () => {
      const result = onboardingSchema.safeParse({
        role: 'CLIENT',
        companyName: 'A',
      })
      expect(result.success).toBe(false)
    })

    it('should reject bio over 1000 chars', () => {
      const result = onboardingSchema.safeParse({
        role: 'FREELANCER',
        bio: 'a'.repeat(1001),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('setRoleSchema', () => {
    it('should accept CLIENT role', () => {
      const result = setRoleSchema.safeParse({ role: 'CLIENT' })
      expect(result.success).toBe(true)
    })

    it('should accept FREELANCER role', () => {
      const result = setRoleSchema.safeParse({ role: 'FREELANCER' })
      expect(result.success).toBe(true)
    })

    it('should reject ADMIN role', () => {
      const result = setRoleSchema.safeParse({ role: 'ADMIN' })
      expect(result.success).toBe(false)
    })

    it('should reject empty role', () => {
      const result = setRoleSchema.safeParse({ role: '' })
      expect(result.success).toBe(false)
    })

    it('should reject missing role', () => {
      const result = setRoleSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('updateUserSettingsSchema (expanded)', () => {
    it('should accept valid phone numbers', () => {
      const validPhones = ['+14155551234', '+442071234567', '+8613812345678', '14155551234']
      for (const phone of validPhones) {
        const result = updateUserSettingsSchema.safeParse({ phone })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid phone numbers', () => {
      const invalidPhones = ['abc', '+0123456789', 'phone123', '0']
      for (const phone of invalidPhones) {
        const result = updateUserSettingsSchema.safeParse({ phone })
        expect(result.success).toBe(false)
      }
    })

    it('should accept null phone', () => {
      const result = updateUserSettingsSchema.safeParse({ phone: null })
      expect(result.success).toBe(true)
    })

    it('should accept notification preferences', () => {
      const result = updateUserSettingsSchema.safeParse({
        notificationPreferences: {
          email: true,
          whatsapp: false,
          inApp: true,
        },
      })
      expect(result.success).toBe(true)
    })

    it('should accept partial notification preferences', () => {
      const result = updateUserSettingsSchema.safeParse({
        notificationPreferences: { email: false },
      })
      expect(result.success).toBe(true)
    })

    it('should reject name shorter than 2 chars', () => {
      const result = updateUserSettingsSchema.safeParse({ name: 'A' })
      expect(result.success).toBe(false)
    })

    it('should reject name longer than 100 chars', () => {
      const result = updateUserSettingsSchema.safeParse({ name: 'a'.repeat(101) })
      expect(result.success).toBe(false)
    })
  })

  describe('onboardingRequestSchema', () => {
    it('should accept valid client request', () => {
      const result = onboardingRequestSchema.safeParse({
        type: 'client',
        data: { companyName: 'Acme' },
      })
      expect(result.success).toBe(true)
    })

    it('should accept valid freelancer request', () => {
      const result = onboardingRequestSchema.safeParse({
        type: 'freelancer',
        data: { skills: ['design'] },
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid type', () => {
      const result = onboardingRequestSchema.safeParse({
        type: 'admin',
        data: {},
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing data', () => {
      const result = onboardingRequestSchema.safeParse({ type: 'client' })
      expect(result.success).toBe(false)
    })
  })

  describe('createCouponSchema', () => {
    it('should accept valid coupon', () => {
      const result = createCouponSchema.safeParse({
        code: 'WELCOME20',
        percentOff: 20,
      })
      expect(result.success).toBe(true)
    })

    it('should accept valid uppercase codes', () => {
      const validCodes = ['SAVE10', 'WELCOME_BACK', 'VIP-2024', 'A1B2C3']
      for (const code of validCodes) {
        const result = createCouponSchema.safeParse({ code })
        expect(result.success).toBe(true)
      }
    })

    it('should reject lowercase codes', () => {
      const result = createCouponSchema.safeParse({ code: 'welcome' })
      expect(result.success).toBe(false)
    })

    it('should reject code with spaces', () => {
      const result = createCouponSchema.safeParse({ code: 'SAVE TEN' })
      expect(result.success).toBe(false)
    })

    it('should reject code shorter than 3 chars', () => {
      const result = createCouponSchema.safeParse({ code: 'AB' })
      expect(result.success).toBe(false)
    })

    it('should reject code longer than 50 chars', () => {
      const result = createCouponSchema.safeParse({ code: 'A'.repeat(51) })
      expect(result.success).toBe(false)
    })

    it('should accept percentOff between 1 and 100', () => {
      expect(createCouponSchema.safeParse({ code: 'TEST', percentOff: 1 }).success).toBe(true)
      expect(createCouponSchema.safeParse({ code: 'TEST', percentOff: 100 }).success).toBe(true)
    })

    it('should reject percentOff outside 1-100', () => {
      expect(createCouponSchema.safeParse({ code: 'TEST', percentOff: 0 }).success).toBe(false)
      expect(createCouponSchema.safeParse({ code: 'TEST', percentOff: 101 }).success).toBe(false)
    })

    it('should accept amountOff', () => {
      const result = createCouponSchema.safeParse({ code: 'TEST', amountOff: 5 })
      expect(result.success).toBe(true)
    })

    it('should accept maxRedemptions', () => {
      const result = createCouponSchema.safeParse({ code: 'TEST', maxRedemptions: 100 })
      expect(result.success).toBe(true)
    })

    it('should reject maxRedemptions less than 1', () => {
      const result = createCouponSchema.safeParse({ code: 'TEST', maxRedemptions: 0 })
      expect(result.success).toBe(false)
    })

    it('should accept valid expiresAt datetime', () => {
      const result = createCouponSchema.safeParse({
        code: 'TEST',
        expiresAt: '2025-12-31T23:59:59.000Z',
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid expiresAt format', () => {
      const result = createCouponSchema.safeParse({
        code: 'TEST',
        expiresAt: 'next-year',
      })
      expect(result.success).toBe(false)
    })
  })
})
