import { NextRequest } from "next/server";
import { db } from "@/db";
import { freelancerProfiles, users } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { notify, adminNotifications, sendEmail, emailTemplates } from "@/lib/notifications";
import { config } from "@/lib/config";
import { requireAdmin } from "@/lib/require-auth";
import { withErrorHandling, successResponse, Errors } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { auditHelpers, actorFromUser } from "@/lib/audit";
import { z } from "zod";

// Security: Limit bulk operations to prevent DoS attacks
const MAX_BULK_SIZE = 100;

const bulkActionSchema = z.object({
  freelancerIds: z
    .array(z.string())
    .min(1, "At least one freelancer ID is required")
    .max(MAX_BULK_SIZE, `Cannot process more than ${MAX_BULK_SIZE} items at once`),
  action: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAdmin();

    const body = await request.json();
    const { freelancerIds, action, reason } = bulkActionSchema.parse(body);

    // Get all freelancer profiles with user info in a single query
    const profilesWithUsers = await db
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
      .where(inArray(freelancerProfiles.id, freelancerIds));

    if (profilesWithUsers.length === 0) {
      throw Errors.notFound("Freelancers");
    }

    const results = {
      success: [] as string[],
      failed: [] as { id: string; error: string }[],
    };

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

    // Bulk update all profiles at once
    await db
      .update(freelancerProfiles)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(inArray(freelancerProfiles.id, freelancerIds));

    // If approving, update user roles in bulk
    if (action === "approve") {
      const userIds = profilesWithUsers.map((p) => p.profile.userId);
      await db
        .update(users)
        .set({
          role: "FREELANCER",
          updatedAt: new Date(),
        })
        .where(inArray(users.id, userIds));
    }

    // Send notifications to each user (in parallel)
    const notificationPromises = profilesWithUsers.map(async ({ profile, user }) => {
      try {
        if (action === "approve") {
          // Notify the freelancer
          await notify({
            userId: user.id,
            type: "FREELANCER_APPROVED",
            title: "Application Approved!",
            content: "Congratulations! Your freelancer application has been approved. You can now start accepting tasks.",
            taskUrl: `${config.app.url}/portal`,
          });

          // Admin notification
          await adminNotifications.freelancerApproved({
            name: user.name,
            email: user.email,
          });
        } else {
          // Send rejection email
          const rejectionEmail = emailTemplates.freelancerRejected(user.name);
          await sendEmail({
            to: user.email,
            subject: rejectionEmail.subject,
            html: rejectionEmail.html,
          });

          // Admin notification
          await adminNotifications.freelancerRejected({
            name: user.name,
            email: user.email,
          });
        }

        results.success.push(profile.id);
      } catch (error) {
        logger.error({ err: error, freelancerId: profile.id }, "Failed to send notification for bulk action");
        results.failed.push({
          id: profile.id,
          error: error instanceof Error ? error.message : "Notification failed",
        });
      }
    });

    await Promise.allSettled(notificationPromises);

    logger.info(
      {
        action,
        count: freelancerIds.length,
        successCount: results.success.length,
        failedCount: results.failed.length,
        reason
      },
      "Bulk freelancer action completed"
    );

    // Audit log: Track bulk freelancer actions for compliance
    auditHelpers.freelancerBulkAction(
      actorFromUser(session.user),
      action,
      freelancerIds,
      results.success.length,
      results.failed.length,
      "POST /api/admin/freelancers/bulk"
    );

    return successResponse({
      action,
      total: freelancerIds.length,
      success: results.success.length,
      failed: results.failed.length,
      failedIds: results.failed,
    });
  }, { endpoint: "POST /api/admin/freelancers/bulk" });
}
