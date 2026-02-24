import 'server-only'

interface InspirationInput {
  id: string
  name: string
  styleTags: string[]
  industry: string[]
  colorSamples: string[]
  sectionTypes: string[]
  layoutStyle: string | null
  typography: string | null
}

interface SimilarityBreakdown {
  styleScore: number
  industryScore: number
  colorScore: number
  layoutScore: number
  sectionScore: number
}

interface SimilarityResult {
  inspiration: InspirationInput
  score: number
  breakdown: SimilarityBreakdown
}

/**
 * Calculate Jaccard similarity between two string arrays
 */
function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0
  const setA = new Set(a.map((s) => s.toLowerCase()))
  const setB = new Set(b.map((s) => s.toLowerCase()))
  const intersection = new Set([...setA].filter((x) => setB.has(x)))
  const union = new Set([...setA, ...setB])
  return union.size === 0 ? 0 : intersection.size / union.size
}

/**
 * Find similar website inspirations based on aggregated tags from selected inspirations
 */
export function findSimilar(
  sourceTags: {
    styleTags: string[]
    industry: string[]
    colorSamples: string[]
    sectionTypes: string[]
    layoutStyles: string[]
  },
  candidates: InspirationInput[],
  limit: number = 5
): SimilarityResult[] {
  const scored = candidates.map((candidate) => {
    const styleScore = jaccardSimilarity(sourceTags.styleTags, candidate.styleTags)
    const industryScore = jaccardSimilarity(sourceTags.industry, candidate.industry)
    const colorScore = jaccardSimilarity(sourceTags.colorSamples, candidate.colorSamples)
    const sectionScore = jaccardSimilarity(sourceTags.sectionTypes, candidate.sectionTypes)
    const layoutScore = candidate.layoutStyle
      ? sourceTags.layoutStyles.some(
          (ls) => ls.toLowerCase() === candidate.layoutStyle?.toLowerCase()
        )
        ? 1.0
        : 0.0
      : 0.0

    // Weighted composite score
    const score =
      styleScore * 0.35 +
      industryScore * 0.2 +
      colorScore * 0.15 +
      layoutScore * 0.15 +
      sectionScore * 0.15

    return {
      inspiration: candidate,
      score: Math.round(score * 100) / 100,
      breakdown: {
        styleScore: Math.round(styleScore * 100) / 100,
        industryScore: Math.round(industryScore * 100) / 100,
        colorScore: Math.round(colorScore * 100) / 100,
        layoutScore: Math.round(layoutScore * 100) / 100,
        sectionScore: Math.round(sectionScore * 100) / 100,
      },
    }
  })

  // Sort by score descending and take top results
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .filter((r) => r.score > 0)
}

/**
 * Find similar website inspirations using pgvector cosine distance.
 * Falls back to empty results if embeddings are not available.
 *
 * Takes pre-computed embedding vectors from selected inspirations, averages them
 * into a single query vector, then uses pgvector's cosine distance operator (<=>)
 * to find the closest matches.
 */
export async function findSimilarByEmbedding(
  sourceVectors: number[][],
  excludeIds: string[],
  limit: number = 5
): Promise<Array<{ id: string; score: number }>> {
  const { db } = await import('@/db')
  const { sql } = await import('drizzle-orm')

  if (sourceVectors.length === 0) return []

  // Average the source vectors to create a query vector
  const dimensions = sourceVectors[0].length
  const avgVector = new Array<number>(dimensions).fill(0)
  for (const vec of sourceVectors) {
    for (let i = 0; i < dimensions; i++) {
      avgVector[i] += vec[i] / sourceVectors.length
    }
  }

  // Format as pgvector literal: '[0.1,0.2,...]'
  const vectorStr = `[${avgVector.join(',')}]`

  try {
    // Build exclusion clause — excludeIds are UUID-validated upstream via Zod
    const exclusionClause =
      excludeIds.length > 0 ? `AND id NOT IN (${excludeIds.map((id) => `'${id}'`).join(',')})` : ''

    const result = (await db.execute(
      sql.raw(`
        SELECT id, 1 - (embedding_vector <=> '${vectorStr}'::vector) as similarity_score
        FROM website_inspirations
        WHERE is_active = true
          AND embedding_vector IS NOT NULL
          ${exclusionClause}
        ORDER BY embedding_vector <=> '${vectorStr}'::vector
        LIMIT ${limit}
      `)
    )) as unknown as Array<{ id: string; similarity_score: number }>

    return result.map((row) => ({
      id: row.id,
      score: Math.round(Number(row.similarity_score) * 100) / 100,
    }))
  } catch {
    // pgvector not available or column doesn't exist — return empty
    return []
  }
}
