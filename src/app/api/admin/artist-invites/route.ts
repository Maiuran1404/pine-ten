import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { createArtistInviteBatchSchema } from '@/lib/validations'
import { db, artistInvites, users } from '@/db'
import { eq, desc, sql } from 'drizzle-orm'
import crypto from 'crypto'
import { config } from '@/lib/config'
import { safeAsync } from '@/lib/notifications'

// GET - List all artist invites with creator info
export async function GET() {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const invitedByUser = db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .as('inviter')

      const acceptedByUser = db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .as('accepter')

      const invites = await db
        .select({
          id: artistInvites.id,
          token: artistInvites.token,
          email: artistInvites.email,
          name: artistInvites.name,
          whatsappNumber: artistInvites.whatsappNumber,
          note: artistInvites.note,
          status: artistInvites.status,
          invitedBy: artistInvites.invitedBy,
          acceptedBy: artistInvites.acceptedBy,
          acceptedAt: artistInvites.acceptedAt,
          expiresAt: artistInvites.expiresAt,
          createdAt: artistInvites.createdAt,
          inviterName: invitedByUser.name,
          inviterEmail: invitedByUser.email,
          acceptedByName: acceptedByUser.name,
          acceptedByEmail: acceptedByUser.email,
        })
        .from(artistInvites)
        .leftJoin(invitedByUser, eq(artistInvites.invitedBy, invitedByUser.id))
        .leftJoin(acceptedByUser, eq(artistInvites.acceptedBy, acceptedByUser.id))
        .orderBy(desc(artistInvites.createdAt))

      // Get stats
      const stats = await db
        .select({
          total: sql<number>`count(*)::int`,
          pending: sql<number>`count(*) filter (where ${artistInvites.status} = 'PENDING')::int`,
          accepted: sql<number>`count(*) filter (where ${artistInvites.status} = 'ACCEPTED')::int`,
          expired: sql<number>`count(*) filter (where ${artistInvites.status} = 'EXPIRED')::int`,
        })
        .from(artistInvites)

      return successResponse({
        invites,
        stats: stats[0] || { total: 0, pending: 0, accepted: 0, expired: 0 },
      })
    },
    { endpoint: 'GET /api/admin/artist-invites' }
  )
}

// POST - Create one or more artist invites
export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      const session = await requireAdmin()

      const body = await request.json()
      const parseResult = createArtistInviteBatchSchema.safeParse(body)
      if (!parseResult.success) {
        const firstError = parseResult.error.issues[0]
        throw Errors.badRequest(firstError?.message || 'Invalid input')
      }

      const { invites: inviteInputs } = parseResult.data
      const baseUrl = config.app.url
      const results: Array<{
        id: string
        token: string
        name: string
        email: string
        link: string
      }> = []

      for (const input of inviteInputs) {
        const token = crypto.randomUUID()

        const [invite] = await db
          .insert(artistInvites)
          .values({
            token,
            email: input.email.toLowerCase().trim(),
            name: input.name.trim(),
            whatsappNumber: input.whatsappNumber || null,
            note: input.note || null,
            invitedBy: session.user.id,
          })
          .returning()

        const joinLink = `${baseUrl}/join/${token}`

        results.push({
          id: invite.id,
          token: invite.token,
          name: invite.name,
          email: invite.email,
          link: joinLink,
        })

        // Fire-and-forget: send invite email
        safeAsync(
          async () => {
            const { sendEmail } = await import('@/lib/notifications')
            const { emailTemplates: inviteEmailTemplates } =
              await import('@/lib/notifications/email/user-templates')
            const template = inviteEmailTemplates.artistInvite(
              input.name,
              session.user.name || 'Crafted Admin',
              joinLink
            )
            await sendEmail({
              to: input.email,
              subject: template.subject,
              html: template.html,
            })
          },
          { context: 'artist-invite-email', email: input.email }
        )

        // Fire-and-forget: send invite via WhatsApp if number provided
        if (input.whatsappNumber) {
          safeAsync(
            async () => {
              const { sendWhatsApp, whatsappTemplates: waTemplates } =
                await import('@/lib/notifications/whatsapp')
              const message = waTemplates.artistInvite(input.name, joinLink)
              await sendWhatsApp({ to: input.whatsappNumber!, message })
            },
            { context: 'artist-invite-whatsapp', phone: input.whatsappNumber }
          )
        }
      }

      return successResponse({ invites: results }, 201)
    },
    { endpoint: 'POST /api/admin/artist-invites' }
  )
}

// DELETE - Revoke an invite (set to EXPIRED)
export async function DELETE(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const { searchParams } = new URL(request.url)
      const inviteId = searchParams.get('id')
      if (!inviteId) throw Errors.badRequest('Invite ID is required')

      const [updated] = await db
        .update(artistInvites)
        .set({ status: 'EXPIRED', updatedAt: new Date() })
        .where(eq(artistInvites.id, inviteId))
        .returning({ id: artistInvites.id })

      if (!updated) throw Errors.notFound('Artist invite')

      return successResponse({ success: true })
    },
    { endpoint: 'DELETE /api/admin/artist-invites' }
  )
}
