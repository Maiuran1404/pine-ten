import { describe, it, expect } from 'vitest'
import {
  updateBrandSchema,
  extractBrandSchema,
  extractBrandRequestSchema,
  createBrandReferenceSchema,
  createDeliverableStyleSchema,
} from './index'

describe('Brand Schemas', () => {
  describe('updateBrandSchema', () => {
    it('should accept empty object (no update)', () => {
      const result = updateBrandSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept valid name', () => {
      const result = updateBrandSchema.safeParse({ name: 'Acme Corp' })
      expect(result.success).toBe(true)
    })

    it('should reject name shorter than 2 chars', () => {
      const result = updateBrandSchema.safeParse({ name: 'A' })
      expect(result.success).toBe(false)
    })

    it('should reject name longer than 100 chars', () => {
      const result = updateBrandSchema.safeParse({ name: 'a'.repeat(101) })
      expect(result.success).toBe(false)
    })

    it('should accept valid hex colors', () => {
      const validColors = ['#FF0000', '#00ff00', '#0000FF', '#AbCdEf', '#123456']
      for (const color of validColors) {
        const result = updateBrandSchema.safeParse({ primaryColor: color })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid hex colors', () => {
      const invalidColors = [
        'FF0000', // missing #
        '#FFF', // too short (3 digits)
        '#FFFFFFF', // too long (7 digits)
        '#GGGGGG', // invalid hex chars
        'red', // named color
        '#12345G', // invalid char
        '', // empty
      ]
      for (const color of invalidColors) {
        const result = updateBrandSchema.safeParse({ primaryColor: color })
        expect(result.success).toBe(false)
      }
    })

    it('should validate all color fields with hex regex', () => {
      const colorFields = [
        'primaryColor',
        'secondaryColor',
        'accentColor',
        'backgroundColor',
        'textColor',
      ]
      for (const field of colorFields) {
        const valid = updateBrandSchema.safeParse({ [field]: '#AABBCC' })
        expect(valid.success).toBe(true)

        const invalid = updateBrandSchema.safeParse({ [field]: 'invalid' })
        expect(invalid.success).toBe(false)
      }
    })

    it('should accept null for nullable color fields', () => {
      const result = updateBrandSchema.safeParse({
        primaryColor: null,
        secondaryColor: null,
        accentColor: null,
      })
      expect(result.success).toBe(true)
    })

    it('should accept valid website URL', () => {
      const result = updateBrandSchema.safeParse({ website: 'https://example.com' })
      expect(result.success).toBe(true)
    })

    it('should accept empty string for website', () => {
      const result = updateBrandSchema.safeParse({ website: '' })
      expect(result.success).toBe(true)
    })

    it('should accept null for website', () => {
      const result = updateBrandSchema.safeParse({ website: null })
      expect(result.success).toBe(true)
    })

    it('should reject invalid website URL', () => {
      const result = updateBrandSchema.safeParse({ website: 'not-a-url' })
      expect(result.success).toBe(false)
    })

    it('should accept valid email for contactEmail', () => {
      const result = updateBrandSchema.safeParse({ contactEmail: 'contact@example.com' })
      expect(result.success).toBe(true)
    })

    it('should reject invalid contactEmail', () => {
      const result = updateBrandSchema.safeParse({ contactEmail: 'not-an-email' })
      expect(result.success).toBe(false)
    })

    it('should accept null for contactEmail', () => {
      const result = updateBrandSchema.safeParse({ contactEmail: null })
      expect(result.success).toBe(true)
    })

    it('should accept valid socialLinks', () => {
      const result = updateBrandSchema.safeParse({
        socialLinks: {
          twitter: 'https://twitter.com/brand',
          linkedin: 'https://linkedin.com/company/brand',
          facebook: '',
          instagram: '',
          youtube: '',
        },
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid socialLinks URLs', () => {
      const result = updateBrandSchema.safeParse({
        socialLinks: {
          twitter: 'not-a-url',
        },
      })
      expect(result.success).toBe(false)
    })

    it('should accept valid logoUrl', () => {
      const result = updateBrandSchema.safeParse({ logoUrl: 'https://example.com/logo.png' })
      expect(result.success).toBe(true)
    })

    it('should accept null for logoUrl', () => {
      const result = updateBrandSchema.safeParse({ logoUrl: null })
      expect(result.success).toBe(true)
    })

    it('should accept arrays for brandColors and keywords', () => {
      const result = updateBrandSchema.safeParse({
        brandColors: ['#FF0000', '#00FF00'],
        keywords: ['modern', 'clean'],
      })
      expect(result.success).toBe(true)
    })

    it('should accept valid font names', () => {
      const result = updateBrandSchema.safeParse({
        primaryFont: 'Inter',
        secondaryFont: 'Roboto Mono',
      })
      expect(result.success).toBe(true)
    })

    it('should reject font name over 100 chars', () => {
      const result = updateBrandSchema.safeParse({ primaryFont: 'a'.repeat(101) })
      expect(result.success).toBe(false)
    })

    it('should accept tagline under 200 chars', () => {
      const result = updateBrandSchema.safeParse({ tagline: 'Build Better' })
      expect(result.success).toBe(true)
    })

    it('should reject tagline over 200 chars', () => {
      const result = updateBrandSchema.safeParse({ tagline: 'a'.repeat(201) })
      expect(result.success).toBe(false)
    })
  })

  describe('extractBrandSchema', () => {
    it('should accept valid URL', () => {
      const result = extractBrandSchema.safeParse({ url: 'https://example.com' })
      expect(result.success).toBe(true)
    })

    it('should reject invalid URL', () => {
      const result = extractBrandSchema.safeParse({ url: 'not-a-url' })
      expect(result.success).toBe(false)
    })

    it('should reject empty URL', () => {
      const result = extractBrandSchema.safeParse({ url: '' })
      expect(result.success).toBe(false)
    })

    it('should reject missing URL', () => {
      const result = extractBrandSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('extractBrandRequestSchema', () => {
    it('should accept valid website URL', () => {
      const result = extractBrandRequestSchema.safeParse({ websiteUrl: 'https://example.com' })
      expect(result.success).toBe(true)
    })

    it('should reject empty websiteUrl', () => {
      const result = extractBrandRequestSchema.safeParse({ websiteUrl: '' })
      expect(result.success).toBe(false)
    })

    it('should reject websiteUrl over 2000 chars', () => {
      const result = extractBrandRequestSchema.safeParse({
        websiteUrl: 'https://' + 'a'.repeat(2000),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('createBrandReferenceSchema', () => {
    const validRef = {
      name: 'Modern Style',
      imageUrl: 'https://example.com/style.png',
      toneBucket: 'professional',
      energyBucket: 'calm',
      colorBucket: 'warm',
    }

    it('should accept valid brand reference', () => {
      const result = createBrandReferenceSchema.safeParse(validRef)
      expect(result.success).toBe(true)
    })

    it('should reject empty name', () => {
      const result = createBrandReferenceSchema.safeParse({ ...validRef, name: '' })
      expect(result.success).toBe(false)
    })

    it('should reject name over 200 chars', () => {
      const result = createBrandReferenceSchema.safeParse({ ...validRef, name: 'a'.repeat(201) })
      expect(result.success).toBe(false)
    })

    it('should reject invalid imageUrl', () => {
      const result = createBrandReferenceSchema.safeParse({ ...validRef, imageUrl: 'not-a-url' })
      expect(result.success).toBe(false)
    })

    it('should default densityBucket to balanced', () => {
      const result = createBrandReferenceSchema.safeParse(validRef)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.densityBucket).toBe('balanced')
      }
    })

    it('should default premiumBucket to balanced', () => {
      const result = createBrandReferenceSchema.safeParse(validRef)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.premiumBucket).toBe('balanced')
      }
    })

    it('should default arrays to empty', () => {
      const result = createBrandReferenceSchema.safeParse(validRef)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.colorSamples).toEqual([])
        expect(result.data.visualStyles).toEqual([])
        expect(result.data.industries).toEqual([])
      }
    })

    it('should default displayOrder to 0', () => {
      const result = createBrandReferenceSchema.safeParse(validRef)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.displayOrder).toBe(0)
      }
    })

    it('should accept nullable description', () => {
      const result = createBrandReferenceSchema.safeParse({ ...validRef, description: null })
      expect(result.success).toBe(true)
    })

    it('should reject description over 1000 chars', () => {
      const result = createBrandReferenceSchema.safeParse({
        ...validRef,
        description: 'a'.repeat(1001),
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty toneBucket', () => {
      const result = createBrandReferenceSchema.safeParse({ ...validRef, toneBucket: '' })
      expect(result.success).toBe(false)
    })

    it('should reject empty energyBucket', () => {
      const result = createBrandReferenceSchema.safeParse({ ...validRef, energyBucket: '' })
      expect(result.success).toBe(false)
    })

    it('should reject empty colorBucket', () => {
      const result = createBrandReferenceSchema.safeParse({ ...validRef, colorBucket: '' })
      expect(result.success).toBe(false)
    })
  })

  describe('createDeliverableStyleSchema', () => {
    const validStyle = {
      name: 'Minimalist Ad',
      imageUrl: 'https://example.com/ad.png',
      deliverableType: 'static-ad',
      styleAxis: 'minimal-to-bold',
    }

    it('should accept valid deliverable style', () => {
      const result = createDeliverableStyleSchema.safeParse(validStyle)
      expect(result.success).toBe(true)
    })

    it('should reject empty name', () => {
      const result = createDeliverableStyleSchema.safeParse({ ...validStyle, name: '' })
      expect(result.success).toBe(false)
    })

    it('should reject name over 200 chars', () => {
      const result = createDeliverableStyleSchema.safeParse({
        ...validStyle,
        name: 'a'.repeat(201),
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid imageUrl', () => {
      const result = createDeliverableStyleSchema.safeParse({ ...validStyle, imageUrl: 'bad' })
      expect(result.success).toBe(false)
    })

    it('should reject empty deliverableType', () => {
      const result = createDeliverableStyleSchema.safeParse({ ...validStyle, deliverableType: '' })
      expect(result.success).toBe(false)
    })

    it('should reject empty styleAxis', () => {
      const result = createDeliverableStyleSchema.safeParse({ ...validStyle, styleAxis: '' })
      expect(result.success).toBe(false)
    })

    it('should accept nullable subStyle', () => {
      const result = createDeliverableStyleSchema.safeParse({ ...validStyle, subStyle: null })
      expect(result.success).toBe(true)
    })

    it('should default semanticTags to empty array', () => {
      const result = createDeliverableStyleSchema.safeParse(validStyle)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.semanticTags).toEqual([])
      }
    })

    it('should default featuredOrder and displayOrder to 0', () => {
      const result = createDeliverableStyleSchema.safeParse(validStyle)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.featuredOrder).toBe(0)
        expect(result.data.displayOrder).toBe(0)
      }
    })

    it('should accept nullable description', () => {
      const result = createDeliverableStyleSchema.safeParse({ ...validStyle, description: null })
      expect(result.success).toBe(true)
    })
  })
})
