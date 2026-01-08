import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { orshotTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/orshot-templates/[id]
 * Get a single Orshot template preset
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    const [template] = await db
      .select()
      .from(orshotTemplates)
      .where(eq(orshotTemplates.id, id))
      .limit(1);

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Admin get orshot template error:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/orshot-templates/[id]
 * Update an Orshot template preset
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const body = await request.json();

    // Check if template exists
    const [existingTemplate] = await db
      .select()
      .from(orshotTemplates)
      .where(eq(orshotTemplates.id, id))
      .limit(1);

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof orshotTemplates.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.category !== undefined) {
      const validCategories = ["social_media", "marketing", "brand_assets"];
      if (!validCategories.includes(body.category)) {
        return NextResponse.json(
          { error: `Category must be one of: ${validCategories.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.category = body.category;
    }
    if (body.orshotTemplateId !== undefined) {
      if (
        typeof body.orshotTemplateId !== "number" ||
        body.orshotTemplateId <= 0
      ) {
        return NextResponse.json(
          { error: "orshotTemplateId must be a positive number" },
          { status: 400 }
        );
      }
      updateData.orshotTemplateId = body.orshotTemplateId;
    }
    if (body.previewImageUrl !== undefined)
      updateData.previewImageUrl = body.previewImageUrl;
    if (body.parameterMapping !== undefined)
      updateData.parameterMapping = body.parameterMapping;
    if (body.outputFormat !== undefined) {
      const validFormats = ["png", "jpg", "webp", "pdf"];
      if (!validFormats.includes(body.outputFormat)) {
        return NextResponse.json(
          { error: `Output format must be one of: ${validFormats.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.outputFormat = body.outputFormat;
    }
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const [updatedTemplate] = await db
      .update(orshotTemplates)
      .set(updateData)
      .where(eq(orshotTemplates.id, id))
      .returning();

    return NextResponse.json({ template: updatedTemplate });
  } catch (error) {
    console.error("Admin update orshot template error:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}
