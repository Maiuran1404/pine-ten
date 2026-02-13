import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { db } from '@/db'
import { deliverableStyleReferences } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const { id } = await params
      const body = await request.json()

      const {
        name,
        description,
        imageUrl,
        deliverableType,
        styleAxis,
        subStyle,
        semanticTags,
        featuredOrder,
        displayOrder,
        isActive,
      } = body

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      }

      if (name !== undefined) updateData.name = name
      if (description !== undefined) updateData.description = description
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl
      if (deliverableType !== undefined) updateData.deliverableType = deliverableType
      if (styleAxis !== undefined) updateData.styleAxis = styleAxis
      if (subStyle !== undefined) updateData.subStyle = subStyle
      if (semanticTags !== undefined) updateData.semanticTags = semanticTags
      if (featuredOrder !== undefined) updateData.featuredOrder = featuredOrder
      if (displayOrder !== undefined) updateData.displayOrder = displayOrder
      if (isActive !== undefined) updateData.isActive = isActive

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
