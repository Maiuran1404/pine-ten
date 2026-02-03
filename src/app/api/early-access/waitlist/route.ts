import { NextResponse } from "next/server";
import { db } from "@/db";
import { earlyAccessWaitlist } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const waitlistSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  name: z.string().optional(),
  referralSource: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate the request body
    const parseResult = waitlistSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, name, referralSource } = parseResult.data;

    // Check if email already exists on the waitlist
    const existingEntry = await db.query.earlyAccessWaitlist.findFirst({
      where: eq(earlyAccessWaitlist.email, email.toLowerCase().trim()),
    });

    if (existingEntry) {
      // Email already on waitlist - still return success to avoid email enumeration
      return NextResponse.json(
        {
          success: true,
          message: "You're on the list! We'll notify you when a spot opens.",
          alreadyRegistered: true,
        },
        { status: 200 }
      );
    }

    // Add to waitlist
    await db.insert(earlyAccessWaitlist).values({
      email: email.toLowerCase().trim(),
      name: name?.trim() || null,
      referralSource: referralSource?.trim() || null,
      status: "PENDING",
    });

    return NextResponse.json(
      {
        success: true,
        message: "You're on the list! We'll notify you when a spot opens.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding to waitlist:", error);
    return NextResponse.json(
      { success: false, error: "Failed to join waitlist. Please try again." },
      { status: 500 }
    );
  }
}
