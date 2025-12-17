import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { freelancerProfiles, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { adminNotifications, sendEmail, emailTemplates } from "@/lib/notifications";

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
        console.error("Failed to send rejection notifications:", emailError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reject freelancer error:", error);
    return NextResponse.json(
      { error: "Failed to reject freelancer" },
      { status: 500 }
    );
  }
}
