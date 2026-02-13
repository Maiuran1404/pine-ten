import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { db } from '@/db'
import { brandReferences } from '@/db/schema'
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
        toneBucket,
        energyBucket,
        densityBucket,
        colorBucket,
        premiumBucket,
        colorSamples,
        visualStyles,
        industries,
        displayOrder,
        isActive,
      } = body

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      }

      if (name !== undefined) updateData.name = name
      if (description !== undefined) updateData.description = description
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl
      if (toneBucket !== undefined) updateData.toneBucket = toneBucket
      if (energyBucket !== undefined) updateData.energyBucket = energyBucket
      if (densityBucket !== undefined) updateData.densityBucket = densityBucket
      if (colorBucket !== undefined) updateData.colorBucket = colorBucket
      if (premiumBucket !== undefined) updateData.premiumBucket = premiumBucket
      if (colorSamples !== undefined) updateData.colorSamples = colorSamples
      if (visualStyles !== undefined) updateData.visualStyles = visualStyles
      if (industries !== undefined) updateData.industries = industries
      if (displayOrder !== undefined) updateData.displayOrder = displayOrder
      if (isActive !== undefined) updateData.isActive = isActive

      const [updatedReference] = await db
        .update(brandReferences)
        .set(updateData)
        .where(eq(brandReferences.id, id))
        .returning()

      if (!updatedReference) {
        throw Errors.notFound('Reference')
      }

      return successResponse({ reference: updatedReference })
    },
    { endpoint: 'PATCH /api/admin/brand-references/[id]' }
  )
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const { id } = await params

      await db.delete(brandReferences).where(eq(brandReferences.id, id))

      return successResponse({ success: true })
    },
    { endpoint: 'DELETE /api/admin/brand-references/[id]' }
  )
}
