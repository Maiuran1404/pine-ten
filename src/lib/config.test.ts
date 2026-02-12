import { describe, it, expect } from 'vitest'
import {
  config,
  defaultTaskCategories,
  complexityMultipliers,
  styleReferenceCategories,
} from './config'

describe('config', () => {
  describe('credits', () => {
    it('should have pricePerCredit as a positive number', () => {
      expect(config.credits.pricePerCredit).toBe(4.9)
    })

    it('should have currency set to USD', () => {
      expect(config.credits.currency).toBe('USD')
    })

    it('should have a low balance threshold', () => {
      expect(config.credits.lowBalanceThreshold).toBe(20)
      expect(config.credits.lowBalanceThreshold).toBeGreaterThan(0)
    })
  })

  describe('payouts', () => {
    it('should have artist percentage between 0 and 100', () => {
      expect(config.payouts.artistPercentage).toBe(70)
      expect(config.payouts.artistPercentage).toBeGreaterThan(0)
      expect(config.payouts.artistPercentage).toBeLessThanOrEqual(100)
    })

    it('should have a minimum payout credits threshold', () => {
      expect(config.payouts.minimumPayoutCredits).toBe(10)
      expect(config.payouts.minimumPayoutCredits).toBeGreaterThan(0)
    })

    it('should have creditValueUSD consistent with price and artist percentage', () => {
      const expected = config.credits.pricePerCredit * (config.payouts.artistPercentage / 100)
      expect(config.payouts.creditValueUSD).toBeCloseTo(expected, 1)
    })
  })

  describe('rateLimits', () => {
    it('should have api rate limit with window and max', () => {
      expect(config.rateLimits.api).toEqual({ window: 60, max: 100 })
    })

    it('should have auth rate limit with window and max', () => {
      expect(config.rateLimits.auth).toEqual({ window: 60, max: 20 })
    })

    it('should have chat rate limit with window and max', () => {
      expect(config.rateLimits.chat).toEqual({ window: 60, max: 30 })
    })

    it('should have auth limit lower than api limit', () => {
      expect(config.rateLimits.auth.max).toBeLessThan(config.rateLimits.api.max)
    })
  })

  describe('tasks', () => {
    it('should have default max revisions', () => {
      expect(config.tasks.defaultMaxRevisions).toBe(2)
    })

    it('should have all priority levels defined', () => {
      expect(config.tasks.priorityLevels.LOW).toBe(0)
      expect(config.tasks.priorityLevels.NORMAL).toBe(1)
      expect(config.tasks.priorityLevels.HIGH).toBe(2)
      expect(config.tasks.priorityLevels.URGENT).toBe(3)
    })
  })

  describe('uploads', () => {
    it('should have max file size limit', () => {
      expect(config.uploads.maxFileSizeMB).toBe(50)
    })

    it('should have max files per request limit', () => {
      expect(config.uploads.maxFilesPerRequest).toBe(10)
    })
  })
})

describe('defaultTaskCategories', () => {
  it('should have exactly 4 categories', () => {
    expect(defaultTaskCategories).toHaveLength(4)
  })

  it('should have valid slug format for all categories', () => {
    const slugRegex = /^[a-z0-9-]+$/
    for (const category of defaultTaskCategories) {
      expect(category.slug).toMatch(slugRegex)
    }
  })

  it('should have positive base credits for all categories', () => {
    for (const category of defaultTaskCategories) {
      expect(category.baseCredits).toBeGreaterThan(0)
    }
  })

  it('should have non-empty names and descriptions', () => {
    for (const category of defaultTaskCategories) {
      expect(category.name.length).toBeGreaterThan(0)
      expect(category.description.length).toBeGreaterThan(0)
    }
  })

  it('should contain expected categories', () => {
    const slugs = defaultTaskCategories.map((c) => c.slug)
    expect(slugs).toContain('static-ads')
    expect(slugs).toContain('video-motion')
    expect(slugs).toContain('social-media')
    expect(slugs).toContain('ui-ux')
  })
})

describe('complexityMultipliers', () => {
  it('should have correct multiplier values', () => {
    expect(complexityMultipliers.SIMPLE).toBe(1)
    expect(complexityMultipliers.MODERATE).toBe(1.5)
    expect(complexityMultipliers.COMPLEX).toBe(2)
    expect(complexityMultipliers.PREMIUM).toBe(3)
  })

  it('should have multipliers in ascending order', () => {
    expect(complexityMultipliers.SIMPLE).toBeLessThan(complexityMultipliers.MODERATE)
    expect(complexityMultipliers.MODERATE).toBeLessThan(complexityMultipliers.COMPLEX)
    expect(complexityMultipliers.COMPLEX).toBeLessThan(complexityMultipliers.PREMIUM)
  })
})

describe('styleReferenceCategories', () => {
  it('should have 8 style categories', () => {
    expect(styleReferenceCategories).toHaveLength(8)
  })

  it('should have unique category names', () => {
    const unique = new Set(styleReferenceCategories)
    expect(unique.size).toBe(styleReferenceCategories.length)
  })

  it('should have non-empty category names', () => {
    for (const category of styleReferenceCategories) {
      expect(category.length).toBeGreaterThan(0)
    }
  })
})
