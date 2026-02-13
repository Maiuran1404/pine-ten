import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { scrapeBigged, type BiggedScraperOptions } from '@/lib/scrapers/bigged-scraper'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'

export const maxDuration = 300 // 5 minutes for long scraping operations

export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      const session = await requireAdmin()

      const body = await request.json()
      const {
        query,
        limit = 20,
        confidenceThreshold = 0.5,
        minImageWidth = 200,
        minImageHeight = 200,
        parallelBatchSize = 3,
        preview = false,
      } = body

      if (!query || typeof query !== 'string') {
        throw Errors.badRequest('Query parameter is required')
      }

      if (limit > 100) {
        throw Errors.badRequest('Limit cannot exceed 100')
      }

      const options: BiggedScraperOptions = {
        query: query.trim(),
        limit,
        confidenceThreshold,
        minImageWidth,
        minImageHeight,
        parallelBatchSize,
        preview,
        triggeredBy: session.user.id,
        triggeredByEmail: session.user.email,
      }

      const result = await scrapeBigged(options)

      return successResponse({
        results: result.results,
        summary: result.summary,
        importLogId: result.importLogId,
        error: result.error,
      })
    },
    { endpoint: 'POST /api/admin/deliverable-styles/scrape-bigged' }
  )
}
