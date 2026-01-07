import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { notificationSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

// Default notification settings to seed
const defaultSettings = [
  {
    eventType: "TASK_ASSIGNED",
    name: "Task Assigned",
    description: "When a freelancer claims a task",
    emailEnabled: true,
    whatsappEnabled: true,
    inAppEnabled: true,
    notifyClient: true,
    notifyFreelancer: false,
    notifyAdmin: true,
    emailSubject: "Your task has been assigned to a designer",
    emailTemplate: `<p>Hi {{clientName}},</p>
<p>Great news! Your task <strong>{{taskTitle}}</strong> has been assigned to a designer who will start working on it soon.</p>
<p><a href="{{taskUrl}}">View Task</a></p>`,
    whatsappTemplate: `*Task Assigned*\n\nYour task "{{taskTitle}}" has been assigned to a designer.\n\nView: {{taskUrl}}`,
  },
  {
    eventType: "TASK_STARTED",
    name: "Work Started",
    description: "When a freelancer starts working on a task",
    emailEnabled: true,
    whatsappEnabled: true,
    inAppEnabled: true,
    notifyClient: true,
    notifyFreelancer: false,
    notifyAdmin: false,
    emailSubject: "Work has started on your task",
    emailTemplate: `<p>Hi {{clientName}},</p>
<p>{{freelancerName}} has started working on your task <strong>{{taskTitle}}</strong>.</p>
<p><a href="{{taskUrl}}">View Task</a></p>`,
    whatsappTemplate: `*Work Started*\n\n{{freelancerName}} has started working on "{{taskTitle}}".\n\nView: {{taskUrl}}`,
  },
  {
    eventType: "TASK_IN_REVIEW",
    name: "Ready for Review",
    description: "When a freelancer submits deliverables",
    emailEnabled: true,
    whatsappEnabled: true,
    inAppEnabled: true,
    notifyClient: true,
    notifyFreelancer: false,
    notifyAdmin: true,
    emailSubject: "Your task is ready for review",
    emailTemplate: `<p>Hi {{clientName}},</p>
<p>Great news! {{freelancerName}} has submitted work for <strong>{{taskTitle}}</strong>.</p>
<p>Please review the deliverables and either approve or request changes.</p>
<p><a href="{{taskUrl}}">Review Now</a></p>`,
    whatsappTemplate: `*Ready for Review*\n\n{{freelancerName}} has submitted work for "{{taskTitle}}".\n\nReview: {{taskUrl}}`,
  },
  {
    eventType: "TASK_COMPLETED",
    name: "Task Approved",
    description: "When a client approves the deliverables",
    emailEnabled: true,
    whatsappEnabled: true,
    inAppEnabled: true,
    notifyClient: false,
    notifyFreelancer: true,
    notifyAdmin: true,
    emailSubject: "Task Approved: {{taskTitle}}",
    emailTemplate: `<p>Hi {{freelancerName}},</p>
<p>Congratulations! Your work on <strong>{{taskTitle}}</strong> has been approved by the client.</p>
<p><a href="{{taskUrl}}">View Task</a></p>`,
    whatsappTemplate: `*Task Approved*\n\nYour work on "{{taskTitle}}" has been approved!\n\nView: {{taskUrl}}`,
  },
  {
    eventType: "REVISION_REQUESTED",
    name: "Revision Requested",
    description: "When a client requests changes",
    emailEnabled: true,
    whatsappEnabled: true,
    inAppEnabled: true,
    notifyClient: false,
    notifyFreelancer: true,
    notifyAdmin: true,
    emailSubject: "Revision Requested: {{taskTitle}}",
    emailTemplate: `<p>Hi {{freelancerName}},</p>
<p>The client has requested changes on <strong>{{taskTitle}}</strong>.</p>
<div style="background: #f5f5f5; padding: 16px; border-radius: 6px; margin: 16px 0;">
  <strong>Feedback:</strong>
  <p>{{feedback}}</p>
</div>
<p><a href="{{taskUrl}}">View Feedback</a></p>`,
    whatsappTemplate: `*Revision Requested*\n\nChanges requested on "{{taskTitle}}":\n\n{{feedback}}\n\nView: {{taskUrl}}`,
  },
  {
    eventType: "NEW_MESSAGE",
    name: "New Message",
    description: "When a new message is sent on a task",
    emailEnabled: false,
    whatsappEnabled: false,
    inAppEnabled: true,
    notifyClient: true,
    notifyFreelancer: true,
    notifyAdmin: false,
    emailSubject: "New message on {{taskTitle}}",
    emailTemplate: `<p>Hi {{recipientName}},</p>
<p>You have a new message on <strong>{{taskTitle}}</strong>.</p>
<p><a href="{{taskUrl}}">View Message</a></p>`,
    whatsappTemplate: `*New Message*\n\nNew message on "{{taskTitle}}".\n\nView: {{taskUrl}}`,
  },
  {
    eventType: "FREELANCER_APPROVED",
    name: "Freelancer Approved",
    description: "When an admin approves a freelancer application",
    emailEnabled: true,
    whatsappEnabled: true,
    inAppEnabled: true,
    notifyClient: false,
    notifyFreelancer: true,
    notifyAdmin: false,
    emailSubject: "Your application has been approved!",
    emailTemplate: `<p>Hi {{freelancerName}},</p>
<p>Congratulations! Your freelancer application has been approved. You can now start accepting tasks.</p>
<p><a href="{{portalUrl}}">Go to Portal</a></p>`,
    whatsappTemplate: `*Application Approved*\n\nCongratulations! You can now start accepting tasks.\n\nPortal: {{portalUrl}}`,
  },
  {
    eventType: "LOW_CREDITS",
    name: "Low Credit Balance",
    description: "When a client's credit balance is low",
    emailEnabled: true,
    whatsappEnabled: false,
    inAppEnabled: true,
    notifyClient: true,
    notifyFreelancer: false,
    notifyAdmin: false,
    emailSubject: "Low Credit Balance Alert",
    emailTemplate: `<p>Hi {{clientName}},</p>
<p>Your credit balance is running low. You currently have <strong>{{credits}} credits</strong> remaining.</p>
<p><a href="{{creditsUrl}}">Purchase Credits</a></p>`,
    whatsappTemplate: `*Low Credits*\n\nYou have {{credits}} credits remaining.\n\nPurchase more: {{creditsUrl}}`,
  },
];

export async function GET() {
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

    // Get all notification settings
    let settings = await db.select().from(notificationSettings);

    // If no settings exist, seed the defaults
    if (settings.length === 0) {
      await db.insert(notificationSettings).values(defaultSettings);
      settings = await db.select().from(notificationSettings);
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Notification settings fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Setting ID required" }, { status: 400 });
    }

    // Update the setting
    await db
      .update(notificationSettings)
      .set({
        ...updates,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(eq(notificationSettings.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notification settings update error:", error);
    return NextResponse.json(
      { error: "Failed to update notification settings" },
      { status: 500 }
    );
  }
}

// Reset to defaults
export async function POST() {
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

    // Delete all and re-seed
    await db.delete(notificationSettings);
    await db.insert(notificationSettings).values(defaultSettings);

    const settings = await db.select().from(notificationSettings);
    return NextResponse.json({ settings, message: "Reset to defaults" });
  } catch (error) {
    console.error("Notification settings reset error:", error);
    return NextResponse.json(
      { error: "Failed to reset notification settings" },
      { status: 500 }
    );
  }
}
