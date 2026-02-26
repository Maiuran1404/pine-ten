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
      "Select the video type that fits my launch goals. Add details about my product and we'll craft the perfect brief.",
    options: [
      {
        title: 'Product Launch Video',
        optionKey: 'product-launch-video',
        description:
          'A polished 30-60 second cinematic video that introduces my product to the world. Perfect for social media announcements, landing pages, and investor presentations.',
        prompt: 'Create a product launch video',
        icon: Rocket,
      },
      {
        title: 'Feature Highlight',
        optionKey: 'feature-highlight',
        description:
          'A focused video that showcases a specific feature or capability of my product. Great for explaining complex functionality in a digestible way.',
        prompt: 'Create a feature highlight video',
        icon: Sparkles,
      },
      {
        title: 'App Walkthrough',
        optionKey: 'app-walkthrough',
        description:
          'A clear, guided tour of my app or software showing the user journey from start to finish. Ideal for onboarding and tutorials.',
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
      "Choose the presentation style that matches my audience. Share my existing deck or key points and we'll design something compelling.",
    options: [
      {
        title: 'Investor Pitch Deck',
        optionKey: 'investor-pitch-deck',
        description:
          'A visually striking presentation designed to capture investor attention and communicate my vision clearly. Typically 10-15 slides.',
        prompt: 'Redesign my investor pitch deck',
        icon: TrendingUp,
      },
      {
        title: 'Sales Deck',
        optionKey: 'sales-deck',
        description:
          'A persuasive presentation built for closing deals. Features benefit-focused messaging and clear calls to action.',
        prompt: 'Create a sales presentation deck',
        icon: Handshake,
      },
      {
        title: 'Company Overview',
        optionKey: 'company-overview',
        description:
          'A versatile introduction to my company that works for partners, clients, and new team members.',
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
      "Tell us about my brand personality and goals. We'll create a visual identity that sets me apart.",
    options: [
      {
        title: 'Full Brand Package',
        optionKey: 'full-brand-package',
        description:
          'A complete visual identity system including logo design, color palette, typography, and brand guidelines.',
        prompt: 'Create a full brand package with logo and visual identity',
        icon: PackageOpen,
      },
      {
        title: 'Logo Design',
        optionKey: 'logo-design',
        description:
          'A custom logo crafted for my brand, including primary logo, wordmark, and icon variations.',
        prompt: 'Design a logo for my brand',
        icon: PenTool,
      },
      {
        title: 'Brand Refresh',
        optionKey: 'brand-refresh',
        description:
          'Modernize and elevate my existing brand while maintaining recognition with updated visual elements.',
        prompt: 'Refresh and modernize my existing brand',
        icon: RefreshCw,
      },
    ],
  },
  'Social Media': {
    icon: Share2,
    categoryKey: 'social-media',
    description: 'Ads, content & video edits',
    modalDescription: 'Plan your content calendar, choose platforms, and set posting frequency.',
    options: [
      {
        title: 'Instagram Post',
        optionKey: 'instagram-post',
        description:
          'Eye-catching static posts designed for maximum engagement in the 4:5 feed format.',
        prompt: 'Create Instagram post designs',
        icon: Instagram,
      },
      {
        title: 'Instagram Story',
        optionKey: 'instagram-story',
        description:
          'Vertical 9:16 content optimized for Stories with interactive elements and dynamic layouts.',
        prompt: 'Create Instagram story designs',
        icon: Instagram,
      },
      {
        title: 'Instagram Reels',
        optionKey: 'instagram-reels',
        description:
          'Short-form vertical video content designed to capture attention in the first second.',
        prompt: 'Create an Instagram Reels video',
        icon: FileVideo,
      },
      {
        title: 'LinkedIn Content',
        optionKey: 'linkedin-content',
        description:
          'Professional content designed for B2B engagement including carousels and thought leadership.',
        prompt: 'Create LinkedIn content',
        icon: Linkedin,
      },
      {
        title: 'Video Edit',
        optionKey: 'video-edit',
        description:
          'Transform raw footage into polished, platform-ready content with professional editing.',
        prompt: 'Edit my video footage for social media',
        icon: FileVideo,
      },
      {
        title: 'Ad Creatives',
        optionKey: 'ad-creatives',
        description:
          'Performance-focused ad designs for Meta, TikTok, Google with A/B testing variations.',
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
      'Plan your content calendar with posting schedules, content pillars, and platform strategy.',
    options: [
      {
        title: 'Social Media Calendar',
        optionKey: 'social-media-calendar',
        description:
          'A strategic posting schedule across your social platforms with content pillars, weekly themes, and engagement tactics.',
        prompt: 'Create a social media content calendar',
        icon: Share2,
      },
      {
        title: 'Multi-Platform Campaign',
        optionKey: 'multi-platform-campaign',
        description:
          'A coordinated content plan spanning multiple platforms with consistent messaging and CTA escalation.',
        prompt: 'Plan a multi-platform content campaign',
        icon: Megaphone,
      },
      {
        title: 'Launch Content Plan',
        optionKey: 'launch-content-plan',
        description:
          'A pre-launch to post-launch content timeline with teasers, announcements, and follow-up content.',
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
      "Pick a landing page style and tell us about my product or campaign. We'll design a page that drives action.",
    options: [
      {
        title: 'Product Landing Page',
        optionKey: 'product-landing-page',
        description:
          'A conversion-focused page that showcases my product with compelling visuals, benefits, and a clear call to action.',
        prompt: 'Design a product landing page',
        icon: ShoppingBag,
      },
      {
        title: 'SaaS Landing Page',
        optionKey: 'saas-landing-page',
        description:
          'A modern page built for software products with feature highlights, pricing, social proof, and sign-up flows.',
        prompt: 'Design a SaaS landing page',
        icon: Monitor,
      },
      {
        title: 'Event Landing Page',
        optionKey: 'event-landing-page',
        description:
          'A dynamic page for events, launches, or campaigns with countdown timers, speaker bios, and registration.',
        prompt: 'Design an event landing page',
        icon: CalendarDays,
      },
    ],
  },
}
