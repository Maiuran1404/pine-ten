import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { freelancerProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await db
      .select()
      .from(freelancerProfiles)
      .where(eq(freelancerProfiles.userId, session.user.id))
      .limit(1);

    if (!profile.length) {
      return NextResponse.json({ status: "NOT_FOUND" });
    }

    return NextResponse.json(profile[0]);
  } catch (error) {
    logger.error({ error }, "Profile fetch error");
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bio, skills, specializations, portfolioUrls, whatsappNumber, availability } = body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (bio !== undefined) updateData.bio = bio;
    if (skills !== undefined) updateData.skills = skills;
    if (specializations !== undefined) updateData.specializations = specializations;
    if (portfolioUrls !== undefined) updateData.portfolioUrls = portfolioUrls;
    if (whatsappNumber !== undefined) updateData.whatsappNumber = whatsappNumber;
    if (availability !== undefined) updateData.availability = availability;

    await db
      .update(freelancerProfiles)
      .set(updateData)
      .where(eq(freelancerProfiles.userId, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Profile update error");
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
