import { NextRequest } from 'next/server'
import { db } from '@/db'
import { websiteProjects } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireClient } from '@/lib/require-auth'
import { pushSkeletonSchema } from '@/lib/validations/website-delivery-schemas'
import { createBuilder } from '@/lib/website/builders/builder-factory'
import { logger } from '@/lib/logger'
import type { SkeletonData } from '@/lib/website/builders/website-builder.interface'

export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      const session = await requireClient()

      const body = await request.json()
      const validated = pushSkeletonSchema.parse(body)

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

      if (project.status !== 'APPROVED') {
        throw Errors.badRequest('Project must be approved before delivery')
      }

      if (!project.skeleton?.sections?.length) {
        throw Errors.badRequest('No skeleton to deliver')
      }

      const framerApiKey = process.env.FRAMER_API_KEY
      if (!framerApiKey) {
        throw Errors.badRequest('Framer integration not configured')
      }

      // Find matching template or use default
      let templateUrl = process.env.FRAMER_TEMPLATE_PROJECT_URL

      if (validated.templateId) {
        const templateResult = await db.execute(
          sql`SELECT framer_project_url FROM website_templates WHERE id = ${validated.templateId} AND is_active = true LIMIT 1`
        )
        const rows = templateResult as unknown as Array<{ framer_project_url: string }>
        if (rows.length > 0) {
          templateUrl = rows[0].framer_project_url
        }
      }

      if (!templateUrl) {
        throw Errors.badRequest('No Framer template available')
      }

      // Update delivery status to PUSHING
      await db.execute(
        sql`UPDATE website_projects SET delivery_status = 'PUSHING', framer_project_url = ${templateUrl}, updated_at = now() WHERE id = ${validated.projectId}`
      )

      // Build the skeleton data for the builder
      const skeletonData: SkeletonData = {
        sections: project.skeleton.sections.map((s) => ({
          id: s.id,
          type: s.type,
          title: s.title,
          description: s.description,
          order: s.order,
          content: s.content,
        })),
        globalStyles: project.skeleton.globalStyles,
      }

      // Push to Framer
      const builder = createBuilder('framer', { apiKey: framerApiKey, projectUrl: templateUrl })

      try {
        const result = await builder.pushSkeleton(skeletonData)

        if (result.success) {
          await db.execute(
            sql`UPDATE website_projects SET delivery_status = 'PUSHED', framer_preview_url = ${result.previewUrl ?? ''}, updated_at = now() WHERE id = ${validated.projectId}`
          )

          // Apply global styles if present
          if (project.skeleton.globalStyles) {
            await builder.applyStyles(project.skeleton.globalStyles)
          }

          logger.info(
            {
              projectId: validated.projectId,
              userId: session.user.id,
              previewUrl: result.previewUrl,
            },
            'Skeleton pushed to Framer successfully'
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
            'Failed to push skeleton to Framer'
          )
        }

        await builder.disconnect()

        return successResponse(result, 200)
      } catch (error) {
        await builder.disconnect()

        await db.execute(
          sql`UPDATE website_projects SET delivery_status = 'FAILED', updated_at = now() WHERE id = ${validated.projectId}`
        )

        throw error
      }
    },
    { endpoint: 'POST /api/website-flow/delivery/push' }
  )
}
