import type {
  StructureData,
  StrategicReviewData,
  BriefingState,
} from '@/lib/ai/briefing-state-machine'
import type { DeliveryStatus } from '@/lib/validations/website-delivery-schemas'
import type {
  AudienceBrief,
  VisualDirection,
  Dimension,
  InferredField,
  ContentOutline,
} from '@/components/chat/brief-panel/types'

// =============================================================================
// MOODBOARD ITEM
// =============================================================================

export interface MoodboardItem {
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

// =============================================================================
// ACTIVITY LOG
// =============================================================================

export interface ActivityLogEntry {
  id: string
  action: string
  actorType: string
  actorId: string | null
  previousStatus: string | null
  newStatus: string | null
  metadata: {
    freelancerName?: string
    deliverableCount?: number
    revisionFeedback?: string
    creditsUsed?: number
    category?: string
    [key: string]: unknown
  } | null
  createdAt: string
}

// =============================================================================
// BRAND DNA
// =============================================================================

export interface BrandDNA {
  name: string
  website: string | null
  industry: string | null
  description: string | null
  logoUrl: string | null
  faviconUrl: string | null
  colors: {
    primary: string | null
    secondary: string | null
    accent: string | null
    background: string | null
    text: string | null
    additional: string[]
  }
  typography: {
    primaryFont: string | null
    secondaryFont: string | null
  }
  socialLinks: {
    twitter?: string
    linkedin?: string
    facebook?: string
    instagram?: string
    youtube?: string
  } | null
  brandAssets: {
    images?: string[]
    documents?: string[]
  } | null
  tagline: string | null
  keywords: string[] | null
}

// =============================================================================
// BRIEF DATA (from briefs table)
// =============================================================================

export interface BriefData {
  id: string
  status: string
  completionPercentage: number
  taskSummary: InferredField<string> | null
  topic: InferredField<string> | null
  platform: InferredField<string> | null
  contentType: InferredField<string> | null
  intent: InferredField<string> | null
  taskType: InferredField<string> | null
  audience: InferredField<AudienceBrief> | null
  dimensions: Dimension[] | null
  visualDirection: VisualDirection | null
  contentOutline: ContentOutline | null
  brandContext: {
    name: string
    industry: string
    toneOfVoice: string
    description: string
  } | null
}

// =============================================================================
// FILE TYPES
// =============================================================================

export interface TaskFile {
  id: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  isDeliverable: boolean
  createdAt: string
}

// =============================================================================
// MESSAGE TYPES
// =============================================================================

export interface TaskMessage {
  id: string
  content: string
  attachments: string[]
  createdAt: string
  senderId: string
  senderName: string
  senderImage: string | null
}

export interface ChatHistoryMessage {
  role: string
  content: string
  timestamp: string
  attachments?: { fileName: string; fileUrl: string; fileType: string }[]
}

// =============================================================================
// MAIN TASK DETAIL DATA
// =============================================================================

export interface TaskDetailData {
  id: string
  title: string
  description: string
  status: string
  requirements: Record<string, unknown> | null
  styleReferences: string[]
  moodboardItems: MoodboardItem[]
  chatHistory: ChatHistoryMessage[]
  estimatedHours: string | null
  creditsUsed: number
  maxRevisions: number
  revisionsUsed: number
  priority: number
  deadline: string | null
  assignedAt: string | null
  completedAt: string | null
  createdAt: string
  category: {
    id: string
    name: string
    slug: string
  } | null
  freelancer: {
    id: string
    name: string
    image: string | null
  } | null
  files: TaskFile[]
  messages: TaskMessage[]
  activityLog: ActivityLogEntry[]
  brandDNA: BrandDNA | null
  briefData: BriefData | null
  briefingState: BriefingState | null
  websiteProject: WebsiteProjectSummary | null
}

// =============================================================================
// WEBSITE PROJECT (delivery pipeline summary)
// =============================================================================

export interface WebsiteProjectSummary {
  id: string
  deliveryStatus: DeliveryStatus
  framerProjectUrl: string | null
  framerPreviewUrl: string | null
  framerDeployedUrl: string | null
}

// =============================================================================
// STATUS CONFIG
// =============================================================================

export const STATUS_CONFIG: Record<string, { color: string; bgColor: string; label: string }> = {
  PENDING: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 border-yellow-200',
    label: 'Queued',
  },
  OFFERED: {
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 border-cyan-200',
    label: 'Queued',
  },
  ASSIGNED: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    label: 'Assigned',
  },
  IN_PROGRESS: {
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
    label: 'In Progress',
  },
  IN_REVIEW: {
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200',
    label: 'In Review',
  },
  PENDING_ADMIN_REVIEW: {
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    label: 'Admin Review',
  },
  REVISION_REQUESTED: {
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    label: 'Revision',
  },
  COMPLETED: {
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    label: 'Completed',
  },
  CANCELLED: {
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    label: 'Cancelled',
  },
}

// =============================================================================
// PROGRESS STEPS
// =============================================================================

export const PROGRESS_STEPS = [
  { key: 'created', label: 'Created', statuses: ['PENDING', 'OFFERED'] },
  { key: 'assigned', label: 'Assigned', statuses: ['ASSIGNED'] },
  { key: 'in_progress', label: 'In Progress', statuses: ['IN_PROGRESS'] },
  {
    key: 'in_review',
    label: 'In Review',
    statuses: ['IN_REVIEW', 'PENDING_ADMIN_REVIEW', 'REVISION_REQUESTED'],
  },
  { key: 'completed', label: 'Completed', statuses: ['COMPLETED'] },
] as const

export type {
  StructureData,
  StrategicReviewData,
  BriefingState,
  AudienceBrief,
  VisualDirection,
  Dimension,
}
