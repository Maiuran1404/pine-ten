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
    const tableName = searchParams.get("table");
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

    // Get specific table data
    let data;
    let total = 0;

    switch (tableName) {
      case "users": {
        const [countRes] = await db.select({ count: count() }).from(users);
        total = countRes.count;
        data = await db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
        break;
      }
      case "sessions": {
        const [countRes] = await db.select({ count: count() }).from(sessions);
        total = countRes.count;
        data = await db.select().from(sessions).orderBy(desc(sessions.createdAt)).limit(limit).offset(offset);
        break;
      }
      case "accounts": {
        const [countRes] = await db.select({ count: count() }).from(accounts);
        total = countRes.count;
        data = await db.select().from(accounts).orderBy(desc(accounts.createdAt)).limit(limit).offset(offset);
        break;
      }
      case "verifications": {
        const [countRes] = await db.select({ count: count() }).from(verifications);
        total = countRes.count;
        data = await db.select().from(verifications).orderBy(desc(verifications.createdAt)).limit(limit).offset(offset);
        break;
      }
      case "companies": {
        const [countRes] = await db.select({ count: count() }).from(companies);
        total = countRes.count;
        data = await db.select().from(companies).orderBy(desc(companies.createdAt)).limit(limit).offset(offset);
        break;
      }
      case "freelancerProfiles": {
        const [countRes] = await db.select({ count: count() }).from(freelancerProfiles);
        total = countRes.count;
        data = await db.select().from(freelancerProfiles).orderBy(desc(freelancerProfiles.createdAt)).limit(limit).offset(offset);
        break;
      }
      case "taskCategories": {
        const [countRes] = await db.select({ count: count() }).from(taskCategories);
        total = countRes.count;
        data = await db.select().from(taskCategories).orderBy(desc(taskCategories.createdAt)).limit(limit).offset(offset);
        break;
      }
      case "tasks": {
        const [countRes] = await db.select({ count: count() }).from(tasks);
        total = countRes.count;
        data = await db.select().from(tasks).orderBy(desc(tasks.createdAt)).limit(limit).offset(offset);
        break;
      }
      case "taskFiles": {
        const [countRes] = await db.select({ count: count() }).from(taskFiles);
        total = countRes.count;
        data = await db.select().from(taskFiles).orderBy(desc(taskFiles.createdAt)).limit(limit).offset(offset);
        break;
      }
      case "taskMessages": {
        const [countRes] = await db.select({ count: count() }).from(taskMessages);
        total = countRes.count;
        data = await db.select().from(taskMessages).orderBy(desc(taskMessages.createdAt)).limit(limit).offset(offset);
        break;
      }
      case "styleReferences": {
        const [countRes] = await db.select({ count: count() }).from(styleReferences);
        total = countRes.count;
        data = await db.select().from(styleReferences).orderBy(desc(styleReferences.createdAt)).limit(limit).offset(offset);
        break;
      }
      case "notifications": {
        const [countRes] = await db.select({ count: count() }).from(notifications);
        total = countRes.count;
        data = await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(limit).offset(offset);
        break;
      }
      case "creditTransactions": {
        const [countRes] = await db.select({ count: count() }).from(creditTransactions);
        total = countRes.count;
        data = await db.select().from(creditTransactions).orderBy(desc(creditTransactions.createdAt)).limit(limit).offset(offset);
        break;
      }
      case "platformSettings": {
        const [countRes] = await db.select({ count: count() }).from(platformSettings);
        total = countRes.count;
        data = await db.select().from(platformSettings).orderBy(desc(platformSettings.updatedAt)).limit(limit).offset(offset);
        break;
      }
      default:
        return NextResponse.json({ error: "Invalid table name" }, { status: 400 });
    }

    return NextResponse.json({
      table: tableName,
      total,
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
