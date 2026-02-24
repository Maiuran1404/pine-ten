import { NextRequest } from 'next/server'
import { db } from '@/db'
import { websiteInspirations } from '@/db/schema'
import { eq, and, count, sql } from 'drizzle-orm'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'

export async function GET(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAuth()

      const { searchParams } = new URL(request.url)
      const industry = searchParams.get('industry')
      const style = searchParams.get('style')
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
      const offset = parseInt(searchParams.get('offset') || '0')

      // Build filter conditions
      const conditions = [eq(websiteInspirations.isActive, true)]

      if (industry) {
        conditions.push(
          sql`${websiteInspirations.industry} @> ${JSON.stringify([industry])}::jsonb`
        )
      }

      if (style) {
        conditions.push(sql`${websiteInspirations.styleTags} @> ${JSON.stringify([style])}::jsonb`)
      }

      const whereClause = and(...conditions)

      // Query inspirations and total count in parallel
      const [inspirations, totalResult] = await Promise.all([
        db
          .select()
          .from(websiteInspirations)
          .where(whereClause)
          .orderBy(websiteInspirations.displayOrder)
          .limit(limit)
          .offset(offset),
        db.select({ total: count() }).from(websiteInspirations).where(whereClause),
      ])

      return successResponse({
        inspirations,
        total: totalResult[0]?.total ?? 0,
      })
    },
    { endpoint: 'GET /api/website-flow/inspirations' }
  )
}
