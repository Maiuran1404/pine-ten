import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { db } from '@/db'
import { deliverableStyleReferences } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import type { DeliverableType, StyleAxis } from '@/lib/constants/reference-libraries'
import { createDeliverableStyleSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      // Get optional filters from query params
      const { searchParams } = new URL(request.url)
      const deliverableType = searchParams.get('deliverableType') as DeliverableType | null
      const styleAxis = searchParams.get('styleAxis') as StyleAxis | null

      // Build conditions array
      const conditions = []
      if (deliverableType) {
        conditions.push(eq(deliverableStyleReferences.deliverableType, deliverableType))
      }
      if (styleAxis) {
        conditions.push(eq(deliverableStyleReferences.styleAxis, styleAxis))
      }

      const query = db.select().from(deliverableStyleReferences)

      const styles =
        conditions.length > 0
          ? await query
              .where(and(...conditions))
              .orderBy(
                deliverableStyleReferences.deliverableType,
                deliverableStyleReferences.styleAxis,
                deliverableStyleReferences.featuredOrder,
                deliverableStyleReferences.displayOrder
              )
          : await query.orderBy(
              deliverableStyleReferences.deliverableType,
              deliverableStyleReferences.styleAxis,
              deliverableStyleReferences.featuredOrder,
              deliverableStyleReferences.displayOrder
            )

      return successResponse({ styles })
    },
    { endpoint: 'GET /api/admin/deliverable-styles' }
  )
}

export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const body = await request.json()
      const validated = createDeliverableStyleSchema.parse(body)

      const [newStyle] = await db
        .insert(deliverableStyleReferences)
        .values({
          name: validated.name,
          description: validated.description || null,
          imageUrl: validated.imageUrl,
          deliverableType: validated.deliverableType,
          styleAxis: validated.styleAxis,
          subStyle: validated.subStyle || null,
          semanticTags: validated.semanticTags,
          featuredOrder: validated.featuredOrder,
          displayOrder: validated.displayOrder,
          isActive: true,
        })
        .returning()

      return successResponse({ style: newStyle }, 201)
    },
    { endpoint: 'POST /api/admin/deliverable-styles' }
  )
}

export async function DELETE(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const { searchParams } = new URL(request.url)
      const id = searchParams.get('id')

      if (!id) {
        throw Errors.badRequest('Style ID is required')
      }

      await db.delete(deliverableStyleReferences).where(eq(deliverableStyleReferences.id, id))

      return successResponse({ success: true })
    },
    { endpoint: 'DELETE /api/admin/deliverable-styles' }
  )
}
