import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { importLogs, users } from "@/db/schema";
import { desc, eq, and, gte, lte, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const target = searchParams.get("target"); // 'deliverable_style' or 'brand_reference'
    const source = searchParams.get("source"); // 'bigged', 'dribbble', etc.
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build conditions
    const conditions = [];
    if (target) {
      conditions.push(eq(importLogs.target, target as "deliverable_style" | "brand_reference"));
    }
    if (source) {
      conditions.push(eq(importLogs.source, source as "bigged" | "dribbble" | "manual_url" | "file_upload" | "page_scrape"));
    }
    if (startDate) {
      conditions.push(gte(importLogs.createdAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(importLogs.createdAt, new Date(endDate)));
    }

    // Fetch logs with user info
    const logs = await db
      .select({
        id: importLogs.id,
        source: importLogs.source,
        target: importLogs.target,
        triggeredBy: importLogs.triggeredBy,
        triggeredByEmail: importLogs.triggeredByEmail,
        searchQuery: importLogs.searchQuery,
        sourceUrl: importLogs.sourceUrl,
        totalAttempted: importLogs.totalAttempted,
        totalSuccessful: importLogs.totalSuccessful,
        totalFailed: importLogs.totalFailed,
        totalSkipped: importLogs.totalSkipped,
        importedItems: importLogs.importedItems,
        failedItems: importLogs.failedItems,
        skippedItems: importLogs.skippedItems,
        processingTimeMs: importLogs.processingTimeMs,
        confidenceThreshold: importLogs.confidenceThreshold,
        status: importLogs.status,
        errorMessage: importLogs.errorMessage,
        startedAt: importLogs.startedAt,
        completedAt: importLogs.completedAt,
        createdAt: importLogs.createdAt,
        userName: users.name,
      })
      .from(importLogs)
      .leftJoin(users, eq(importLogs.triggeredBy, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(importLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(importLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Get summary stats
    const [stats] = await db
      .select({
        totalLogs: sql<number>`count(*)`,
        totalImported: sql<number>`coalesce(sum(${importLogs.totalSuccessful}), 0)`,
        totalFailed: sql<number>`coalesce(sum(${importLogs.totalFailed}), 0)`,
        totalSkipped: sql<number>`coalesce(sum(${importLogs.totalSkipped}), 0)`,
      })
      .from(importLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return NextResponse.json({
      success: true,
      data: {
        logs,
        pagination: {
          total: Number(count),
          limit,
          offset,
          hasMore: offset + logs.length < Number(count),
        },
        stats: {
          totalLogs: Number(stats.totalLogs),
          totalImported: Number(stats.totalImported),
          totalFailed: Number(stats.totalFailed),
          totalSkipped: Number(stats.totalSkipped),
        },
      },
    });
  } catch (error) {
    console.error("Failed to fetch import logs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch import logs" },
      { status: 500 }
    );
  }
}

// Get a single import log by ID
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await db.delete(importLogs).where(eq(importLogs.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete import log:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete import log" },
      { status: 500 }
    );
  }
}
