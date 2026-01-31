import { NextRequest } from "next/server";
import { db } from "@/db";
import { freelancerProfiles, users, tasks } from "@/db/schema";
import { eq, count, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/require-auth";
import { withErrorHandling, successResponse, notFoundResponse } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    await requireAdmin();

    const { id } = await params;

    // Get freelancer profile with user info
    const freelancerResult = await db
      .select({
        id: freelancerProfiles.id,
        userId: freelancerProfiles.userId,
        status: freelancerProfiles.status,
        skills: freelancerProfiles.skills,
        specializations: freelancerProfiles.specializations,
        portfolioUrls: freelancerProfiles.portfolioUrls,
        bio: freelancerProfiles.bio,
        timezone: freelancerProfiles.timezone,
        hourlyRate: freelancerProfiles.hourlyRate,
        rating: freelancerProfiles.rating,
        completedTasks: freelancerProfiles.completedTasks,
        whatsappNumber: freelancerProfiles.whatsappNumber,
        availability: freelancerProfiles.availability,
        createdAt: freelancerProfiles.createdAt,
        updatedAt: freelancerProfiles.updatedAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
          createdAt: users.createdAt,
        },
      })
      .from(freelancerProfiles)
      .innerJoin(users, eq(users.id, freelancerProfiles.userId))
      .where(eq(freelancerProfiles.id, id))
      .limit(1);

    if (freelancerResult.length === 0) {
      return notFoundResponse("Freelancer not found");
    }

    const freelancer = freelancerResult[0];

    // Get task statistics
    const taskStats = await db
      .select({
        status: tasks.status,
        count: count(),
      })
      .from(tasks)
      .where(eq(tasks.freelancerId, freelancer.userId))
      .groupBy(tasks.status);

    // Get recent tasks
    const recentTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        createdAt: tasks.createdAt,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .where(eq(tasks.freelancerId, freelancer.userId))
      .orderBy(tasks.createdAt)
      .limit(10);

    // Calculate task counts
    const taskCounts = {
      total: taskStats.reduce((sum, s) => sum + Number(s.count), 0),
      completed: taskStats.find((s) => s.status === "COMPLETED")?.count || 0,
      inProgress: taskStats.find((s) => s.status === "IN_PROGRESS")?.count || 0,
      pending: taskStats.find((s) => s.status === "PENDING")?.count || 0,
      inReview: taskStats.find((s) => s.status === "IN_REVIEW")?.count || 0,
    };

    return successResponse({
      freelancer: {
        ...freelancer,
        taskCounts,
        recentTasks,
      },
    });
  }, { endpoint: "GET /api/admin/freelancers/[id]" });
}
