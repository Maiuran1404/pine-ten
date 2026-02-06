import Stripe from "stripe";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";
import { db } from "@/db";
import { webhookEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCreditSettings } from "@/lib/platform-settings";

// Lazy initialization to avoid errors during build when env vars aren't available
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    if (!secretKey.startsWith("sk_")) {
      throw new Error("Invalid STRIPE_SECRET_KEY format");
    }
    stripeInstance = new Stripe(secretKey, {
      apiVersion: "2025-11-17.clover",
    });
  }
  return stripeInstance;
}

// For backwards compatibility - use getter to lazily initialize
export const stripe = {
  get coupons() { return getStripe().coupons; },
  get promotionCodes() { return getStripe().promotionCodes; },
  get checkout() { return getStripe().checkout; },
  get webhooks() { return getStripe().webhooks; },
} as unknown as Stripe;

/**
 * Validate that webhook secret is properly configured
 */
export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }
  if (!secret.startsWith("whsec_")) {
    throw new Error("Invalid STRIPE_WEBHOOK_SECRET format");
  }
  return secret;
}

// Credit package definitions (prices calculated dynamically from platform settings)
export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number; // in cents
  description: string;
  popular?: boolean;
  discount?: number; // percentage discount
}

// Base package definitions (without prices)
const creditPackageDefinitions = [
  {
    id: "credits_50",
    name: "50 Credits",
    credits: 50,
    description: "Perfect for trying out the service",
    discount: 0,
  },
  {
    id: "credits_100",
    name: "100 Credits",
    credits: 100,
    description: "Great for small projects",
    popular: true,
    discount: 0,
  },
  {
    id: "credits_250",
    name: "250 Credits",
    credits: 250,
    description: "Save 5% - Best for regular use",
    discount: 5, // 5% off
  },
  {
    id: "credits_500",
    name: "500 Credits",
    credits: 500,
    description: "Save 10% - Best value for teams",
    discount: 10, // 10% off
  },
] as const;

/**
 * Get credit packages with current pricing from platform settings
 * This fetches prices from database for admin-configurable pricing
 */
export async function getCreditPackages(): Promise<CreditPackage[]> {
  const settings = await getCreditSettings();
  const pricePerCredit = settings.pricePerCredit;

  return creditPackageDefinitions.map((pkg) => {
    const basePrice = pkg.credits * pricePerCredit * 100; // in cents
    const discountMultiplier = (100 - pkg.discount) / 100;
    return {
      id: pkg.id,
      name: pkg.name,
      credits: pkg.credits,
      price: Math.round(basePrice * discountMultiplier),
      description: pkg.description,
      popular: "popular" in pkg ? pkg.popular : undefined,
      discount: pkg.discount > 0 ? pkg.discount : undefined,
    };
  });
}

// Static export for backwards compatibility (uses default config values)
// Prefer getCreditPackages() for dynamic pricing
export const creditPackages = creditPackageDefinitions.map((pkg) => {
  const basePrice = pkg.credits * config.credits.pricePerCredit * 100;
  const discountMultiplier = (100 - pkg.discount) / 100;
  return {
    id: pkg.id,
    name: pkg.name,
    credits: pkg.credits,
    price: Math.round(basePrice * discountMultiplier),
    description: pkg.description,
    popular: "popular" in pkg ? pkg.popular : undefined,
  };
});

export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  packageId: string,
  returnUrl?: string
) {
  // Fetch packages with current pricing from database
  const packages = await getCreditPackages();
  const creditPackage = packages.find((p) => p.id === packageId);

  if (!creditPackage) {
    throw new Error("Invalid package selected");
  }

  // Get currency from platform settings
  const settings = await getCreditSettings();

  // Build success and cancel URLs
  // If returnUrl is provided, redirect back there with payment params
  // Otherwise default to dashboard
  const baseReturnUrl = returnUrl || "/dashboard";
  const successUrl = new URL(baseReturnUrl, config.app.url);
  successUrl.searchParams.set("payment", "success");
  successUrl.searchParams.set("credits", creditPackage.credits.toString());

  const cancelUrl = new URL(baseReturnUrl, config.app.url);
  cancelUrl.searchParams.set("payment", "cancelled");

  const session = await stripe.checkout.sessions.create({
    customer_email: userEmail,
    line_items: [
      {
        price_data: {
          currency: settings.currency.toLowerCase(),
          product_data: {
            name: creditPackage.name,
            description: creditPackage.description,
          },
          unit_amount: Math.round(creditPackage.price),
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    allow_promotion_codes: true,
    success_url: successUrl.toString(),
    cancel_url: cancelUrl.toString(),
    metadata: {
      userId,
      credits: creditPackage.credits.toString(),
      packageId,
    },
  });

  return session;
}

/**
 * Check if a webhook event has already been processed
 */
export async function isEventProcessed(eventId: string): Promise<boolean> {
  const existing = await db
    .select({ id: webhookEvents.id })
    .from(webhookEvents)
    .where(eq(webhookEvents.eventId, eventId))
    .limit(1);

  return existing.length > 0;
}

/**
 * Mark a webhook event as processed
 */
export async function markEventProcessed(
  eventId: string,
  eventType: string,
  payload?: unknown,
  status: "processed" | "failed" = "processed",
  errorMessage?: string
): Promise<void> {
  await db.insert(webhookEvents).values({
    eventId,
    eventType,
    provider: "stripe",
    payload: payload as Record<string, unknown>,
    status,
    errorMessage,
  });
}

export async function handleWebhook(
  body: string,
  signature: string
): Promise<{ userId: string; credits: number; eventId: string } | null> {
  // Use safe getter that validates the secret
  const webhookSecret = getWebhookSecret();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    logger.error({ err }, "Webhook signature verification failed");
    throw new Error("Invalid signature");
  }

  logger.info({ eventType: event.type, eventId: event.id }, "Processing Stripe webhook");

  // Check idempotency - skip if already processed
  const alreadyProcessed = await isEventProcessed(event.id);
  if (alreadyProcessed) {
    logger.info({ eventId: event.id }, "Webhook event already processed, skipping");
    return null;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status === "paid" && session.metadata) {
      const userId = session.metadata.userId;
      const credits = parseInt(session.metadata.credits);

      if (!userId || isNaN(credits)) {
        logger.error({ session: session.id }, "Invalid webhook metadata");
        // Mark as failed for debugging
        await markEventProcessed(event.id, event.type, { sessionId: session.id }, "failed", "Invalid metadata");
        return null;
      }

      logger.info({ userId, credits, sessionId: session.id }, "Credit purchase completed");

      return { userId, credits, eventId: event.id };
    }
  }

  // Mark non-handled event types as processed to avoid re-processing
  await markEventProcessed(event.id, event.type, { type: event.type }, "processed");
  return null;
}

export function formatPrice(cents: number, currency: string = config.credits.currency): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(cents / 100);
}

/**
 * Format price using platform settings currency
 */
export async function formatPriceFromSettings(cents: number): Promise<string> {
  const settings = await getCreditSettings();
  return formatPrice(cents, settings.currency);
}
