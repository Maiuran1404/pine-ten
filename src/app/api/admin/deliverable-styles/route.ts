import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/require-auth";
import { withErrorHandling, successResponse, Errors } from "@/lib/errors";
import { db } from "@/db";
import { deliverableStyleReferences } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { DeliverableType, StyleAxis } from "@/lib/constants/reference-libraries";

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin();

    // Get optional filters from query params
    const { searchParams } = new URL(request.url);
    const deliverableType = searchParams.get("deliverableType") as DeliverableType | null;
    const styleAxis = searchParams.get("styleAxis") as StyleAxis | null;

    // Build conditions array
    const conditions = [];
    if (deliverableType) {
      conditions.push(eq(deliverableStyleReferences.deliverableType, deliverableType));
    }
    if (styleAxis) {
      conditions.push(eq(deliverableStyleReferences.styleAxis, styleAxis));
    }

    const query = db.select().from(deliverableStyleReferences);

    const styles = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(
          deliverableStyleReferences.deliverableType,
          deliverableStyleReferences.styleAxis,
          deliverableStyleReferences.featuredOrder,
          deliverableStyleReferences.displayOrder
        )
      : await query.orderBy(
          deliverableStyleReferences.deliverableType,
          deliverableStyleReferences.styleAxis,
          deliverableStyleReferences.featuredOrder,
          deliverableStyleReferences.displayOrder
        );

    return successResponse({ styles });
  }, { endpoint: "GET /api/admin/deliverable-styles" });
}

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin();

    const body = await request.json();
    const {
      name,
      description,
      imageUrl,
      deliverableType,
      styleAxis,
      subStyle,
      semanticTags,
      featuredOrder,
      displayOrder,
    } = body;

    if (!name || !imageUrl || !deliverableType || !styleAxis) {
      throw Errors.badRequest("Name, imageUrl, deliverableType, and styleAxis are required");
    }

    const [newStyle] = await db
      .insert(deliverableStyleReferences)
      .values({
        name,
        description: description || null,
        imageUrl,
        deliverableType,
        styleAxis,
        subStyle: subStyle || null,
        semanticTags: semanticTags || [],
        featuredOrder: featuredOrder || 0,
        displayOrder: displayOrder || 0,
        isActive: true,
      })
      .returning();

    return successResponse({ style: newStyle }, 201);
  }, { endpoint: "POST /api/admin/deliverable-styles" });
}

export async function DELETE(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      throw Errors.badRequest("Style ID is required");
    }

    await db.delete(deliverableStyleReferences).where(eq(deliverableStyleReferences.id, id));

    return successResponse({ success: true });
  }, { endpoint: "DELETE /api/admin/deliverable-styles" });
}
