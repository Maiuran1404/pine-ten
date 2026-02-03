import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  earlyAccessCodes,
  earlyAccessCodeUsages,
  earlyAccessWaitlist,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const useCodeSchema = z.object({
  code: z.string().min(1, "Code is required"),
  userId: z.string().min(1, "User ID is required"),
  email: z.string().email().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parseResult = useCodeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { code, userId, email } = parseResult.data;

    // Normalize code
    const normalizedCode = code.toUpperCase().trim();

    // Find and validate the code
    const accessCode = await db.query.earlyAccessCodes.findFirst({
      where: eq(earlyAccessCodes.code, normalizedCode),
    });

    if (!accessCode) {
      return NextResponse.json(
        { success: false, error: "Invalid invite code" },
        { status: 400 }
      );
    }

    if (!accessCode.isActive) {
      return NextResponse.json(
        { success: false, error: "This code is no longer active" },
        { status: 400 }
      );
    }

    if (accessCode.expiresAt && accessCode.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "This code has expired" },
        { status: 400 }
      );
    }

    if (accessCode.maxUses && accessCode.usedCount >= accessCode.maxUses) {
      return NextResponse.json(
        { success: false, error: "This code has reached its usage limit" },
        { status: 400 }
      );
    }

    // Record the usage and increment the count
    await db.transaction(async (tx) => {
      // Insert usage record
      await tx.insert(earlyAccessCodeUsages).values({
        codeId: accessCode.id,
        userId: userId,
      });

      // Increment the used count
      await tx
        .update(earlyAccessCodes)
        .set({
          usedCount: sql`${earlyAccessCodes.usedCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(earlyAccessCodes.id, accessCode.id));

      // If the user was on the waitlist, update their status
      if (email) {
        await tx
          .update(earlyAccessWaitlist)
          .set({
            status: "REGISTERED",
            registeredAt: new Date(),
          })
          .where(eq(earlyAccessWaitlist.email, email.toLowerCase().trim()));
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error using early access code:", error);
    return NextResponse.json(
      { success: false, error: "Failed to use code" },
      { status: 500 }
    );
  }
}
