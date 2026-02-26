import { Instagram, Linkedin, Music, Youtube, Twitter } from 'lucide-react'

export const SOCIAL_MEDIA_PLATFORMS = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    formats: ['Post', 'Story', 'Reels'],
    defaultFrequency: '3x / week',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: Linkedin,
    formats: ['Post', 'Carousel'],
    defaultFrequency: '2x / week',
  },
  { id: 'tiktok', name: 'TikTok', icon: Music, formats: ['Video'], defaultFrequency: '3x / week' },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    formats: ['Shorts', 'Long-form'],
    defaultFrequency: '1x / week',
  },
  { id: 'x', name: 'X', icon: Twitter, formats: ['Post', 'Thread'], defaultFrequency: 'Daily' },
] as const

export const FREQUENCY_OPTIONS = [
  'Daily',
  '5x / week',
  '3x / week',
  '2x / week',
  '1x / week',
  '2x / month',
  '1x / month',
]
