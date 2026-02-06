import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  recordStyleSelection,
  confirmStyleSelection,
  getUserStylePreferences,
} from "@/lib/ai/selection-history";
import { logger } from "@/lib/logger";

// POST - Record a style selection
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      styleId,
      deliverableType,
      styleAxis,
      selectionContext = "chat",
      wasConfirmed = false,
      draftId,
    } = body;

    if (!styleId || !deliverableType || !styleAxis) {
      return NextResponse.json(
        { error: "Missing required fields: styleId, deliverableType, styleAxis" },
        { status: 400 }
      );
    }

    await recordStyleSelection({
      userId: session.user.id,
      styleId,
      deliverableType,
      styleAxis,
      selectionContext,
      wasConfirmed,
      draftId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error recording style selection");
    return NextResponse.json(
      { error: "Failed to record style selection" },
      { status: 500 }
    );
  }
}

// PUT - Confirm a style selection (when user proceeds with it)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { styleId, draftId } = body;

    if (!styleId) {
      return NextResponse.json(
        { error: "Missing required field: styleId" },
        { status: 400 }
      );
    }

    await confirmStyleSelection(session.user.id, styleId, draftId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error confirming style selection");
    return NextResponse.json(
      { error: "Failed to confirm style selection" },
      { status: 500 }
    );
  }
}

// GET - Get user's style preferences
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const deliverableType = searchParams.get("deliverableType") || undefined;

    const preferences = await getUserStylePreferences(
      session.user.id,
      deliverableType as any
    );

    return NextResponse.json(preferences);
  } catch (error) {
    logger.error({ error }, "Error fetching style preferences");
    return NextResponse.json(
      { error: "Failed to fetch style preferences" },
      { status: 500 }
    );
  }
}
