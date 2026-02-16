import { NextRequest } from 'next/server'
import { db, withTransaction } from '@/db'
import { assignmentAlgorithmConfig } from '@/db/schema'
import { eq, ne } from 'drizzle-orm'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { requireAdmin } from '@/lib/require-auth'

/**
 * POST /api/admin/algorithm/publish
 * Publish (activate) a configuration, deactivating any existing active config
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      const { user } = await requireAdmin()

      const body = await request.json()
      const { id } = body

      if (!id) {
        throw Errors.badRequest('Configuration ID is required')
      }

      // Check if config exists
      const [configToPublish] = await db
        .select()
        .from(assignmentAlgorithmConfig)
        .where(eq(assignmentAlgorithmConfig.id, id))

      if (!configToPublish) {
        throw Errors.notFound('Configuration')
      }

      if (configToPublish.isActive) {
        throw Errors.badRequest('Configuration is already active')
      }

      // Use transaction to ensure atomicity
      await withTransaction(async (tx) => {
        // Deactivate all other configs
        await tx
          .update(assignmentAlgorithmConfig)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(ne(assignmentAlgorithmConfig.id, id))

        // Activate the selected config
        await tx
          .update(assignmentAlgorithmConfig)
          .set({
            isActive: true,
            publishedAt: new Date(),
            updatedBy: user.id,
            updatedAt: new Date(),
          })
          .where(eq(assignmentAlgorithmConfig.id, id))
      })

      logger.info(
        {
          configId: id,
          version: configToPublish.version,
          userId: user.id,
        },
        'Algorithm configuration published and activated'
      )

      return successResponse({
        message: `Configuration v${configToPublish.version} is now active`,
        configId: id,
      })
    },
    { endpoint: 'POST /api/admin/algorithm/publish' }
  )
}
