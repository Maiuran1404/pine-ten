import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { orshotTemplates } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

/**
 * GET /api/admin/orshot-templates
 * List all Orshot template presets
 */
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

    const templates = await db
      .select()
      .from(orshotTemplates)
      .orderBy(desc(orshotTemplates.createdAt));

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Admin orshot templates error:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/orshot-templates
 * Create a new Orshot template preset
 */
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
    const {
      name,
      description,
      category,
      orshotTemplateId,
      previewImageUrl,
      parameterMapping,
      outputFormat,
    } = body;

    // Validate required fields
    if (!name || !category || !orshotTemplateId || !parameterMapping) {
      return NextResponse.json(
        {
          error:
            "Name, category, orshotTemplateId, and parameterMapping are required",
        },
        { status: 400 }
      );
    }

    // Validate orshotTemplateId is a number
    if (typeof orshotTemplateId !== "number" || orshotTemplateId <= 0) {
      return NextResponse.json(
        { error: "orshotTemplateId must be a positive number" },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ["social_media", "marketing", "brand_assets"];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Category must be one of: ${validCategories.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate outputFormat
    const validFormats = ["png", "jpg", "webp", "pdf"];
    if (outputFormat && !validFormats.includes(outputFormat)) {
      return NextResponse.json(
        { error: `Output format must be one of: ${validFormats.join(", ")}` },
        { status: 400 }
      );
    }

    const [newTemplate] = await db
      .insert(orshotTemplates)
      .values({
        name,
        description: description || null,
        category,
        orshotTemplateId,
        previewImageUrl: previewImageUrl || null,
        parameterMapping,
        outputFormat: outputFormat || "png",
        isActive: true,
      })
      .returning();

    return NextResponse.json({ template: newTemplate }, { status: 201 });
  } catch (error) {
    console.error("Admin create orshot template error:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/orshot-templates?id={id}
 * Delete an Orshot template preset
 */
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    await db.delete(orshotTemplates).where(eq(orshotTemplates.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete orshot template error:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
