import { NextRequest } from 'next/server'
import { db } from '@/db'
import { orshotTemplates, generatedDesigns, companies, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import {
  generateBrandedDesign,
  isOrshotEnabled,
  type BrandData,
  type ParameterMapping,
} from '@/lib/orshot'
import { logger } from '@/lib/logger'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'

/**
 * POST /api/orshot/generate
 * Generate a design from a template using client's brand data
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAuth()

    // Check if Orshot is configured
    if (!isOrshotEnabled()) {
      throw Errors.badRequest('Quick Design feature is not configured')
    }

    const body = await request.json()
    const { templateId } = body

    if (!templateId) {
      throw Errors.badRequest('Template ID is required')
    }

    // Fetch the template
    const [template] = await db
      .select()
      .from(orshotTemplates)
      .where(eq(orshotTemplates.id, templateId))
      .limit(1)

    if (!template) {
      throw Errors.notFound('Template')
    }

    if (!template.isActive) {
      throw Errors.badRequest('Template is not available')
    }

    // Fetch the user's company/brand data
    const [user] = await db
      .select({
        companyId: users.companyId,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)

    if (!user?.companyId) {
      throw Errors.badRequest('Please complete your brand profile first')
    }

    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, user.companyId))
      .limit(1)

    if (!company) {
      throw Errors.badRequest('Brand data not found. Please complete your brand profile.')
    }

    // Map company to BrandData
    const brandData: BrandData = {
      name: company.name,
      logoUrl: company.logoUrl,
      primaryColor: company.primaryColor,
      secondaryColor: company.secondaryColor,
      accentColor: company.accentColor,
      backgroundColor: company.backgroundColor,
      textColor: company.textColor,
      primaryFont: company.primaryFont,
      secondaryFont: company.secondaryFont,
      tagline: company.tagline,
    }

    logger.info(
      { userId: session.user.id, templateId, templateName: template.name },
      'Generating design'
    )

    // Generate the design
    const result = await generateBrandedDesign(
      template.orshotTemplateId,
      brandData,
      template.parameterMapping as ParameterMapping,
      template.outputFormat as 'png' | 'jpg' | 'webp' | 'pdf'
    )

    if (!result.success || !result.imageUrl) {
      logger.error({ error: result.error, templateId }, 'Design generation failed')
      throw Errors.internal(result.error || 'Failed to generate design')
    }

    // Save the generated design
    const [savedDesign] = await db
      .insert(generatedDesigns)
      .values({
        clientId: session.user.id,
        templateId: template.id,
        templateName: template.name,
        imageUrl: result.imageUrl,
        imageFormat: template.outputFormat,
        modificationsUsed: { ...brandData } as Record<string, unknown>,
        savedToAssets: false,
      })
      .returning()

    logger.info(
      {
        userId: session.user.id,
        designId: savedDesign.id,
        responseTime: result.responseTime,
      },
      'Design generated and saved'
    )

    return successResponse({
      design: {
        id: savedDesign.id,
        imageUrl: result.imageUrl,
        templateName: template.name,
        category: template.category,
        format: template.outputFormat,
        createdAt: savedDesign.createdAt,
      },
    })
  })
}
