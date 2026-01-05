import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// Set user role after registration based on portal type
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { role } = body;

    // Only allow setting to FREELANCER from this endpoint
    // CLIENT is the default, ADMIN should never be set this way
    if (role !== "FREELANCER") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check current role - only update if still CLIENT (hasn't been set already)
    const currentUser = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (currentUser.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only update if currently CLIENT
    if (currentUser[0].role === "CLIENT") {
      await db
        .update(users)
        .set({ role: "FREELANCER", updatedAt: new Date() })
        .where(eq(users.id, session.user.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Set role error:", error);
    return NextResponse.json(
      { error: "Failed to set role" },
      { status: 500 }
    );
  }
}
