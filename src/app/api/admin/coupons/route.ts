import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { stripe } from '@/lib/stripe'
import { auditHelpers, actorFromUser } from '@/lib/audit'
import { z } from 'zod'
import { logger } from '@/lib/logger'

// Validation schemas for coupon operations
const createCouponSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(200),
    percentOff: z.number().min(1).max(100).optional(),
    amountOff: z.number().min(1).optional(),
    currency: z.string().length(3).default('aud').optional(),
    duration: z.enum(['forever', 'once', 'repeating']).default('forever'),
    durationInMonths: z.number().min(1).max(36).optional(),
    maxRedemptions: z.number().min(1).optional(),
    code: z
      .string()
      .min(3)
      .max(25)
      .regex(/^[A-Z0-9_-]+$/i, 'Code must be alphanumeric')
      .optional(),
  })
  .refine((data) => data.percentOff || data.amountOff, {
    message: 'Either percentOff or amountOff is required',
  })

const updateCouponSchema = z.object({
  couponId: z.string().min(1, 'Coupon ID is required'),
  name: z.string().min(1).max(200).optional(),
  promotionCodeId: z.string().optional(),
  active: z.boolean().optional(),
})

// GET - List all coupons with their promotion codes
export async function GET() {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      // Fetch coupons from Stripe
      const coupons = await stripe.coupons.list({ limit: 100 })

      // Fetch all promotion codes once and build a lookup map
      const allPromotionCodes = await stripe.promotionCodes.list({ limit: 100 })
      const promoCodesByCoupon = new Map<string, typeof allPromotionCodes.data>()
      for (const code of allPromotionCodes.data) {
        const promotion = code.promotion as { coupon?: string }
        const couponId = promotion?.coupon
        if (couponId) {
          const existing = promoCodesByCoupon.get(couponId) || []
          existing.push(code)
          promoCodesByCoupon.set(couponId, existing)
        }
      }

      const couponsWithCodes = coupons.data.map((coupon) => {
        const codesForCoupon = promoCodesByCoupon.get(coupon.id) || []

        return {
          id: coupon.id,
          name: coupon.name,
          percentOff: coupon.percent_off,
          amountOff: coupon.amount_off,
          currency: coupon.currency,
          duration: coupon.duration,
          durationInMonths: coupon.duration_in_months,
          maxRedemptions: coupon.max_redemptions,
          timesRedeemed: coupon.times_redeemed,
          valid: coupon.valid,
          createdAt: new Date(coupon.created * 1000).toISOString(),
          promotionCodes: codesForCoupon.map((code) => ({
            id: code.id,
            code: code.code,
            active: code.active,
            timesRedeemed: code.times_redeemed,
            maxRedemptions: code.max_redemptions,
            expiresAt: code.expires_at ? new Date(code.expires_at * 1000).toISOString() : null,
          })),
        }
      })

      return successResponse({ coupons: couponsWithCodes })
    },
    { endpoint: 'GET /api/admin/coupons' }
  )
}

// POST - Create a new coupon with promotion code
export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      const session = await requireAdmin()

      const body = await request.json()

      // Validate input with Zod schema
      const parseResult = createCouponSchema.safeParse(body)
      if (!parseResult.success) {
        const firstError = parseResult.error.issues[0]
        throw Errors.badRequest(firstError?.message || 'Invalid input')
      }

      const {
        name,
        percentOff,
        amountOff,
        currency,
        duration,
        durationInMonths,
        maxRedemptions,
        code,
      } = parseResult.data

      // Create coupon
      const couponData: {
        name: string
        duration: 'forever' | 'once' | 'repeating'
        percent_off?: number
        amount_off?: number
        currency?: string
        duration_in_months?: number
        max_redemptions?: number
      } = {
        name,
        duration: duration || 'forever',
      }

      if (percentOff) {
        couponData.percent_off = percentOff
      } else if (amountOff) {
        couponData.amount_off = amountOff * 100 // Convert to cents
        couponData.currency = currency || 'aud'
      }

      if (duration === 'repeating' && durationInMonths) {
        couponData.duration_in_months = durationInMonths
      }

      if (maxRedemptions) {
        couponData.max_redemptions = maxRedemptions
      }

      const coupon = await stripe.coupons.create(couponData)

      // Create promotion code if provided
      let promotionCode = null
      if (code) {
        // Use fetch for new API format
        const response = await fetch('https://api.stripe.com/v1/promotion_codes', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'promotion[type]': 'coupon',
            'promotion[coupon]': coupon.id,
            code: code.toUpperCase(),
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          logger.error({ error }, 'Failed to create promotion code')
        } else {
          promotionCode = await response.json()
        }
      }

      // Audit log: Track coupon creation for billing compliance
      auditHelpers.couponCreate(
        actorFromUser(session.user),
        coupon.id,
        coupon.name || name,
        'POST /api/admin/coupons'
      )

      return successResponse({
        coupon: {
          id: coupon.id,
          name: coupon.name,
          percentOff: coupon.percent_off,
          amountOff: coupon.amount_off,
        },
        promotionCode: promotionCode
          ? {
              id: promotionCode.id,
              code: promotionCode.code,
            }
          : null,
      })
    },
    { endpoint: 'POST /api/admin/coupons' }
  )
}

// DELETE - Delete a coupon
export async function DELETE(request: NextRequest) {
  return withErrorHandling(
    async () => {
      const session = await requireAdmin()

      const { searchParams } = new URL(request.url)
      const couponId = searchParams.get('id')

      if (!couponId) {
        throw Errors.badRequest('Coupon ID is required')
      }

      await stripe.coupons.del(couponId)

      // Audit log: Track coupon deletion for billing compliance
      auditHelpers.couponDelete(actorFromUser(session.user), couponId, 'DELETE /api/admin/coupons')

      return successResponse({ success: true })
    },
    { endpoint: 'DELETE /api/admin/coupons' }
  )
}

// PATCH - Update a coupon (limited - can only update name and metadata)
export async function PATCH(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const body = await request.json()

      // Validate input with Zod schema
      const parseResult = updateCouponSchema.safeParse(body)
      if (!parseResult.success) {
        const firstError = parseResult.error.issues[0]
        throw Errors.badRequest(firstError?.message || 'Invalid input')
      }

      const { couponId, name, promotionCodeId, active } = parseResult.data

      // Update coupon name if provided
      if (couponId && name) {
        await stripe.coupons.update(couponId, { name })
      }

      // Update promotion code active status if provided
      if (promotionCodeId && typeof active === 'boolean') {
        await stripe.promotionCodes.update(promotionCodeId, { active })
      }

      return successResponse({ success: true })
    },
    { endpoint: 'PATCH /api/admin/coupons' }
  )
}
