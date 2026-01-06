import { NextRequest } from "next/server";
import { db } from "@/db";
import { users, creditTransactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail, emailTemplates } from "@/lib/notifications";
import { config } from "@/lib/config";
import { requireAdmin } from "@/lib/require-auth";
import { withErrorHandling, successResponse, Errors } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { adminCreditsSchema } from "@/lib/validations";

// POST - Manually grant/adjust credits for a user (admin only)
export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin();

    const body = await request.json();
    const { userId, amount, type, description } = adminCreditsSchema.parse(body);

    // Get user
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) {
      throw Errors.notFound("User");
    }

    const currentCredits = user[0].credits;
    const newCredits = currentCredits + amount;

    // Prevent negative credit balance
    if (newCredits < 0) {
      throw Errors.badRequest("Operation would result in negative credit balance");
    }

    // Update user credits
    await db
      .update(users)
      .set({
        credits: newCredits,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Log the transaction
    await db.insert(creditTransactions).values({
      userId,
      amount,
      type: type === "BONUS" ? "ADMIN_GRANT" : type,
      description: description || `Admin ${type.toLowerCase()}: ${amount} credits`,
    });

    // Send notification email for positive adjustments
    if (amount > 0 && user[0].email) {
      try {
        const email = emailTemplates.creditsPurchased(
          user[0].name,
          amount,
          `${config.app.url}/dashboard`
        );
        await sendEmail({
          to: user[0].email,
          subject: `You've received ${amount} credits!`,
          html: email.html.replace(
            "Thank you for your purchase!",
            description || "Credits have been added to your account!"
          ),
        });
      } catch (emailError) {
        logger.error({ err: emailError }, "Failed to send credit notification");
      }
    }

    logger.info({ userId, amount, type, newCredits }, "Credits adjusted by admin");

    return successResponse({
      previousCredits: currentCredits,
      newCredits,
      adjustment: amount,
    });
  }, { endpoint: "POST /api/admin/credits" });
}
