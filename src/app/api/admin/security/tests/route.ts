import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/require-auth";
import { withErrorHandling, successResponse, Errors } from "@/lib/errors";
import { db } from "@/db";
import { securityTests } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// GET - List all security tests
export async function GET() {
  return withErrorHandling(async () => {
    await requireAdmin();

    const tests = await db
      .select()
      .from(securityTests)
      .orderBy(desc(securityTests.createdAt));

    return successResponse({ tests });
  }, { endpoint: "GET /api/admin/security/tests" });
}

// POST - Create a new security test
export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin();

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
      throw Errors.badRequest("Name, category, and testType are required");
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

    return successResponse({ test }, 201);
  }, { endpoint: "POST /api/admin/security/tests" });
}

// PUT - Update a security test
export async function PUT(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin();

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      throw Errors.badRequest("Test ID is required");
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
      throw Errors.notFound("Test");
    }

    return successResponse({ test });
  }, { endpoint: "PUT /api/admin/security/tests" });
}

// DELETE - Delete a security test
export async function DELETE(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      throw Errors.badRequest("Test ID is required");
    }

    await db.delete(securityTests).where(eq(securityTests.id, id));

    return successResponse({ success: true });
  }, { endpoint: "DELETE /api/admin/security/tests" });
}
