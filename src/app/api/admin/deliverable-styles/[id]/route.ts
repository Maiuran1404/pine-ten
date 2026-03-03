import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { db } from '@/db'
import { deliverableStyleReferences } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { updateDeliverableStyleSchema } from '@/lib/validations'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const { id } = await params
      const validated = updateDeliverableStyleSchema.parse(await request.json())

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      }

      if (validated.name !== undefined) updateData.name = validated.name
      if (validated.description !== undefined) updateData.description = validated.description
      if (validated.imageUrl !== undefined) updateData.imageUrl = validated.imageUrl
      if (validated.deliverableType !== undefined)
        updateData.deliverableType = validated.deliverableType
      if (validated.styleAxis !== undefined) updateData.styleAxis = validated.styleAxis
      if (validated.subStyle !== undefined) updateData.subStyle = validated.subStyle
      if (validated.semanticTags !== undefined) updateData.semanticTags = validated.semanticTags
      if (validated.featuredOrder !== undefined) updateData.featuredOrder = validated.featuredOrder
      if (validated.displayOrder !== undefined) updateData.displayOrder = validated.displayOrder
      if (validated.isActive !== undefined) updateData.isActive = validated.isActive
      if (validated.promptGuide !== undefined) updateData.promptGuide = validated.promptGuide
      if (validated.colorTemperature !== undefined)
        updateData.colorTemperature = validated.colorTemperature
      if (validated.energyLevel !== undefined) updateData.energyLevel = validated.energyLevel
      if (validated.formalityLevel !== undefined)
        updateData.formalityLevel = validated.formalityLevel
      if (validated.moodKeywords !== undefined) updateData.moodKeywords = validated.moodKeywords
      if (validated.densityLevel !== undefined) updateData.densityLevel = validated.densityLevel
      if (validated.colorSamples !== undefined) updateData.colorSamples = validated.colorSamples
      if (validated.visualElements !== undefined)
        updateData.visualElements = validated.visualElements
      if (validated.styleReferenceImages !== undefined)
        updateData.styleReferenceImages = validated.styleReferenceImages

      const [updatedStyle] = await db
        .update(deliverableStyleReferences)
        .set(updateData)
        .where(eq(deliverableStyleReferences.id, id))
        .returning()

      if (!updatedStyle) {
        throw Errors.notFound('Style')
      }

      return successResponse({ style: updatedStyle })
    },
    { endpoint: 'PATCH /api/admin/deliverable-styles/[id]' }
  )
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const { id } = await params

      await db.delete(deliverableStyleReferences).where(eq(deliverableStyleReferences.id, id))

      return successResponse({ success: true })
    },
    { endpoint: 'DELETE /api/admin/deliverable-styles/[id]' }
  )
}
