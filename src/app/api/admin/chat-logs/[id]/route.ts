import { NextRequest } from 'next/server'
import { db } from '@/db'
import { chatDrafts, tasks, users, taskCategories, deliverableStyleReferences } from '@/db/schema'
import { requireAdmin } from '@/lib/require-auth'
import { eq, inArray } from 'drizzle-orm'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import type {
  AdminChatMessage,
  StyleDetail,
  PendingTaskInfo,
  MoodboardItemData,
  TaskMetadata,
  ChatLogDetail,
} from '@/types/admin-chat-logs'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(
    async () => {
      await requireAdmin()
      const { id } = await params

      // Try chatDrafts first
      const [draft] = await db
        .select({
          id: chatDrafts.id,
          clientId: chatDrafts.clientId,
          title: chatDrafts.title,
          messages: chatDrafts.messages,
          selectedStyles: chatDrafts.selectedStyles,
          pendingTask: chatDrafts.pendingTask,
          briefingState: chatDrafts.briefingState,
          createdAt: chatDrafts.createdAt,
          updatedAt: chatDrafts.updatedAt,
          userName: users.name,
          userEmail: users.email,
          userImage: users.image,
        })
        .from(chatDrafts)
        .leftJoin(users, eq(chatDrafts.clientId, users.id))
        .where(eq(chatDrafts.id, id))
        .limit(1)

      if (draft) {
        const messages = (draft.messages as AdminChatMessage[]) || []
        const selectedStyles = (draft.selectedStyles as string[]) || []
        const briefingState = draft.briefingState as Record<string, unknown> | null
        const structureData = (briefingState?.structure as Record<string, unknown>) ?? null
        const styleDetails = await fetchStyleDetails(selectedStyles)

        const result: ChatLogDetail = {
          id: draft.id,
          type: 'draft',
          userId: draft.clientId,
          userName: draft.userName || 'Unknown',
          userEmail: draft.userEmail || '',
          userImage: draft.userImage,
          title: draft.title,
          messages,
          selectedStyles,
          styleDetails,
          pendingTask: draft.pendingTask as PendingTaskInfo | null,
          createdAt: draft.createdAt.toISOString(),
          updatedAt: draft.updatedAt.toISOString(),
          briefingState,
          structureData,
          moodboardItems: [],
          taskMetadata: null,
        }

        return successResponse(result)
      }

      // Fall back to tasks
      const [task] = await db
        .select({
          id: tasks.id,
          clientId: tasks.clientId,
          title: tasks.title,
          chatHistory: tasks.chatHistory,
          styleReferences: tasks.styleReferences,
          structureData: tasks.structureData,
          moodboardItems: tasks.moodboardItems,
          status: tasks.status,
          complexity: tasks.complexity,
          urgency: tasks.urgency,
          creditsUsed: tasks.creditsUsed,
          categoryId: tasks.categoryId,
          deadline: tasks.deadline,
          assignedAt: tasks.assignedAt,
          completedAt: tasks.completedAt,
          createdAt: tasks.createdAt,
          updatedAt: tasks.updatedAt,
          userName: users.name,
          userEmail: users.email,
          userImage: users.image,
        })
        .from(tasks)
        .leftJoin(users, eq(tasks.clientId, users.id))
        .where(eq(tasks.id, id))
        .limit(1)

      if (!task) {
        throw Errors.notFound('Chat log')
      }

      // Get category name if categoryId exists
      let categoryName: string | null = null
      if (task.categoryId) {
        const [cat] = await db
          .select({ name: taskCategories.name })
          .from(taskCategories)
          .where(eq(taskCategories.id, task.categoryId))
          .limit(1)
        categoryName = cat?.name ?? null
      }

      const messages = (task.chatHistory as AdminChatMessage[]) || []
      const selectedStyles = (task.styleReferences as string[]) || []
      const styleDetails = await fetchStyleDetails(selectedStyles)

      const taskMetadata: TaskMetadata = {
        id: task.id,
        status: task.status,
        complexity: task.complexity,
        urgency: task.urgency,
        creditsUsed: task.creditsUsed,
        categoryName,
        deadline: task.deadline?.toISOString() ?? null,
        assignedAt: task.assignedAt?.toISOString() ?? null,
        completedAt: task.completedAt?.toISOString() ?? null,
      }

      const result: ChatLogDetail = {
        id: task.id,
        type: 'task',
        userId: task.clientId,
        userName: task.userName || 'Unknown',
        userEmail: task.userEmail || '',
        userImage: task.userImage,
        title: task.title,
        messages,
        selectedStyles,
        styleDetails,
        taskStatus: task.status,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        briefingState: null,
        structureData: task.structureData as Record<string, unknown> | null,
        moodboardItems: (task.moodboardItems as MoodboardItemData[]) || [],
        taskMetadata,
      }

      return successResponse(result)
    },
    { endpoint: 'GET /api/admin/chat-logs/[id]' }
  )
}

async function fetchStyleDetails(styleIds: string[]): Promise<StyleDetail[]> {
  if (styleIds.length === 0) return []

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const validUuids = styleIds.filter((v) => uuidRegex.test(v))
  const plainNames = styleIds.filter((v) => !uuidRegex.test(v))

  const detailsMap: Record<string, StyleDetail> = {}

  for (const name of plainNames) {
    detailsMap[name] = { id: name, name, imageUrl: '', deliverableType: '', styleAxis: '' }
  }

  if (validUuids.length > 0) {
    const rows = await db
      .select({
        id: deliverableStyleReferences.id,
        name: deliverableStyleReferences.name,
        imageUrl: deliverableStyleReferences.imageUrl,
        deliverableType: deliverableStyleReferences.deliverableType,
        styleAxis: deliverableStyleReferences.styleAxis,
      })
      .from(deliverableStyleReferences)
      .where(inArray(deliverableStyleReferences.id, validUuids))

    for (const s of rows) {
      detailsMap[s.id] = s
    }
  }

  return styleIds.map((id) => detailsMap[id]).filter(Boolean)
}
