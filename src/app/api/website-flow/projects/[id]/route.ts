import { NextRequest } from 'next/server'
import { db } from '@/db'
import { websiteProjects } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(
    async () => {
      const session = await requireAuth()

      const { id } = await params

      const [project] = await db
        .select()
        .from(websiteProjects)
        .where(eq(websiteProjects.id, id))
        .limit(1)

      if (!project) {
        throw Errors.notFound('Website project')
      }

      // Verify ownership or admin access
      if (project.userId !== session.user.id && session.user.role !== 'ADMIN') {
        throw Errors.forbidden('You do not have permission to view this project')
      }

      return successResponse(project)
    },
    { endpoint: 'GET /api/website-flow/projects/[id]' }
  )
}
