import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { chatDrafts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// GET - Fetch all drafts for current user
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const drafts = await db.query.chatDrafts.findMany({
      where: eq(chatDrafts.clientId, session.user.id),
      orderBy: (chatDrafts, { desc }) => [desc(chatDrafts.updatedAt)],
    });

    return NextResponse.json({ drafts });
  } catch (error) {
    console.error("Fetch drafts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch drafts" },
      { status: 500 }
    );
  }
}

// POST - Create or update a draft
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, messages, selectedStyles, pendingTask } = body;

    // Check if ID is a valid UUID (not a local draft ID like "draft_xxx")
    const isValidUUID = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isValidUUID) {
      // Update existing draft with valid UUID
      const existing = await db.query.chatDrafts.findFirst({
        where: and(
          eq(chatDrafts.id, id),
          eq(chatDrafts.clientId, session.user.id)
        ),
      });

      if (existing) {
        const [updated] = await db
          .update(chatDrafts)
          .set({
            title: title || existing.title,
            messages: messages || existing.messages,
            selectedStyles: selectedStyles || existing.selectedStyles,
            pendingTask: pendingTask,
            updatedAt: new Date(),
          })
          .where(eq(chatDrafts.id, id))
          .returning();

        return NextResponse.json({ draft: updated });
      }
    }

    // Create new draft (either no ID, local draft ID, or UUID not found)
    const [draft] = await db
      .insert(chatDrafts)
      .values({
        clientId: session.user.id,
        title: title || "New Request",
        messages: messages || [],
        selectedStyles: selectedStyles || [],
        pendingTask: pendingTask || null,
      })
      .returning();

    return NextResponse.json({ draft, localId: id });
  } catch (error) {
    console.error("Save draft error:", error);
    return NextResponse.json(
      { error: "Failed to save draft" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a draft
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Draft ID required" }, { status: 400 });
    }

    // Check if ID is a valid UUID before attempting delete
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isValidUUID) {
      await db
        .delete(chatDrafts)
        .where(
          and(
            eq(chatDrafts.id, id),
            eq(chatDrafts.clientId, session.user.id)
          )
        );
    }
    // If not a valid UUID, it's a local-only draft - just return success

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete draft error:", error);
    return NextResponse.json(
      { error: "Failed to delete draft" },
      { status: 500 }
    );
  }
}
