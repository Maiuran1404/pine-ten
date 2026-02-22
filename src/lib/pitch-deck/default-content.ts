import type { PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'

export const defaultPitchDeckContent: PitchDeckFormData = {
  // Global
  clientName: 'Arcline',
  primaryColor: '#4B624F',
  accentColor: '#2E4A24',

  // Cover
  coverDate: new Date().toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  }),

  // About
  aboutTitle: 'Marketing done by AI and with human experts',
  aboutBody:
    'We combine AI-driven speed with experienced human experts to deliver consistent, professional work across branding, marketing, and content. Our model is simple: clients describe what they need, and we handle everything from structure and execution to refinement and delivery.',

  // Project Details
  projectDetailsTitle: 'Project Details',
  projectDetailsColumns: [
    {
      title: 'PROJECT DETAILS',
      description:
        "We're building a clear and effective landing page for Arcline. This includes fixing and improving visual assets, shaping the messaging, and making sure everything works well together. We'll also help create LinkedIn content and provide regular status updates during the project.",
    },
    {
      title: 'CREATIVE VISION',
      description:
        'Clean, modern, and easy to understand. The design and language should feel professional and confident without being complicated. Everything should help explain what Arcline does in a clear and trustworthy way.',
    },
    {
      title: 'PROJECT OBJECTIVES',
      description:
        'Create a landing page that clearly explains Arcline and converts visitors. Improve and align all visuals and copy used on the page. Support Arcline with clear LinkedIn communication. Keep the project on track with regular updates and progress reports.',
    },
  ],

  // Overview
  overviewTitle: 'Project Overview',
  overviewBody:
    "This project refreshes Arcline's landing page and brand foundation to support both enterprise sales and startup self-serve growth. We'll rewrite and polish platform communication to fit both audiences, and create new visual assets from scratch to strengthen Arcline's branding for upcoming rounds. We'll also plan, film, and edit LinkedIn content, supported by a shared playbook document that outlines topics, messaging, and required inputs. Finally, we'll refine Arcline's communication across its key channels to ensure everything feels consistent, clear, and on-brand.",

  // Scope
  scopeTitle: 'Scope Of Work',
  scopeCategories: [
    {
      title: 'Landing Page',
      items: [
        'Landing page re-design and publish',
        'New design assets created from scratch',
        'Consistent brand system created for future use',
        'Asset preparation for upcoming funding rounds',
      ],
    },
    {
      title: 'Communication',
      items: [
        'Clear messaging for both enterprise and self-serve users',
        'Refined value proposition and page structure',
        "Polished communication across Arcline's platforms",
        'Alignment between visuals, copy, and positioning',
      ],
    },
    {
      title: 'Content & Social',
      items: [
        'LinkedIn content planning and direction',
        'Filming and editing of short-form content',
        'Shared content prep document (topics, structure, inputs)',
        'Ongoing coordination and progress updates',
      ],
    },
  ],

  // Timeline
  timelineTitle: 'Timeline',
  milestones: [
    {
      date: 'Sunday 8th',
      description: 'Start Designing.',
    },
    {
      date: 'Saturday 14th',
      description: 'First delivery of landing page, Communication & content documents.',
    },
    {
      date: 'Sunday 15th',
      description: 'Rapid iterations based on feedback',
    },
    {
      date: 'Tuesday 17th',
      description: 'Final delivery of Landing page + blocking out filming days.',
    },
  ],

  // Pricing
  pricingTitle: 'Pricing',
  pricingSubtitle: 'For projects',
  pricingCards: [
    {
      label: 'Custom offer',
      price: '50 000 NOK',
      priceDescription: 'Pricing for landing page + communication',
      ctaText: "Let's work together!",
      includedItems: [
        'New landing page',
        'Asset development',
        'UX & Communication',
        'Project Management',
      ],
    },
    {
      label: 'Custom offer',
      price: '20 000 NOK/mo',
      priceDescription: 'Pricing for content',
      ctaText: "Let's work together!",
      includedItems: [
        'Filming & editing',
        'Content strategy',
        'Editing of content',
        'Project Management',
      ],
    },
  ],

  // Back Cover
  backCoverMessage: 'Thank you',
  backCoverBody:
    "Thank you for your time and consideration. If Crafted feels like the right partner, we'd love to discuss your goals and recommend the best next steps.",
  contactName: 'Maiuran Loganthan',
  contactEmail: 'Maiuran@getcrafted.ai',
  contactPhone: '+47 48198693',
  contactWebsite: 'getcrafted.ai',
}
