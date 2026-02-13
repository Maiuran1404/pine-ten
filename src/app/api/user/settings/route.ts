import { NextRequest } from 'next/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { updateUserSettingsSchema } from '@/lib/validations'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'

export async function GET() {
  return withErrorHandling(async () => {
    const session = await requireAuth()

    const userResult = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        image: users.image,
        notificationPreferences: users.notificationPreferences,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)

    if (!userResult.length) {
      throw Errors.notFound('User')
    }

    return successResponse({ user: userResult[0] })
  })
}

export async function PUT(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAuth()

    const body = await request.json()
    const validated = updateUserSettingsSchema.parse(body)

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (validated.name !== undefined) {
      updateData.name = validated.name
    }
    if (validated.phone !== undefined) {
      updateData.phone = validated.phone
    }
    if (validated.notificationPreferences !== undefined) {
      updateData.notificationPreferences = validated.notificationPreferences
    }

    await db.update(users).set(updateData).where(eq(users.id, session.user.id))

    return successResponse({ success: true })
  })
}
