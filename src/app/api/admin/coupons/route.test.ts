import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/audit', () => ({
  auditHelpers: {
    couponCreate: vi.fn(),
    couponDelete: vi.fn(),
  },
  actorFromUser: vi.fn().mockReturnValue({ type: 'admin', id: 'admin-1' }),
}))

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

const mockStripeCoupons = {
  list: vi.fn(),
  create: vi.fn(),
  del: vi.fn(),
  update: vi.fn(),
}
const mockStripePromotionCodes = {
  list: vi.fn(),
  update: vi.fn(),
}
vi.mock('@/lib/stripe', () => ({
  stripe: {
    coupons: mockStripeCoupons,
    promotionCodes: mockStripePromotionCodes,
  },
}))

const { GET, POST: _POST, DELETE, PATCH: _PATCH } = await import('./route')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/admin/coupons', () => {
  it('returns 401 when not admin', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('returns coupons with promotion codes', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    mockStripeCoupons.list.mockResolvedValue({
      data: [
        {
          id: 'coupon-1',
          name: 'Test Coupon',
          percent_off: 20,
          amount_off: null,
          currency: null,
          duration: 'forever',
          duration_in_months: null,
          max_redemptions: null,
          times_redeemed: 5,
          valid: true,
          created: Math.floor(Date.now() / 1000),
        },
      ],
    })
    mockStripePromotionCodes.list.mockResolvedValue({
      data: [
        {
          id: 'promo-1',
          code: 'SAVE20',
          active: true,
          times_redeemed: 3,
          max_redemptions: null,
          expires_at: null,
          promotion: { coupon: 'coupon-1' },
        },
      ],
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.coupons).toHaveLength(1)
    expect(data.data.coupons[0].promotionCodes).toHaveLength(1)
    expect(data.data.coupons[0].promotionCodes[0].code).toBe('SAVE20')
  })
})

describe('DELETE /api/admin/coupons', () => {
  function makeRequest(couponId?: string) {
    return {
      url: `http://localhost/api/admin/coupons${couponId ? `?id=${couponId}` : ''}`,
      method: 'DELETE',
    }
  }

  it('returns 400 when coupon ID is missing', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })

    const response = await DELETE(makeRequest() as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Coupon ID')
  })

  it('deletes a coupon successfully', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    mockStripeCoupons.del.mockResolvedValue({ id: 'coupon-1', deleted: true })

    const response = await DELETE(makeRequest('coupon-1') as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
    expect(mockStripeCoupons.del).toHaveBeenCalledWith('coupon-1')
  })
})
