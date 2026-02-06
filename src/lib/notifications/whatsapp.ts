import twilio from "twilio";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

interface WhatsAppParams {
  to: string; // Must include country code, e.g., +1234567890
  message: string;
}

export async function sendWhatsApp({ to, message }: WhatsAppParams) {
  try {
    // Format the number for WhatsApp
    const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

    const result = await client.messages.create({
      from: config.notifications.whatsapp.number,
      to: formattedTo,
      body: message,
    });

    return { success: true, sid: result.sid };
  } catch (error) {
    logger.error({ err: error }, "WhatsApp send error");
    return { success: false, error };
  }
}

// Send WhatsApp notification to admin
export async function notifyAdminWhatsApp(message: string) {
  const adminNumber = config.notifications.whatsapp.adminNumber;
  
  if (!adminNumber) {
    logger.warn("ADMIN_WHATSAPP_NUMBER is not set, skipping WhatsApp notification");
    return { success: false, error: "ADMIN_WHATSAPP_NUMBER not configured" };
  }

  return sendWhatsApp({
    to: adminNumber,
    message,
  });
}

// WhatsApp message templates
export const whatsappTemplates = {
  taskAssigned: (taskTitle: string, taskUrl: string) =>
    `*New Task Assigned*\n\nYou have been assigned: ${taskTitle}\n\nView details: ${taskUrl}`,

  taskCompleted: (taskTitle: string, taskUrl: string) =>
    `*Task Completed*\n\nYour task "${taskTitle}" is ready for review.\n\nView deliverables: ${taskUrl}`,

  revisionRequested: (taskTitle: string, taskUrl: string) =>
    `*Revision Requested*\n\nA revision has been requested for: ${taskTitle}\n\nView feedback: ${taskUrl}`,

  newTaskAvailable: (taskTitle: string, credits: number, taskUrl: string) =>
    `*New Task Available*\n\n${taskTitle}\nCredits: ${credits}\n\nClaim now: ${taskUrl}`,
};

// Admin WhatsApp notification templates
export const adminWhatsAppTemplates = {
  newTaskCreated: (data: {
    taskTitle: string;
    clientName: string;
    clientEmail: string;
    category: string;
    creditsUsed: number;
    taskUrl: string;
  }) =>
    `*🆕 New Task Created*\n\n` +
    `*Task:* ${data.taskTitle}\n` +
    `*Client:* ${data.clientName} (${data.clientEmail})\n` +
    `*Category:* ${data.category}\n` +
    `*Credits:* ${data.creditsUsed}\n\n` +
    `View: ${data.taskUrl}`,

  newUserSignup: (data: {
    name: string;
    email: string;
    role: string;
    signupUrl?: string;
  }) =>
    `*👤 New User Signup*\n\n` +
    `*Name:* ${data.name}\n` +
    `*Email:* ${data.email}\n` +
    `*Role:* ${data.role}\n` +
    (data.signupUrl ? `\nView: ${data.signupUrl}` : ""),
};
