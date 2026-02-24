import { NextRequest } from 'next/server'
import { db } from '@/db'
import { websiteProjects } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireClient } from '@/lib/require-auth'
import {
  createWebsiteProjectSchema,
  updateWebsiteProjectSchema,
} from '@/lib/validations/website-flow-schemas'

export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      const session = await requireClient()

      const body = await request.json()
      const validated = createWebsiteProjectSchema.parse(body)

      const [project] = await db
        .insert(websiteProjects)
        .values({
          userId: session.user.id,
          companyId: session.user.companyId ?? undefined,
          selectedInspirations: validated.selectedInspirations,
          userNotes: validated.userNotes,
          phase: 'INSPIRATION',
          status: 'DRAFT',
        })
        .returning()

      return successResponse(project, 201)
    },
    { endpoint: 'POST /api/website-flow/projects' }
  )
}

export async function PUT(request: NextRequest) {
  return withErrorHandling(
    async () => {
      const session = await requireClient()

      const body = await request.json()
      const validated = updateWebsiteProjectSchema.parse(body)

      // Get project ID from body or query
      const { searchParams } = new URL(request.url)
      const projectId =
        ((body as Record<string, unknown>).id as string | undefined) ?? searchParams.get('id')

      if (!projectId) {
        throw Errors.badRequest('Project ID is required')
      }

      // Verify project exists and belongs to user
      const existing = await db
        .select()
        .from(websiteProjects)
        .where(eq(websiteProjects.id, projectId))
        .limit(1)

      if (!existing.length) {
        throw Errors.notFound('Website project')
      }

      if (existing[0].userId !== session.user.id && session.user.role !== 'ADMIN') {
        throw Errors.forbidden('You do not have permission to update this project')
      }

      // Build update values
      const updateValues: Record<string, unknown> = {
        updatedAt: new Date(),
      }

      if (validated.phase !== undefined) updateValues.phase = validated.phase
      if (validated.selectedInspirations !== undefined)
        updateValues.selectedInspirations = validated.selectedInspirations
      if (validated.userNotes !== undefined) updateValues.userNotes = validated.userNotes
      if (validated.skeleton !== undefined) updateValues.skeleton = validated.skeleton
      if (validated.chatHistory !== undefined) updateValues.chatHistory = validated.chatHistory
      if (validated.skeletonStage !== undefined)
        updateValues.skeletonStage = validated.skeletonStage

      const [updated] = await db
        .update(websiteProjects)
        .set(updateValues)
        .where(eq(websiteProjects.id, projectId))
        .returning()

      return successResponse(updated)
    },
    { endpoint: 'PUT /api/website-flow/projects' }
  )
}
