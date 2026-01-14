import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { brandReferences } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const {
      name,
      description,
      imageUrl,
      toneBucket,
      energyBucket,
      colorBucket,
      colorSamples,
      visualStyles,
      industries,
      displayOrder,
      isActive,
    } = body;

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (toneBucket !== undefined) updateData.toneBucket = toneBucket;
    if (energyBucket !== undefined) updateData.energyBucket = energyBucket;
    if (colorBucket !== undefined) updateData.colorBucket = colorBucket;
    if (colorSamples !== undefined) updateData.colorSamples = colorSamples;
    if (visualStyles !== undefined) updateData.visualStyles = visualStyles;
    if (industries !== undefined) updateData.industries = industries;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updatedReference] = await db
      .update(brandReferences)
      .set(updateData)
      .where(eq(brandReferences.id, id))
      .returning();

    if (!updatedReference) {
      return NextResponse.json({ error: "Reference not found" }, { status: 404 });
    }

    return NextResponse.json({ reference: updatedReference });
  } catch (error) {
    console.error("Admin update brand reference error:", error);
    return NextResponse.json(
      { error: "Failed to update brand reference" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    await db.delete(brandReferences).where(eq(brandReferences.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete brand reference error:", error);
    return NextResponse.json(
      { error: "Failed to delete brand reference" },
      { status: 500 }
    );
  }
}
