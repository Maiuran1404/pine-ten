import { NextResponse } from "next/server";
import { db } from "@/db";
import { earlyAccessWaitlist } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";

// Schema for updating a waitlist entry
const updateWaitlistSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["PENDING", "INVITED", "REGISTERED"]).optional(),
});

// GET - List all waitlist entries
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const waitlist = await db
      .select()
      .from(earlyAccessWaitlist)
      .orderBy(desc(earlyAccessWaitlist.createdAt));

    // Get summary stats
    const stats = await db
      .select({
        total: sql<number>`COUNT(*)`,
        pending: sql<number>`SUM(CASE WHEN ${earlyAccessWaitlist.status} = 'PENDING' THEN 1 ELSE 0 END)`,
        invited: sql<number>`SUM(CASE WHEN ${earlyAccessWaitlist.status} = 'INVITED' THEN 1 ELSE 0 END)`,
        registered: sql<number>`SUM(CASE WHEN ${earlyAccessWaitlist.status} = 'REGISTERED' THEN 1 ELSE 0 END)`,
      })
      .from(earlyAccessWaitlist);

    return NextResponse.json({
      waitlist,
      stats: stats[0] || { total: 0, pending: 0, invited: 0, registered: 0 },
    });
  } catch (error) {
    console.error("Error fetching waitlist:", error);
    return NextResponse.json(
      { error: "Failed to fetch waitlist" },
      { status: 500 }
    );
  }
}

// PATCH - Update a waitlist entry (e.g., mark as invited)
export async function PATCH(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = updateWaitlistSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { id, status } = parseResult.data;

    // Build update object
    const updateData: Partial<typeof earlyAccessWaitlist.$inferInsert> = {};

    if (status !== undefined) {
      updateData.status = status;
      if (status === "INVITED") {
        updateData.invitedAt = new Date();
      } else if (status === "REGISTERED") {
        updateData.registeredAt = new Date();
      }
    }

    const [updatedEntry] = await db
      .update(earlyAccessWaitlist)
      .set(updateData)
      .where(eq(earlyAccessWaitlist.id, id))
      .returning();

    if (!updatedEntry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json({ entry: updatedEntry });
  } catch (error) {
    console.error("Error updating waitlist entry:", error);
    return NextResponse.json(
      { error: "Failed to update entry" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a waitlist entry
export async function DELETE(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Entry ID is required" },
        { status: 400 }
      );
    }

    await db.delete(earlyAccessWaitlist).where(eq(earlyAccessWaitlist.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting waitlist entry:", error);
    return NextResponse.json(
      { error: "Failed to delete entry" },
      { status: 500 }
    );
  }
}
