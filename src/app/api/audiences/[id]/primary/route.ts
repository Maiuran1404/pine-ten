import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { audiences, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get user's company ID
    const [user] = await db
      .select({ companyId: users.companyId })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user?.companyId) {
      return NextResponse.json({ error: "No company found" }, { status: 404 });
    }

    // First, set all audiences for this company to not primary
    await db
      .update(audiences)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(eq(audiences.companyId, user.companyId));

    // Then set the specified audience as primary
    const result = await db
      .update(audiences)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(
        and(
          eq(audiences.id, id),
          eq(audiences.companyId, user.companyId)
        )
      )
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: "Audience not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error setting primary audience");
    return NextResponse.json(
      { error: "Failed to set primary audience" },
      { status: 500 }
    );
  }
}
