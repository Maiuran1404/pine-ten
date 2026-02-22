import { NextRequest } from 'next/server'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { db, artistInvites, users } from '@/db'
import { eq } from 'drizzle-orm'

// GET - Validate invite token and return pre-fill data (public, no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  return withErrorHandling(
    async () => {
      const { token } = await params

      const invite = await db
        .select({
          id: artistInvites.id,
          name: artistInvites.name,
          email: artistInvites.email,
          status: artistInvites.status,
          expiresAt: artistInvites.expiresAt,
          invitedBy: artistInvites.invitedBy,
        })
        .from(artistInvites)
        .where(eq(artistInvites.token, token))
        .limit(1)

      if (!invite.length) {
        return successResponse({ valid: false, reason: 'Invite not found' })
      }

      const inv = invite[0]

      if (inv.status !== 'PENDING') {
        return successResponse({
          valid: false,
          reason:
            inv.status === 'ACCEPTED'
              ? 'This invite has already been used'
              : 'This invite has expired',
        })
      }

      if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) {
        return successResponse({ valid: false, reason: 'This invite has expired' })
      }

      // Get inviter name for trust badge
      let inviterName: string | null = null
      if (inv.invitedBy) {
        const inviter = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, inv.invitedBy))
          .limit(1)
        inviterName = inviter[0]?.name || null
      }

      return successResponse({
        valid: true,
        name: inv.name,
        email: inv.email,
        inviterName,
      })
    },
    { endpoint: 'GET /api/artist-invites/[token]' }
  )
}
