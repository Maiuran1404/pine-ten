import { NextRequest } from 'next/server'
import { db } from '@/db'
import { websiteInspirations } from '@/db/schema'
import { eq, and, inArray, notInArray, sql } from 'drizzle-orm'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'
import { similarWebsitesSchema } from '@/lib/validations/website-flow-schemas'
import { findSimilar, findSimilarByEmbedding } from '@/lib/website/similarity-engine'
import { logger } from '@/lib/logger'

/**
 * Try to load embedding vectors for the given inspiration IDs.
 * Returns empty array if pgvector is not available or no embeddings exist.
 */
async function loadEmbeddingVectors(
  inspirationIds: string[]
): Promise<Array<{ id: string; vector: number[] }>> {
  try {
    const rows = await db
      .select({
        id: websiteInspirations.id,
        vectorText: sql<string>`embedding_vector::text`,
      })
      .from(websiteInspirations)
      .where(
        and(inArray(websiteInspirations.id, inspirationIds), sql`embedding_vector IS NOT NULL`)
      )

    return rows
      .filter((row) => row.vectorText)
      .map((row) => ({
        id: row.id,
        // Parse pgvector text representation: "[0.1,0.2,...]"
        vector: row.vectorText.replace(/^\[/, '').replace(/]$/, '').split(',').map(Number),
      }))
  } catch {
    // pgvector extension not installed or column doesn't exist
    return []
  }
}

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

      // Try embedding-based search first (if vectors are available)
      const embeddingVectors = await loadEmbeddingVectors(validated.inspirationIds)

      if (embeddingVectors.length > 0) {
        logger.debug(
          { count: embeddingVectors.length, total: validated.inspirationIds.length },
          'Using embedding-based similarity search'
        )

        const embeddingResults = await findSimilarByEmbedding(
          embeddingVectors.map((ev) => ev.vector),
          validated.inspirationIds,
          validated.limit
        )

        if (embeddingResults.length > 0) {
          // Load full inspiration data for the embedding results
          const resultIds = embeddingResults.map((r) => r.id)
          const resultInspirations = await db
            .select()
            .from(websiteInspirations)
            .where(inArray(websiteInspirations.id, resultIds))

          // Map scores onto full inspiration data
          const scoreMap = new Map(embeddingResults.map((r) => [r.id, r.score]))
          const similar = resultInspirations
            .map((insp) => ({
              inspiration: {
                id: insp.id,
                name: insp.name,
                styleTags: insp.styleTags ?? [],
                industry: insp.industry ?? [],
                colorSamples: insp.colorSamples ?? [],
                sectionTypes: insp.sectionTypes ?? [],
                layoutStyle: insp.layoutStyle,
                typography: insp.typography,
              },
              score: scoreMap.get(insp.id) ?? 0,
              breakdown: {
                styleScore: 0,
                industryScore: 0,
                colorScore: 0,
                layoutScore: 0,
                sectionScore: 0,
              },
              method: 'embedding' as const,
            }))
            .sort((a, b) => b.score - a.score)

          return successResponse({ similar })
        }
      }

      // Fallback: Jaccard tag-based similarity
      logger.debug('Falling back to Jaccard tag-based similarity search')

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
