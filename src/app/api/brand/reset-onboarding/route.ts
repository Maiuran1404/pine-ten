import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, companies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";

export async function POST() {
  try {
    const { user } = await requireAuth();

    // Get user with company info
    const [currentUser] = await db
      .select({
        companyId: users.companyId,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete the company if it exists
    if (currentUser.companyId) {
      await db.delete(companies).where(eq(companies.id, currentUser.companyId));
    }

    // Reset user onboarding status
    await db
      .update(users)
      .set({
        companyId: null,
        onboardingCompleted: false,
        onboardingData: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to reset onboarding" },
      { status: 500 }
    );
  }
}
