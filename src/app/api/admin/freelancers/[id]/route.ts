import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { freelancerProfiles, users, tasks } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { requireAdmin } from "@/lib/require-auth";
import { withErrorHandling, successResponse, Errors } from "@/lib/errors";

const updateFreelancerSchema = z.object({
  // User fields
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  // Profile fields
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  skills: z.array(z.string()).optional(),
  specializations: z.array(z.string()).optional(),
  portfolioUrls: z.array(z.string().url()).optional(),
  bio: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
  hourlyRate: z.string().nullable().optional(),
  whatsappNumber: z.string().nullable().optional(),
  availability: z.boolean().optional(),
  rating: z.string().nullable().optional(),
});

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
      throw Errors.notFound("Freelancer");
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    await requireAdmin();

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateFreelancerSchema.parse(body);

    // Check if freelancer exists
    const existingFreelancer = await db
      .select({
        id: freelancerProfiles.id,
        userId: freelancerProfiles.userId,
      })
      .from(freelancerProfiles)
      .where(eq(freelancerProfiles.id, id))
      .limit(1);

    if (existingFreelancer.length === 0) {
      throw Errors.notFound("Freelancer");
    }

    const freelancer = existingFreelancer[0];

    // Separate user fields from profile fields
    const { name, email, ...profileFields } = validatedData;

    // Update user if name or email provided
    if (name || email) {
      const userUpdates: Record<string, string> = {};
      if (name) userUpdates.name = name;
      if (email) userUpdates.email = email;

      await db
        .update(users)
        .set(userUpdates)
        .where(eq(users.id, freelancer.userId));
    }

    // Update profile fields
    if (Object.keys(profileFields).length > 0) {
      await db
        .update(freelancerProfiles)
        .set({
          ...profileFields,
          updatedAt: new Date(),
        })
        .where(eq(freelancerProfiles.id, id));
    }

    // Fetch updated freelancer
    const updatedFreelancer = await db
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

    return successResponse({ freelancer: updatedFreelancer[0] });
  }, { endpoint: "PUT /api/admin/freelancers/[id]" });
}
