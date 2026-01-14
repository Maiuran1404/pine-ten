import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { deliverableStyleReferences } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import type { DeliverableType, StyleAxis } from "@/lib/constants/reference-libraries";

export async function GET(request: NextRequest) {
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

    return NextResponse.json({ styles });
  } catch (error) {
    console.error("Admin deliverable styles error:", error);
    return NextResponse.json(
      { error: "Failed to fetch deliverable styles" },
      { status: 500 }
    );
  }
}

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
      imageUrl,
      deliverableType,
      styleAxis,
      subStyle,
      semanticTags,
      featuredOrder,
      displayOrder,
    } = body;

    if (!name || !imageUrl || !deliverableType || !styleAxis) {
      return NextResponse.json(
        { error: "Name, imageUrl, deliverableType, and styleAxis are required" },
        { status: 400 }
      );
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

    return NextResponse.json({ style: newStyle }, { status: 201 });
  } catch (error) {
    console.error("Admin create deliverable style error:", error);
    return NextResponse.json(
      { error: "Failed to create deliverable style" },
      { status: 500 }
    );
  }
}

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
      return NextResponse.json({ error: "Style ID is required" }, { status: 400 });
    }

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
