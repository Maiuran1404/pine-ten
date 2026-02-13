import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { createInviteCodeSchema, updateInviteCodeSchema } from '@/lib/validations'
import { db, earlyAccessCodes, users } from '@/db'
import { eq, desc } from 'drizzle-orm'
import crypto from 'crypto'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1 to avoid confusion
  let result = 'CRAFT-'
  for (let i = 0; i < 4; i++) {
    result += chars[crypto.randomInt(chars.length)]
  }
  return result
}

// GET - List all invite codes with creator info
export async function GET() {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const codes = await db
        .select({
          id: earlyAccessCodes.id,
          code: earlyAccessCodes.code,
          description: earlyAccessCodes.description,
          maxUses: earlyAccessCodes.maxUses,
          usedCount: earlyAccessCodes.usedCount,
          expiresAt: earlyAccessCodes.expiresAt,
          isActive: earlyAccessCodes.isActive,
          createdBy: earlyAccessCodes.createdBy,
          createdAt: earlyAccessCodes.createdAt,
          creatorName: users.name,
          creatorEmail: users.email,
        })
        .from(earlyAccessCodes)
        .leftJoin(users, eq(earlyAccessCodes.createdBy, users.id))
        .orderBy(desc(earlyAccessCodes.createdAt))

      return successResponse({ codes })
    },
    { endpoint: 'GET /api/admin/invite-codes' }
  )
}

// POST - Create a new invite code
export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      const session = await requireAdmin()

      const body = await request.json()
      const parseResult = createInviteCodeSchema.safeParse(body)
      if (!parseResult.success) {
        const firstError = parseResult.error.issues[0]
        throw Errors.badRequest(firstError?.message || 'Invalid input')
      }

      const { code: customCode, description, maxUses, expiresAt } = parseResult.data

      // Generate or use custom code
      let code = customCode || generateCode()

      // Ensure uniqueness (retry up to 5 times for auto-generated codes)
      for (let attempt = 0; attempt < 5; attempt++) {
        const existing = await db
          .select({ id: earlyAccessCodes.id })
          .from(earlyAccessCodes)
          .where(eq(earlyAccessCodes.code, code))
          .limit(1)

        if (existing.length === 0) break

        if (customCode) {
          throw Errors.badRequest('An invite code with this value already exists')
        }
        code = generateCode()

        if (attempt === 4) {
          throw Errors.badRequest('Failed to generate a unique code. Please try again.')
        }
      }

      const [newCode] = await db
        .insert(earlyAccessCodes)
        .values({
          code,
          description: description || null,
          maxUses: maxUses || null,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          createdBy: session.user.id,
        })
        .returning()

      return successResponse({ code: newCode }, 201)
    },
    { endpoint: 'POST /api/admin/invite-codes' }
  )
}

// PATCH - Update an invite code
export async function PATCH(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const { searchParams } = new URL(request.url)
      const codeId = searchParams.get('id')
      if (!codeId) throw Errors.badRequest('Code ID is required')

      const body = await request.json()
      const parseResult = updateInviteCodeSchema.safeParse(body)
      if (!parseResult.success) {
        const firstError = parseResult.error.issues[0]
        throw Errors.badRequest(firstError?.message || 'Invalid input')
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() }
      const data = parseResult.data

      if (typeof data.isActive === 'boolean') updates.isActive = data.isActive
      if (data.description !== undefined) updates.description = data.description
      if (data.maxUses !== undefined) updates.maxUses = data.maxUses
      if (data.expiresAt !== undefined)
        updates.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null

      const [updated] = await db
        .update(earlyAccessCodes)
        .set(updates)
        .where(eq(earlyAccessCodes.id, codeId))
        .returning()

      if (!updated) throw Errors.notFound('Invite code')

      return successResponse({ code: updated })
    },
    { endpoint: 'PATCH /api/admin/invite-codes' }
  )
}

// DELETE - Delete an invite code (soft by default, hard with ?hard=true)
export async function DELETE(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const { searchParams } = new URL(request.url)
      const codeId = searchParams.get('id')
      const hard = searchParams.get('hard') === 'true'

      if (!codeId) throw Errors.badRequest('Code ID is required')

      if (hard) {
        const [deleted] = await db
          .delete(earlyAccessCodes)
          .where(eq(earlyAccessCodes.id, codeId))
          .returning({ id: earlyAccessCodes.id })

        if (!deleted) throw Errors.notFound('Invite code')
      } else {
        const [updated] = await db
          .update(earlyAccessCodes)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(earlyAccessCodes.id, codeId))
          .returning({ id: earlyAccessCodes.id })

        if (!updated) throw Errors.notFound('Invite code')
      }

      return successResponse({ success: true })
    },
    { endpoint: 'DELETE /api/admin/invite-codes' }
  )
}
