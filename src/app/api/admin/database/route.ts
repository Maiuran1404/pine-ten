import { NextRequest } from "next/server";
import { db } from "@/db";
import { requireAdmin } from "@/lib/require-auth";
import { withErrorHandling, successResponse, Errors } from "@/lib/errors";
import { auditHelpers, actorFromUser } from "@/lib/audit";
import { logger } from "@/lib/logger";
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

// Sensitive fields that should NEVER be exposed via the API
// These could be used for session hijacking, account takeover, etc.
const SENSITIVE_FIELDS: Record<string, string[]> = {
  sessions: ["token"], // Session token - would allow session hijacking
  accounts: ["accessToken", "refreshToken", "idToken", "password"], // OAuth tokens and passwords
  verifications: ["value"], // Verification tokens - could be used to bypass email verification
};

/**
 * Sanitize data by removing sensitive fields
 * This prevents accidental exposure of tokens, passwords, etc.
 */
function sanitizeData<T extends Record<string, unknown>>(
  tableName: string,
  data: T[]
): Partial<T>[] {
  const fieldsToRemove = SENSITIVE_FIELDS[tableName];
  if (!fieldsToRemove || fieldsToRemove.length === 0) {
    return data;
  }

  return data.map((row) => {
    const sanitized = { ...row };
    for (const field of fieldsToRemove) {
      if (field in sanitized) {
        delete sanitized[field];
      }
    }
    return sanitized;
  });
}

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
  return withErrorHandling(async () => {
    const session = await requireAdmin();

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
          logger.error({ error: err, table: name }, "Failed to count table");
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

      return successResponse({ tables: tableCounts });
    }

    // Validate table name
    if (!(tableName in tableConfig)) {
      throw Errors.badRequest("Invalid table name");
    }

    const config = tableConfig[tableName];

    // Run count and data queries in parallel (fixes N+1 pattern)
    const [countResult, data] = await Promise.all([
      db.select({ count: count() }).from(config.table),
      db.select().from(config.table).orderBy(desc(config.orderBy)).limit(limit).offset(offset),
    ]);

    // Sanitize data to remove sensitive fields before returning
    const sanitizedData = sanitizeData(tableName, data as Record<string, unknown>[]);

    // Audit log: Track database access for security monitoring
    // Fire-and-forget to avoid blocking the response
    auditHelpers.databaseAccess(
      actorFromUser(session.user),
      tableName,
      "GET /api/admin/database"
    );

    return successResponse({
      table: tableName,
      total: countResult[0].count,
      data: sanitizedData,
      limit,
      offset,
    });
  }, { endpoint: "GET /api/admin/database" });
}
