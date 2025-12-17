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

    if (id) {
      // Update existing draft
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

    // Create new draft
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

    return NextResponse.json({ draft });
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

    await db
      .delete(chatDrafts)
      .where(
        and(
          eq(chatDrafts.id, id),
          eq(chatDrafts.clientId, session.user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete draft error:", error);
    return NextResponse.json(
      { error: "Failed to delete draft" },
      { status: 500 }
    );
  }
}
