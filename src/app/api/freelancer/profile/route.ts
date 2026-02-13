import 'server-only'

import { NextRequest } from 'next/server'
import { db } from '@/db'
import { freelancerProfiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { updateFreelancerProfileSchema } from '@/lib/validations'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'

export async function GET(_request: NextRequest) {
  return withErrorHandling(
    async () => {
      const { user } = await requireAuth()

      const profile = await db
        .select()
        .from(freelancerProfiles)
        .where(eq(freelancerProfiles.userId, user.id))
        .limit(1)

      if (!profile.length) {
        return successResponse({ status: 'NOT_FOUND' })
      }

      return successResponse(profile[0])
    },
    { endpoint: 'GET /api/freelancer/profile' }
  )
}

export async function PATCH(request: NextRequest) {
  return withErrorHandling(
    async () => {
      const { user } = await requireAuth()

      const validated = updateFreelancerProfileSchema.parse(await request.json())

      const updateData: Record<string, unknown> = { updatedAt: new Date() }

      if (validated.bio !== undefined) updateData.bio = validated.bio
      if (validated.skills !== undefined) updateData.skills = validated.skills
      if (validated.specializations !== undefined)
        updateData.specializations = validated.specializations
      if (validated.portfolioUrls !== undefined) updateData.portfolioUrls = validated.portfolioUrls
      if (validated.whatsappNumber !== undefined)
        updateData.whatsappNumber = validated.whatsappNumber
      if (validated.availability !== undefined) updateData.availability = validated.availability

      await db
        .update(freelancerProfiles)
        .set(updateData)
        .where(eq(freelancerProfiles.userId, user.id))

      return successResponse({ success: true })
    },
    { endpoint: 'PATCH /api/freelancer/profile' }
  )
}
