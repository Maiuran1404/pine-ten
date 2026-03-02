import {
  Megaphone,
  Presentation,
  Palette,
  Share2,
  PanelTop,
  Instagram,
  Linkedin,
  Rocket,
  Sparkles,
  Smartphone,
  TrendingUp,
  Handshake,
  Building2,
  PackageOpen,
  PenTool,
  RefreshCw,
  ShoppingBag,
  Monitor,
  CalendarDays,
  FileVideo,
} from 'lucide-react'
import type { TemplateCategory } from '../_types/dashboard-types'

// Template categories and sub-options based on service offerings
export const TEMPLATE_CATEGORIES: Record<string, TemplateCategory> = {
  'Launch Videos': {
    icon: Megaphone,
    categoryKey: 'launch-videos',
    description: 'Product videos that convert',
    modalDescription:
      'Pick a video format below, then tell us about your product so we can build the perfect brief.',
    options: [
      {
        title: 'Product Launch Video',
        optionKey: 'product-launch-video',
        description: 'Build hype around your launch with a cinematic 30-60s product reveal.',
        prompt: 'Create a product launch video',
        icon: Rocket,
      },
      {
        title: 'Feature Explainer',
        optionKey: 'feature-highlight',
        description: 'Show users exactly why one feature matters with a focused deep-dive.',
        prompt: 'Create a feature explainer video',
        icon: Sparkles,
      },
      {
        title: 'App Walkthrough',
        optionKey: 'app-walkthrough',
        description: 'Onboard new users faster with a guided screen-by-screen tour.',
        prompt: 'Create an app walkthrough video',
        icon: Smartphone,
      },
    ],
  },
  'Pitch Deck': {
    icon: Presentation,
    categoryKey: 'pitch-deck',
    description: 'Investor-ready presentations',
    modalDescription:
      'Choose a deck type, then share your key talking points or an existing deck to redesign.',
    options: [
      {
        title: 'Investor Pitch Deck',
        optionKey: 'investor-pitch-deck',
        description: 'Tell your story in 10-15 slides that make investors want to write a check.',
        prompt: 'Redesign my investor pitch deck',
        icon: TrendingUp,
      },
      {
        title: 'Sales Deck',
        optionKey: 'sales-deck',
        description: 'Close deals faster with slides that lead prospects straight to yes.',
        prompt: 'Create a sales presentation deck',
        icon: Handshake,
      },
      {
        title: 'Company Overview',
        optionKey: 'company-overview',
        description: 'Give anyone a clear picture of who you are and what you do in minutes.',
        prompt: 'Design a company overview presentation',
        icon: Building2,
      },
    ],
  },
  Branding: {
    icon: Palette,
    categoryKey: 'branding',
    description: 'Complete visual identity',
    modalDescription:
      "Tell us about your brand personality and audience and we'll shape a visual identity to match.",
    options: [
      {
        title: 'Full Brand Package',
        optionKey: 'full-brand-package',
        description: 'Launch with a complete identity — logo, colors, type, and brand guidelines.',
        prompt: 'Create a full brand package with logo and visual identity',
        icon: PackageOpen,
      },
      {
        title: 'Logo Design',
        optionKey: 'logo-design',
        description: 'Get a versatile logo system — primary mark, wordmark, and icon variations.',
        prompt: 'Design a logo for my brand',
        icon: PenTool,
      },
      {
        title: 'Brand Refresh',
        optionKey: 'brand-refresh',
        description: "Update your visual identity without losing the brand equity you've built.",
        prompt: 'Refresh and modernize my existing brand',
        icon: RefreshCw,
      },
    ],
  },
  'Social Media': {
    icon: Share2,
    categoryKey: 'social-media',
    description: 'Ads, content & video edits',
    modalDescription:
      "Pick a content type and platform — we'll handle the sizing, format, and creative direction.",
    options: [
      {
        title: 'Instagram Post',
        optionKey: 'instagram-post',
        description: 'Stop the scroll with eye-catching static posts optimized for the feed.',
        prompt: 'Create Instagram post designs',
        icon: Instagram,
      },
      {
        title: 'Instagram Story',
        optionKey: 'instagram-story',
        description: 'Drive taps and replies with vertical Stories that feel native to the format.',
        prompt: 'Create Instagram story designs',
        icon: Instagram,
      },
      {
        title: 'Instagram Reels',
        optionKey: 'instagram-reels',
        description: 'Hook viewers in the first second with short-form vertical video.',
        prompt: 'Create an Instagram Reels video',
        icon: FileVideo,
      },
      {
        title: 'LinkedIn Content',
        optionKey: 'linkedin-content',
        description: 'Build thought leadership with professional carousels and visual posts.',
        prompt: 'Create LinkedIn content',
        icon: Linkedin,
      },
      {
        title: 'Video Edit',
        optionKey: 'video-edit',
        description: 'Turn raw footage into polished, ready-to-post content.',
        prompt: 'Edit my video footage for social media',
        icon: FileVideo,
      },
      {
        title: 'Ad Creatives',
        optionKey: 'ad-creatives',
        description: 'Drive conversions with scroll-stopping ad creatives and A/B variants.',
        prompt: 'Create social media ad creatives',
        icon: Megaphone,
      },
    ],
  },
  'Content Calendar': {
    icon: CalendarDays,
    categoryKey: 'content-calendar',
    description: 'Strategic content planning',
    modalDescription:
      "Choose a planning scope and we'll map out your content pillars, cadence, and platform mix.",
    options: [
      {
        title: 'Social Media Calendar',
        optionKey: 'social-media-calendar',
        description:
          'Never run out of ideas — get a structured weekly posting plan you can stick to.',
        prompt: 'Create a social media content calendar',
        icon: Share2,
      },
      {
        title: 'Multi-Platform Campaign',
        optionKey: 'multi-platform-campaign',
        description: 'Amplify one message everywhere with a coordinated cross-platform rollout.',
        prompt: 'Plan a multi-platform content campaign',
        icon: Megaphone,
      },
      {
        title: 'Launch Content Plan',
        optionKey: 'launch-content-plan',
        description: 'Build anticipation before launch day and keep momentum going after.',
        prompt: 'Create a product launch content plan',
        icon: Rocket,
      },
    ],
  },
  'Landing Page': {
    icon: PanelTop,
    categoryKey: 'landing-page',
    description: 'High-converting web pages',
    modalDescription:
      "Pick a page type, then describe your product or campaign and we'll design a page that converts.",
    options: [
      {
        title: 'Product Landing Page',
        optionKey: 'product-landing-page',
        description: 'Turn visitors into customers with a page built around one clear action.',
        prompt: 'Design a product landing page',
        icon: ShoppingBag,
      },
      {
        title: 'SaaS Landing Page',
        optionKey: 'saas-landing-page',
        description: 'Convert free users to paid with a page that sells the upgrade.',
        prompt: 'Design a SaaS landing page',
        icon: Monitor,
      },
      {
        title: 'Event Landing Page',
        optionKey: 'event-landing-page',
        description: 'Fill every seat with a page that builds urgency and captures sign-ups.',
        prompt: 'Design an event landing page',
        icon: CalendarDays,
      },
    ],
  },
}
