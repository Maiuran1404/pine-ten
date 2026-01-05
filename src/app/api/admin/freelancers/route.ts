import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { freelancerProfiles, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

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

    // Get all users with FREELANCER role, left joining their profiles
    // This shows artists who haven't completed onboarding too
    const freelancers = await db
      .select({
        id: freelancerProfiles.id,
        odUserId: users.id,
        status: freelancerProfiles.status,
        skills: freelancerProfiles.skills,
        specializations: freelancerProfiles.specializations,
        portfolioUrls: freelancerProfiles.portfolioUrls,
        bio: freelancerProfiles.bio,
        completedTasks: freelancerProfiles.completedTasks,
        rating: freelancerProfiles.rating,
        profileCreatedAt: freelancerProfiles.createdAt,
        userCreatedAt: users.createdAt,
        user: {
          name: users.name,
          email: users.email,
        },
      })
      .from(users)
      .leftJoin(freelancerProfiles, eq(users.id, freelancerProfiles.userId))
      .where(eq(users.role, "FREELANCER"))
      .orderBy(desc(users.createdAt));

    // Transform the data to handle users without profiles
    const transformedFreelancers = freelancers.map((f) => ({
      id: f.id || f.odUserId, // Use profile ID if exists, otherwise user ID
      userId: f.odUserId,
      status: f.status || "NOT_ONBOARDED", // Show as not onboarded if no profile
      skills: f.skills || [],
      specializations: f.specializations || [],
      portfolioUrls: f.portfolioUrls || [],
      bio: f.bio,
      completedTasks: f.completedTasks || 0,
      rating: f.rating,
      createdAt: f.profileCreatedAt || f.userCreatedAt,
      user: f.user,
    }));

    return NextResponse.json({ freelancers: transformedFreelancers });
  } catch (error) {
    console.error("Admin freelancers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch freelancers" },
      { status: 500 }
    );
  }
}
