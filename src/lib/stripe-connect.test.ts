import { describe, it, expect } from 'vitest'
import { vi } from 'vitest'

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(),
}))

vi.mock('@/lib/config', () => ({
  config: {
    app: { url: 'http://localhost:3000', baseDomain: 'getcrafted.ai' },
    credits: { pricePerCredit: 4.9 },
    payouts: { artistPercentage: 70 },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}))

vi.mock('@/db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'payout-1' }]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}))

vi.mock('@/db/schema', () => ({
  stripeConnectAccounts: {
    freelancerId: 'freelancer_id',
    stripeAccountId: 'stripe_account_id',
  },
  payouts: { id: 'id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}))

const { calculatePayoutAmounts } = await import('./stripe-connect')

describe('calculatePayoutAmounts', () => {
  it('should calculate payout amounts with 70/30 split', () => {
    const result = calculatePayoutAmounts(10)

    // 10 credits * $4.90 = $49.00 gross
    expect(result.grossAmountUsd).toBe(49)
    // 70% to artist = $34.30
    expect(result.netAmountUsd).toBe(34.3)
    // 30% platform fee = $14.70
    expect(result.platformFeeUsd).toBe(14.7)
    expect(result.artistPercentage).toBe(70)
  })

  it('should handle zero credits', () => {
    const result = calculatePayoutAmounts(0)

    expect(result.grossAmountUsd).toBe(0)
    expect(result.netAmountUsd).toBe(0)
    expect(result.platformFeeUsd).toBe(0)
  })

  it('should round to 2 decimal places', () => {
    const result = calculatePayoutAmounts(3)

    // 3 * 4.9 = 14.7 gross
    // 14.7 * 0.70 = 10.29 net
    // 14.7 - 10.29 = 4.41 platform fee
    expect(result.grossAmountUsd).toBe(14.7)
    expect(result.netAmountUsd).toBe(10.29)
    expect(result.platformFeeUsd).toBe(4.41)
  })

  it('should ensure gross = net + platformFee', () => {
    const result = calculatePayoutAmounts(7)

    expect(result.grossAmountUsd).toBeCloseTo(result.netAmountUsd + result.platformFeeUsd, 1)
  })

  it('should handle single credit', () => {
    const result = calculatePayoutAmounts(1)

    expect(result.grossAmountUsd).toBe(4.9)
    expect(result.netAmountUsd).toBe(3.43)
    expect(result.platformFeeUsd).toBe(1.47)
  })
})
