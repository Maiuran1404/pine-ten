import { Resend } from "resend";
import { config } from "@/lib/config";

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: EmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: config.notifications.email.from,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("Email send error:", error);
      return { success: false, error };
    }

    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Email send exception:", error);
    return { success: false, error };
  }
}

// Email templates
export const emailTemplates = {
  taskAssigned: (freelancerName: string, taskTitle: string, taskUrl: string) => ({
    subject: `New Task Assigned: ${taskTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000;">New Task Assigned</h2>
        <p>Hi ${freelancerName},</p>
        <p>You have been assigned a new task: <strong>${taskTitle}</strong></p>
        <a href="${taskUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">View Task</a>
        <p style="margin-top: 24px; color: #666;">- The ${config.app.name} Team</p>
      </div>
    `,
  }),

  taskCompleted: (clientName: string, taskTitle: string, taskUrl: string) => ({
    subject: `Task Completed: ${taskTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000;">Task Completed</h2>
        <p>Hi ${clientName},</p>
        <p>Your task <strong>${taskTitle}</strong> has been completed and is ready for review.</p>
        <a href="${taskUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">Review Deliverables</a>
        <p style="margin-top: 24px; color: #666;">- The ${config.app.name} Team</p>
      </div>
    `,
  }),

  revisionRequested: (freelancerName: string, taskTitle: string, taskUrl: string, feedback: string) => ({
    subject: `Revision Requested: ${taskTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000;">Revision Requested</h2>
        <p>Hi ${freelancerName},</p>
        <p>A revision has been requested for: <strong>${taskTitle}</strong></p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 6px; margin: 16px 0;">
          <strong>Feedback:</strong>
          <p style="margin: 8px 0 0;">${feedback}</p>
        </div>
        <a href="${taskUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">View Task</a>
        <p style="margin-top: 24px; color: #666;">- The ${config.app.name} Team</p>
      </div>
    `,
  }),

  lowCredits: (userName: string, remainingCredits: number, purchaseUrl: string) => ({
    subject: `Low Credit Balance Alert`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000;">Low Credit Balance</h2>
        <p>Hi ${userName},</p>
        <p>Your credit balance is running low. You currently have <strong>${remainingCredits} credits</strong> remaining.</p>
        <a href="${purchaseUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">Purchase Credits</a>
        <p style="margin-top: 24px; color: #666;">- The ${config.app.name} Team</p>
      </div>
    `,
  }),

  freelancerApproved: (freelancerName: string, portalUrl: string) => ({
    subject: `Welcome to ${config.app.name} - Application Approved!`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000;">Application Approved!</h2>
        <p>Hi ${freelancerName},</p>
        <p>Congratulations! Your freelancer application has been approved. You can now start accepting tasks.</p>
        <a href="${portalUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">Go to Portal</a>
        <p style="margin-top: 24px; color: #666;">- The ${config.app.name} Team</p>
      </div>
    `,
  }),
};
