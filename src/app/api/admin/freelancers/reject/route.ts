import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { freelancerProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { role?: string };
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { freelancerId } = body;

    if (!freelancerId) {
      return NextResponse.json(
        { error: "Freelancer ID is required" },
        { status: 400 }
      );
    }

    await db
      .update(freelancerProfiles)
      .set({
        status: "REJECTED",
        updatedAt: new Date(),
      })
      .where(eq(freelancerProfiles.id, freelancerId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reject freelancer error:", error);
    return NextResponse.json(
      { error: "Failed to reject freelancer" },
      { status: 500 }
    );
  }
}
