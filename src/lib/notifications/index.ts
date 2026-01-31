import { db } from "@/db";
import { notifications, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail, emailTemplates } from "./email";
import { sendWhatsApp, whatsappTemplates } from "./whatsapp";
import type { NotificationPreferences } from "@/types";

type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_OFFERED"
  | "TASK_COMPLETED"
  | "REVISION_REQUESTED"
  | "LOW_CREDITS"
  | "FREELANCER_APPROVED"
  | "NEW_TASK_AVAILABLE"
  | "NEW_MESSAGE";

interface NotifyParams {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  taskId?: string;
  taskUrl?: string;
  additionalData?: Record<string, string>;
}

export async function notify({
  userId,
  type,
  title,
  content,
  taskId,
  taskUrl,
  additionalData,
}: NotifyParams) {
  // Get user with preferences
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user.length) {
    console.error("User not found for notification:", userId);
    return;
  }

  const userData = user[0];
  const prefs = (userData.notificationPreferences as NotificationPreferences) || {
    email: true,
    whatsapp: true,
    inApp: true,
  };

  const results: { channel: string; success: boolean }[] = [];

  // Always create in-app notification
  if (prefs.inApp !== false) {
    await db.insert(notifications).values({
      userId,
      type,
      channel: "IN_APP",
      title,
      content,
      relatedTaskId: taskId,
      status: "SENT",
      sentAt: new Date(),
    });
    results.push({ channel: "IN_APP", success: true });
  }

  // Send email if enabled
  if (prefs.email !== false && userData.email) {
    const emailData = getEmailTemplate(type, {
      userName: userData.name,
      taskTitle: additionalData?.taskTitle || title,
      taskUrl: taskUrl || "",
      feedback: additionalData?.feedback || "",
      remainingCredits: parseInt(additionalData?.remainingCredits || "0"),
    });

    if (emailData) {
      const emailResult = await sendEmail({
        to: userData.email,
        subject: emailData.subject,
        html: emailData.html,
      });

      await db.insert(notifications).values({
        userId,
        type,
        channel: "EMAIL",
        title,
        content,
        relatedTaskId: taskId,
        status: emailResult.success ? "SENT" : "FAILED",
        sentAt: new Date(),
      });

      results.push({ channel: "EMAIL", success: emailResult.success });
    }
  }

  // Send WhatsApp if enabled and phone available
  if (prefs.whatsapp !== false && userData.phone) {
    const message = getWhatsAppMessage(type, {
      taskTitle: additionalData?.taskTitle || title,
      taskUrl: taskUrl || "",
      credits: parseInt(additionalData?.credits || "0"),
    });

    if (message) {
      const whatsappResult = await sendWhatsApp({
        to: userData.phone,
        message,
      });

      await db.insert(notifications).values({
        userId,
        type,
        channel: "WHATSAPP",
        title,
        content,
        relatedTaskId: taskId,
        status: whatsappResult.success ? "SENT" : "FAILED",
        sentAt: new Date(),
      });

      results.push({ channel: "WHATSAPP", success: whatsappResult.success });
    }
  }

  return results;
}

function getEmailTemplate(
  type: NotificationType,
  data: {
    userName: string;
    taskTitle: string;
    taskUrl: string;
    feedback?: string;
    remainingCredits?: number;
  }
) {
  switch (type) {
    case "TASK_ASSIGNED":
      return emailTemplates.taskAssigned(data.userName, data.taskTitle, data.taskUrl);
    case "TASK_COMPLETED":
      return emailTemplates.taskCompleted(data.userName, data.taskTitle, data.taskUrl);
    case "REVISION_REQUESTED":
      return emailTemplates.revisionRequested(
        data.userName,
        data.taskTitle,
        data.taskUrl,
        data.feedback || ""
      );
    case "LOW_CREDITS":
      return emailTemplates.lowCredits(
        data.userName,
        data.remainingCredits || 0,
        data.taskUrl
      );
    case "FREELANCER_APPROVED":
      return emailTemplates.freelancerApproved(data.userName, data.taskUrl);
    default:
      return null;
  }
}

function getWhatsAppMessage(
  type: NotificationType,
  data: {
    taskTitle: string;
    taskUrl: string;
    credits?: number;
  }
) {
  switch (type) {
    case "TASK_ASSIGNED":
      return whatsappTemplates.taskAssigned(data.taskTitle, data.taskUrl);
    case "TASK_COMPLETED":
      return whatsappTemplates.taskCompleted(data.taskTitle, data.taskUrl);
    case "REVISION_REQUESTED":
      return whatsappTemplates.revisionRequested(data.taskTitle, data.taskUrl);
    case "NEW_TASK_AVAILABLE":
      return whatsappTemplates.newTaskAvailable(
        data.taskTitle,
        data.credits || 0,
        data.taskUrl
      );
    default:
      return null;
  }
}

export { sendEmail, emailTemplates, adminNotifications, notifyAdmin } from "./email";
export { sendWhatsApp, whatsappTemplates, notifyAdminWhatsApp, adminWhatsAppTemplates } from "./whatsapp";
