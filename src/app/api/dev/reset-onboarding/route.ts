// TODO: Remove this file after testing onboarding
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";

export async function POST() {
  try {
    const { user } = await requireAuth();

    await db
      .update(users)
      .set({ onboardingCompleted: false })
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
