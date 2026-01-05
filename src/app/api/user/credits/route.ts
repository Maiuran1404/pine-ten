import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userResult = await db
      .select({
        credits: users.credits,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!userResult.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ credits: userResult[0].credits });
  } catch (error) {
    console.error("Credits fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch credits" },
      { status: 500 }
    );
  }
}
