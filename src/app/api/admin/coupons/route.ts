import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { z } from "zod";

// Validation schemas for coupon operations
const createCouponSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  percentOff: z.number().min(1).max(100).optional(),
  amountOff: z.number().min(1).optional(),
  currency: z.string().length(3).default("aud").optional(),
  duration: z.enum(["forever", "once", "repeating"]).default("forever"),
  durationInMonths: z.number().min(1).max(36).optional(),
  maxRedemptions: z.number().min(1).optional(),
  code: z.string().min(3).max(25).regex(/^[A-Z0-9_-]+$/i, "Code must be alphanumeric").optional(),
}).refine(
  (data) => data.percentOff || data.amountOff,
  { message: "Either percentOff or amountOff is required" }
);

const updateCouponSchema = z.object({
  couponId: z.string().min(1, "Coupon ID is required"),
  name: z.string().min(1).max(200).optional(),
  promotionCodeId: z.string().optional(),
  active: z.boolean().optional(),
});

// GET - List all coupons with their promotion codes
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { role?: string };
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch coupons from Stripe
    const coupons = await stripe.coupons.list({ limit: 100 });

    // Fetch promotion codes for each coupon
    const couponsWithCodes = await Promise.all(
      coupons.data.map(async (coupon) => {
        const promotionCodes = await stripe.promotionCodes.list({
          limit: 10,
        });

        // Filter promotion codes for this coupon
        const codesForCoupon = promotionCodes.data.filter(
          (code) => {
            const promotion = code.promotion as { coupon?: string };
            return promotion?.coupon === coupon.id;
          }
        );

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
            expiresAt: code.expires_at
              ? new Date(code.expires_at * 1000).toISOString()
              : null,
          })),
        };
      })
    );

    return NextResponse.json({ coupons: couponsWithCodes });
  } catch (error) {
    console.error("Failed to fetch coupons:", error);
    return NextResponse.json(
      { error: "Failed to fetch coupons" },
      { status: 500 }
    );
  }
}

// POST - Create a new coupon with promotion code
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { role?: string };
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Validate input with Zod schema
    const parseResult = createCouponSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || "Invalid input" },
        { status: 400 }
      );
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
    } = parseResult.data;

    // Create coupon
    const couponData: {
      name: string;
      duration: "forever" | "once" | "repeating";
      percent_off?: number;
      amount_off?: number;
      currency?: string;
      duration_in_months?: number;
      max_redemptions?: number;
    } = {
      name,
      duration: duration || "forever",
    };

    if (percentOff) {
      couponData.percent_off = percentOff;
    } else if (amountOff) {
      couponData.amount_off = amountOff * 100; // Convert to cents
      couponData.currency = currency || "aud";
    }

    if (duration === "repeating" && durationInMonths) {
      couponData.duration_in_months = durationInMonths;
    }

    if (maxRedemptions) {
      couponData.max_redemptions = maxRedemptions;
    }

    const coupon = await stripe.coupons.create(couponData);

    // Create promotion code if provided
    let promotionCode = null;
    if (code) {
      // Use fetch for new API format
      const response = await fetch("https://api.stripe.com/v1/promotion_codes", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          "promotion[type]": "coupon",
          "promotion[coupon]": coupon.id,
          code: code.toUpperCase(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Failed to create promotion code:", error);
      } else {
        promotionCode = await response.json();
      }
    }

    return NextResponse.json({
      success: true,
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
    });
  } catch (error) {
    console.error("Failed to create coupon:", error);
    return NextResponse.json(
      { error: "Failed to create coupon" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a coupon
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { role?: string };
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const couponId = searchParams.get("id");

    if (!couponId) {
      return NextResponse.json(
        { error: "Coupon ID is required" },
        { status: 400 }
      );
    }

    await stripe.coupons.del(couponId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete coupon:", error);
    return NextResponse.json(
      { error: "Failed to delete coupon" },
      { status: 500 }
    );
  }
}

// PATCH - Update a coupon (limited - can only update name and metadata)
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { role?: string };
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Validate input with Zod schema
    const parseResult = updateCouponSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { couponId, name, promotionCodeId, active } = parseResult.data;

    // Update coupon name if provided
    if (couponId && name) {
      await stripe.coupons.update(couponId, { name });
    }

    // Update promotion code active status if provided
    if (promotionCodeId && typeof active === "boolean") {
      await stripe.promotionCodes.update(promotionCodeId, { active });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update coupon:", error);
    return NextResponse.json(
      { error: "Failed to update coupon" },
      { status: 500 }
    );
  }
}
