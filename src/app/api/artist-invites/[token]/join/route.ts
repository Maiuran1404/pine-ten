import { NextRequest } from 'next/server'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { db, artistInvites, users, freelancerProfiles } from '@/db'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { headers as getHeaders } from 'next/headers'
import { config } from '@/lib/config'
import { safeAsync } from '@/lib/notifications'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const joinBodySchema = z.object({
  email: z.string().email(),
  whatsappNumber: z.string().min(1, 'WhatsApp number is required').max(30),
})

// POST - Complete invite setup: set role, create profile, mark invite accepted
// Called AFTER the client-side signUp.email() has already created the user + session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  return withErrorHandling(
    async () => {
      const { token } = await params

      // 1. Get authenticated session (user just signed up client-side)
      const session = await auth.api.getSession({
        headers: await getHeaders(),
      })
      if (!session?.user?.id) {
        throw Errors.unauthorized()
      }

      const body = await request.json()
      const parseResult = joinBodySchema.safeParse(body)
      if (!parseResult.success) {
        const firstError = parseResult.error.issues[0]
        throw Errors.badRequest(firstError?.message || 'Invalid input')
      }

      const { email, whatsappNumber } = parseResult.data

      // 2. Verify the session user matches the submitted email
      if (session.user.email?.toLowerCase() !== email.toLowerCase().trim()) {
        throw Errors.badRequest('Email does not match authenticated user')
      }

      // 3. Validate token
      const inviteRows = await db
        .select()
        .from(artistInvites)
        .where(eq(artistInvites.token, token))
        .limit(1)

      if (!inviteRows.length) throw Errors.notFound('Invite')

      const invite = inviteRows[0]

      if (invite.status !== 'PENDING') {
        throw Errors.badRequest(
          invite.status === 'ACCEPTED'
            ? 'This invite has already been used'
            : 'This invite has expired'
        )
      }

      if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        throw Errors.badRequest('This invite has expired')
      }

      // 4. Validate email matches invite (case-insensitive)
      if (email.toLowerCase().trim() !== invite.email.toLowerCase().trim()) {
        throw Errors.badRequest('Email does not match the invite')
      }

      const userId = session.user.id

      // 5. Update user: set role to FREELANCER, mark onboarding complete, set phone
      await db
        .update(users)
        .set({
          role: 'FREELANCER',
          onboardingCompleted: true,
          phone: whatsappNumber,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))

      // 6. Create freelancer profile with APPROVED status
      await db.insert(freelancerProfiles).values({
        userId,
        status: 'APPROVED',
        whatsappNumber,
        skills: [],
        specializations: [],
        portfolioUrls: [],
      })

      // 7. Update invite: mark as accepted
      await db
        .update(artistInvites)
        .set({
          status: 'ACCEPTED',
          acceptedBy: userId,
          acceptedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(artistInvites.id, invite.id))

      // 8. Fire-and-forget notifications
      const portalUrl = `${config.app.url}/portal`
      const name = session.user.name || invite.name

      // Welcome WhatsApp to artist
      safeAsync(
        async () => {
          const { sendWhatsApp, whatsappTemplates: waTemplates } =
            await import('@/lib/notifications/whatsapp')
          const message = waTemplates.artistWelcome(name, portalUrl)
          await sendWhatsApp({ to: whatsappNumber, message })
        },
        { context: 'artist-welcome-whatsapp' }
      )

      // Notify admin via WhatsApp
      safeAsync(
        async () => {
          const { notifyAdminWhatsApp, adminWhatsAppTemplates } =
            await import('@/lib/notifications/whatsapp')
          const message = adminWhatsAppTemplates.artistInviteAccepted({ name, email })
          await notifyAdminWhatsApp(message)
        },
        { context: 'admin-invite-accepted-whatsapp' }
      )

      // Welcome email to artist
      safeAsync(
        async () => {
          const { sendEmail } = await import('@/lib/notifications')
          const { emailTemplates: inviteEmailTemplates } =
            await import('@/lib/notifications/email/user-templates')
          const template = inviteEmailTemplates.artistWelcomeInvited(name, portalUrl)
          await sendEmail({
            to: email,
            subject: template.subject,
            html: template.html,
          })
        },
        { context: 'artist-welcome-email' }
      )

      logger.info({ userId, inviteId: invite.id, email }, 'Artist joined via invite link')

      // 9. Return success
      return successResponse(
        {
          success: true,
          redirectUrl: '/portal',
          user: {
            id: userId,
            name,
            email: email.toLowerCase().trim(),
            role: 'FREELANCER',
          },
        },
        201
      )
    },
    { endpoint: 'POST /api/artist-invites/[token]/join' }
  )
}
