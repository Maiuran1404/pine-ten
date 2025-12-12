import twilio from "twilio";
import { config } from "@/lib/config";

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
    console.error("WhatsApp send error:", error);
    return { success: false, error };
  }
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
