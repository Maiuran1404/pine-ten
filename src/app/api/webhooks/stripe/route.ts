import { NextRequest, NextResponse } from "next/server";
import { handleWebhook } from "@/lib/stripe";
import { db } from "@/db";
import { users, creditTransactions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    const result = await handleWebhook(body, signature);

    if (result) {
      // Update user credits
      const user = await db
        .select({ credits: users.credits })
        .from(users)
        .where(eq(users.id, result.userId))
        .limit(1);

      if (user.length) {
        const newCredits = user[0].credits + result.credits;

        await db
          .update(users)
          .set({
            credits: newCredits,
            updatedAt: new Date(),
          })
          .where(eq(users.id, result.userId));

        // Log the transaction
        await db.insert(creditTransactions).values({
          userId: result.userId,
          amount: result.credits,
          type: "PURCHASE",
          description: `Purchased ${result.credits} credits`,
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
