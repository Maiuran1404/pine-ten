import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/require-auth";
import { withErrorHandling, successResponse, Errors } from "@/lib/errors";
import { db } from "@/db";
import { brandReferences } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import type { ToneBucket, EnergyBucket, ColorBucket } from "@/lib/constants/reference-libraries";

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin();

    // Get optional filters from query params
    const { searchParams } = new URL(request.url);
    const toneBucket = searchParams.get("toneBucket") as ToneBucket | null;
    const energyBucket = searchParams.get("energyBucket") as EnergyBucket | null;
    const colorBucket = searchParams.get("colorBucket") as ColorBucket | null;

    // Build conditions array
    const conditions = [];
    if (toneBucket) {
      conditions.push(eq(brandReferences.toneBucket, toneBucket));
    }
    if (energyBucket) {
      conditions.push(eq(brandReferences.energyBucket, energyBucket));
    }
    if (colorBucket) {
      conditions.push(eq(brandReferences.colorBucket, colorBucket));
    }

    const query = db.select().from(brandReferences);

    const references = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(desc(brandReferences.createdAt))
      : await query.orderBy(desc(brandReferences.createdAt));

    return successResponse({ references });
  }, { endpoint: "GET /api/admin/brand-references" });
}

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin();

    const body = await request.json();
    const {
      name,
      description,
      imageUrl,
      toneBucket,
      energyBucket,
      densityBucket,
      colorBucket,
      premiumBucket,
      colorSamples,
      visualStyles,
      industries,
      displayOrder,
    } = body;

    if (!name || !imageUrl || !toneBucket || !energyBucket || !colorBucket) {
      throw Errors.badRequest("Name, imageUrl, toneBucket, energyBucket, and colorBucket are required");
    }

    const [newReference] = await db
      .insert(brandReferences)
      .values({
        name,
        description: description || null,
        imageUrl,
        toneBucket,
        energyBucket,
        densityBucket: densityBucket || "balanced",
        colorBucket,
        premiumBucket: premiumBucket || "balanced",
        colorSamples: colorSamples || [],
        visualStyles: visualStyles || [],
        industries: industries || [],
        displayOrder: displayOrder || 0,
        isActive: true,
      })
      .returning();

    return successResponse({ reference: newReference }, 201);
  }, { endpoint: "POST /api/admin/brand-references" });
}

export async function DELETE(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      throw Errors.badRequest("Reference ID is required");
    }

    await db.delete(brandReferences).where(eq(brandReferences.id, id));

    return successResponse({ success: true });
  }, { endpoint: "DELETE /api/admin/brand-references" });
}
