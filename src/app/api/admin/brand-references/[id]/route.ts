import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { db } from '@/db'
import { brandReferences } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { updateBrandReferenceSchema } from '@/lib/validations'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const { id } = await params
      const validated = updateBrandReferenceSchema.parse(await request.json())

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      }

      if (validated.name !== undefined) updateData.name = validated.name
      if (validated.description !== undefined) updateData.description = validated.description
      if (validated.imageUrl !== undefined) updateData.imageUrl = validated.imageUrl
      if (validated.toneBucket !== undefined) updateData.toneBucket = validated.toneBucket
      if (validated.energyBucket !== undefined) updateData.energyBucket = validated.energyBucket
      if (validated.densityBucket !== undefined) updateData.densityBucket = validated.densityBucket
      if (validated.colorBucket !== undefined) updateData.colorBucket = validated.colorBucket
      if (validated.premiumBucket !== undefined) updateData.premiumBucket = validated.premiumBucket
      if (validated.colorSamples !== undefined) updateData.colorSamples = validated.colorSamples
      if (validated.visualStyles !== undefined) updateData.visualStyles = validated.visualStyles
      if (validated.industries !== undefined) updateData.industries = validated.industries
      if (validated.displayOrder !== undefined) updateData.displayOrder = validated.displayOrder
      if (validated.isActive !== undefined) updateData.isActive = validated.isActive

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
