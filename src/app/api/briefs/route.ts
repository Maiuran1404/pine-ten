import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { briefs, users, chatDrafts } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { LiveBrief, Dimension } from "@/components/chat/brief-panel/types";
import { calculateBriefCompletion } from "@/components/chat/brief-panel/types";
import { logger } from "@/lib/logger";

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(str: string | null | undefined): boolean {
  if (!str) return false;
  return UUID_REGEX.test(str);
}

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
        where: and(eq(briefs.id, briefId), eq(briefs.userId, session.user.id)),
      });

      if (!brief) {
        return NextResponse.json({ error: "Brief not found" }, { status: 404 });
      }

      return NextResponse.json({ brief: convertDbBriefToLiveBrief(brief) });
    }

    // Get brief by draft ID
    if (draftId) {
      // Only query if draftId is a valid UUID (old format IDs will fail DB query)
      if (!isValidUUID(draftId)) {
        // Old format draftId - no brief saved yet
        return NextResponse.json({ brief: null });
      }

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
    logger.error({ error }, "Error fetching briefs");
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
    logger.debug({ bodyKeys: Object.keys(body) }, "POST /api/briefs - received body keys");

    const { brief: liveBrief, draftId } = body as {
      brief: LiveBrief;
      draftId?: string;
    };

    logger.debug(
      { liveBriefKeys: liveBrief ? Object.keys(liveBrief) : null, draftId },
      "POST /api/briefs - liveBrief and draftId"
    );

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

    // Calculate completion safely
    let completion = 0;
    try {
      completion = calculateBriefCompletion(liveBrief);
    } catch (e) {
      logger.warn({ error: e }, "Failed to calculate brief completion");
    }
    const status = completion >= 80 ? "READY" : "DRAFT";

    // Validate draftId is a proper UUID (old format IDs like "draft_123_abc" are not valid)
    let validDraftId = isValidUUID(draftId) ? draftId : null;

    // Check if the draft exists in chatDrafts (foreign key constraint)
    if (validDraftId) {
      const draftExists = await db.query.chatDrafts.findFirst({
        where: eq(chatDrafts.id, validDraftId),
        columns: { id: true },
      });
      if (!draftExists) {
        // Draft doesn't exist yet, set to null to avoid FK constraint error
        validDraftId = null;
      }
    }

    // Check if brief already exists for this draft
    let existingBrief = null;
    if (validDraftId) {
      existingBrief = await db.query.briefs.findFirst({
        where: and(
          eq(briefs.draftId, validDraftId),
          eq(briefs.userId, session.user.id)
        ),
      });
    }

    // Helper function for safe JSON serialization
    const safeSerialize = <T>(value: T | undefined | null): T | null => {
      if (value === undefined || value === null) return null;
      try {
        return JSON.parse(JSON.stringify(value));
      } catch (error) {
        logger.warn({ err: error }, "Failed to serialize value for brief");
        return null;
      }
    };

    // Convert LiveBrief to database format using JSON serialization
    const briefData = {
      userId: session.user.id,
      companyId: user?.companyId || null,
      draftId: validDraftId,
      status: status as "DRAFT" | "READY",
      completionPercentage: completion,
      taskSummary: safeSerialize(liveBrief.taskSummary),
      topic: safeSerialize(liveBrief.topic),
      platform: safeSerialize(liveBrief.platform),
      contentType: null,
      intent: safeSerialize(liveBrief.intent),
      taskType: safeSerialize(liveBrief.taskType),
      audience: safeSerialize(liveBrief.audience),
      dimensions: safeSerialize(liveBrief.dimensions) || [],
      visualDirection: safeSerialize(liveBrief.visualDirection),
      contentOutline: safeSerialize(liveBrief.contentOutline),
      clarifyingQuestionsAsked: liveBrief.clarifyingQuestionsAsked || [],
      updatedAt: new Date(),
    };

    logger.debug(
      { briefDataKeys: Object.keys(briefData), existingBriefId: existingBrief?.id || null },
      "POST /api/briefs - briefData and existingBrief"
    );

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
    logger.error(
      { error, details: error instanceof Error ? error.message : String(error) },
      "Error saving brief"
    );
    return NextResponse.json(
      {
        error: "Failed to save brief",
        details: error instanceof Error ? error.message : String(error),
      },
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
      return NextResponse.json({ error: "Brief ID required" }, { status: 400 });
    }

    await db
      .delete(briefs)
      .where(and(eq(briefs.id, briefId), eq(briefs.userId, session.user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error deleting brief");
    return NextResponse.json(
      { error: "Failed to delete brief" },
      { status: 500 }
    );
  }
}

// Helper to convert DB brief to LiveBrief format
function convertDbBriefToLiveBrief(
  dbBrief: typeof briefs.$inferSelect
): LiveBrief {
  // Safe conversion of dimensions
  const dimensionsRaw = dbBrief.dimensions as Array<{
    width: number;
    height: number;
    label?: string;
    name?: string;
    aspectRatio?: string;
    aspect?: string;
  }> | null;

  const dimensions: Dimension[] = dimensionsRaw
    ? dimensionsRaw.map((d) => ({
        label: d.label || d.name || "",
        width: d.width,
        height: d.height,
        aspectRatio: d.aspectRatio || d.aspect || `${d.width}:${d.height}`,
      }))
    : [];

  return {
    id: dbBrief.draftId || dbBrief.id,
    createdAt: dbBrief.createdAt,
    updatedAt: dbBrief.updatedAt,
    taskSummary: (dbBrief.taskSummary as LiveBrief["taskSummary"]) || {
      value: null,
      confidence: 0,
      source: "pending",
    },
    topic: (dbBrief.topic as LiveBrief["topic"]) || {
      value: null,
      confidence: 0,
      source: "pending",
    },
    platform: (dbBrief.platform as LiveBrief["platform"]) || {
      value: null,
      confidence: 0,
      source: "pending",
    },
    intent: (dbBrief.intent as LiveBrief["intent"]) || {
      value: null,
      confidence: 0,
      source: "pending",
    },
    taskType: (dbBrief.taskType as LiveBrief["taskType"]) || {
      value: null,
      confidence: 0,
      source: "pending",
    },
    audience: (dbBrief.audience as LiveBrief["audience"]) || {
      value: null,
      confidence: 0,
      source: "pending",
    },
    dimensions,
    visualDirection:
      (dbBrief.visualDirection as LiveBrief["visualDirection"]) || null,
    contentOutline:
      (dbBrief.contentOutline as LiveBrief["contentOutline"]) || null,
    clarifyingQuestionsAsked:
      (dbBrief.clarifyingQuestionsAsked as string[]) || [],
    completionPercentage: dbBrief.completionPercentage,
    isReadyForDesigner:
      dbBrief.status === "READY" || dbBrief.status === "SUBMITTED",
  };
}
