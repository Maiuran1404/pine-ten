import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { orshotTemplates } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * GET /api/orshot/templates
 * List available Orshot templates for clients (only active ones)
 */
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = await db
      .select({
        id: orshotTemplates.id,
        name: orshotTemplates.name,
        description: orshotTemplates.description,
        category: orshotTemplates.category,
        previewImageUrl: orshotTemplates.previewImageUrl,
        outputFormat: orshotTemplates.outputFormat,
      })
      .from(orshotTemplates)
      .where(eq(orshotTemplates.isActive, true))
      .orderBy(desc(orshotTemplates.createdAt));

    return NextResponse.json({ templates });
  } catch (error) {
    logger.error({ error }, "Orshot templates error");
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}
