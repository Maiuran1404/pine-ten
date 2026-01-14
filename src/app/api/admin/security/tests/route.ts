import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { securityTests } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// GET - List all security tests
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

    const tests = await db
      .select()
      .from(securityTests)
      .orderBy(desc(securityTests.createdAt));

    return NextResponse.json({ tests });
  } catch (error) {
    console.error("Failed to fetch security tests:", error);
    return NextResponse.json(
      { error: "Failed to fetch tests" },
      { status: 500 }
    );
  }
}

// POST - Create a new security test
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
      testType,
      severity,
      testFlow,
      exploratoryConfig,
      expectedOutcome,
    } = body;

    if (!name || !category || !testType) {
      return NextResponse.json(
        { error: "Name, category, and testType are required" },
        { status: 400 }
      );
    }

    const [test] = await db
      .insert(securityTests)
      .values({
        name,
        description,
        category,
        testType,
        severity: severity || "medium",
        testFlow,
        exploratoryConfig,
        expectedOutcome,
      })
      .returning();

    return NextResponse.json({ test }, { status: 201 });
  } catch (error) {
    console.error("Failed to create security test:", error);
    return NextResponse.json(
      { error: "Failed to create test" },
      { status: 500 }
    );
  }
}

// PUT - Update a security test
export async function PUT(request: NextRequest) {
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
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Test ID is required" }, { status: 400 });
    }

    const [test] = await db
      .update(securityTests)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(securityTests.id, id))
      .returning();

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    return NextResponse.json({ test });
  } catch (error) {
    console.error("Failed to update security test:", error);
    return NextResponse.json(
      { error: "Failed to update test" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a security test
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
      return NextResponse.json({ error: "Test ID is required" }, { status: 400 });
    }

    await db.delete(securityTests).where(eq(securityTests.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete security test:", error);
    return NextResponse.json(
      { error: "Failed to delete test" },
      { status: 500 }
    );
  }
}
