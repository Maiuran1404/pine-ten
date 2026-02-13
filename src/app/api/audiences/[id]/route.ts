import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db'
import { audiences, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { logger } from '@/lib/logger'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get user's company ID
    const [user] = await db
      .select({ companyId: users.companyId })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)

    if (!user?.companyId) {
      return NextResponse.json({ error: 'No company found' }, { status: 404 })
    }

    // Delete the audience (only if it belongs to user's company)
    const result = await db
      .delete(audiences)
      .where(and(eq(audiences.id, id), eq(audiences.companyId, user.companyId)))
      .returning()

    if (result.length === 0) {
      return NextResponse.json({ error: 'Audience not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ error }, 'Error deleting audience')
    return NextResponse.json({ error: 'Failed to delete audience' }, { status: 500 })
  }
}
