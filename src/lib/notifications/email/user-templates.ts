import { config } from '@/lib/config'
import {
  heading,
  paragraph,
  button,
  infoCard,
  callout,
  spacer,
  statusBadge,
  divider,
} from './components'
import { wrapUserEmail } from './layout'
import { colors } from './constants'

export const emailTemplates = {
  taskAssigned: (freelancerName: string, taskTitle: string, taskUrl: string) => ({
    subject: `New Task Assigned: ${taskTitle}`,
    html: wrapUserEmail(`
      ${heading('New Task Assigned')}
      ${paragraph(`Hi ${freelancerName},`)}
      ${paragraph(`You have been assigned a new task. Here are the details:`)}
      ${infoCard([{ label: 'Task', value: `<strong>${taskTitle}</strong>` }])}
      ${paragraph('Please review the brief and get started at your earliest convenience.')}
      ${button('View Task', taskUrl)}
      ${spacer(8)}
      ${paragraph(`&mdash; The ${config.app.name} Team`, { muted: true })}
    `),
  }),

  taskCompleted: (clientName: string, taskTitle: string, taskUrl: string) => ({
    subject: `Task Completed: ${taskTitle}`,
    html: wrapUserEmail(`
      ${heading('Task Completed')}
      ${paragraph(`Hi ${clientName},`)}
      ${paragraph(`Your task <strong>${taskTitle}</strong> has been completed and is ready for your review.`)}
      ${button('Review Deliverables', taskUrl)}
      ${spacer(8)}
      ${paragraph(`&mdash; The ${config.app.name} Team`, { muted: true })}
    `),
  }),

  revisionRequested: (
    freelancerName: string,
    taskTitle: string,
    taskUrl: string,
    feedback: string
  ) => ({
    subject: `Revision Requested: ${taskTitle}`,
    html: wrapUserEmail(`
      ${heading('Revision Requested')}
      ${paragraph(`Hi ${freelancerName},`)}
      ${paragraph(`A revision has been requested for <strong>${taskTitle}</strong>.`)}
      ${callout(feedback, 'warning', { title: 'Client Feedback' })}
      ${button('View Task', taskUrl)}
      ${spacer(8)}
      ${paragraph(`&mdash; The ${config.app.name} Team`, { muted: true })}
    `),
  }),

  taskAssignedToClient: (
    clientName: string,
    taskTitle: string,
    designerName: string,
    taskUrl: string
  ) => ({
    subject: `Designer Assigned: ${taskTitle}`,
    html: wrapUserEmail(`
      ${heading('Your Task Has Been Assigned', { color: colors.primary })}
      ${paragraph(`Hi ${clientName},`)}
      ${paragraph(`<strong>${designerName}</strong> has been assigned to work on <strong>${taskTitle}</strong>.`)}
      ${paragraph("They'll start working on your task shortly. You'll receive updates as work progresses.")}
      ${button('View Task', taskUrl)}
      ${spacer(8)}
      ${paragraph(`&mdash; The ${config.app.name} Team`, { muted: true })}
    `),
  }),

  deliverableSubmittedToClient: (
    clientName: string,
    taskTitle: string,
    designerName: string,
    taskUrl: string
  ) => ({
    subject: `Work Submitted: ${taskTitle}`,
    html: wrapUserEmail(`
      ${heading('Deliverables Submitted', { color: colors.primary })}
      ${paragraph(`Hi ${clientName},`)}
      ${paragraph(`<strong>${designerName}</strong> has submitted deliverables for <strong>${taskTitle}</strong>.`)}
      ${callout("Our team is reviewing the work to ensure quality. You'll be notified once it's ready for your review.", 'info')}
      ${button('View Task', taskUrl)}
      ${spacer(8)}
      ${paragraph(`&mdash; The ${config.app.name} Team`, { muted: true })}
    `),
  }),

  taskApprovedForClient: (clientName: string, taskTitle: string, assetsUrl: string) => ({
    subject: `Task Complete: ${taskTitle}`,
    html: wrapUserEmail(`
      ${heading('Your Task is Complete!', { color: colors.primary })}
      ${paragraph(`Hi ${clientName},`)}
      ${paragraph(`Your task <strong>${taskTitle}</strong> has been marked as complete. All deliverables are now available in your Assets.`)}
      ${callout('Your final files are ready to download.', 'success')}
      ${button('View Assets', assetsUrl)}
      ${spacer(8)}
      ${paragraph(`&mdash; The ${config.app.name} Team`, { muted: true })}
    `),
  }),

  taskApprovedForFreelancer: (freelancerName: string, taskTitle: string, credits: number) => ({
    subject: `Task Approved: ${taskTitle}`,
    html: wrapUserEmail(`
      ${heading('Your Work Has Been Approved!', { color: colors.primary })}
      ${paragraph(`Hi ${freelancerName},`)}
      ${paragraph(`Great news &mdash; the client has approved your work on <strong>${taskTitle}</strong>.`)}
      ${infoCard([
        { label: 'Task', value: `<strong>${taskTitle}</strong>` },
        {
          label: 'Earnings',
          value: `${statusBadge(`${credits} credits`, 'success')}`,
        },
      ])}
      ${paragraph('The credits have been added to your earnings balance.')}
      ${spacer(8)}
      ${paragraph('Keep up the excellent work!', { muted: true })}
      ${paragraph(`&mdash; The ${config.app.name} Team`, { muted: true })}
    `),
  }),

  lowCredits: (userName: string, remainingCredits: number, purchaseUrl: string) => ({
    subject: `Low Credit Balance Alert`,
    html: wrapUserEmail(`
      ${heading('Low Credit Balance')}
      ${paragraph(`Hi ${userName},`)}
      ${callout(`Your credit balance is running low. You currently have <strong>${remainingCredits} credits</strong> remaining.`, 'warning', { title: 'Balance Alert' })}
      ${paragraph('Top up your credits to keep submitting tasks without interruption.')}
      ${button('Purchase Credits', purchaseUrl)}
      ${spacer(8)}
      ${paragraph(`&mdash; The ${config.app.name} Team`, { muted: true })}
    `),
  }),

  freelancerApproved: (freelancerName: string, portalUrl: string) => ({
    subject: `Welcome to ${config.app.name} - Application Approved!`,
    html: wrapUserEmail(`
      ${heading('Application Approved!', { color: colors.primary })}
      ${paragraph(`Hi ${freelancerName},`)}
      ${callout('Congratulations! Your freelancer application has been approved. You can now start accepting tasks.', 'success')}
      ${paragraph('Head over to the portal to set up your profile and browse available tasks.')}
      ${button('Go to Portal', portalUrl)}
      ${spacer(8)}
      ${paragraph(`&mdash; The ${config.app.name} Team`, { muted: true })}
    `),
  }),

  freelancerRejected: (freelancerName: string) => ({
    subject: `${config.app.name} - Application Update`,
    html: wrapUserEmail(`
      ${heading('Application Update')}
      ${paragraph(`Hi ${freelancerName},`)}
      ${paragraph(`Thank you for your interest in joining ${config.app.name}. After careful review, we're unable to approve your application at this time.`)}
      ${paragraph('We encourage you to continue developing your skills and portfolio, and feel free to reapply in the future.')}
      ${spacer(8)}
      ${paragraph(`&mdash; The ${config.app.name} Team`, { muted: true })}
    `),
  }),

  welcomeClient: (clientName: string, dashboardUrl: string) => ({
    subject: `Welcome to ${config.app.name}!`,
    html: wrapUserEmail(`
      ${heading(`Welcome to ${config.app.name}!`, { color: colors.primary })}
      ${paragraph(`Hi ${clientName},`)}
      ${paragraph("Thanks for signing up! We're excited to help you with your creative design needs.")}
      ${divider()}
      ${heading("Here's how to get started:", { level: 3 })}
      ${infoCard([
        {
          label: 'Step 1',
          value: 'Complete your onboarding to tell us about your brand',
        },
        { label: 'Step 2', value: 'Purchase credits to submit tasks' },
        {
          label: 'Step 3',
          value: "Create your first task and we'll match you with a designer",
        },
      ])}
      ${button('Go to Dashboard', dashboardUrl)}
      ${spacer(8)}
      ${paragraph(`&mdash; The ${config.app.name} Team`, { muted: true })}
    `),
  }),

  creditsPurchased: (clientName: string, credits: number, dashboardUrl: string) => ({
    subject: `Credits Added to Your Account`,
    html: wrapUserEmail(`
      ${heading('Credits Added!', { color: colors.primary })}
      ${paragraph(`Hi ${clientName},`)}
      ${infoCard([
        {
          label: 'Credits Added',
          value: `${statusBadge(`${credits} credits`, 'success')}`,
        },
      ])}
      ${paragraph("You're all set to create new tasks!")}
      ${button('Create a Task', dashboardUrl)}
      ${spacer(8)}
      ${paragraph(`&mdash; The ${config.app.name} Team`, { muted: true })}
    `),
  }),

  passwordReset: (userName: string, resetUrl: string) => ({
    subject: `Reset Your Password`,
    html: wrapUserEmail(`
      ${heading('Reset Your Password', { align: 'center' })}
      ${paragraph(`Hi ${userName},`, { align: 'center' })}
      ${paragraph('We received a request to reset your password. Click the button below to create a new password:', { align: 'center' })}
      ${button('Reset Password', resetUrl, { align: 'center' })}
      ${callout("This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.", 'info')}
      ${spacer(8)}
      ${paragraph(`&mdash; The ${config.app.name} Team`, { muted: true, align: 'center' })}
    `),
  }),

  emailVerification: (userName: string, verificationUrl: string) => ({
    subject: `Verify Your Email Address`,
    html: wrapUserEmail(`
      ${heading('Verify Your Email', { align: 'center' })}
      ${paragraph(`Hi ${userName},`, { align: 'center' })}
      ${paragraph('Thanks for signing up! Please verify your email address by clicking the button below:', { align: 'center' })}
      ${button('Verify Email', verificationUrl, { align: 'center' })}
      ${callout("This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.", 'info')}
      ${spacer(8)}
      ${paragraph(`&mdash; The ${config.app.name} Team`, { muted: true, align: 'center' })}
    `),
  }),
}
