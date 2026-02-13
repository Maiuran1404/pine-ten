import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db'
import { freelancerProfiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { updateFreelancerProfileSchema } from '@/lib/validations'
import { handleZodError } from '@/lib/errors'
import { ZodError } from 'zod'

export async function GET(_request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await db
      .select()
      .from(freelancerProfiles)
      .where(eq(freelancerProfiles.userId, session.user.id))
      .limit(1)

    if (!profile.length) {
      return NextResponse.json({ status: 'NOT_FOUND' })
    }

    return NextResponse.json(profile[0])
  } catch (error) {
    logger.error({ error }, 'Profile fetch error')
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = updateFreelancerProfileSchema.parse(body)

    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (validated.bio !== undefined) updateData.bio = validated.bio
    if (validated.skills !== undefined) updateData.skills = validated.skills
    if (validated.specializations !== undefined)
      updateData.specializations = validated.specializations
    if (validated.portfolioUrls !== undefined) updateData.portfolioUrls = validated.portfolioUrls
    if (validated.whatsappNumber !== undefined) updateData.whatsappNumber = validated.whatsappNumber
    if (validated.availability !== undefined) updateData.availability = validated.availability

    await db
      .update(freelancerProfiles)
      .set(updateData)
      .where(eq(freelancerProfiles.userId, session.user.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ZodError) {
      return handleZodError(error)
    }
    logger.error({ error }, 'Profile update error')
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
