import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { freelancerProfiles, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notify, adminNotifications, sendEmail, emailTemplates } from "@/lib/notifications";
import { config } from "@/lib/config";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { freelancerId } = body;

    if (!freelancerId) {
      return NextResponse.json(
        { error: "Freelancer ID is required" },
        { status: 400 }
      );
    }

    // Get freelancer profile
    const profile = await db
      .select()
      .from(freelancerProfiles)
      .where(eq(freelancerProfiles.id, freelancerId))
      .limit(1);

    if (!profile.length) {
      return NextResponse.json(
        { error: "Freelancer not found" },
        { status: 404 }
      );
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
        console.error("Failed to send admin notification:", emailError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Approve freelancer error:", error);
    return NextResponse.json(
      { error: "Failed to approve freelancer" },
      { status: 500 }
    );
  }
}
