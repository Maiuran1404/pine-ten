import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { updateUserSettingsSchema } from "@/lib/validations";
import { handleZodError } from "@/lib/errors";
import { ZodError } from "zod";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userResult = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        image: users.image,
        notificationPreferences: users.notificationPreferences,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!userResult.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: userResult[0] });
  } catch (error) {
    logger.error({ error }, "Settings fetch error");
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = updateUserSettingsSchema.parse(body);

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (validated.name !== undefined) {
      updateData.name = validated.name;
    }
    if (validated.phone !== undefined) {
      updateData.phone = validated.phone;
    }
    if (validated.notificationPreferences !== undefined) {
      updateData.notificationPreferences = validated.notificationPreferences;
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    logger.error({ error }, "Settings update error");
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
