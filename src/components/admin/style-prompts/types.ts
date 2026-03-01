import type { DeliverableType, StyleAxis } from '@/lib/constants/reference-libraries'

export interface DeliverableStyleReference {
  id: string
  name: string
  description: string | null
  imageUrl: string
  deliverableType: DeliverableType
  styleAxis: StyleAxis
  subStyle: string | null
  semanticTags: string[]
  featuredOrder: number
  displayOrder: number
  isActive: boolean
  usageCount: number
  createdAt: string
  promptGuide?: string | null
  colorTemperature?: string
  energyLevel?: string
  densityLevel?: string
  formalityLevel?: string
  colorSamples?: string[]
  industries?: string[]
  targetAudience?: string
  visualElements?: string[]
  moodKeywords?: string[]
  styleReferenceImages?: string[]
}

export interface CardEditState {
  name: string
  promptGuide: string
  isActive: boolean
}

export type GenerationStatus = 'idle' | 'generating' | 'success' | 'error'

export interface CardGenerationState {
  status: GenerationStatus
  previewBlobUrl: string | null
  previewBase64: string | null
  error: string | null
}

export interface BatchState {
  isRunning: boolean
  completed: number
  total: number
}

export interface CreateFormState {
  name: string
  description: string
  imageUrl: string
  deliverableType: DeliverableType
  styleAxis: StyleAxis
  promptGuide: string
}

export const DEFAULT_CREATE_FORM: CreateFormState = {
  name: '',
  description: '',
  imageUrl: '',
  deliverableType: 'instagram_post',
  styleAxis: 'minimal',
  promptGuide: '',
}
