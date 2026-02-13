export type UserRole = 'CLIENT' | 'FREELANCER' | 'ADMIN'

export type TaskStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'IN_REVIEW'
  | 'REVISION_REQUESTED'
  | 'COMPLETED'
  | 'CANCELLED'

export type TaskCategory = 'STATIC_ADS' | 'VIDEO_MOTION' | 'SOCIAL_MEDIA'

export type NotificationChannel = 'EMAIL' | 'WHATSAPP' | 'IN_APP'

export type FreelancerStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'

export interface TaskRequirements {
  projectType: TaskCategory
  description: string
  dimensions?: string[]
  platforms?: string[]
  brandGuidelines?: {
    colors?: string[]
    fonts?: string[]
    existingAssets?: string[]
  }
  stylePreferences?: string[]
  additionalNotes?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  attachments?: string[]
  styleReferences?: string[]
}

export interface OnboardingData {
  companyName?: string
  industry?: string
  teamSize?: string
  primaryUseCase?: string[]
  stylePreferences?: string[]
  brandColors?: string[]
  completedAt?: Date
}

export interface NotificationPreferences {
  email: boolean
  whatsapp: boolean
  inApp: boolean
  taskAssigned: boolean
  taskCompleted: boolean
  taskRevision: boolean
  lowCredits: boolean
}
