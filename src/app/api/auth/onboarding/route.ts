import { NextRequest } from 'next/server'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'
import { db } from '@/db'
import { users, freelancerProfiles, companies, audiences } from '@/db/schema'
import { eq } from 'drizzle-orm'
import {
  adminNotifications,
  sendEmail,
  emailTemplates,
  notifyAdminWhatsApp,
  adminWhatsAppTemplates,
} from '@/lib/notifications'
import { config } from '@/lib/config'
import { withRateLimit } from '@/lib/rate-limit'
import { inferAudiencesFromBrand } from '@/lib/ai/infer-audiences'
import { logger } from '@/lib/logger'
import { onboardingRequestSchema } from '@/lib/validations'

async function handler(request: NextRequest) {
  return withErrorHandling(
    async () => {
      const { user } = await requireAuth()

      // Security: Get current user from database to check actual state
      // This prevents race conditions and ensures we have accurate data
      const [currentUser] = await db
        .select({
          role: users.role,
          onboardingCompleted: users.onboardingCompleted,
        })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1)

      if (!currentUser) {
        throw Errors.notFound('User')
      }

      // Security: Prevent re-submission of onboarding
      // Once completed, users cannot change their role or re-onboard
      if (currentUser.onboardingCompleted) {
        throw Errors.forbidden('Onboarding already completed. Contact support to make changes.')
      }

      // Security: Only CLIENT or FREELANCER role users can go through onboarding
      // ADMIN users should not be able to onboard
      // FREELANCER is allowed because users on artist subdomain may be assigned this role before onboarding
      if (currentUser.role !== 'CLIENT' && currentUser.role !== 'FREELANCER') {
        throw Errors.forbidden('Only new users can complete onboarding')
      }

      const body = await request.json()
      const parsed = onboardingRequestSchema.parse(body)

      if (parsed.type === 'client') {
        const { brand, hasWebsite } = parsed.data

        // Create company with brand information
        const [company] = await db
          .insert(companies)
          .values({
            name: brand.name,
            website: brand.website || null,
            industry: brand.industry || null,
            industryArchetype: brand.industryArchetype || null,
            description: brand.description || null,
            logoUrl: brand.logoUrl || null,
            faviconUrl: brand.faviconUrl || null,
            primaryColor: brand.primaryColor || null,
            secondaryColor: brand.secondaryColor || null,
            accentColor: brand.accentColor || null,
            backgroundColor: brand.backgroundColor || null,
            textColor: brand.textColor || null,
            brandColors: brand.brandColors || [],
            primaryFont: brand.primaryFont || null,
            secondaryFont: brand.secondaryFont || null,
            socialLinks: brand.socialLinks || {},
            contactEmail: brand.contactEmail || null,
            contactPhone: brand.contactPhone || null,
            tagline: brand.tagline || null,
            keywords: brand.keywords || [],
            onboardingStatus: 'COMPLETED',
          })
          .returning()

        // Save inferred audiences if any, or infer from brand data if none provided
        let audiencesToSave = brand.audiences
        let audienceSource = 'website'

        // If no audiences from website extraction, infer from brand data
        if (!audiencesToSave || !Array.isArray(audiencesToSave) || audiencesToSave.length === 0) {
          try {
            logger.info('No audiences from website, inferring from brand data')
            audiencesToSave = await inferAudiencesFromBrand({
              name: brand.name,
              industry: brand.industry,
              industryArchetype: brand.industryArchetype,
              description: brand.description,
              creativeFocus: brand.creativeFocus ? [brand.creativeFocus] : undefined,
            })
            audienceSource = 'inferred'
            logger.info({ count: audiencesToSave.length }, 'Inferred audiences from brand data')
          } catch (error) {
            logger.error({ error }, 'Failed to infer audiences from brand data')
            audiencesToSave = []
          }
        }

        if (audiencesToSave && Array.isArray(audiencesToSave) && audiencesToSave.length > 0) {
          const audienceValues = audiencesToSave.map(
            (audience: {
              name: string
              isPrimary?: boolean
              demographics?: Record<string, unknown>
              firmographics?: Record<string, unknown>
              psychographics?: Record<string, unknown>
              behavioral?: Record<string, unknown>
              confidence?: number
            }) => ({
              companyId: company.id,
              name: audience.name,
              isPrimary: audience.isPrimary || false,
              demographics: audience.demographics || null,
              firmographics: audience.firmographics || null,
              psychographics: audience.psychographics || null,
              behavioral: audience.behavioral || null,
              confidence: audience.confidence || 50,
              sources: [audienceSource],
            })
          )

          await db.insert(audiences).values(audienceValues)
        }

        // Update user with company link and onboarding completion
        await db
          .update(users)
          .set({
            companyId: company.id,
            onboardingCompleted: true,
            onboardingData: {
              hasWebsite,
              completedAt: new Date().toISOString(),
            },
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id))

        // Fire-and-forget: Send notifications without blocking the response
        const userName = user.name || 'Unknown'
        const userEmail = user.email || ''
        const companyInfo = {
          name: company.name,
          industry: company.industry || undefined,
        }
        Promise.resolve().then(async () => {
          try {
            await adminNotifications.newClientSignup({
              name: userName,
              email: userEmail,
              userId: user.id,
              company: companyInfo,
            })
            const welcomeEmail = emailTemplates.welcomeClient(
              userName,
              `${config.app.url}/dashboard`
            )
            await sendEmail({
              to: userEmail,
              subject: welcomeEmail.subject,
              html: welcomeEmail.html,
            })

            // Send WhatsApp notification to admin
            const whatsappMessage = adminWhatsAppTemplates.newUserSignup({
              name: userName,
              email: userEmail,
              role: 'CLIENT',
              signupUrl: `${config.app.url}/admin/clients`,
            })
            await notifyAdminWhatsApp(whatsappMessage)
          } catch (error) {
            logger.error({ error }, 'Failed to send client onboarding notifications')
          }
        })

        return successResponse({ success: true, companyId: company.id })
      }

      if (parsed.type === 'freelancer') {
        const data = parsed.data
        // Update user role and create freelancer profile
        await db
          .update(users)
          .set({
            role: 'FREELANCER',
            phone: data.whatsappNumber || null,
            image: data.profileImage || null,
            onboardingCompleted: true,
            onboardingData: { bio: data.bio },
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id))

        // Create freelancer profile
        await db.insert(freelancerProfiles).values({
          userId: user.id,
          status: 'PENDING', // Needs admin approval
          skills: data.skills,
          specializations: data.specializations,
          portfolioUrls: data.portfolioUrls,
          bio: data.bio,
          timezone: data.timezone || null,
          hourlyRate: data.hourlyRate != null ? String(data.hourlyRate) : null,
          whatsappNumber: data.whatsappNumber || null,
        })

        // Fire-and-forget: Send notification without blocking the response
        const freelancerName = user.name || 'Unknown'
        const freelancerEmail = user.email || ''
        const freelancerSkills = data.skills
        const freelancerPortfolio = data.portfolioUrls
        const freelancerHourlyRate = data.hourlyRate
        Promise.resolve().then(async () => {
          try {
            await adminNotifications.newFreelancerApplication({
              name: freelancerName,
              email: freelancerEmail,
              skills: freelancerSkills,
              portfolioUrls: freelancerPortfolio,
              userId: user.id,
              hourlyRate: freelancerHourlyRate ?? undefined,
            })

            // Send WhatsApp notification to admin
            const whatsappMessage = adminWhatsAppTemplates.newUserSignup({
              name: freelancerName,
              email: freelancerEmail,
              role: 'FREELANCER',
              signupUrl: `${config.app.url}/admin/freelancers`,
            })
            await notifyAdminWhatsApp(whatsappMessage)
          } catch (error) {
            logger.error({ error }, 'Failed to send freelancer application notification')
          }
        })

        return successResponse({ success: true })
      }

      throw Errors.badRequest('Invalid type')
    },
    { endpoint: 'POST /api/auth/onboarding' }
  )
}

// Apply auth rate limiting (20 req/min)
export const POST = withRateLimit(handler, 'auth', config.rateLimits.auth)
