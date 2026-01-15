import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/require-auth";
import { withErrorHandling, successResponse, Errors } from "@/lib/errors";
import { db } from "@/db";
import { users, tasks, taskFiles, taskMessages } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  return withErrorHandling(async () => {
    await requireAdmin();

    const { userId } = await params;

    // Check if user exists
    const userToDelete = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userToDelete.length === 0) {
      throw Errors.notFound("User");
    }

    // Prevent deleting admin users
    if (userToDelete[0].role === "ADMIN") {
      throw Errors.badRequest("Cannot delete admin users");
    }

    // For freelancers, unassign them from any tasks first
    if (userToDelete[0].role === "FREELANCER") {
      await db
        .update(tasks)
        .set({ freelancerId: null })
        .where(eq(tasks.freelancerId, userId));
    }

    // Delete any task files uploaded by this user to other users' tasks
    await db.delete(taskFiles).where(eq(taskFiles.uploadedBy, userId));

    // Delete any task messages sent by this user
    await db.delete(taskMessages).where(eq(taskMessages.senderId, userId));

    // Delete the user (cascades to sessions, accounts, notifications, creditTransactions, chatDrafts, freelancerProfiles, and tasks as client)
    await db.delete(users).where(eq(users.id, userId));

    return successResponse({ success: true });
  }, { endpoint: "DELETE /api/admin/clients/[userId]" });
}
