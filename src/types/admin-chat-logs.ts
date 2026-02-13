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
