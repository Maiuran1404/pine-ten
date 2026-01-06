import { Resend } from "resend";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";

// Lazy initialization to avoid errors during build when env vars aren't available
let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: EmailParams) {
  try {
    logger.debug({ to, subject }, "Sending email");

    if (!process.env.RESEND_API_KEY) {
      logger.error("RESEND_API_KEY is not set");
      return { success: false, error: "RESEND_API_KEY not configured" };
    }

    // BCC admin on all emails for monitoring (if admin email is set)
    const adminEmail = config.notifications.email.adminEmail;
    const bcc = adminEmail && to !== adminEmail ? adminEmail : undefined;

    const { data, error } = await getResend().emails.send({
      from: config.notifications.email.from,
      to,
      bcc,
      subject,
      html,
      text,
    });

    if (error) {
      logger.error({ err: error, to, subject }, "Email send failed");
      return { success: false, error };
    }

    logger.info({ emailId: data?.id, to }, "Email sent successfully");
    return { success: true, id: data?.id };
  } catch (error) {
    logger.error({ err: error, to, subject }, "Email exception");
    return { success: false, error };
  }
}

// Send notification to admin
export async function notifyAdmin(subject: string, html: string) {
  return sendEmail({
    to: config.notifications.email.adminEmail,
    subject: `[${config.app.name}] ${subject}`,
    html: wrapAdminEmail(html),
  });
}

