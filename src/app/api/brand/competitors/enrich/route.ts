import { NextRequest } from 'next/server'
import Firecrawl from '@mendable/firecrawl-js'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'
import { db } from '@/db'
import { users, companies } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Lazy initialization to avoid errors during build
let firecrawl: Firecrawl | null = null

function getFirecrawl() {
  if (!firecrawl) {
    firecrawl = new Firecrawl({
      apiKey: process.env.FIRECRAWL_API_KEY || '',
    })
  }
  return firecrawl
}

const enrichCompetitorsSchema = z.object({
  competitors: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        website: z.string().optional(),
      })
    )
    .min(1)
    .max(10),
})

interface EnrichedCompetitor {
  name: string
  website: string | null
  description: string | null
  primaryColor: string | null
  logoUrl: string | null
  positioning: string | null
  strengths: string | null
  weaknesses: string | null
}

// Enrich a single competitor using Firecrawl search + branding
async function enrichSingleCompetitor(
  fc: Firecrawl,
  competitor: { name: string; website?: string }
): Promise<EnrichedCompetitor> {
  const result: EnrichedCompetitor = {
    name: competitor.name,
    website: competitor.website || null,
    description: null,
    primaryColor: null,
    logoUrl: null,
    positioning: null,
    strengths: null,
    weaknesses: null,
  }

  try {
    // If we already have a website, scrape it directly for branding
    if (competitor.website) {
      try {
        const scrapeResult = await fc.scrape(competitor.website, {
          formats: ['markdown', 'branding'],
          onlyMainContent: true,
        })
        const branding = scrapeResult.branding as
          | {
              colors?: { primary?: string }
              images?: { logo?: string }
            }
          | undefined
        result.primaryColor = branding?.colors?.primary || null
        result.logoUrl = branding?.images?.logo || null
        result.description =
          (scrapeResult.metadata as { description?: string })?.description || null
      } catch (scrapeErr) {
        logger.debug(
          { error: scrapeErr, competitor: competitor.name },
          'Failed to scrape competitor website'
        )
      }
      return result
    }

    // Otherwise, search for the competitor to find their website and info
    const searchResult = await fc.search(`${competitor.name} company official website`, {
      limit: 3,
      scrapeOptions: {
        formats: ['branding'],
      },
    })

    // Extract the best result — search returns .web array with SearchResultWeb | Document items
    const webResults = searchResult?.web

    if (webResults && webResults.length > 0) {
      const topResult = webResults[0] as {
        url?: string
        title?: string
        description?: string
        branding?: {
          colors?: { primary?: string }
          images?: { logo?: string }
        }
      }
      result.website = topResult.url || null
      result.description = topResult.description || null
      result.primaryColor = topResult.branding?.colors?.primary || null
      result.logoUrl = topResult.branding?.images?.logo || null
    }
  } catch (error) {
    logger.warn({ error, competitor: competitor.name }, 'Failed to enrich competitor')
  }

  return result
}

export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      const { user } = await requireAuth()

      // Verify user has a company
      const dbUser = await db.query.users.findFirst({
        where: eq(users.id, user.id),
      })
      if (!dbUser?.companyId) {
        throw Errors.notFound('Brand')
      }

      const body = await request.json()
      const { competitors } = enrichCompetitorsSchema.parse(body)

      const fc = getFirecrawl()

      // Enrich all competitors in parallel using Promise.allSettled
      // This ensures one failure doesn't block others
      const enrichmentResults = await Promise.allSettled(
        competitors.map((comp) => enrichSingleCompetitor(fc, comp))
      )

      const enrichedCompetitors: EnrichedCompetitor[] = enrichmentResults.map((result, i) => {
        if (result.status === 'fulfilled') {
          return result.value
        }
        // On failure, return original data unchanged
        return {
          name: competitors[i].name,
          website: competitors[i].website || null,
          description: null,
          primaryColor: null,
          logoUrl: null,
          positioning: null,
          strengths: null,
          weaknesses: null,
        }
      })

      // Optionally update the company record with enriched competitors
      const existingCompany = await db.query.companies.findFirst({
        where: eq(companies.id, dbUser.companyId),
      })

      if (existingCompany?.competitors) {
        // Merge enriched data into existing competitors
        const updatedCompetitors = (
          existingCompany.competitors as Array<{
            name: string
            website?: string
            positioning?: string
            strengths?: string
            weaknesses?: string
          }>
        ).map((existing) => {
          const enriched = enrichedCompetitors.find(
            (e) => e.name.toLowerCase() === existing.name.toLowerCase()
          )
          if (!enriched) return existing
          return {
            ...existing,
            website: enriched.website || existing.website,
            positioning: enriched.positioning || existing.positioning,
            strengths: enriched.strengths || existing.strengths,
            weaknesses: enriched.weaknesses || existing.weaknesses,
          }
        })

        await db
          .update(companies)
          .set({
            competitors: updatedCompetitors,
            updatedAt: new Date(),
          })
          .where(eq(companies.id, dbUser.companyId))
      }

      return successResponse({
        competitors: enrichedCompetitors,
        enriched: enrichedCompetitors.filter((c) => c.website || c.description).length,
        total: enrichedCompetitors.length,
      })
    },
    { endpoint: 'POST /api/brand/competitors/enrich' }
  )
}
