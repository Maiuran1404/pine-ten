import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { platformSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

const CHAT_PROMPTS_KEY = "chat_prompts";

export async function GET() {
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

    const result = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, CHAT_PROMPTS_KEY))
      .limit(1);

    if (result.length > 0) {
      return NextResponse.json({ prompts: result[0].value });
    }

    return NextResponse.json({ prompts: null });
  } catch (error) {
    console.error("Fetch chat prompts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat prompts" },
      { status: 500 }
    );
  }
}

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
    const { prompts } = body;

    if (!prompts) {
      return NextResponse.json(
        { error: "Prompts are required" },
        { status: 400 }
      );
    }

    // Upsert the chat prompts
    const existing = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, CHAT_PROMPTS_KEY))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(platformSettings)
        .set({
          value: prompts,
          description: "AI Chat decision tree prompts configuration",
          updatedAt: new Date()
        })
        .where(eq(platformSettings.key, CHAT_PROMPTS_KEY));
    } else {
      await db.insert(platformSettings).values({
        key: CHAT_PROMPTS_KEY,
        value: prompts,
        description: "AI Chat decision tree prompts configuration",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update chat prompts error:", error);
    return NextResponse.json(
      { error: "Failed to update chat prompts" },
      { status: 500 }
    );
  }
}
