import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  users,
  sessions,
  accounts,
  verifications,
  freelancerProfiles,
  taskCategories,
  tasks,
  taskFiles,
  taskMessages,
  styleReferences,
  notifications,
  creditTransactions,
  platformSettings,
} from "@/db/schema";
import { count, desc } from "drizzle-orm";

const TABLES = {
  users,
  sessions,
  accounts,
  verifications,
  freelancerProfiles,
  taskCategories,
  tasks,
  taskFiles,
  taskMessages,
  styleReferences,
  notifications,
  creditTransactions,
  platformSettings,
} as const;

type TableName = keyof typeof TABLES;

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

    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get("table") as TableName | null;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // If no table specified, return table list with counts
    if (!tableName) {
      const tableCounts = await Promise.all(
        Object.entries(TABLES).map(async ([name, table]) => {
          try {
            const [result] = await db.select({ count: count() }).from(table);
            return { name, count: result.count };
          } catch {
            return { name, count: 0 };
          }
        })
      );

      return NextResponse.json({ tables: tableCounts });
    }

    // Get specific table data
    if (!TABLES[tableName]) {
      return NextResponse.json({ error: "Invalid table name" }, { status: 400 });
    }

    const table = TABLES[tableName];

    // Get total count
    const [countResult] = await db.select({ count: count() }).from(table);

    // Get data with pagination - handle tables with and without createdAt
    let data;
    if ('createdAt' in table) {
      data = await db
        .select()
        .from(table)
        .orderBy(desc((table as typeof users).createdAt))
        .limit(limit)
        .offset(offset);
    } else {
      data = await db
        .select()
        .from(table)
        .limit(limit)
        .offset(offset);
    }

    return NextResponse.json({
      table: tableName,
      total: countResult.count,
      data,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Admin database error:", error);
    return NextResponse.json(
      { error: "Failed to fetch database data" },
      { status: 500 }
    );
  }
}
