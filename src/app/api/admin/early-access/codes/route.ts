import { NextResponse } from "next/server";
import { db } from "@/db";
import { earlyAccessCodes, users } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";
import crypto from "crypto";

// Helper to generate a random invite code
function generateInviteCode(): string {
  const prefix = "EARLY";
  const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${randomPart}`;
}

// Schema for creating a new code
const createCodeSchema = z.object({
  code: z.string().optional(), // If not provided, auto-generate
  description: z.string().optional(),
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
});

// Schema for updating a code
const updateCodeSchema = z.object({
  id: z.string().uuid(),
  description: z.string().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
});

// GET - List all codes
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const codes = await db
      .select({
        id: earlyAccessCodes.id,
        code: earlyAccessCodes.code,
        description: earlyAccessCodes.description,
        maxUses: earlyAccessCodes.maxUses,
        usedCount: earlyAccessCodes.usedCount,
        expiresAt: earlyAccessCodes.expiresAt,
        isActive: earlyAccessCodes.isActive,
        createdBy: earlyAccessCodes.createdBy,
        createdAt: earlyAccessCodes.createdAt,
        creatorName: users.name,
      })
      .from(earlyAccessCodes)
      .leftJoin(users, eq(earlyAccessCodes.createdBy, users.id))
      .orderBy(desc(earlyAccessCodes.createdAt));

    // Get summary stats
    const stats = await db
      .select({
        totalCodes: sql<number>`COUNT(*)`,
        activeCodes: sql<number>`SUM(CASE WHEN ${earlyAccessCodes.isActive} = true THEN 1 ELSE 0 END)`,
        totalUsages: sql<number>`SUM(${earlyAccessCodes.usedCount})`,
      })
      .from(earlyAccessCodes);

    return NextResponse.json({
      codes,
      stats: stats[0] || { totalCodes: 0, activeCodes: 0, totalUsages: 0 },
    });
  } catch (error) {
    console.error("Error fetching early access codes:", error);
    return NextResponse.json(
      { error: "Failed to fetch codes" },
      { status: 500 }
    );
  }
}

// POST - Create a new code
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = createCodeSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { code, description, maxUses, expiresAt } = parseResult.data;

    // Generate or normalize the code
    const finalCode = code
      ? code.toUpperCase().trim()
      : generateInviteCode();

    // Check if code already exists
    const existingCode = await db.query.earlyAccessCodes.findFirst({
      where: eq(earlyAccessCodes.code, finalCode),
    });

    if (existingCode) {
      return NextResponse.json(
        { error: "A code with this value already exists" },
        { status: 400 }
      );
    }

    // Create the code
    const [newCode] = await db
      .insert(earlyAccessCodes)
      .values({
        code: finalCode,
        description: description?.trim() || null,
        maxUses: maxUses || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
        createdBy: session.user.id,
      })
      .returning();

    return NextResponse.json({ code: newCode }, { status: 201 });
  } catch (error) {
    console.error("Error creating early access code:", error);
    return NextResponse.json(
      { error: "Failed to create code" },
      { status: 500 }
    );
  }
}

// PATCH - Update a code
export async function PATCH(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = updateCodeSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { id, description, maxUses, expiresAt, isActive } = parseResult.data;

    // Build update object
    const updateData: Partial<typeof earlyAccessCodes.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }
    if (maxUses !== undefined) {
      updateData.maxUses = maxUses;
    }
    if (expiresAt !== undefined) {
      updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    const [updatedCode] = await db
      .update(earlyAccessCodes)
      .set(updateData)
      .where(eq(earlyAccessCodes.id, id))
      .returning();

    if (!updatedCode) {
      return NextResponse.json({ error: "Code not found" }, { status: 404 });
    }

    return NextResponse.json({ code: updatedCode });
  } catch (error) {
    console.error("Error updating early access code:", error);
    return NextResponse.json(
      { error: "Failed to update code" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a code
export async function DELETE(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Code ID is required" },
        { status: 400 }
      );
    }

    await db.delete(earlyAccessCodes).where(eq(earlyAccessCodes.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting early access code:", error);
    return NextResponse.json(
      { error: "Failed to delete code" },
      { status: 500 }
    );
  }
}
