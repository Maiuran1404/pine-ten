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

    // Get freelancer profile
    const profile = await db
      .select()
      .from(freelancerProfiles)
      .where(eq(freelancerProfiles.id, freelancerId))
      .limit(1);

    if (!profile.length) {
      throw Errors.notFound("Freelancer");
    }

    // Update status to rejected
    await db
      .update(freelancerProfiles)
      .set({
        status: "REJECTED",
        updatedAt: new Date(),
      })
      .where(eq(freelancerProfiles.id, freelancerId));

    // Get user info for notification
    const freelancerUser = await db
      .select()
      .from(users)
      .where(eq(users.id, profile[0].userId))
      .limit(1);

    if (freelancerUser.length) {
      // Send rejection email to freelancer
      try {
        const rejectionEmail = emailTemplates.freelancerRejected(freelancerUser[0].name);
        await sendEmail({
          to: freelancerUser[0].email,
          subject: rejectionEmail.subject,
          html: rejectionEmail.html,
        });

        // Send admin notification
        await adminNotifications.freelancerRejected({
          name: freelancerUser[0].name,
          email: freelancerUser[0].email,
        });
      } catch (emailError) {
        logger.error({ err: emailError }, "Failed to send rejection notifications");
      }
    }

    logger.info({ freelancerId, reason }, "Freelancer rejected");

    return successResponse({ success: true });
  }, { endpoint: "POST /api/admin/freelancers/reject" });
}
