import { NextRequest } from 'next/server'
import { db } from '@/db'
import { websiteInspirations } from '@/db/schema'
import { eq, and, inArray, notInArray } from 'drizzle-orm'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'
import { similarWebsitesSchema } from '@/lib/validations/website-flow-schemas'
import { findSimilar } from '@/lib/website/similarity-engine'

export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAuth()

      const body = await request.json()
      const validated = similarWebsitesSchema.parse(body)

      // Load selected inspiration records by IDs
      const selectedInspirations = await db
        .select()
        .from(websiteInspirations)
        .where(
          and(
            eq(websiteInspirations.isActive, true),
            inArray(websiteInspirations.id, validated.inspirationIds)
          )
        )

      // Load all other active inspirations as candidates
      const candidates = await db
        .select()
        .from(websiteInspirations)
        .where(
          and(
            eq(websiteInspirations.isActive, true),
            notInArray(websiteInspirations.id, validated.inspirationIds)
          )
        )

      // Aggregate tags from source inspirations
      const aggregatedTags = {
        styleTags: [...new Set(selectedInspirations.flatMap((i) => i.styleTags ?? []))],
        industry: [...new Set(selectedInspirations.flatMap((i) => i.industry ?? []))],
        colorSamples: [...new Set(selectedInspirations.flatMap((i) => i.colorSamples ?? []))],
        sectionTypes: [...new Set(selectedInspirations.flatMap((i) => i.sectionTypes ?? []))],
        layoutStyles: [
          ...new Set(
            selectedInspirations.map((i) => i.layoutStyle).filter((ls): ls is string => ls !== null)
          ),
        ],
      }

      // Find similar inspirations
      const candidateInputs = candidates.map((c) => ({
        id: c.id,
        name: c.name,
        styleTags: c.styleTags ?? [],
        industry: c.industry ?? [],
        colorSamples: c.colorSamples ?? [],
        sectionTypes: c.sectionTypes ?? [],
        layoutStyle: c.layoutStyle,
        typography: c.typography,
      }))

      const similar = findSimilar(aggregatedTags, candidateInputs, validated.limit)

      return successResponse({ similar })
    },
    { endpoint: 'POST /api/website-flow/similar' }
  )
}
