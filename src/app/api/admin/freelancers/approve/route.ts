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

    // Get freelancer profile
    const profile = await db
      .select()
      .from(freelancerProfiles)
      .where(eq(freelancerProfiles.id, freelancerId))
      .limit(1);

    if (!profile.length) {
      throw Errors.notFound("Freelancer");
    }

    // Update status to approved
    await db
      .update(freelancerProfiles)
      .set({
        status: "APPROVED",
        updatedAt: new Date(),
      })
      .where(eq(freelancerProfiles.id, freelancerId));

    // Ensure user role is set to FREELANCER (safeguard in case onboarding didn't set it)
    await db
      .update(users)
      .set({
        role: "FREELANCER",
        updatedAt: new Date(),
      })
      .where(eq(users.id, profile[0].userId));

    // Get user info for notification
    const freelancerUser = await db
      .select()
      .from(users)
      .where(eq(users.id, profile[0].userId))
      .limit(1);

    if (freelancerUser.length) {
      // Notify the freelancer (in-app + email)
      await notify({
        userId: freelancerUser[0].id,
        type: "FREELANCER_APPROVED",
        title: "Application Approved!",
        content: "Congratulations! Your freelancer application has been approved. You can now start accepting tasks.",
        taskUrl: `${config.app.url}/portal`,
      });

      // Send admin notification
      try {
        await adminNotifications.freelancerApproved({
          name: freelancerUser[0].name,
          email: freelancerUser[0].email,
        });
      } catch (emailError) {
        logger.error({ err: emailError }, "Failed to send admin notification");
      }
    }

    logger.info({ freelancerId, userId: profile[0].userId }, "Freelancer approved");

    return successResponse({ success: true });
  }, { endpoint: "POST /api/admin/freelancers/approve" });
}
