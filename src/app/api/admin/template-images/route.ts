import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { db } from '@/db'
import { templateImages } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { createTemplateImageSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const { searchParams } = new URL(request.url)
      const categoryKey = searchParams.get('categoryKey')

      const conditions = []
      if (categoryKey) {
        conditions.push(eq(templateImages.categoryKey, categoryKey))
      }

      const query = db.select().from(templateImages)

      const images =
        conditions.length > 0
          ? await query
              .where(and(...conditions))
              .orderBy(templateImages.categoryKey, templateImages.displayOrder)
          : await query.orderBy(templateImages.categoryKey, templateImages.displayOrder)

      return successResponse({ images })
    },
    { endpoint: 'GET /api/admin/template-images' }
  )
}

export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const body = await request.json()
      const validated = createTemplateImageSchema.parse(body)

      // Upsert: if categoryKey + optionKey combo exists, update it
      const existing = await db
        .select()
        .from(templateImages)
        .where(
          and(
            eq(templateImages.categoryKey, validated.categoryKey),
            validated.optionKey
              ? eq(templateImages.optionKey, validated.optionKey)
              : isNull(templateImages.optionKey)
          )
        )
        .limit(1)

      if (existing.length > 0) {
        const [updated] = await db
          .update(templateImages)
          .set({
            imageUrl: validated.imageUrl,
            sourceUrl: validated.sourceUrl || null,
            displayOrder: validated.displayOrder,
            updatedAt: new Date(),
          })
          .where(eq(templateImages.id, existing[0].id))
          .returning()

        return successResponse({ image: updated })
      }

      const [newImage] = await db
        .insert(templateImages)
        .values({
          categoryKey: validated.categoryKey,
          optionKey: validated.optionKey || null,
          imageUrl: validated.imageUrl,
          sourceUrl: validated.sourceUrl || null,
          displayOrder: validated.displayOrder,
        })
        .returning()

      return successResponse({ image: newImage }, 201)
    },
    { endpoint: 'POST /api/admin/template-images' }
  )
}

export async function DELETE(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const { searchParams } = new URL(request.url)
      const { id } = z.object({ id: z.string().uuid() }).parse({
        id: searchParams.get('id'),
      })

      await db.delete(templateImages).where(eq(templateImages.id, id))

      return successResponse({ success: true })
    },
    { endpoint: 'DELETE /api/admin/template-images' }
  )
}
