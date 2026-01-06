import { NextRequest } from "next/server";
import { db } from "@/db";
import { taskCategories } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/require-auth";
import { withErrorHandling, successResponse } from "@/lib/errors";
import { createCategorySchema } from "@/lib/validations";

export async function GET() {
  return withErrorHandling(async () => {
    await requireAdmin();

    const categories = await db
      .select()
      .from(taskCategories)
      .orderBy(desc(taskCategories.createdAt));

    return successResponse({ categories });
  }, { endpoint: "GET /api/admin/categories" });
}

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin();

    const body = await request.json();
    const validatedData = createCategorySchema.parse(body);

    // Generate slug from name if not provided
    const slug = validatedData.slug || validatedData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const [newCategory] = await db
      .insert(taskCategories)
      .values({
        name: validatedData.name,
        slug,
        description: validatedData.description,
        baseCredits: validatedData.baseCredits,
        isActive: validatedData.isActive,
      })
      .returning();

    return successResponse({ category: newCategory }, 201);
  }, { endpoint: "POST /api/admin/categories" });
}
