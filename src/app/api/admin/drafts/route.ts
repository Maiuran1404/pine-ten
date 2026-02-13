import { db } from '@/db'
import { chatDrafts, users, companies } from '@/db/schema'
import { requireAdmin } from '@/lib/require-auth'
import { desc, eq } from 'drizzle-orm'
import { withErrorHandling, successResponse } from '@/lib/errors'

// GET - Fetch all drafts (admin only)
export async function GET() {
  return withErrorHandling(
    async () => {
      await requireAdmin()

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

      return successResponse({ drafts })
    },
    { endpoint: 'GET /api/admin/drafts' }
  )
}
