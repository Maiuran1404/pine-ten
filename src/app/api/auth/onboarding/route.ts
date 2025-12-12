import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { users, freelancerProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, data } = body;

    if (type === "client") {
      // Update user with onboarding data
      await db
        .update(users)
        .set({
          onboardingCompleted: true,
          onboardingData: data,
          updatedAt: new Date(),
        })
        .where(eq(users.id, session.user.id));

      return NextResponse.json({ success: true });
    }

    if (type === "freelancer") {
      // Update user role and create freelancer profile
      await db
        .update(users)
        .set({
          role: "FREELANCER",
          phone: data.whatsappNumber || null,
          onboardingCompleted: true,
          onboardingData: { bio: data.bio },
          updatedAt: new Date(),
        })
        .where(eq(users.id, session.user.id));

      // Create freelancer profile
      await db.insert(freelancerProfiles).values({
        userId: session.user.id,
        status: "PENDING", // Needs admin approval
        skills: data.skills,
        specializations: data.specializations,
        portfolioUrls: data.portfolioUrls,
        bio: data.bio,
        hourlyRate: data.hourlyRate || null,
        whatsappNumber: data.whatsappNumber || null,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
