import { NextRequest } from "next/server";
import { db } from "@/db";
import { freelancerProfiles, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notify, adminNotifications } from "@/lib/notifications";
import { config } from "@/lib/config";
import { requireAdmin } from "@/lib/require-auth";
import { withErrorHandling, successResponse, Errors } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { adminFreelancerActionSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin();

    const body = await request.json();
    const { freelancerId } = adminFreelancerActionSchema.parse(body);

    // Get freelancer profile with user info in a single query (fixes N+1)
    const profileWithUser = await db
      .select({
        profile: freelancerProfiles,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(freelancerProfiles)
      .innerJoin(users, eq(freelancerProfiles.userId, users.id))
      .where(eq(freelancerProfiles.id, freelancerId))
      .limit(1);

    if (!profileWithUser.length) {
      throw Errors.notFound("Freelancer");
    }

    const { profile, user: freelancerUser } = profileWithUser[0];

    // Update status and user role in parallel
    await Promise.all([
      db
        .update(freelancerProfiles)
        .set({
          status: "APPROVED",
          updatedAt: new Date(),
        })
        .where(eq(freelancerProfiles.id, freelancerId)),
      db
        .update(users)
        .set({
          role: "FREELANCER",
          updatedAt: new Date(),
        })
        .where(eq(users.id, profile.userId)),
    ]);

    // Notify the freelancer (in-app + email)
    await notify({
      userId: freelancerUser.id,
      type: "FREELANCER_APPROVED",
      title: "Application Approved!",
      content: "Congratulations! Your freelancer application has been approved. You can now start accepting tasks.",
      taskUrl: `${config.app.url}/portal`,
    });

    // Send admin notification (includes Slack)
    try {
      await adminNotifications.freelancerApproved({
        name: freelancerUser.name,
        email: freelancerUser.email,
        userId: profile.userId,
        skills: profile.skills || [],
        portfolioUrls: profile.portfolioUrls || [],
        approvedBy: "Admin",
      });
    } catch (emailError) {
      logger.error({ err: emailError }, "Failed to send admin notification");
    }

    logger.info({ freelancerId, userId: profile.userId }, "Freelancer approved");

    return successResponse({ success: true });
  }, { endpoint: "POST /api/admin/freelancers/approve" });
}
