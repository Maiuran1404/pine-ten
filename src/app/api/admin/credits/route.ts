import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { users, creditTransactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail, emailTemplates } from "@/lib/notifications";
import { config } from "@/lib/config";

// POST - Manually grant credits to a user (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = session.user as { role?: string };
    if (adminUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, credits, reason, sendNotification = true } = body;

    if (!userId || !credits) {
      return NextResponse.json(
        { error: "User ID and credits amount are required" },
        { status: 400 }
      );
    }

    if (credits <= 0) {
      return NextResponse.json(
        { error: "Credits must be a positive number" },
        { status: 400 }
      );
    }

    // Get user
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentCredits = user[0].credits;
    const newCredits = currentCredits + credits;

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
      amount: credits,
      type: "ADMIN_GRANT",
      description: reason || `Admin granted ${credits} credits`,
    });

    // Send notification email if requested
    if (sendNotification && user[0].email) {
      try {
        const email = emailTemplates.creditsPurchased(
          user[0].name,
          credits,
          `${config.app.url}/dashboard`
        );
        await sendEmail({
          to: user[0].email,
          subject: `You've received ${credits} credits!`,
          html: email.html.replace(
            "Thank you for your purchase!",
            reason || "Credits have been added to your account!"
          ),
        });
      } catch (emailError) {
        console.error("Failed to send credit notification:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      previousCredits: currentCredits,
      newCredits,
      creditsAdded: credits,
    });
  } catch (error) {
    console.error("Failed to grant credits:", error);
    return NextResponse.json(
      { error: "Failed to grant credits" },
      { status: 500 }
    );
  }
}
