import { NextResponse } from "next/server";
import { db } from "@/db";
import { earlyAccessCodes } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { valid: false, error: "Code is required" },
        { status: 400 }
      );
    }

    // Normalize code: uppercase and trim whitespace
    const normalizedCode = code.toUpperCase().trim();

    // Find the code in the database
    const accessCode = await db.query.earlyAccessCodes.findFirst({
      where: eq(earlyAccessCodes.code, normalizedCode),
    });

    // Code doesn't exist
    if (!accessCode) {
      return NextResponse.json(
        { valid: false, error: "Invalid invite code" },
        { status: 200 }
      );
    }

    // Code is not active
    if (!accessCode.isActive) {
      return NextResponse.json(
        { valid: false, error: "This code is no longer active" },
        { status: 200 }
      );
    }

    // Code has expired
    if (accessCode.expiresAt && accessCode.expiresAt < new Date()) {
      return NextResponse.json(
        { valid: false, error: "This code has expired" },
        { status: 200 }
      );
    }

    // Code has reached usage limit
    if (accessCode.maxUses && accessCode.usedCount >= accessCode.maxUses) {
      return NextResponse.json(
        { valid: false, error: "This code has reached its usage limit" },
        { status: 200 }
      );
    }

    // Code is valid
    return NextResponse.json(
      {
        valid: true,
        codeId: accessCode.id,
        description: accessCode.description,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error validating early access code:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to validate code" },
      { status: 500 }
    );
  }
}
