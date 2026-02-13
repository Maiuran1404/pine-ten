import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { db } from '@/db'
import { testUsers } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

// GET - List all test users
export async function GET() {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const users = await db.select().from(testUsers).orderBy(desc(testUsers.createdAt))

      // Don't expose credentials in response
      const safeUsers = users.map(({ credentials, ...rest }) => ({
        ...rest,
        hasCredentials: !!credentials,
      }))

      return successResponse({ testUsers: safeUsers })
    },
    { endpoint: 'GET /api/admin/security/test-users' }
  )
}

// POST - Create a new test user
export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const body = await request.json()
      const { name, email, role, credentials } = body

      if (!name || !email || !role) {
        throw Errors.badRequest('Name, email, and role are required')
      }

      const [testUser] = await db
        .insert(testUsers)
        .values({
          name,
          email,
          role,
          credentials,
        })
        .returning()

      return successResponse(
        {
          testUser: {
            ...testUser,
            credentials: undefined,
            hasCredentials: !!testUser.credentials,
          },
        },
        201
      )
    },
    { endpoint: 'POST /api/admin/security/test-users' }
  )
}

// PUT - Update a test user
export async function PUT(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const body = await request.json()
      const { id, ...updates } = body

      if (!id) {
        throw Errors.badRequest('Test user ID is required')
      }

      const [testUser] = await db
        .update(testUsers)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(testUsers.id, id))
        .returning()

      if (!testUser) {
        throw Errors.notFound('Test user')
      }

      return successResponse({
        testUser: {
          ...testUser,
          credentials: undefined,
          hasCredentials: !!testUser.credentials,
        },
      })
    },
    { endpoint: 'PUT /api/admin/security/test-users' }
  )
}

// DELETE - Delete a test user
export async function DELETE(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const { searchParams } = new URL(request.url)
      const id = searchParams.get('id')

      if (!id) {
        throw Errors.badRequest('Test user ID is required')
      }

      await db.delete(testUsers).where(eq(testUsers.id, id))

      return successResponse({ success: true })
    },
    { endpoint: 'DELETE /api/admin/security/test-users' }
  )
}