// Wrapper for admin email styling
function wrapAdminEmail(content: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #000; color: #fff; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 18px;">${config.app.name} Admin</h1>
      </div>
      <div style="border: 1px solid #e5e5e5; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        ${content}
      </div>
      <p style="text-align: center; color: #666; font-size: 12px; margin-top: 16px;">
        This is an automated notification from ${config.app.name}
      </p>
    </div>
  `;
}

// ============================================
// ADMIN NOTIFICATION TEMPLATES
// ============================================

export const adminNotifications = {
  // New client signup
  newClientSignup: async (data: { name: string; email: string }) => {
    return notifyAdmin(
      "New Client Signup",
      `
        <h2 style="color: #16a34a; margin-top: 0;">New Client Registered</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Name</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: 600;">${data.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Email</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Time</td>
            <td style="padding: 8px 0;">${new Date().toLocaleString()}</td>
          </tr>
        </table>
        <a href="${config.app.url}/admin/clients" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">View Clients</a>
      `
    );
  },

  // New freelancer application
  newFreelancerApplication: async (data: {
    name: string;
    email: string;
    skills: string[];
    portfolioUrls: string[];
  }) => {
    return notifyAdmin(
      "New Freelancer Application",
      `
        <h2 style="color: #2563eb; margin-top: 0;">New Freelancer Application</h2>
        <p style="background: #fef3c7; padding: 12px; border-radius: 6px; color: #92400e;">
          A new freelancer has applied and requires your approval.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Name</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: 600;">${data.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Email</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Skills</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.skills.join(", ") || "Not specified"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Portfolio</td>
            <td style="padding: 8px 0;">
              ${data.portfolioUrls.length > 0
                ? data.portfolioUrls.map(url => `<a href="${url}" style="color: #2563eb;">${url}</a>`).join("<br>")
                : "Not provided"}
            </td>
          </tr>
        </table>
        <a href="${config.app.url}/admin/freelancers" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">Review Application</a>
      `
    );
  },

  // New task created
  newTaskCreated: async (data: {
    taskId: string;
    taskTitle: string;
    clientName: string;
    clientEmail: string;
    category: string;
    creditsUsed: number;
  }) => {
    return notifyAdmin(
      "New Task Created",
      `
        <h2 style="color: #7c3aed; margin-top: 0;">New Task Submitted</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Task Title</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: 600;">${data.taskTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Client</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.clientName} (${data.clientEmail})</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Category</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.category}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Credits</td>
            <td style="padding: 8px 0;">${data.creditsUsed} credits ($${data.creditsUsed * config.credits.pricePerCredit})</td>
          </tr>
        </table>
        <a href="${config.app.url}/admin/tasks" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">View Tasks</a>
      `
    );
  },

  // Task assigned to freelancer
  taskAssigned: async (data: {
    taskTitle: string;
    freelancerName: string;
    freelancerEmail: string;
    clientName: string;
  }) => {
    return notifyAdmin(
      "Task Assigned",
      `
        <h2 style="color: #0891b2; margin-top: 0;">Task Assigned to Freelancer</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Task</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: 600;">${data.taskTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Freelancer</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.freelancerName} (${data.freelancerEmail})</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Client</td>
            <td style="padding: 8px 0;">${data.clientName}</td>
          </tr>
        </table>
      `
    );
  },

  // Task completed
  taskCompleted: async (data: {
    taskTitle: string;
    freelancerName: string;
    clientName: string;
  }) => {
    return notifyAdmin(
      "Task Completed",
      `
        <h2 style="color: #16a34a; margin-top: 0;">Task Completed</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Task</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: 600;">${data.taskTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Completed by</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.freelancerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Client</td>
            <td style="padding: 8px 0;">${data.clientName}</td>
          </tr>
        </table>
      `
    );
  },

  // Credit purchase
  creditPurchase: async (data: {
    clientName: string;
    clientEmail: string;
    credits: number;
    amount: number;
    paymentId?: string;
  }) => {
    return notifyAdmin(
      "Credit Purchase",
      `
        <h2 style="color: #16a34a; margin-top: 0;">New Credit Purchase</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Client</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: 600;">${data.clientName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Email</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.clientEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Credits</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.credits} credits</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Amount</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: 600; color: #16a34a;">$${data.amount.toFixed(2)}</td>
          </tr>
          ${data.paymentId ? `
          <tr>
            <td style="padding: 8px 0; color: #666;">Payment ID</td>
            <td style="padding: 8px 0; font-family: monospace; font-size: 12px;">${data.paymentId}</td>
          </tr>
          ` : ''}
        </table>
      `
    );
  },

  // Freelancer approved
  freelancerApproved: async (data: {
    name: string;
    email: string;
    approvedBy?: string;
  }) => {
    return notifyAdmin(
      "Freelancer Approved",
      `
        <h2 style="color: #16a34a; margin-top: 0;">Freelancer Approved</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Freelancer</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: 600;">${data.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Email</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Status</td>
            <td style="padding: 8px 0;"><span style="background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 4px; font-size: 12px;">APPROVED</span></td>
          </tr>
        </table>
      `
    );
  },

  // Freelancer rejected
  freelancerRejected: async (data: {
    name: string;
    email: string;
  }) => {
    return notifyAdmin(
      "Freelancer Rejected",
      `
        <h2 style="color: #dc2626; margin-top: 0;">Freelancer Rejected</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Freelancer</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: 600;">${data.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Email</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Status</td>
            <td style="padding: 8px 0;"><span style="background: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 4px; font-size: 12px;">REJECTED</span></td>
          </tr>
        </table>
      `
    );
  },

  // Revision requested
  revisionRequested: async (data: {
    taskTitle: string;
    clientName: string;
    freelancerName: string;
    revisionsUsed: number;
    maxRevisions: number;
  }) => {
    return notifyAdmin(
      "Revision Requested",
      `
        <h2 style="color: #f59e0b; margin-top: 0;">Revision Requested</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Task</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: 600;">${data.taskTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Client</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.clientName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Freelancer</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.freelancerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Revisions</td>
            <td style="padding: 8px 0;">${data.revisionsUsed} / ${data.maxRevisions}</td>
          </tr>
        </table>
      `
    );
  },
};

// ============================================
// USER EMAIL TEMPLATES
// ============================================

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

  freelancerRejected: (freelancerName: string) => ({
    subject: `${config.app.name} - Application Update`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000;">Application Update</h2>
        <p>Hi ${freelancerName},</p>
        <p>Thank you for your interest in joining ${config.app.name}. After careful review, we're unable to approve your application at this time.</p>
        <p>We encourage you to continue developing your skills and portfolio, and feel free to reapply in the future.</p>
        <p style="margin-top: 24px; color: #666;">- The ${config.app.name} Team</p>
      </div>
    `,
  }),

  welcomeClient: (clientName: string, dashboardUrl: string) => ({
    subject: `Welcome to ${config.app.name}!`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000;">Welcome to ${config.app.name}!</h2>
        <p>Hi ${clientName},</p>
        <p>Thanks for signing up! We're excited to help you with your creative design needs.</p>
        <p>Here's how to get started:</p>
        <ol style="line-height: 1.8;">
          <li>Complete your onboarding to tell us about your brand</li>
          <li>Purchase credits to submit tasks</li>
          <li>Create your first task and we'll match you with a designer</li>
        </ol>
        <a href="${dashboardUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">Go to Dashboard</a>
        <p style="margin-top: 24px; color: #666;">- The ${config.app.name} Team</p>
      </div>
    `,
  }),

  creditsPurchased: (clientName: string, credits: number, dashboardUrl: string) => ({
    subject: `Credits Added to Your Account`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000;">Credits Added!</h2>
        <p>Hi ${clientName},</p>
        <p><strong>${credits} credits</strong> have been added to your account. You're all set to create new tasks!</p>
        <a href="${dashboardUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">Create a Task</a>
        <p style="margin-top: 24px; color: #666;">- The ${config.app.name} Team</p>
      </div>
    `,
  }),

  // Password reset email
  passwordReset: (userName: string, resetUrl: string) => ({
    subject: `Reset Your Password`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000;">Reset Your Password</h2>
        <p>Hi ${userName},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <a href="${resetUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">Reset Password</a>
        <p style="margin-top: 24px; color: #666; font-size: 14px;">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
        <p style="margin-top: 24px; color: #666;">- The ${config.app.name} Team</p>
      </div>
    `,
  }),

  // Email verification
  emailVerification: (userName: string, verificationUrl: string) => ({
    subject: `Verify Your Email Address`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000;">Verify Your Email</h2>
        <p>Hi ${userName},</p>
        <p>Thanks for signing up! Please verify your email address by clicking the button below:</p>
        <a href="${verificationUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">Verify Email</a>
        <p style="margin-top: 24px; color: #666; font-size: 14px;">This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
        <p style="margin-top: 24px; color: #666;">- The ${config.app.name} Team</p>
      </div>
    `,
  }),
};
