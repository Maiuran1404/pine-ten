import { describe, it, expect } from 'vitest'
import {
  adminFreelancerActionSchema,
  createCategorySchema,
  updateCategorySchema,
  createStyleReferenceSchema,
  adminCreditsSchema,
  chatPromptsSchema,
  adminSettingsSchema,
  updateNotificationSettingSchema,
} from './index'

describe('Admin Schemas', () => {
  describe('adminFreelancerActionSchema', () => {
    it('should accept valid freelancer action', () => {
      const result = adminFreelancerActionSchema.safeParse({
        freelancerId: '550e8400-e29b-41d4-a716-446655440000',
      })
      expect(result.success).toBe(true)
    })

    it('should reject non-UUID freelancerId', () => {
      const result = adminFreelancerActionSchema.safeParse({
        freelancerId: 'not-a-uuid',
      })
      expect(result.success).toBe(false)
    })

    it('should accept optional reason', () => {
      const result = adminFreelancerActionSchema.safeParse({
        freelancerId: '550e8400-e29b-41d4-a716-446655440000',
        reason: 'Violating terms of service',
      })
      expect(result.success).toBe(true)
    })

    it('should reject reason over 500 chars', () => {
      const result = adminFreelancerActionSchema.safeParse({
        freelancerId: '550e8400-e29b-41d4-a716-446655440000',
        reason: 'a'.repeat(501),
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing freelancerId', () => {
      const result = adminFreelancerActionSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('createCategorySchema', () => {
    const validCategory = {
      name: 'Static Ads',
      slug: 'static-ads',
      baseCredits: 10,
    }

    it('should accept valid category', () => {
      const result = createCategorySchema.safeParse(validCategory)
      expect(result.success).toBe(true)
    })

    it('should reject name shorter than 2 chars', () => {
      const result = createCategorySchema.safeParse({ ...validCategory, name: 'A' })
      expect(result.success).toBe(false)
    })

    it('should reject name longer than 100 chars', () => {
      const result = createCategorySchema.safeParse({ ...validCategory, name: 'a'.repeat(101) })
      expect(result.success).toBe(false)
    })

    it('should accept valid slug formats', () => {
      const validSlugs = ['static-ads', 'video-motion', 'ui-ux', 'a1-b2-c3', 'simple']
      for (const slug of validSlugs) {
        const result = createCategorySchema.safeParse({ ...validCategory, slug })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid slug formats', () => {
      const invalidSlugs = [
        'Static Ads', // uppercase and space
        'static_ads', // underscore
        'STATIC-ADS', // uppercase
        'static ads', // space
        'static.ads', // dot
      ]
      for (const slug of invalidSlugs) {
        const result = createCategorySchema.safeParse({ ...validCategory, slug })
        expect(result.success).toBe(false)
      }
    })

    it('should reject slug shorter than 2 chars', () => {
      const result = createCategorySchema.safeParse({ ...validCategory, slug: 'a' })
      expect(result.success).toBe(false)
    })

    it('should accept baseCredits between 1 and 50', () => {
      expect(createCategorySchema.safeParse({ ...validCategory, baseCredits: 1 }).success).toBe(
        true
      )
      expect(createCategorySchema.safeParse({ ...validCategory, baseCredits: 50 }).success).toBe(
        true
      )
    })

    it('should reject baseCredits outside 1-50 range', () => {
      expect(createCategorySchema.safeParse({ ...validCategory, baseCredits: 0 }).success).toBe(
        false
      )
      expect(createCategorySchema.safeParse({ ...validCategory, baseCredits: 51 }).success).toBe(
        false
      )
    })

    it('should reject non-integer baseCredits', () => {
      const result = createCategorySchema.safeParse({ ...validCategory, baseCredits: 2.5 })
      expect(result.success).toBe(false)
    })

    it('should default isActive to true', () => {
      const result = createCategorySchema.safeParse(validCategory)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isActive).toBe(true)
      }
    })

    it('should accept optional description', () => {
      const result = createCategorySchema.safeParse({
        ...validCategory,
        description: 'Image ads for social media',
      })
      expect(result.success).toBe(true)
    })

    it('should reject description over 500 chars', () => {
      const result = createCategorySchema.safeParse({
        ...validCategory,
        description: 'a'.repeat(501),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateCategorySchema', () => {
    it('should accept empty object (partial update)', () => {
      const result = updateCategorySchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept partial category update', () => {
      const result = updateCategorySchema.safeParse({ name: 'New Name' })
      expect(result.success).toBe(true)
    })

    it('should still validate slug format on partial update', () => {
      const result = updateCategorySchema.safeParse({ slug: 'INVALID SLUG' })
      expect(result.success).toBe(false)
    })
  })

  describe('createStyleReferenceSchema', () => {
    const validStyle = {
      category: 'Minimalist',
      name: 'Clean White',
      imageUrl: 'https://example.com/style.png',
    }

    it('should accept valid style reference', () => {
      const result = createStyleReferenceSchema.safeParse(validStyle)
      expect(result.success).toBe(true)
    })

    it('should reject category shorter than 2 chars', () => {
      const result = createStyleReferenceSchema.safeParse({ ...validStyle, category: 'A' })
      expect(result.success).toBe(false)
    })

    it('should reject name shorter than 2 chars', () => {
      const result = createStyleReferenceSchema.safeParse({ ...validStyle, name: 'A' })
      expect(result.success).toBe(false)
    })

    it('should reject invalid imageUrl', () => {
      const result = createStyleReferenceSchema.safeParse({ ...validStyle, imageUrl: 'bad' })
      expect(result.success).toBe(false)
    })

    it('should default tags to empty array', () => {
      const result = createStyleReferenceSchema.safeParse(validStyle)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tags).toEqual([])
      }
    })

    it('should default isActive to true', () => {
      const result = createStyleReferenceSchema.safeParse(validStyle)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isActive).toBe(true)
      }
    })
  })

  describe('adminCreditsSchema', () => {
    it('should accept valid credit adjustment', () => {
      const result = adminCreditsSchema.safeParse({
        userId: 'user_123',
        amount: 10,
        type: 'BONUS',
      })
      expect(result.success).toBe(true)
    })

    it('should accept negative amounts for adjustment', () => {
      const result = adminCreditsSchema.safeParse({
        userId: 'user_123',
        amount: -5,
        type: 'ADJUSTMENT',
      })
      expect(result.success).toBe(true)
    })

    it('should accept all valid types', () => {
      for (const type of ['BONUS', 'ADJUSTMENT', 'REFUND']) {
        const result = adminCreditsSchema.safeParse({
          userId: 'user_123',
          amount: 1,
          type,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid type', () => {
      const result = adminCreditsSchema.safeParse({
        userId: 'user_123',
        amount: 1,
        type: 'INVALID',
      })
      expect(result.success).toBe(false)
    })

    it('should reject non-integer amount', () => {
      const result = adminCreditsSchema.safeParse({
        userId: 'user_123',
        amount: 1.5,
        type: 'BONUS',
      })
      expect(result.success).toBe(false)
    })

    it('should accept optional description', () => {
      const result = adminCreditsSchema.safeParse({
        userId: 'user_123',
        amount: 5,
        type: 'BONUS',
        description: 'Welcome bonus',
      })
      expect(result.success).toBe(true)
    })

    it('should reject description over 500 chars', () => {
      const result = adminCreditsSchema.safeParse({
        userId: 'user_123',
        amount: 5,
        type: 'BONUS',
        description: 'a'.repeat(501),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('chatPromptsSchema', () => {
    it('should accept valid chat prompts', () => {
      const result = chatPromptsSchema.safeParse({
        systemPrompt: 'You are a creative design assistant that helps with task creation.',
      })
      expect(result.success).toBe(true)
    })

    it('should reject systemPrompt shorter than 10 chars', () => {
      const result = chatPromptsSchema.safeParse({ systemPrompt: 'Short' })
      expect(result.success).toBe(false)
    })

    it('should reject systemPrompt over 10000 chars', () => {
      const result = chatPromptsSchema.safeParse({ systemPrompt: 'a'.repeat(10001) })
      expect(result.success).toBe(false)
    })

    it('should accept all optional tree fields', () => {
      const result = chatPromptsSchema.safeParse({
        systemPrompt: 'You are a creative design assistant.',
        staticAdsTree: 'Static ads decision tree',
        dynamicAdsTree: 'Dynamic ads decision tree',
        socialMediaTree: 'Social media decision tree',
        uiuxTree: 'UI/UX decision tree',
        creditGuidelines: 'Credit guidelines',
      })
      expect(result.success).toBe(true)
    })

    it('should reject optional fields over 10000 chars', () => {
      const result = chatPromptsSchema.safeParse({
        systemPrompt: 'Valid system prompt here.',
        staticAdsTree: 'a'.repeat(10001),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('adminSettingsSchema', () => {
    it('should accept valid settings', () => {
      const result = adminSettingsSchema.safeParse({
        key: 'maintenance_mode',
        value: true,
      })
      expect(result.success).toBe(true)
    })

    it('should accept any value type', () => {
      expect(adminSettingsSchema.safeParse({ key: 'k', value: 'string' }).success).toBe(true)
      expect(adminSettingsSchema.safeParse({ key: 'k', value: 42 }).success).toBe(true)
      expect(adminSettingsSchema.safeParse({ key: 'k', value: null }).success).toBe(true)
      expect(adminSettingsSchema.safeParse({ key: 'k', value: { nested: true } }).success).toBe(
        true
      )
    })

    it('should reject empty key', () => {
      const result = adminSettingsSchema.safeParse({ key: '', value: true })
      expect(result.success).toBe(false)
    })

    it('should reject key over 200 chars', () => {
      const result = adminSettingsSchema.safeParse({ key: 'a'.repeat(201), value: true })
      expect(result.success).toBe(false)
    })

    it('should accept optional description', () => {
      const result = adminSettingsSchema.safeParse({
        key: 'setting',
        value: 'val',
        description: 'A setting',
      })
      expect(result.success).toBe(true)
    })

    it('should reject description over 500 chars', () => {
      const result = adminSettingsSchema.safeParse({
        key: 'setting',
        value: 'val',
        description: 'a'.repeat(501),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateNotificationSettingSchema', () => {
    it('should accept valid notification setting', () => {
      const result = updateNotificationSettingSchema.safeParse({
        id: 'notif_1',
        emailEnabled: true,
        whatsappEnabled: false,
      })
      expect(result.success).toBe(true)
    })

    it('should reject empty id', () => {
      const result = updateNotificationSettingSchema.safeParse({ id: '' })
      expect(result.success).toBe(false)
    })

    it('should accept all boolean toggle fields', () => {
      const result = updateNotificationSettingSchema.safeParse({
        id: 'notif_1',
        emailEnabled: true,
        whatsappEnabled: true,
        inAppEnabled: true,
        notifyClient: true,
        notifyFreelancer: true,
        notifyAdmin: true,
      })
      expect(result.success).toBe(true)
    })

    it('should accept template fields', () => {
      const result = updateNotificationSettingSchema.safeParse({
        id: 'notif_1',
        emailSubject: 'Task Update',
        emailTemplate: '<h1>Hello</h1>',
        whatsappTemplate: 'Your task has been updated',
      })
      expect(result.success).toBe(true)
    })

    it('should reject emailSubject over 500 chars', () => {
      const result = updateNotificationSettingSchema.safeParse({
        id: 'notif_1',
        emailSubject: 'a'.repeat(501),
      })
      expect(result.success).toBe(false)
    })

    it('should reject emailTemplate over 10000 chars', () => {
      const result = updateNotificationSettingSchema.safeParse({
        id: 'notif_1',
        emailTemplate: 'a'.repeat(10001),
      })
      expect(result.success).toBe(false)
    })

    it('should reject whatsappTemplate over 2000 chars', () => {
      const result = updateNotificationSettingSchema.safeParse({
        id: 'notif_1',
        whatsappTemplate: 'a'.repeat(2001),
      })
      expect(result.success).toBe(false)
    })
  })
})
