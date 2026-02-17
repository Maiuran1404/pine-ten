import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()

vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  platformSettings: {
    id: 'id',
    key: 'key',
    value: 'value',
    description: 'description',
    updatedAt: 'updatedAt',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: 'eq', args })),
}))

vi.mock('./config', () => ({
  config: {
    credits: { pricePerCredit: 4.9, currency: 'USD', lowBalanceThreshold: 20 },
    payouts: {
      artistPercentage: 70,
      minimumPayoutCredits: 10,
      holdingPeriodDays: 7,
      creditValueUSD: 3.43,
    },
  },
}))

const {
  getCreditSettings,
  getPayoutSettings,
  getAllPlatformSettings,
  updateSetting,
  calculateArtistPayout,
  calculatePlatformRevenue,
} = await import('./platform-settings')

function mockSelectResult(value: unknown) {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(value !== null ? [{ value }] : []),
      }),
    }),
  })
}

describe('getCreditSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns credit settings from DB', async () => {
    const dbCredits = { pricePerCredit: 9.9, currency: 'EUR', lowBalanceThreshold: 10 }
    mockSelectResult(dbCredits)

    const result = await getCreditSettings()
    expect(result).toEqual(dbCredits)
  })

  it('returns defaults when DB has no value', async () => {
    mockSelectResult(null)

    const result = await getCreditSettings()
    expect(result.pricePerCredit).toBe(4.9)
    expect(result.currency).toBe('USD')
  })

  it('returns defaults on DB error', async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockRejectedValue(new Error('DB error')),
        }),
      }),
    })

    const result = await getCreditSettings()
    expect(result.pricePerCredit).toBe(4.9)
  })
})

describe('getPayoutSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns payout settings from DB', async () => {
    const dbPayouts = {
      artistPercentage: 80,
      minimumPayoutCredits: 20,
      holdingPeriodDays: 14,
      creditValueUSD: 4.0,
    }
    mockSelectResult(dbPayouts)

    const result = await getPayoutSettings()
    expect(result).toEqual(dbPayouts)
  })
})

describe('getAllPlatformSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns both credits and payouts', async () => {
    // getCreditSettings call
    mockSelectResult(null)
    // getPayoutSettings call
    mockSelectResult(null)

    const result = await getAllPlatformSettings()
    expect(result.credits).toBeDefined()
    expect(result.payouts).toBeDefined()
    expect(result.credits.pricePerCredit).toBe(4.9)
    expect(result.payouts.artistPercentage).toBe(70)
  })
})

describe('updateSetting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates existing setting in DB', async () => {
    // Check for existing
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: '1', key: 'credits', value: {} }]),
        }),
      }),
    })

    mockUpdate.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    await updateSetting('credits', { pricePerCredit: 9.9 })
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('inserts new setting when not existing', async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    })

    mockInsert.mockReturnValueOnce({
      values: vi.fn().mockResolvedValue(undefined),
    })

    await updateSetting('newKey', { foo: 'bar' }, 'A description')
    expect(mockInsert).toHaveBeenCalled()
  })
})

describe('calculateArtistPayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calculates payout based on credits and value per credit', async () => {
    mockSelectResult(null) // Uses defaults

    const result = await calculateArtistPayout(10)
    expect(result).toBe(10 * 3.43)
  })
})

describe('calculatePlatformRevenue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calculates platform revenue as total minus artist payout', async () => {
    // getCreditSettings
    mockSelectResult(null)
    // getPayoutSettings
    mockSelectResult(null)

    const result = await calculatePlatformRevenue(10)
    // totalRevenue = 10 * 4.9 = 49
    // artistPayout = 10 * 3.43 = 34.3
    // platformRevenue = 49 - 34.3 = 14.7
    expect(result).toBeCloseTo(14.7, 1)
  })
})
