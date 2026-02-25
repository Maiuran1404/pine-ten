import { NextRequest } from 'next/server'
import { db } from '@/db'
import { websiteProjects } from '@/db/schema'
import { eq } from 'drizzle-orm'
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
      if (!project.framerProjectUrl) {
        throw Errors.badRequest('Project has not been pushed to Framer yet')
      }

      if (project.deliveryStatus !== 'PUSHED' && project.deliveryStatus !== 'PREVIEW_READY') {
        throw Errors.badRequest(
          `Cannot preview in current delivery status: ${project.deliveryStatus}`
        )
      }

      const framerApiKey = process.env.FRAMER_API_KEY
      if (!framerApiKey) {
        throw Errors.badRequest('Framer integration not configured')
      }

      // Update status to PREVIEWING
      await db
        .update(websiteProjects)
        .set({ deliveryStatus: 'PREVIEWING', updatedAt: new Date() })
        .where(eq(websiteProjects.id, validated.projectId))

      const builder = createBuilder('framer', {
        apiKey: framerApiKey,
        projectUrl: project.framerProjectUrl,
      })

      try {
        const result = await builder.publishPreview()

        await db
          .update(websiteProjects)
          .set({
            deliveryStatus: 'PREVIEW_READY',
            framerPreviewUrl: result.previewUrl,
            updatedAt: new Date(),
          })
          .where(eq(websiteProjects.id, validated.projectId))

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
        await db
          .update(websiteProjects)
          .set({ deliveryStatus: 'PUSHED', updatedAt: new Date() })
          .where(eq(websiteProjects.id, validated.projectId))

        throw error
      }
    },
    { endpoint: 'POST /api/website-flow/delivery/preview' }
  )
}
