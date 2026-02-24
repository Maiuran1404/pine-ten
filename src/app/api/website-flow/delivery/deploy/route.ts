import { NextRequest } from 'next/server'
import { db } from '@/db'
import { websiteProjects } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireClient } from '@/lib/require-auth'
import { deploySchema } from '@/lib/validations/website-delivery-schemas'
import { createBuilder } from '@/lib/website/builders/builder-factory'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      const session = await requireClient()

      const body = await request.json()
      const validated = deploySchema.parse(body)

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

      // Check delivery status — must be PREVIEW_READY before deploying
      const deliveryResult = await db.execute(
        sql`SELECT delivery_status, framer_project_url FROM website_projects WHERE id = ${validated.projectId} LIMIT 1`
      )
      const deliveryRow = (
        deliveryResult as unknown as Array<{ delivery_status: string; framer_project_url: string }>
      )[0]

      if (!deliveryRow?.framer_project_url) {
        throw Errors.badRequest('Project has not been pushed to Framer yet')
      }

      if (deliveryRow.delivery_status !== 'PREVIEW_READY') {
        throw Errors.badRequest(
          `Cannot deploy in current delivery status: ${deliveryRow.delivery_status}. Preview must be ready first.`
        )
      }

      const framerApiKey = process.env.FRAMER_API_KEY
      if (!framerApiKey) {
        throw Errors.badRequest('Framer integration not configured')
      }

      // Update status to DEPLOYING
      await db.execute(
        sql`UPDATE website_projects SET delivery_status = 'DEPLOYING', updated_at = now() WHERE id = ${validated.projectId}`
      )

      const builder = createBuilder('framer', {
        apiKey: framerApiKey,
        projectUrl: deliveryRow.framer_project_url,
      })

      try {
        const result = await builder.deployToProduction()

        if (result.success) {
          await db.execute(
            sql`UPDATE website_projects SET delivery_status = 'DEPLOYED', framer_deployed_url = ${result.deployedUrl}, updated_at = now() WHERE id = ${validated.projectId}`
          )

          logger.info(
            {
              projectId: validated.projectId,
              userId: session.user.id,
              deployedUrl: result.deployedUrl,
            },
            'Website deployed to production via Framer'
          )
        } else {
          await db.execute(
            sql`UPDATE website_projects SET delivery_status = 'FAILED', updated_at = now() WHERE id = ${validated.projectId}`
          )

          logger.warn(
            {
              projectId: validated.projectId,
              userId: session.user.id,
              error: result.error,
            },
            'Framer production deploy failed'
          )
        }

        await builder.disconnect()

        return successResponse(result, 200)
      } catch (error) {
        await builder.disconnect()

        // Revert to PREVIEW_READY on failure
        await db.execute(
          sql`UPDATE website_projects SET delivery_status = 'PREVIEW_READY', updated_at = now() WHERE id = ${validated.projectId}`
        )

        throw error
      }
    },
    { endpoint: 'POST /api/website-flow/delivery/deploy' }
  )
}
