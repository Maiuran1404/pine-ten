import { NextRequest } from 'next/server'
import { db } from '@/db'
import { websiteProjects } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireClient } from '@/lib/require-auth'
import { previewSchema } from '@/lib/validations/website-delivery-schemas'
import { createBuilder } from '@/lib/website/builders/builder-factory'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      const session = await requireClient()

      const body = await request.json()
      const validated = previewSchema.parse(body)

      // Load project and verify ownership
      const [project] = await db
        .select()
        .from(websiteProjects)
        .where(eq(websiteProjects.id, validated.projectId))
        .limit(1)

      if (!project) {
        throw Errors.notFound('Website project')
      }

      if (project.userId !== session.user.id) {
        throw Errors.forbidden('You do not have permission to modify this project')
      }

      // Check delivery status — must be PUSHED before previewing
      const deliveryResult = await db.execute(
        sql`SELECT delivery_status, framer_project_url FROM website_projects WHERE id = ${validated.projectId} LIMIT 1`
      )
      const deliveryRow = (
        deliveryResult as unknown as Array<{ delivery_status: string; framer_project_url: string }>
      )[0]

      if (!deliveryRow?.framer_project_url) {
        throw Errors.badRequest('Project has not been pushed to Framer yet')
      }

      if (
        deliveryRow.delivery_status !== 'PUSHED' &&
        deliveryRow.delivery_status !== 'PREVIEW_READY'
      ) {
        throw Errors.badRequest(
          `Cannot preview in current delivery status: ${deliveryRow.delivery_status}`
        )
      }

      const framerApiKey = process.env.FRAMER_API_KEY
      if (!framerApiKey) {
        throw Errors.badRequest('Framer integration not configured')
      }

      // Update status to PREVIEWING
      await db.execute(
        sql`UPDATE website_projects SET delivery_status = 'PREVIEWING', updated_at = now() WHERE id = ${validated.projectId}`
      )

      const builder = createBuilder('framer', {
        apiKey: framerApiKey,
        projectUrl: deliveryRow.framer_project_url,
      })

      try {
        const result = await builder.publishPreview()

        await db.execute(
          sql`UPDATE website_projects SET delivery_status = 'PREVIEW_READY', framer_preview_url = ${result.previewUrl}, updated_at = now() WHERE id = ${validated.projectId}`
        )

        await builder.disconnect()

        logger.info(
          {
            projectId: validated.projectId,
            userId: session.user.id,
            previewUrl: result.previewUrl,
          },
          'Framer preview published'
        )

        return successResponse({ previewUrl: result.previewUrl }, 200)
      } catch (error) {
        await builder.disconnect()

        // Revert to PUSHED status on failure
        await db.execute(
          sql`UPDATE website_projects SET delivery_status = 'PUSHED', updated_at = now() WHERE id = ${validated.projectId}`
        )

        throw error
      }
    },
    { endpoint: 'POST /api/website-flow/delivery/preview' }
  )
}
