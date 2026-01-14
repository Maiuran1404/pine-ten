import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { deliverableStyleReferences } from "@/db/schema";
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
      deliverableType,
      styleAxis,
      subStyle,
      semanticTags,
      featuredOrder,
      displayOrder,
      isActive,
    } = body;

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (deliverableType !== undefined) updateData.deliverableType = deliverableType;
    if (styleAxis !== undefined) updateData.styleAxis = styleAxis;
    if (subStyle !== undefined) updateData.subStyle = subStyle;
    if (semanticTags !== undefined) updateData.semanticTags = semanticTags;
    if (featuredOrder !== undefined) updateData.featuredOrder = featuredOrder;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updatedStyle] = await db
      .update(deliverableStyleReferences)
      .set(updateData)
      .where(eq(deliverableStyleReferences.id, id))
      .returning();

    if (!updatedStyle) {
      return NextResponse.json({ error: "Style not found" }, { status: 404 });
    }

    return NextResponse.json({ style: updatedStyle });
  } catch (error) {
    console.error("Admin update deliverable style error:", error);
    return NextResponse.json(
      { error: "Failed to update deliverable style" },
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

    await db.delete(deliverableStyleReferences).where(eq(deliverableStyleReferences.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete deliverable style error:", error);
    return NextResponse.json(
      { error: "Failed to delete deliverable style" },
      { status: 500 }
    );
  }
}
