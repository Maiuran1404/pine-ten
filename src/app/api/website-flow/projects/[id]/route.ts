import { NextRequest } from 'next/server'
import { db } from '@/db'
import { websiteProjects } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
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

      // Fetch delivery columns (added via manual migration, not in Drizzle schema)
      const deliveryResult = await db.execute(
        sql`SELECT delivery_status, framer_project_url, framer_preview_url, framer_deployed_url FROM website_projects WHERE id = ${id} LIMIT 1`
      )
      const deliveryRow = (
        deliveryResult as unknown as Array<{
          delivery_status: string | null
          framer_project_url: string | null
          framer_preview_url: string | null
          framer_deployed_url: string | null
        }>
      )[0]

      // Merge delivery state into the response
      const projectWithDelivery = {
        ...project,
        deliveryStatus: deliveryRow?.delivery_status ?? 'PENDING',
        framerProjectUrl: deliveryRow?.framer_project_url ?? null,
        framerPreviewUrl: deliveryRow?.framer_preview_url ?? null,
        framerDeployedUrl: deliveryRow?.framer_deployed_url ?? null,
      }

      return successResponse(projectWithDelivery)
    },
    { endpoint: 'GET /api/website-flow/projects/[id]' }
  )
}
