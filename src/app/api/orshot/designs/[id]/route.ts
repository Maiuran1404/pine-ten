import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { generatedDesigns, orshotTemplates, companies, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/orshot/designs/[id]
 * Get a specific generated design
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const [design] = await db
      .select({
        id: generatedDesigns.id,
        clientId: generatedDesigns.clientId,
        templateId: generatedDesigns.templateId,
        templateName: generatedDesigns.templateName,
        imageUrl: generatedDesigns.imageUrl,
        imageFormat: generatedDesigns.imageFormat,
        modificationsUsed: generatedDesigns.modificationsUsed,
        savedToAssets: generatedDesigns.savedToAssets,
        createdAt: generatedDesigns.createdAt,
        templateCategory: orshotTemplates.category,
        templateDescription: orshotTemplates.description,
      })
      .from(generatedDesigns)
      .leftJoin(
        orshotTemplates,
        eq(generatedDesigns.templateId, orshotTemplates.id)
      )
      .where(
        and(
          eq(generatedDesigns.id, id),
          eq(generatedDesigns.clientId, session.user.id)
        )
      )
      .limit(1);

    if (!design) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 });
    }

    return NextResponse.json({ design });
  } catch (error) {
    console.error("Design fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch design" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orshot/designs/[id]
 * Save design to brand assets
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if design exists and belongs to user
    const [design] = await db
      .select()
      .from(generatedDesigns)
      .where(
        and(
          eq(generatedDesigns.id, id),
          eq(generatedDesigns.clientId, session.user.id)
        )
      )
      .limit(1);

    if (!design) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 });
    }

    if (design.savedToAssets) {
      return NextResponse.json(
        { error: "Design already saved to assets" },
        { status: 400 }
      );
    }

    // Get user's company
    const [user] = await db
      .select({ companyId: users.companyId })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user?.companyId) {
      return NextResponse.json(
        { error: "No brand profile found" },
        { status: 400 }
      );
    }

    // Get current brand assets
    const [company] = await db
      .select({ brandAssets: companies.brandAssets })
      .from(companies)
      .where(eq(companies.id, user.companyId))
      .limit(1);

    // Add image to brand assets
    const currentAssets = company?.brandAssets || { images: [], documents: [] };
    const updatedAssets = {
      ...currentAssets,
      images: [...(currentAssets.images || []), design.imageUrl],
    };

    // Update company brand assets
    await db
      .update(companies)
      .set({
        brandAssets: updatedAssets,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, user.companyId));

    // Mark design as saved
    await db
      .update(generatedDesigns)
      .set({ savedToAssets: true })
      .where(eq(generatedDesigns.id, id));

    return NextResponse.json({
      success: true,
      message: "Design saved to brand assets",
    });
  } catch (error) {
    console.error("Save to assets error:", error);
    return NextResponse.json(
      { error: "Failed to save design to assets" },
      { status: 500 }
    );
  }
}
