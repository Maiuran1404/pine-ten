import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { briefs, users, companies, chatDrafts } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { LiveBrief } from "@/components/chat/brief-panel/types";
import { calculateBriefCompletion } from "@/components/chat/brief-panel/types";

// GET /api/briefs - List user's briefs
// GET /api/briefs?draftId=xxx - Get brief by draft ID
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const draftId = searchParams.get("draftId");
    const briefId = searchParams.get("id");

    // Get specific brief by ID
    if (briefId) {
      const brief = await db.query.briefs.findFirst({
        where: and(
          eq(briefs.id, briefId),
          eq(briefs.userId, session.user.id)
        ),
      });

      if (!brief) {
        return NextResponse.json({ error: "Brief not found" }, { status: 404 });
      }

      return NextResponse.json({ brief: convertDbBriefToLiveBrief(brief) });
    }

    // Get brief by draft ID
    if (draftId) {
      const brief = await db.query.briefs.findFirst({
        where: and(
          eq(briefs.draftId, draftId),
          eq(briefs.userId, session.user.id)
        ),
      });

      if (!brief) {
        return NextResponse.json({ brief: null });
      }

      return NextResponse.json({ brief: convertDbBriefToLiveBrief(brief) });
    }

    // List all briefs for user
    const userBriefs = await db.query.briefs.findMany({
      where: eq(briefs.userId, session.user.id),
      orderBy: [desc(briefs.updatedAt)],
      limit: 50,
    });

    return NextResponse.json({
      briefs: userBriefs.map(convertDbBriefToLiveBrief),
    });
  } catch (error) {
    console.error("Error fetching briefs:", error);
    return NextResponse.json(
      { error: "Failed to fetch briefs" },
      { status: 500 }
    );
  }
}

// POST /api/briefs - Create or update brief
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { brief: liveBrief, draftId } = body as {
      brief: LiveBrief;
      draftId?: string;
    };

    if (!liveBrief) {
      return NextResponse.json(
        { error: "Missing brief data" },
        { status: 400 }
      );
    }

    // Get user's company
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    // Calculate completion
    const completion = calculateBriefCompletion(liveBrief);
    const status = completion >= 80 ? "READY" : "DRAFT";

    // Check if brief already exists for this draft
    let existingBrief = null;
    if (draftId) {
      existingBrief = await db.query.briefs.findFirst({
        where: and(
          eq(briefs.draftId, draftId),
          eq(briefs.userId, session.user.id)
        ),
      });
    }

    const briefData = {
      userId: session.user.id,
      companyId: user?.companyId || null,
      draftId: draftId || null,
      status: status as "DRAFT" | "READY",
      completionPercentage: completion,
      topic: liveBrief.topic,
      platform: liveBrief.platform,
      contentType: liveBrief.contentType,
      intent: liveBrief.intent,
      taskType: liveBrief.taskType,
      audience: liveBrief.audience,
      dimensions: liveBrief.dimensions,
      visualDirection: liveBrief.visualDirection,
      contentOutline: liveBrief.contentOutline,
      clarifyingQuestionsAsked: liveBrief.clarifyingQuestionsAsked,
      updatedAt: new Date(),
    };

    let savedBrief;

    if (existingBrief) {
      // Update existing
      const [updated] = await db
        .update(briefs)
        .set(briefData)
        .where(eq(briefs.id, existingBrief.id))
        .returning();
      savedBrief = updated;
    } else {
      // Create new
      const [created] = await db.insert(briefs).values(briefData).returning();
      savedBrief = created;
    }

    return NextResponse.json({
      brief: convertDbBriefToLiveBrief(savedBrief),
      id: savedBrief.id,
    });
  } catch (error) {
    console.error("Error saving brief:", error);
    return NextResponse.json(
      { error: "Failed to save brief" },
      { status: 500 }
    );
  }
}

// DELETE /api/briefs?id=xxx - Delete brief
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const briefId = searchParams.get("id");

    if (!briefId) {
      return NextResponse.json(
        { error: "Brief ID required" },
        { status: 400 }
      );
    }

    await db.delete(briefs).where(
      and(eq(briefs.id, briefId), eq(briefs.userId, session.user.id))
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting brief:", error);
    return NextResponse.json(
      { error: "Failed to delete brief" },
      { status: 500 }
    );
  }
}

// Helper to convert DB brief to LiveBrief format
function convertDbBriefToLiveBrief(dbBrief: typeof briefs.$inferSelect): LiveBrief {
  return {
    id: dbBrief.id,
    draftId: dbBrief.draftId || dbBrief.id,
    topic: dbBrief.topic as LiveBrief["topic"] || {
      value: null,
      confidence: 0,
      source: "pending",
    },
    platform: dbBrief.platform as LiveBrief["platform"] || {
      value: null,
      confidence: 0,
      source: "pending",
    },
    contentType: dbBrief.contentType as LiveBrief["contentType"] || {
      value: null,
      confidence: 0,
      source: "pending",
    },
    intent: dbBrief.intent as LiveBrief["intent"] || {
      value: null,
      confidence: 0,
      source: "pending",
    },
    taskType: dbBrief.taskType as LiveBrief["taskType"] || {
      value: null,
      confidence: 0,
      source: "pending",
    },
    audience: dbBrief.audience as LiveBrief["audience"] || {
      value: null,
      confidence: 0,
      source: "pending",
    },
    dimensions: (dbBrief.dimensions as LiveBrief["dimensions"]) || [],
    visualDirection: dbBrief.visualDirection as LiveBrief["visualDirection"] || null,
    contentOutline: dbBrief.contentOutline as LiveBrief["contentOutline"] || null,
    clarifyingQuestionsAsked: (dbBrief.clarifyingQuestionsAsked as string[]) || [],
    createdAt: dbBrief.createdAt,
    updatedAt: dbBrief.updatedAt,
  };
}
