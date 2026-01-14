import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { brandReferences } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import type { ToneBucket, EnergyBucket, ColorBucket } from "@/lib/constants/reference-libraries";

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

    return NextResponse.json({ references });
  } catch (error) {
    console.error("Admin brand references error:", error);
    return NextResponse.json(
      { error: "Failed to fetch brand references" },
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
      toneBucket,
      energyBucket,
      colorBucket,
      colorSamples,
      visualStyles,
      industries,
      displayOrder,
    } = body;

    if (!name || !imageUrl || !toneBucket || !energyBucket || !colorBucket) {
      return NextResponse.json(
        { error: "Name, imageUrl, toneBucket, energyBucket, and colorBucket are required" },
        { status: 400 }
      );
    }

    const [newReference] = await db
      .insert(brandReferences)
      .values({
        name,
        description: description || null,
        imageUrl,
        toneBucket,
        energyBucket,
        colorBucket,
        colorSamples: colorSamples || [],
        visualStyles: visualStyles || [],
        industries: industries || [],
        displayOrder: displayOrder || 0,
        isActive: true,
      })
      .returning();

    return NextResponse.json({ reference: newReference }, { status: 201 });
  } catch (error) {
    console.error("Admin create brand reference error:", error);
    return NextResponse.json(
      { error: "Failed to create brand reference" },
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
      return NextResponse.json({ error: "Reference ID is required" }, { status: 400 });
    }

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
