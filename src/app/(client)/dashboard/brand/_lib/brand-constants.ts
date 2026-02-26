import {
  Building2,
  Palette,
  Type,
  Globe,
  Users,
  Target,
  MessageSquare,
  Swords,
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
  Youtube,
} from 'lucide-react'
import type { TabId, TabGroup } from './brand-types'

export const industries = [
  'Technology',
  'E-commerce',
  'SaaS',
  'Marketing & Advertising',
  'Finance',
  'Healthcare',
  'Education',
  'Real Estate',
  'Food & Beverage',
  'Fashion & Apparel',
  'Entertainment',
  'Professional Services',
  'Manufacturing',
  'Non-profit',
  'Recruitment',
  'Banking',
  'Venture Capital',
  'Construction',
  'Electrical Services',
  'Plumbing',
  'HVAC',
  'Restaurants',
  'Cafes',
  'Hotels',
  'Other',
]

export const industryArchetypes = [
  {
    value: 'hospitality',
    label: 'Hospitality',
    description: 'Restaurants, Cafes, Hotels',
  },
  {
    value: 'blue-collar',
    label: 'Blue-collar',
    description: 'Trade services, Construction, Manufacturing',
  },
  {
    value: 'white-collar',
    label: 'White-collar',
    description: 'Professional services, Finance, Recruitment',
  },
  {
    value: 'e-commerce',
    label: 'E-commerce',
    description: 'Product-based online businesses',
  },
  {
    value: 'tech',
    label: 'Tech',
    description: 'Technology startups, Software, SaaS',
  },
]

export const COLOR_PRESETS = {
  primary: [
    '#10b981',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
    '#f97316',
    '#eab308',
    '#22c55e',
    '#06b6d4',
    '#6366f1',
    '#000000',
  ],
  secondary: [
    '#3b82f6',
    '#1e3a8a',
    '#4338ca',
    '#7c3aed',
    '#be185d',
    '#9a3412',
    '#166534',
    '#155e75',
    '#334155',
    '#18181b',
  ],
}

export const SOCIAL_PLATFORMS = [
  {
    key: 'twitter' as const,
    label: 'Twitter / X',
    placeholder: 'https://twitter.com/...',
    icon: Twitter,
  },
  {
    key: 'linkedin' as const,
    label: 'LinkedIn',
    placeholder: 'https://linkedin.com/company/...',
    icon: Linkedin,
  },
  {
    key: 'instagram' as const,
    label: 'Instagram',
    placeholder: 'https://instagram.com/...',
    icon: Instagram,
  },
  {
    key: 'facebook' as const,
    label: 'Facebook',
    placeholder: 'https://facebook.com/...',
    icon: Facebook,
  },
  {
    key: 'youtube' as const,
    label: 'YouTube',
    placeholder: 'https://youtube.com/@...',
    icon: Youtube,
  },
]

export const TABS: { id: TabId; label: string; icon: typeof Building2 }[] = [
  { id: 'company', label: 'Company', icon: Building2 },
  { id: 'colors', label: 'Colors', icon: Palette },
  { id: 'typography', label: 'Typography', icon: Type },
  { id: 'social', label: 'Social', icon: Globe },
  { id: 'audiences', label: 'Audiences', icon: Users },
  { id: 'positioning', label: 'Positioning', icon: Target },
  { id: 'voice', label: 'Voice', icon: MessageSquare },
  { id: 'competitors', label: 'Competitors', icon: Swords },
]

export const TAB_GROUPS: TabGroup[] = [
  { id: 'identity', label: 'Identity', tabs: ['company', 'colors', 'typography'] },
  { id: 'presence', label: 'Presence', tabs: ['social', 'audiences', 'competitors'] },
  { id: 'strategy', label: 'Strategy', tabs: ['positioning', 'voice'] },
]

/**
 * Fields checked to determine completion status per tab.
 * 'audiences' is special — completion depends on the audiences array, not BrandData fields.
 */
export const TAB_COMPLETION_FIELDS: Record<TabId, string[]> = {
  company: ['name', 'industry', 'description', 'tagline', 'website'],
  colors: ['primaryColor', 'secondaryColor', 'accentColor'],
  typography: ['primaryFont', 'secondaryFont', 'keywords'],
  social: ['contactEmail', 'socialLinks'],
  audiences: [], // computed from audiences array
  positioning: ['positioning'],
  voice: ['brandVoice'],
  competitors: ['competitors'],
}
