import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/require-auth";
import { withErrorHandling, successResponse, Errors } from "@/lib/errors";
import { auditHelpers, actorFromUser } from "@/lib/audit";
import { db } from "@/db";
import { platformSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  return withErrorHandling(async () => {
    await requireAdmin();

    const settings = await db.select().from(platformSettings);

    // Convert to key-value object
    const settingsMap: Record<string, unknown> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    return successResponse({ settings: settingsMap });
  }, { endpoint: "GET /api/admin/settings" });
}

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAdmin();

    const body = await request.json();
    const { key, value, description } = body;

    if (!key || value === undefined) {
      throw Errors.badRequest("Key and value are required");
    }

    // Upsert the setting
    const existing = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, key))
      .limit(1);

    const previousValue = existing.length > 0 ? existing[0].value : null;

    if (existing.length > 0) {
      await db
        .update(platformSettings)
        .set({ value, description, updatedAt: new Date() })
        .where(eq(platformSettings.key, key));
    } else {
      await db.insert(platformSettings).values({
        key,
        value,
        description,
      });
    }

    // Audit log: Track settings changes for compliance
    auditHelpers.settingsUpdate(
      actorFromUser(session.user),
      key,
      previousValue,
      value,
      "POST /api/admin/settings"
    );

    return successResponse({ success: true });
  }, { endpoint: "POST /api/admin/settings" });
}
