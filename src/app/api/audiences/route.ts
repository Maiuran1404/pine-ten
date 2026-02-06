import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { audiences, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's company ID
    const [user] = await db
      .select({ companyId: users.companyId })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user?.companyId) {
      return NextResponse.json({ audiences: [] });
    }

    // Get audiences for the company, sorted by primary first then confidence descending
    const companyAudiences = await db
      .select()
      .from(audiences)
      .where(eq(audiences.companyId, user.companyId));

    // Sort so primary is first, then by confidence descending
    const sortedAudiences = companyAudiences.sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return b.confidence - a.confidence;
    });

    return NextResponse.json({ audiences: sortedAudiences });
  } catch (error) {
    logger.error({ error }, "Error fetching audiences");
    return NextResponse.json(
      { error: "Failed to fetch audiences" },
      { status: 500 }
    );
  }
}
