import { NextRequest } from 'next/server'
import { db } from '@/db'
import { websiteProjects } from '@/db/schema'
import { eq } from 'drizzle-orm'
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
      if (!project.framerProjectUrl) {
        throw Errors.badRequest('Project has not been pushed to Framer yet')
      }

      if (project.deliveryStatus !== 'PREVIEW_READY') {
        throw Errors.badRequest(
          `Cannot deploy in current delivery status: ${project.deliveryStatus}. Preview must be ready first.`
        )
      }

      const framerApiKey = process.env.FRAMER_API_KEY
      if (!framerApiKey) {
        throw Errors.badRequest('Framer integration not configured')
      }

      // Update status to DEPLOYING
      await db
        .update(websiteProjects)
        .set({ deliveryStatus: 'DEPLOYING', updatedAt: new Date() })
        .where(eq(websiteProjects.id, validated.projectId))

      const builder = createBuilder('framer', {
        apiKey: framerApiKey,
        projectUrl: project.framerProjectUrl,
      })

      try {
        const result = await builder.deployToProduction()

        if (result.success) {
          await db
            .update(websiteProjects)
            .set({
              deliveryStatus: 'DEPLOYED',
              framerDeployedUrl: result.deployedUrl,
              updatedAt: new Date(),
            })
            .where(eq(websiteProjects.id, validated.projectId))

          logger.info(
            {
              projectId: validated.projectId,
              userId: session.user.id,
              deployedUrl: result.deployedUrl,
            },
            'Website deployed to production via Framer'
          )
        } else {
          await db
            .update(websiteProjects)
            .set({ deliveryStatus: 'FAILED', updatedAt: new Date() })
            .where(eq(websiteProjects.id, validated.projectId))

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
        await db
          .update(websiteProjects)
          .set({ deliveryStatus: 'PREVIEW_READY', updatedAt: new Date() })
          .where(eq(websiteProjects.id, validated.projectId))

        throw error
      }
    },
    { endpoint: 'POST /api/website-flow/delivery/deploy' }
  )
}
