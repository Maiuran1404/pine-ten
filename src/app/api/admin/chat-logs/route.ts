import { NextRequest } from 'next/server'
import { db } from '@/db'
import { chatDrafts, tasks, users, deliverableStyleReferences } from '@/db/schema'
import { requireAdmin } from '@/lib/require-auth'
import { desc, eq, or, ilike, inArray } from 'drizzle-orm'
import { withErrorHandling, successResponse } from '@/lib/errors'
import type { AdminChatMessage, StyleDetail, PendingTaskInfo } from '@/types/admin-chat-logs'

const STAGE_ORDER = [
  'EXTRACT',
  'TASK_TYPE',
  'INTENT',
  'INSPIRATION',
  'STRUCTURE',
  'ELABORATE',
  'STRATEGIC_REVIEW',
  'MOODBOARD',
  'REVIEW',
  'DEEPEN',
  'SUBMIT',
]

interface StoryboardScene {
  resolvedImageUrl?: string
  [key: string]: unknown
}

interface BriefingStateData {
  stage?: string
  deliverableCategory?: string | null
  [key: string]: unknown
}

interface StructureDataShape {
  type?: string
  scenes?: StoryboardScene[]
  [key: string]: unknown
}

interface MoodboardItemShape {
  id: string
  [key: string]: unknown
}

// Internal type with Date objects (before serialization)
interface InternalChatLog {
  id: string
  type: 'draft' | 'task'
  userId: string
  userName: string
  userEmail: string
  userImage: string | null
  title: string
  messages: AdminChatMessage[]
  selectedStyles: string[]
  styleDetails?: StyleDetail[]
  taskStatus?: string
  pendingTask?: PendingTaskInfo | null
  // Enriched fields for list view
  currentStage: string | null
  deliverableCategory: string | null
  stagesReached: string[]
  messageCount: number
  hasMoodboard: boolean
  hasStructure: boolean
  imageCount: number
  createdAt: Date
  updatedAt: Date
}

function deriveStagesReached(currentStage: string | null): string[] {
  if (!currentStage) return []
  const idx = STAGE_ORDER.indexOf(currentStage)
  if (idx === -1) return [currentStage]
  return STAGE_ORDER.slice(0, idx + 1)
}

function countStoryboardImages(structureData: unknown): number {
  const data = structureData as StructureDataShape | null
  if (!data || data.type !== 'storyboard' || !Array.isArray(data.scenes)) return 0
  return data.scenes.filter((s: StoryboardScene) => !!s.resolvedImageUrl).length
}

