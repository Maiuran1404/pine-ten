import type { PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'

export const defaultPitchDeckContent: PitchDeckFormData = {
  // Global
  clientName: 'Client Name',
  primaryColor: '#1a1a2e',
  accentColor: '#e94560',

  // Cover
  coverTitle: 'Design Proposal',
  coverSubtitle: 'Interior Design Services',
  coverDate: new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  }),

  // About
  aboutTitle: 'About Crafted',
  aboutBody:
    'We are a design studio specializing in creating beautiful, functional spaces that reflect your unique style and vision. Our team of experienced designers brings creativity and precision to every project.',
  aboutHighlights: [
    '50+ projects completed',
    'Award-winning design team',
    'End-to-end project management',
    'Sustainable design practices',
  ],

  // Services
  servicesTitle: 'Our Services',
  services: [
    {
      name: 'Interior Design',
      description: 'Full-service interior design from concept to completion',
    },
    {
      name: 'Space Planning',
      description: 'Optimized layouts that maximize your space potential',
    },
    {
      name: '3D Visualization',
      description: 'Photorealistic renders to preview your space before construction',
    },
    {
      name: 'Project Management',
      description: 'Seamless coordination of all trades and deliveries',
    },
  ],

  // Project Details
  projectDetailsTitle: 'Project Details',
  projectName: 'Living Space Redesign',
  projectDescription:
    'A comprehensive redesign of the living areas, focused on creating an open, inviting atmosphere that balances modern aesthetics with comfort and functionality.',
  projectObjectives: [
    'Create an open-plan living area',
    'Maximize natural lighting',
    'Incorporate sustainable materials',
    'Design for entertaining and daily living',
  ],

  // Overview
  overviewTitle: 'Project Overview',
  overviewBody:
    'This project encompasses a full transformation of your living space, bringing together thoughtful design principles with your personal style preferences.',
  overviewKeyPoints: [
    'Contemporary design with warm accents',
    'Custom furniture selections',
    'Lighting design plan',
    'Material and finish specifications',
  ],

  // Scope
  scopeTitle: 'Scope of Work',
  scopeItems: [
    {
      title: 'Concept Development',
      description: 'Mood boards, color palettes, and initial design concepts',
      included: true,
    },
    {
      title: 'Detailed Design',
      description: 'Floor plans, elevations, and 3D visualizations',
      included: true,
    },
    {
      title: 'Procurement',
      description: 'Sourcing and ordering of all furniture and materials',
      included: true,
    },
    {
      title: 'Installation',
      description: 'On-site coordination and final styling',
      included: true,
    },
  ],

  // Timeline
  timelineTitle: 'Project Timeline',
  milestones: [
    {
      phase: 'Discovery & Brief',
      description: 'Initial consultation and requirements gathering',
      duration: '1 week',
    },
    {
      phase: 'Concept Design',
      description: 'Mood boards, concepts, and initial presentations',
      duration: '2 weeks',
    },
    {
      phase: 'Design Development',
      description: 'Detailed plans, 3D renders, and material selections',
      duration: '3 weeks',
    },
    {
      phase: 'Implementation',
      description: 'Procurement, installation, and final styling',
      duration: '4 weeks',
    },
  ],

  // Pricing
  pricingTitle: 'Investment',
  pricingItems: [
    {
      item: 'Design Fee',
      description: 'Concept through to detailed design documentation',
      price: '$5,000',
    },
    {
      item: 'Project Management',
      description: 'Coordination of all trades and procurement',
      price: '$2,500',
    },
    {
      item: '3D Visualization',
      description: 'Photorealistic renders of key spaces',
      price: '$1,500',
    },
  ],
  pricingTotal: '$9,000',
  pricingNotes:
    'Excludes furniture, fixtures, and construction costs. 50% deposit required to commence.',

  // Back Cover
  backCoverMessage: "Let's create something beautiful together.",
  contactEmail: 'hello@crafted.design',
  contactPhone: '+61 400 000 000',
  contactWebsite: 'www.crafted.design',
}
