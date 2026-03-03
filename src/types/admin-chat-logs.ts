/**
 * Shared types for admin chat logs functionality
 */

export interface AdminChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  attachments?: {
    fileName: string
    fileUrl: string
    fileType: string
    fileSize: number
  }[]
}

export interface StyleDetail {
  id: string
  name: string
  imageUrl: string
  deliverableType: string
  styleAxis: string
}

export interface PendingTaskInfo {
  title: string
  description: string
  category: string
  creditsRequired: number
}

export interface ChatLog {
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
  createdAt: string
  updatedAt: string
}

export interface ChatLogStats {
  total: number
  drafts: number
  tasks: number
  pendingTasks: number
}

// List-level additions (lightweight, for left panel)
export interface ChatLogListItem extends ChatLog {
  currentStage: string | null
  deliverableCategory: string | null
  stagesReached: string[]
  messageCount: number
  hasMoodboard: boolean
  hasStructure: boolean
  imageCount: number
}

// Detail-level types (fetched on-demand for right panel)
export interface MoodboardItemData {
  id: string
  type: 'style' | 'color' | 'image' | 'upload'
  imageUrl: string
  name: string
  metadata?: {
    styleAxis?: string
    deliverableType?: string
    colorSamples?: string[]
    styleId?: string
  }
}

export interface TaskMetadata {
  id: string
  status: string
  complexity: string | null
  urgency: string | null
  creditsUsed: number
  categoryName: string | null
  deadline: string | null
  assignedAt: string | null
  completedAt: string | null
}

export interface ChatLogDetail extends ChatLog {
  briefingState: Record<string, unknown> | null
  structureData: Record<string, unknown> | null
  moodboardItems: MoodboardItemData[]
  taskMetadata: TaskMetadata | null
}