export async function GET(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const searchParams = request.nextUrl.searchParams
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '20')
      const status = searchParams.get('status') || 'all' // all, draft, task
      const search = searchParams.get('search') || ''
      const category = searchParams.get('category') || '' // video, website, content, design, brand
      const offset = (page - 1) * limit

      const logs: InternalChatLog[] = []

      // Fetch drafts if needed
      if (status === 'all' || status === 'draft') {
        let draftsQuery = db
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
          .orderBy(desc(chatDrafts.updatedAt))

        if (search) {
          draftsQuery = draftsQuery.where(
            or(
              ilike(users.name, `%${search}%`),
              ilike(users.email, `%${search}%`),
              ilike(chatDrafts.title, `%${search}%`)
            )
          ) as typeof draftsQuery
        }

        const draftsResult = await draftsQuery

        for (const draft of draftsResult) {
          const briefingState = draft.briefingState as BriefingStateData | null
          const currentStage = briefingState?.stage ?? null
          const deliverableCategory = (briefingState?.deliverableCategory as string | null) ?? null

          // Apply category filter
          if (category && deliverableCategory !== category) continue

          const messages = (draft.messages as AdminChatMessage[]) || []

          logs.push({
            id: draft.id,
            type: 'draft',
            userId: draft.clientId,
            userName: draft.userName || 'Unknown',
            userEmail: draft.userEmail || '',
            userImage: draft.userImage,
            title: draft.title,
            messages,
            selectedStyles: (draft.selectedStyles as string[]) || [],
            pendingTask: draft.pendingTask as PendingTaskInfo | null,
            currentStage,
            deliverableCategory,
            stagesReached: deriveStagesReached(currentStage),
            messageCount: messages.length,
            hasMoodboard: false, // drafts don't store moodboard items directly
            hasStructure: !!briefingState?.structure,
            imageCount: countStoryboardImages(
              (briefingState as Record<string, unknown> | null)?.structure ?? null
            ),
            createdAt: draft.createdAt,
            updatedAt: draft.updatedAt,
          })
        }
      }

      // Fetch tasks with chat history if needed
      if (status === 'all' || status === 'task') {
        let tasksQuery = db
          .select({
            id: tasks.id,
            clientId: tasks.clientId,
            title: tasks.title,
            chatHistory: tasks.chatHistory,
            styleReferences: tasks.styleReferences,
            structureData: tasks.structureData,
            moodboardItems: tasks.moodboardItems,
            complexity: tasks.complexity,
            urgency: tasks.urgency,
            creditsUsed: tasks.creditsUsed,
            status: tasks.status,
            createdAt: tasks.createdAt,
            updatedAt: tasks.updatedAt,
            userName: users.name,
            userEmail: users.email,
            userImage: users.image,
          })
          .from(tasks)
          .leftJoin(users, eq(tasks.clientId, users.id))
          .orderBy(desc(tasks.updatedAt))

        if (search) {
          tasksQuery = tasksQuery.where(
            or(
              ilike(users.name, `%${search}%`),
              ilike(users.email, `%${search}%`),
              ilike(tasks.title, `%${search}%`)
            )
          ) as typeof tasksQuery
        }

        const tasksResult = await tasksQuery

        for (const task of tasksResult) {
          // Only include tasks that have chat history
          const chatHistory = task.chatHistory as AdminChatMessage[] | null
          if (!chatHistory || chatHistory.length === 0) continue

          const structureData = task.structureData as StructureDataShape | null
          const moodboardItems = (task.moodboardItems as MoodboardItemShape[] | null) || []

          // Tasks don't have briefingState — derive category from structureData type
          let deliverableCategory: string | null = null
          if (structureData?.type === 'storyboard') deliverableCategory = 'video'
          else if (structureData?.type === 'layout') deliverableCategory = 'website'
          else if (structureData?.type === 'calendar') deliverableCategory = 'content'
          else if (structureData?.type === 'single_design') deliverableCategory = 'design'

          // Apply category filter
          if (category && deliverableCategory !== category) continue

          logs.push({
            id: task.id,
            type: 'task',
            userId: task.clientId,
            userName: task.userName || 'Unknown',
            userEmail: task.userEmail || '',
            userImage: task.userImage,
            title: task.title,
            messages: chatHistory,
            selectedStyles: (task.styleReferences as string[]) || [],
            taskStatus: task.status,
            currentStage: 'SUBMIT', // tasks have completed the flow
            deliverableCategory,
            stagesReached: STAGE_ORDER, // tasks completed all stages
            messageCount: chatHistory.length,
            hasMoodboard: moodboardItems.length > 0,
            hasStructure: structureData != null,
            imageCount: countStoryboardImages(structureData),
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
          })
        }
      }

      // Sort combined logs by updatedAt
      logs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

      // Collect all style IDs to fetch details
      const allStyleValues = [...new Set(logs.flatMap((log) => log.selectedStyles))]

      // Split into valid UUIDs vs plain style names
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const validUuids = allStyleValues.filter((v) => uuidRegex.test(v))
      const plainNames = allStyleValues.filter((v) => !uuidRegex.test(v))

      // Fetch style details if there are any
      const styleDetailsMap: Record<string, StyleDetail> = {}

      // Build synthetic entries for plain name values (no DB lookup needed)
      for (const name of plainNames) {
        styleDetailsMap[name] = {
          id: name,
          name,
          imageUrl: '',
          deliverableType: '',
          styleAxis: '',
        }
      }

      // Query DB only with valid UUIDs
      if (validUuids.length > 0) {
        const styleDetails = await db
          .select({
            id: deliverableStyleReferences.id,
            name: deliverableStyleReferences.name,
            imageUrl: deliverableStyleReferences.imageUrl,
            deliverableType: deliverableStyleReferences.deliverableType,
            styleAxis: deliverableStyleReferences.styleAxis,
          })
          .from(deliverableStyleReferences)
          .where(inArray(deliverableStyleReferences.id, validUuids))

        for (const s of styleDetails) {
          styleDetailsMap[s.id] = s
        }
      }

      // Add style details to each log (strip full messages from list payload)
      const logsForList = logs.map((log) => ({
        ...log,
        styleDetails: log.selectedStyles.map((id) => styleDetailsMap[id]).filter(Boolean),
        // Keep messages lightweight — only send count, not full content
        messages: undefined,
      }))

      // Apply pagination to combined results
      const total = logsForList.length
      const paginatedLogs = logsForList.slice(offset, offset + limit)

      // Calculate stats
      const totalDrafts = logs.filter((l) => l.type === 'draft').length
      const totalTasks = logs.filter((l) => l.type === 'task').length
      const totalMessages = logs.reduce((sum, l) => sum + l.messageCount, 0)
      const avgMessages = total > 0 ? Math.round(totalMessages / total) : 0

      return successResponse({
        logs: paginatedLogs,
        total,
        page,
        limit,
        stats: {
          total,
          drafts: totalDrafts,
          tasks: totalTasks,
          avgMessages,
        },
      })
    },
    { endpoint: 'GET /api/admin/chat-logs' }
  )
}
