export interface SectionTemplate {
  type: string
  label: string
  description: string
  defaultOrder: number
  wireframeHint:
    | 'hero'
    | 'features'
    | 'testimonials'
    | 'cta'
    | 'content'
    | 'gallery'
    | 'pricing'
    | 'faq'
    | 'contact'
    | 'footer'
    | 'navigation'
    | 'stats'
    | 'team'
    | 'about'
}

export const SECTION_TYPES: Record<string, SectionTemplate> = {
  navigation: {
    type: 'navigation',
    label: 'Navigation',
    description: 'Top navigation bar with logo and menu links',
    defaultOrder: 0,
    wireframeHint: 'navigation',
  },
  hero: {
    type: 'hero',
    label: 'Hero Section',
    description: 'Full-width hero with headline, subheading, and CTA',
    defaultOrder: 1,
    wireframeHint: 'hero',
  },
  features: {
    type: 'features',
    label: 'Features',
    description: 'Grid or list of key features/services',
    defaultOrder: 2,
    wireframeHint: 'features',
  },
  about: {
    type: 'about',
    label: 'About',
    description: 'Company or personal introduction section',
    defaultOrder: 3,
    wireframeHint: 'about',
  },
  testimonials: {
    type: 'testimonials',
    label: 'Testimonials',
    description: 'Client reviews and social proof',
    defaultOrder: 4,
    wireframeHint: 'testimonials',
  },
  stats: {
    type: 'stats',
    label: 'Stats & Numbers',
    description: 'Key metrics and achievements',
    defaultOrder: 5,
    wireframeHint: 'stats',
  },
  gallery: {
    type: 'gallery',
    label: 'Gallery / Portfolio',
    description: 'Image grid showcasing work or products',
    defaultOrder: 6,
    wireframeHint: 'gallery',
  },
  pricing: {
    type: 'pricing',
    label: 'Pricing',
    description: 'Pricing tiers or packages',
    defaultOrder: 7,
    wireframeHint: 'pricing',
  },
  team: {
    type: 'team',
    label: 'Team',
    description: 'Team members with photos and roles',
    defaultOrder: 8,
    wireframeHint: 'team',
  },
  faq: {
    type: 'faq',
    label: 'FAQ',
    description: 'Frequently asked questions accordion',
    defaultOrder: 9,
    wireframeHint: 'faq',
  },
  cta: {
    type: 'cta',
    label: 'Call to Action',
    description: 'Conversion-focused section with clear CTA',
    defaultOrder: 10,
    wireframeHint: 'cta',
  },
  contact: {
    type: 'contact',
    label: 'Contact',
    description: 'Contact form and information',
    defaultOrder: 11,
    wireframeHint: 'contact',
  },
  footer: {
    type: 'footer',
    label: 'Footer',
    description: 'Footer with links, social, and legal',
    defaultOrder: 12,
    wireframeHint: 'footer',
  },
}

export const INDUSTRY_DEFAULTS: Record<string, string[]> = {
  'law-firm': [
    'navigation',
    'hero',
    'features',
    'about',
    'testimonials',
    'team',
    'cta',
    'contact',
    'footer',
  ],
  saas: [
    'navigation',
    'hero',
    'features',
    'stats',
    'pricing',
    'testimonials',
    'faq',
    'cta',
    'footer',
  ],
  agency: [
    'navigation',
    'hero',
    'gallery',
    'features',
    'about',
    'testimonials',
    'cta',
    'contact',
    'footer',
  ],
  ecommerce: [
    'navigation',
    'hero',
    'features',
    'gallery',
    'testimonials',
    'pricing',
    'faq',
    'cta',
    'footer',
  ],
  portfolio: ['navigation', 'hero', 'gallery', 'about', 'testimonials', 'contact', 'footer'],
  restaurant: [
    'navigation',
    'hero',
    'about',
    'gallery',
    'features',
    'testimonials',
    'contact',
    'footer',
  ],
  healthcare: [
    'navigation',
    'hero',
    'features',
    'about',
    'team',
    'testimonials',
    'faq',
    'cta',
    'contact',
    'footer',
  ],
  finance: [
    'navigation',
    'hero',
    'features',
    'stats',
    'about',
    'testimonials',
    'faq',
    'cta',
    'contact',
    'footer',
  ],
  'real-estate': [
    'navigation',
    'hero',
    'features',
    'gallery',
    'stats',
    'testimonials',
    'cta',
    'contact',
    'footer',
  ],
  education: [
    'navigation',
    'hero',
    'features',
    'about',
    'stats',
    'testimonials',
    'pricing',
    'faq',
    'cta',
    'footer',
  ],
}

export function getDefaultSections(industry?: string): string[] {
  if (industry && INDUSTRY_DEFAULTS[industry]) {
    return INDUSTRY_DEFAULTS[industry]
  }
  // Generic default
  return ['navigation', 'hero', 'features', 'about', 'testimonials', 'cta', 'contact', 'footer']
}

export function getSectionTemplate(type: string): SectionTemplate | undefined {
  return SECTION_TYPES[type]
}
