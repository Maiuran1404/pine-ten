import { extractStyleDNA, getStyleDNASummary } from '@/lib/ai/style-dna'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'

// GET - Get user's Style DNA
export async function GET() {
  return withErrorHandling(async () => {
    const session = await requireAuth()

    const dna = await extractStyleDNA(session.user.id)

    if (!dna) {
      throw Errors.notFound('No brand profile found. Please complete your brand setup.')
    }

    // Include summary for easy display
    const summary = getStyleDNASummary(dna)

    return successResponse({
      dna,
      summary,
    })
  })
}
