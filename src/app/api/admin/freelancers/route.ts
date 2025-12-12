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

    const freelancers = await db
      .select({
        id: freelancerProfiles.id,
        userId: freelancerProfiles.userId,
        status: freelancerProfiles.status,
        skills: freelancerProfiles.skills,
        specializations: freelancerProfiles.specializations,
        portfolioUrls: freelancerProfiles.portfolioUrls,
        bio: freelancerProfiles.bio,
        completedTasks: freelancerProfiles.completedTasks,
        rating: freelancerProfiles.rating,
        createdAt: freelancerProfiles.createdAt,
        user: {
          name: users.name,
          email: users.email,
        },
      })
      .from(freelancerProfiles)
      .leftJoin(users, eq(freelancerProfiles.userId, users.id))
      .orderBy(desc(freelancerProfiles.createdAt));

    return NextResponse.json({ freelancers });
  } catch (error) {
    console.error("Admin freelancers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch freelancers" },
      { status: 500 }
    );
  }
}
