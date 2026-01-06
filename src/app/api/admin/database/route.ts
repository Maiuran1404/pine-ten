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
  companies,
} from "@/db/schema";
import { count, desc } from "drizzle-orm";

// Table configuration for DRY code
const tableConfig = {
  users: { table: users, orderBy: users.createdAt },
  sessions: { table: sessions, orderBy: sessions.createdAt },
  accounts: { table: accounts, orderBy: accounts.createdAt },
  verifications: { table: verifications, orderBy: verifications.createdAt },
  companies: { table: companies, orderBy: companies.createdAt },
  freelancerProfiles: { table: freelancerProfiles, orderBy: freelancerProfiles.createdAt },
  taskCategories: { table: taskCategories, orderBy: taskCategories.createdAt },
  tasks: { table: tasks, orderBy: tasks.createdAt },
  taskFiles: { table: taskFiles, orderBy: taskFiles.createdAt },
  taskMessages: { table: taskMessages, orderBy: taskMessages.createdAt },
  styleReferences: { table: styleReferences, orderBy: styleReferences.createdAt },
  notifications: { table: notifications, orderBy: notifications.createdAt },
  creditTransactions: { table: creditTransactions, orderBy: creditTransactions.createdAt },
  platformSettings: { table: platformSettings, orderBy: platformSettings.updatedAt },
} as const;

type TableName = keyof typeof tableConfig;

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
      const safeCount = async (name: string, query: Promise<{ count: number }[]>) => {
        try {
          const [r] = await query;
          return { name, count: r.count };
        } catch (err) {
          console.error(`Failed to count ${name}:`, err);
          return { name, count: 0 };
        }
      };

      // All count queries run in parallel
      const tableCounts = await Promise.all([
        safeCount("users", db.select({ count: count() }).from(users)),
        safeCount("sessions", db.select({ count: count() }).from(sessions)),
        safeCount("accounts", db.select({ count: count() }).from(accounts)),
        safeCount("verifications", db.select({ count: count() }).from(verifications)),
        safeCount("companies", db.select({ count: count() }).from(companies)),
        safeCount("freelancerProfiles", db.select({ count: count() }).from(freelancerProfiles)),
        safeCount("taskCategories", db.select({ count: count() }).from(taskCategories)),
        safeCount("tasks", db.select({ count: count() }).from(tasks)),
        safeCount("taskFiles", db.select({ count: count() }).from(taskFiles)),
        safeCount("taskMessages", db.select({ count: count() }).from(taskMessages)),
        safeCount("styleReferences", db.select({ count: count() }).from(styleReferences)),
        safeCount("notifications", db.select({ count: count() }).from(notifications)),
        safeCount("creditTransactions", db.select({ count: count() }).from(creditTransactions)),
        safeCount("platformSettings", db.select({ count: count() }).from(platformSettings)),
      ]);

      return NextResponse.json({ tables: tableCounts });
    }

    // Validate table name
    if (!(tableName in tableConfig)) {
      return NextResponse.json({ error: "Invalid table name" }, { status: 400 });
    }

    const config = tableConfig[tableName];

    // Run count and data queries in parallel (fixes N+1 pattern)
    const [countResult, data] = await Promise.all([
      db.select({ count: count() }).from(config.table),
      db.select().from(config.table).orderBy(desc(config.orderBy)).limit(limit).offset(offset),
    ]);

    return NextResponse.json({
      table: tableName,
      total: countResult[0].count,
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
