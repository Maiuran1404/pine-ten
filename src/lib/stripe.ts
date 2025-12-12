import Stripe from "stripe";
import { config } from "@/lib/config";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});

// Credit packages for purchase
export const creditPackages = [
  {
    id: "credits_5",
    name: "5 Credits",
    credits: 5,
    price: 5 * config.credits.pricePerCredit * 100, // in cents
    description: "Perfect for trying out the service",
  },
  {
    id: "credits_10",
    name: "10 Credits",
    credits: 10,
    price: 10 * config.credits.pricePerCredit * 100,
    description: "Great for small projects",
    popular: true,
  },
  {
    id: "credits_25",
    name: "25 Credits",
    credits: 25,
    price: 25 * config.credits.pricePerCredit * 100 * 0.95, // 5% discount
    description: "Save 5% - Best for regular use",
  },
  {
    id: "credits_50",
    name: "50 Credits",
    credits: 50,
    price: 50 * config.credits.pricePerCredit * 100 * 0.9, // 10% discount
    description: "Save 10% - Best value for teams",
  },
] as const;

export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  packageId: string
) {
  const creditPackage = creditPackages.find((p) => p.id === packageId);

  if (!creditPackage) {
    throw new Error("Invalid package selected");
  }

  const session = await stripe.checkout.sessions.create({
    customer_email: userEmail,
    line_items: [
      {
        price_data: {
          currency: config.credits.currency.toLowerCase(),
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
    success_url: `${config.app.url}/dashboard?payment=success&credits=${creditPackage.credits}`,
    cancel_url: `${config.app.url}/dashboard?payment=cancelled`,
    metadata: {
      userId,
      credits: creditPackage.credits.toString(),
      packageId,
    },
  });

  return session;
}

export async function handleWebhook(
  body: string,
  signature: string
): Promise<{ userId: string; credits: number } | null> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    throw new Error("Invalid signature");
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status === "paid" && session.metadata) {
      return {
        userId: session.metadata.userId,
        credits: parseInt(session.metadata.credits),
      };
    }
  }

  return null;
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: config.credits.currency,
  }).format(cents / 100);
}
