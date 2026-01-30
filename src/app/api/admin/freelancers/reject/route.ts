import { NextRequest } from "next/server";
import { db } from "@/db";
import { freelancerProfiles, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { adminNotifications, sendEmail, emailTemplates } from "@/lib/notifications";
import { requireAdmin } from "@/lib/require-auth";
import { withErrorHandling, successResponse, Errors } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { adminFreelancerActionSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin();

    const body = await request.json();
    const { freelancerId, reason } = adminFreelancerActionSchema.parse(body);

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

    // Update status to rejected
    await db
      .update(freelancerProfiles)
      .set({
        status: "REJECTED",
        updatedAt: new Date(),
      })
      .where(eq(freelancerProfiles.id, freelancerId));

    // Send rejection email to freelancer
    try {
      const rejectionEmail = emailTemplates.freelancerRejected(freelancerUser.name);
      await sendEmail({
        to: freelancerUser.email,
        subject: rejectionEmail.subject,
        html: rejectionEmail.html,
      });

      // Send admin notification (includes Slack)
      await adminNotifications.freelancerRejected({
        name: freelancerUser.name,
        email: freelancerUser.email,
        userId: profile.userId,
        reason,
        rejectedBy: "Admin",
      });
    } catch (emailError) {
      logger.error({ err: emailError }, "Failed to send rejection notifications");
    }

    logger.info({ freelancerId, reason }, "Freelancer rejected");

    return successResponse({ success: true });
  }, { endpoint: "POST /api/admin/freelancers/reject" });
}
