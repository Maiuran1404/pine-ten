import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { freelancerProfiles, users, tasks } from '@/db/schema'
import { eq, count } from 'drizzle-orm'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'

const updateFreelancerSchema = z.object({
  // User fields
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  // Profile fields
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  skills: z.array(z.string()).optional(),
  specializations: z.array(z.string()).optional(),
  portfolioUrls: z.array(z.string().url()).optional(),
  bio: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
  hourlyRate: z.string().nullable().optional(),
  whatsappNumber: z.string().nullable().optional(),
  availability: z.boolean().optional(),
  rating: z.string().nullable().optional(),
})

// Helper to check if a string is a valid UUID
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const { id } = await params

      // Define the type for the query result
      type ProfileQueryResult = {
        id: string
        userId: string
        status: string
        skills: string[] | null
        specializations: string[] | null
        portfolioUrls: string[] | null
        bio: string | null
        timezone: string | null
        hourlyRate: string | null
        rating: string | null
        completedTasks: number
        whatsappNumber: string | null
        availability: boolean
        createdAt: Date
        updatedAt: Date
        user: {
          id: string
          name: string | null
          email: string
          image: string | null
          createdAt: Date
        }
      }[]

      // First, try to find by profile ID (only if id is a valid UUID)
      let freelancerResult: ProfileQueryResult = []

      if (isValidUUID(id)) {
        freelancerResult = await db
          .select({
            id: freelancerProfiles.id,
            userId: freelancerProfiles.userId,
            status: freelancerProfiles.status,
            skills: freelancerProfiles.skills,
            specializations: freelancerProfiles.specializations,
            portfolioUrls: freelancerProfiles.portfolioUrls,
            bio: freelancerProfiles.bio,
            timezone: freelancerProfiles.timezone,
            hourlyRate: freelancerProfiles.hourlyRate,
            rating: freelancerProfiles.rating,
            completedTasks: freelancerProfiles.completedTasks,
            whatsappNumber: freelancerProfiles.whatsappNumber,
            availability: freelancerProfiles.availability,
            createdAt: freelancerProfiles.createdAt,
            updatedAt: freelancerProfiles.updatedAt,
            user: {
              id: users.id,
              name: users.name,
              email: users.email,
              image: users.image,
              createdAt: users.createdAt,
            },
          })
          .from(freelancerProfiles)
          .innerJoin(users, eq(users.id, freelancerProfiles.userId))
          .where(eq(freelancerProfiles.id, id))
          .limit(1)
      }

      // If not found by profile ID (or ID wasn't a valid UUID), try by user ID
      if (freelancerResult.length === 0) {
        freelancerResult = await db
          .select({
            id: freelancerProfiles.id,
            userId: freelancerProfiles.userId,
            status: freelancerProfiles.status,
            skills: freelancerProfiles.skills,
            specializations: freelancerProfiles.specializations,
            portfolioUrls: freelancerProfiles.portfolioUrls,
            bio: freelancerProfiles.bio,
            timezone: freelancerProfiles.timezone,
            hourlyRate: freelancerProfiles.hourlyRate,
            rating: freelancerProfiles.rating,
            completedTasks: freelancerProfiles.completedTasks,
            whatsappNumber: freelancerProfiles.whatsappNumber,
            availability: freelancerProfiles.availability,
            createdAt: freelancerProfiles.createdAt,
            updatedAt: freelancerProfiles.updatedAt,
            user: {
              id: users.id,
              name: users.name,
              email: users.email,
              image: users.image,
              createdAt: users.createdAt,
            },
          })
          .from(freelancerProfiles)
          .innerJoin(users, eq(users.id, freelancerProfiles.userId))
          .where(eq(freelancerProfiles.userId, id))
          .limit(1)
      }

      // If still not found, check if user exists but has no profile (NOT_ONBOARDED)
      if (freelancerResult.length === 0) {
        const userResult = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            image: users.image,
            role: users.role,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(eq(users.id, id))
          .limit(1)

        if (userResult.length === 0 || userResult[0].role !== 'FREELANCER') {
          throw Errors.notFound('Freelancer')
        }

        // Return user without profile (NOT_ONBOARDED state)
        const user = userResult[0]
        return successResponse({
          freelancer: {
            id: user.id, // Use user ID as the identifier
            userId: user.id,
            status: 'NOT_ONBOARDED',
            skills: [],
            specializations: [],
            portfolioUrls: [],
            bio: null,
            timezone: null,
            hourlyRate: null,
            rating: null,
            completedTasks: 0,
            whatsappNumber: null,
            availability: true,
            createdAt: user.createdAt,
            updatedAt: user.createdAt,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              image: user.image,
              createdAt: user.createdAt,
            },
            taskCounts: {
              total: 0,
              completed: 0,
              inProgress: 0,
              pending: 0,
              inReview: 0,
            },
            recentTasks: [],
          },
        })
      }

      const freelancer = freelancerResult[0]

      // Get task statistics
      const taskStats = await db
        .select({
          status: tasks.status,
          count: count(),
        })
        .from(tasks)
        .where(eq(tasks.freelancerId, freelancer.userId))
        .groupBy(tasks.status)

      // Get recent tasks
      const recentTasks = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          status: tasks.status,
          createdAt: tasks.createdAt,
          completedAt: tasks.completedAt,
        })
        .from(tasks)
        .where(eq(tasks.freelancerId, freelancer.userId))
        .orderBy(tasks.createdAt)
        .limit(10)

      // Calculate task counts
      const taskCounts = {
        total: taskStats.reduce((sum, s) => sum + Number(s.count), 0),
        completed: taskStats.find((s) => s.status === 'COMPLETED')?.count || 0,
        inProgress: taskStats.find((s) => s.status === 'IN_PROGRESS')?.count || 0,
        pending: taskStats.find((s) => s.status === 'PENDING')?.count || 0,
        inReview: taskStats.find((s) => s.status === 'IN_REVIEW')?.count || 0,
      }

      return successResponse({
        freelancer: {
          ...freelancer,
          taskCounts,
          recentTasks,
        },
      })
    },
    { endpoint: 'GET /api/admin/freelancers/[id]' }
  )
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const { id } = await params
      const body = await request.json()
      const validatedData = updateFreelancerSchema.parse(body)

      // Try to find freelancer by profile ID first
      let existingFreelancer = await db
        .select({
          id: freelancerProfiles.id,
          userId: freelancerProfiles.userId,
        })
        .from(freelancerProfiles)
        .where(eq(freelancerProfiles.id, id))
        .limit(1)

      // If not found by profile ID, try by user ID
      if (existingFreelancer.length === 0) {
        existingFreelancer = await db
          .select({
            id: freelancerProfiles.id,
            userId: freelancerProfiles.userId,
          })
          .from(freelancerProfiles)
          .where(eq(freelancerProfiles.userId, id))
          .limit(1)
      }

      // Handle NOT_ONBOARDED users (no profile exists)
      let freelancer: { id: string; userId: string }
      let isNotOnboarded = false

      if (existingFreelancer.length === 0) {
        // Check if user exists
        const userResult = await db
          .select({ id: users.id, role: users.role })
          .from(users)
          .where(eq(users.id, id))
          .limit(1)

        if (userResult.length === 0 || userResult[0].role !== 'FREELANCER') {
          throw Errors.notFound('Freelancer')
        }

        // User exists but no profile - we may need to create one
        isNotOnboarded = true
        freelancer = { id: id, userId: id }
      } else {
        freelancer = existingFreelancer[0]
      }

      // Separate user fields from profile fields
      const { name, email, ...profileFields } = validatedData

      // Update user if name or email provided
      if (name || email) {
        const userUpdates: Record<string, string> = {}
        if (name) userUpdates.name = name
        if (email) userUpdates.email = email

        await db.update(users).set(userUpdates).where(eq(users.id, freelancer.userId))
      }

      // For NOT_ONBOARDED users, create a profile if there are profile fields to update
      if (isNotOnboarded && Object.keys(profileFields).length > 0) {
        await db.insert(freelancerProfiles).values({
          userId: freelancer.userId,
          status: profileFields.status || 'PENDING',
          skills: profileFields.skills || [],
          specializations: profileFields.specializations || [],
          portfolioUrls: profileFields.portfolioUrls || [],
          bio: profileFields.bio || null,
          timezone: profileFields.timezone || null,
          hourlyRate: profileFields.hourlyRate || null,
          whatsappNumber: profileFields.whatsappNumber || null,
          availability: profileFields.availability ?? true,
          rating: profileFields.rating || null,
        })
      } else if (Object.keys(profileFields).length > 0) {
        // Update existing profile - use freelancer.id which is the actual profile ID
        await db
          .update(freelancerProfiles)
          .set({
            ...profileFields,
            updatedAt: new Date(),
          })
          .where(eq(freelancerProfiles.id, freelancer.id))
      }

      // Fetch updated freelancer - search by userId to handle both cases
      const updatedFreelancer = await db
        .select({
          id: freelancerProfiles.id,
          userId: freelancerProfiles.userId,
          status: freelancerProfiles.status,
          skills: freelancerProfiles.skills,
          specializations: freelancerProfiles.specializations,
          portfolioUrls: freelancerProfiles.portfolioUrls,
          bio: freelancerProfiles.bio,
          timezone: freelancerProfiles.timezone,
          hourlyRate: freelancerProfiles.hourlyRate,
          rating: freelancerProfiles.rating,
          completedTasks: freelancerProfiles.completedTasks,
          whatsappNumber: freelancerProfiles.whatsappNumber,
          availability: freelancerProfiles.availability,
          createdAt: freelancerProfiles.createdAt,
          updatedAt: freelancerProfiles.updatedAt,
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
            image: users.image,
            createdAt: users.createdAt,
          },
        })
        .from(freelancerProfiles)
        .innerJoin(users, eq(users.id, freelancerProfiles.userId))
        .where(eq(freelancerProfiles.userId, freelancer.userId))
        .limit(1)

      return successResponse({ freelancer: updatedFreelancer[0] })
    },
    { endpoint: 'PUT /api/admin/freelancers/[id]' }
  )
}
