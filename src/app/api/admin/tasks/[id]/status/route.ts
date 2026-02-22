import { NextRequest } from 'next/server'
import { db } from '@/db'
import { tasks, taskActivityLog } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'
import { z } from 'zod'

const statusChangeSchema = z.object({
  status: z.enum([
    'PENDING',
    'OFFERED',
    'ASSIGNED',
    'IN_PROGRESS',
    'IN_REVIEW',
    'PENDING_ADMIN_REVIEW',
    'REVISION_REQUESTED',
    'COMPLETED',
    'CANCELLED',
  ]),
})

// Valid transitions for board drag-and-drop
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['ASSIGNED', 'IN_PROGRESS'],
  OFFERED: ['ASSIGNED', 'PENDING'],
  ASSIGNED: ['IN_PROGRESS', 'PENDING'],
  IN_PROGRESS: ['IN_REVIEW', 'PENDING_ADMIN_REVIEW', 'ASSIGNED'],
  IN_REVIEW: ['COMPLETED', 'REVISION_REQUESTED', 'IN_PROGRESS'],
  PENDING_ADMIN_REVIEW: ['COMPLETED', 'REVISION_REQUESTED', 'IN_PROGRESS'],
  REVISION_REQUESTED: ['IN_PROGRESS', 'ASSIGNED'],
  COMPLETED: ['IN_PROGRESS'],
  CANCELLED: ['PENDING'],
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const session = await requireAuth()
    const user = session.user as { role?: string }

    if (user.role !== 'ADMIN') {
      throw Errors.forbidden()
    }

    const { id } = await params
    const body = await request.json()
    const { status: newStatus } = statusChangeSchema.parse(body)

    // Get current task
    const [task] = await db
      .select({
        id: tasks.id,
        status: tasks.status,
        freelancerId: tasks.freelancerId,
      })
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1)

    if (!task) {
      throw Errors.notFound('Task')
    }

    // Validate transition
    const allowed = ALLOWED_TRANSITIONS[task.status] || []
    if (!allowed.includes(newStatus)) {
      throw Errors.badRequest(`Cannot transition from ${task.status} to ${newStatus}`)
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      updatedAt: new Date(),
    }

    // Set assignedAt when moving to ASSIGNED for the first time
    if (newStatus === 'ASSIGNED' && task.status === 'PENDING') {
      updatePayload.assignedAt = new Date()
    }

    // Set completedAt when moving to COMPLETED
    if (newStatus === 'COMPLETED') {
      updatePayload.completedAt = new Date()
    }

    await db.update(tasks).set(updatePayload).where(eq(tasks.id, id))

    // Log the status change
    await db.insert(taskActivityLog).values({
      taskId: id,
      actorId: session.user.id,
      actorType: 'admin',
      action: 'status_changed',
      previousStatus: task.status,
      newStatus,
      metadata: { source: 'board_drag' },
    })

    return successResponse({ id, status: newStatus })
  })
}
