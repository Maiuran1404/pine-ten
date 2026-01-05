import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { users, tasks, taskFiles, taskMessages } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
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

    const { userId } = await params;

    // Check if user exists
    const userToDelete = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userToDelete.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent deleting admin users
    if (userToDelete[0].role === "ADMIN") {
      return NextResponse.json(
        { error: "Cannot delete admin users" },
        { status: 400 }
      );
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
