import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/require-auth";
import { withErrorHandling, successResponse, Errors } from "@/lib/errors";
import { db } from "@/db";
import { orshotTemplates } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

/**
 * GET /api/admin/orshot-templates
 * List all Orshot template presets
 */
export async function GET() {
  return withErrorHandling(async () => {
    await requireAdmin();

    const templates = await db
      .select()
      .from(orshotTemplates)
      .orderBy(desc(orshotTemplates.createdAt));

    return successResponse({ templates });
  }, { endpoint: "GET /api/admin/orshot-templates" });
}

/**
 * POST /api/admin/orshot-templates
 * Create a new Orshot template preset
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin();

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
      throw Errors.badRequest(
        "Name, category, orshotTemplateId, and parameterMapping are required"
      );
    }

    // Validate orshotTemplateId is a number
    if (typeof orshotTemplateId !== "number" || orshotTemplateId <= 0) {
      throw Errors.badRequest("orshotTemplateId must be a positive number");
    }

    // Validate category
    const validCategories = ["social_media", "marketing", "brand_assets"];
    if (!validCategories.includes(category)) {
      throw Errors.badRequest(
        `Category must be one of: ${validCategories.join(", ")}`
      );
    }

    // Validate outputFormat
    const validFormats = ["png", "jpg", "webp", "pdf"];
    if (outputFormat && !validFormats.includes(outputFormat)) {
      throw Errors.badRequest(
        `Output format must be one of: ${validFormats.join(", ")}`
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

    return successResponse({ template: newTemplate }, 201);
  }, { endpoint: "POST /api/admin/orshot-templates" });
}

/**
 * DELETE /api/admin/orshot-templates?id={id}
 * Delete an Orshot template preset
 */
export async function DELETE(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      throw Errors.badRequest("Template ID is required");
    }

    await db.delete(orshotTemplates).where(eq(orshotTemplates.id, id));

    return successResponse({ success: true });
  }, { endpoint: "DELETE /api/admin/orshot-templates" });
}
