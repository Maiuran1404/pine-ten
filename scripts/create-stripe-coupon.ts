import Stripe from 'stripe'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
})

async function createTestCoupon() {
  const COUPON_ID = 'TEST100'

  try {
    // Check if coupon already exists
    let coupon: Stripe.Coupon
    try {
      coupon = await stripe.coupons.retrieve(COUPON_ID)
      console.log('ℹ️  Coupon already exists:', coupon.id)
    } catch {
      // Create a 100% off coupon
      coupon = await stripe.coupons.create({
        percent_off: 100,
        duration: 'forever',
        id: COUPON_ID,
        name: '100% Test Discount',
      })
      console.log('✅ Coupon created:', coupon.id)
    }

    // Check if promotion code exists
    const existingCodes = await stripe.promotionCodes.list({
      code: COUPON_ID,
      limit: 1,
    })

    if (existingCodes.data.length > 0) {
      console.log('ℹ️  Promotion code already exists:', existingCodes.data[0].code)
    } else {
      // Create a promotion code using fetch (new API format as of 2025)
      const response = await fetch('https://api.stripe.com/v1/promotion_codes', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'promotion[type]': 'coupon',
          'promotion[coupon]': coupon.id,
          code: COUPON_ID,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to create promotion code')
      }

      const promotionCode = await response.json()
      console.log('✅ Promotion code created:', promotionCode.code)
    }

    console.log('\n🎉 Use code TEST100 at checkout for 100% off!')
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error('Stripe error:', error.message)
    } else {
      console.error('Error:', error)
    }
  }
}

createTestCoupon()
