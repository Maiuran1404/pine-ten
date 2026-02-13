import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db'
import { chatDrafts, users, companies } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'

// GET - Fetch all drafts (admin only)
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch all drafts with client info
    const drafts = await db
      .select({
        id: chatDrafts.id,
        title: chatDrafts.title,
        messages: chatDrafts.messages,
        selectedStyles: chatDrafts.selectedStyles,
        pendingTask: chatDrafts.pendingTask,
        createdAt: chatDrafts.createdAt,
        updatedAt: chatDrafts.updatedAt,
        clientId: chatDrafts.clientId,
        clientName: users.name,
        clientEmail: users.email,
        companyName: companies.name,
      })
      .from(chatDrafts)
      .leftJoin(users, eq(chatDrafts.clientId, users.id))
      .leftJoin(companies, eq(users.companyId, companies.id))
      .orderBy(desc(chatDrafts.updatedAt))

    return NextResponse.json({ drafts })
  } catch (error) {
    logger.error({ error }, 'Fetch admin drafts error')
    return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 })
  }
}
