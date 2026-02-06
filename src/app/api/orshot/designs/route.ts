import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { generatedDesigns, orshotTemplates } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * GET /api/orshot/designs
 * List client's generated designs
 */
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const designs = await db
      .select({
        id: generatedDesigns.id,
        templateId: generatedDesigns.templateId,
        templateName: generatedDesigns.templateName,
        imageUrl: generatedDesigns.imageUrl,
        imageFormat: generatedDesigns.imageFormat,
        savedToAssets: generatedDesigns.savedToAssets,
        createdAt: generatedDesigns.createdAt,
        templateCategory: orshotTemplates.category,
      })
      .from(generatedDesigns)
      .leftJoin(
        orshotTemplates,
        eq(generatedDesigns.templateId, orshotTemplates.id)
      )
      .where(eq(generatedDesigns.clientId, session.user.id))
      .orderBy(desc(generatedDesigns.createdAt));

    return NextResponse.json({ designs });
  } catch (error) {
    logger.error({ error }, "Designs list error");
    return NextResponse.json(
      { error: "Failed to fetch designs" },
      { status: 500 }
    );
  }
}
