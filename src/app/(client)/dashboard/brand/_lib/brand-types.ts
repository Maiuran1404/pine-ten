export interface Audience {
  id: string
  name: string
  isPrimary: boolean
  demographics?: {
    ageRange?: { min: number; max: number }
    gender?: 'all' | 'male' | 'female' | 'other'
    income?: 'low' | 'middle' | 'high' | 'enterprise'
  }
  firmographics?: {
    companySize?: string[]
    industries?: string[]
    jobTitles?: string[]
    departments?: string[]
    decisionMakingRole?: 'decision-maker' | 'influencer' | 'end-user'
  }
  psychographics?: {
    painPoints?: string[]
    goals?: string[]
    values?: string[]
  }
  behavioral?: {
    contentPreferences?: string[]
    platforms?: string[]
    buyingProcess?: 'impulse' | 'considered' | 'committee'
  }
  confidence: number
  sources?: string[]
}

export interface BrandData {
  id: string
  name: string
  website: string | null
  description: string | null
  tagline: string | null
  industry: string | null
  industryArchetype: string | null
  logoUrl: string | null
  faviconUrl: string | null
  primaryColor: string | null
  secondaryColor: string | null
  accentColor: string | null
  backgroundColor: string | null
  textColor: string | null
  brandColors: string[]
  primaryFont: string | null
  secondaryFont: string | null
  socialLinks: {
    twitter?: string
    linkedin?: string
    facebook?: string
    instagram?: string
    youtube?: string
  } | null
  contactEmail: string | null
  contactPhone: string | null
  keywords: string[]
}

export type TabId = 'company' | 'colors' | 'typography' | 'social' | 'audiences'
