import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/require-auth";
import { withErrorHandling, successResponse, Errors } from "@/lib/errors";
import { db } from "@/db";
import { platformSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

const CHAT_PROMPTS_KEY = "chat_prompts";

export async function GET() {
  return withErrorHandling(async () => {
    await requireAdmin();

    const result = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, CHAT_PROMPTS_KEY))
      .limit(1);

    if (result.length > 0) {
      return successResponse({ prompts: result[0].value });
    }

    return successResponse({ prompts: null });
  }, { endpoint: "GET /api/admin/chat-prompts" });
}

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin();

    const body = await request.json();
    const { prompts } = body;

    if (!prompts) {
      throw Errors.badRequest("Prompts are required");
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

    return successResponse({ success: true });
  }, { endpoint: "POST /api/admin/chat-prompts" });
}
