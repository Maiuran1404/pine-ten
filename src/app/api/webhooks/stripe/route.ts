import { NextRequest, NextResponse } from "next/server";
import { handleWebhook, markEventProcessed } from "@/lib/stripe";
import { db } from "@/db";
import { users, creditTransactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { adminNotifications, sendEmail, emailTemplates } from "@/lib/notifications";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";

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
      try {
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

          // Mark event as successfully processed
          await markEventProcessed(
            result.eventId,
            "checkout.session.completed",
            { userId: result.userId, credits: result.credits },
            "processed"
          );

          logger.info(
            { userId: result.userId, credits: result.credits, eventId: result.eventId },
            "Credits added successfully"
          );

          // Get full user data for notifications
          const fullUser = await db
            .select()
            .from(users)
            .where(eq(users.id, result.userId))
            .limit(1);

          if (fullUser.length) {
            try {
              // Send admin notification
              await adminNotifications.creditPurchase({
                clientName: fullUser[0].name,
                clientEmail: fullUser[0].email,
                credits: result.credits,
                amount: result.credits * config.credits.pricePerCredit,
              });

              // Send confirmation email to user
              const purchaseEmail = emailTemplates.creditsPurchased(
                fullUser[0].name,
                result.credits,
                `${config.app.url}/dashboard`
              );
              await sendEmail({
                to: fullUser[0].email,
                subject: purchaseEmail.subject,
                html: purchaseEmail.html,
              });
            } catch (emailError) {
              logger.error({ err: emailError }, "Failed to send purchase notifications");
            }
          }
        } else {
          // User not found, mark as failed
          await markEventProcessed(
            result.eventId,
            "checkout.session.completed",
            { userId: result.userId, credits: result.credits },
            "failed",
            "User not found"
          );
          logger.error({ userId: result.userId }, "User not found for credit purchase");
        }
      } catch (processingError) {
        // Mark event as failed if processing threw an error
        await markEventProcessed(
          result.eventId,
          "checkout.session.completed",
          { userId: result.userId, credits: result.credits },
          "failed",
          processingError instanceof Error ? processingError.message : "Unknown error"
        );
        throw processingError;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error({ err: error }, "Webhook error");
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
