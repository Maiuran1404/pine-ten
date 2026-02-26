import type { LucideIcon } from 'lucide-react'

export interface TemplateOption {
  title: string
  description: string
  prompt: string
  icon: LucideIcon
  optionKey: string
}

export interface TemplateCategory {
  icon: LucideIcon
  categoryKey: string
  description: string
  modalDescription: string
  options: TemplateOption[]
}

export interface TemplateImageData {
  id: string
  categoryKey: string
  optionKey: string | null
  imageUrl: string
}

export interface UploadedFile {
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
}

export interface StyleReference {
  id: string
  name: string
  imageUrl: string
  deliverableType: string | null
  styleAxis: string | null
  contentCategory?: string
  colorTemperature?: string
}

export interface PlatformSelection {
  enabled: boolean
  formats: string[]
  frequency: string
}
