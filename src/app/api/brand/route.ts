import { NextRequest } from 'next/server'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'
import { db } from '@/db'
import { users, companies } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { updateBrandSchema } from '@/lib/validations'

// GET - Fetch the user's company/brand
export async function GET() {
  return withErrorHandling(
    async () => {
      const { user } = await requireAuth()

      // Get user with company
      const dbUser = await db.query.users.findFirst({
        where: eq(users.id, user.id),
        with: {
          company: true,
        },
      })

      if (!dbUser?.company) {
        throw Errors.notFound('Brand')
      }

      return successResponse(dbUser.company)
    },
    { endpoint: 'GET /api/brand' }
  )
}

// PUT - Update the user's company/brand
export async function PUT(request: NextRequest) {
  return withErrorHandling(
    async () => {
      const { user } = await requireAuth()

      // Get user to check company
      const dbUser = await db.query.users.findFirst({
        where: eq(users.id, user.id),
      })

      if (!dbUser?.companyId) {
        throw Errors.notFound('Brand')
      }

      const body = await request.json()
      const validated = updateBrandSchema.parse(body)
      const {
        name,
        website,
        industry,
        industryArchetype,
        description,
        logoUrl,
        faviconUrl,
        primaryColor,
        secondaryColor,
        accentColor,
        backgroundColor,
        textColor,
        brandColors,
        primaryFont,
        secondaryFont,
        headingFont,
        colorScheme,
        fontSizes,
        fontWeights,
        spacingUnit,
        borderRadius,
        socialLinks,
        contactEmail,
        contactPhone,
        tagline,
        keywords,
        competitors,
        positioning,
        brandVoice,
      } = validated

      // Update company
      const [updated] = await db
        .update(companies)
        .set({
          name: name || undefined,
          website: website ?? undefined,
          industry: industry ?? undefined,
          industryArchetype: industryArchetype ?? undefined,
          description: description ?? undefined,
          logoUrl: logoUrl ?? undefined,
          faviconUrl: faviconUrl ?? undefined,
          primaryColor: primaryColor ?? undefined,
          secondaryColor: secondaryColor ?? undefined,
          accentColor: accentColor ?? undefined,
          backgroundColor: backgroundColor ?? undefined,
          textColor: textColor ?? undefined,
          brandColors: brandColors ?? undefined,
          primaryFont: primaryFont ?? undefined,
          secondaryFont: secondaryFont ?? undefined,
          headingFont: headingFont ?? undefined,
          colorScheme: colorScheme ?? undefined,
          fontSizes: fontSizes ?? undefined,
          fontWeights: fontWeights ?? undefined,
          spacingUnit: spacingUnit ?? undefined,
          borderRadius: borderRadius ?? undefined,
          socialLinks: socialLinks ?? undefined,
          contactEmail: contactEmail ?? undefined,
          contactPhone: contactPhone ?? undefined,
          tagline: tagline ?? undefined,
          keywords: keywords ?? undefined,
          competitors: competitors ?? undefined,
          positioning: positioning ?? undefined,
          brandVoice: brandVoice ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(companies.id, dbUser.companyId))
        .returning()

      return successResponse(updated)
    },
    { endpoint: 'PUT /api/brand' }
  )
}
