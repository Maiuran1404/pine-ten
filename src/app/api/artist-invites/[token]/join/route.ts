import { NextRequest } from 'next/server'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { joinViaInviteSchema } from '@/lib/validations'
import { db, artistInvites, users, freelancerProfiles } from '@/db'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { headers as getHeaders } from 'next/headers'
import { config } from '@/lib/config'
import { safeAsync } from '@/lib/notifications'
import { logger } from '@/lib/logger'

// POST - Signup via invite: create user, auto-approve, create session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  return withErrorHandling(
    async () => {
      const { token } = await params

      const body = await request.json()
      const parseResult = joinViaInviteSchema.safeParse(body)
      if (!parseResult.success) {
        const firstError = parseResult.error.issues[0]
        throw Errors.badRequest(firstError?.message || 'Invalid input')
      }

      const { name, email, password, whatsappNumber } = parseResult.data

      // 1. Validate token
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

      // 2. Validate email matches invite (case-insensitive)
      if (email.toLowerCase().trim() !== invite.email.toLowerCase().trim()) {
        throw Errors.badRequest('Email does not match the invite')
      }

      // 3. Check if user already exists
      const existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email.toLowerCase().trim()))
        .limit(1)

      if (existingUser.length) {
        throw Errors.badRequest(
          'An account with this email already exists. Please sign in instead.'
        )
      }

      // 4. Create user via Better Auth signUp (server-side)
      //    This creates the user + account + session
      const signUpResult = await auth.api.signUpEmail({
        headers: await getHeaders(),
        body: {
          email: email.toLowerCase().trim(),
          password,
          name: name.trim(),
        },
      })

      if (!signUpResult?.user?.id) {
        throw Errors.internal('Failed to create user account')
      }

      const newUserId = signUpResult.user.id

      // 5. Update user: set role to FREELANCER, mark onboarding complete, set phone
      await db
        .update(users)
        .set({
          role: 'FREELANCER',
          onboardingCompleted: true,
          phone: whatsappNumber,
          updatedAt: new Date(),
        })
        .where(eq(users.id, newUserId))

      // 6. Create freelancer profile with APPROVED status
      await db.insert(freelancerProfiles).values({
        userId: newUserId,
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
          acceptedBy: newUserId,
          acceptedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(artistInvites.id, invite.id))

      // 8. Fire-and-forget notifications
      const portalUrl = `${config.app.url}/portal`

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

      logger.info(
        { userId: newUserId, inviteId: invite.id, email },
        'Artist joined via invite link'
      )

      // 9. Return success with session info
      //    The Better Auth signUp already set the session cookie via the response headers,
      //    but we need to forward them. Create a response that includes the auth cookies.
      const response = successResponse(
        {
          success: true,
          redirectUrl: '/portal',
          user: {
            id: newUserId,
            name: name.trim(),
            email: email.toLowerCase().trim(),
            role: 'FREELANCER',
          },
        },
        201
      )

      return response
    },
    { endpoint: 'POST /api/artist-invites/[token]/join' }
  )
}
