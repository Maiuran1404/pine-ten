import { z } from 'zod'

export const serviceItemSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  description: z.string().min(1, 'Service description is required'),
})

export const scopeItemSchema = z.object({
  title: z.string().min(1, 'Scope item title is required'),
  description: z.string().min(1, 'Scope item description is required'),
  included: z.boolean(),
})

export const milestoneSchema = z.object({
  phase: z.string().min(1, 'Phase name is required'),
  description: z.string().min(1, 'Phase description is required'),
  duration: z.string().min(1, 'Duration is required'),
})

export const pricingItemSchema = z.object({
  item: z.string().min(1, 'Item name is required'),
  description: z.string().min(1, 'Item description is required'),
  price: z.string().min(1, 'Price is required'),
})

export const pitchDeckSchema = z.object({
  // Global
  clientName: z.string().min(1, 'Client name is required'),
  primaryColor: z.string(),
  accentColor: z.string(),

  // Cover (Slide 1)
  coverTitle: z.string().min(1, 'Cover title is required'),
  coverSubtitle: z.string(),
  coverDate: z.string(),

  // About (Slide 2)
  aboutTitle: z.string(),
  aboutBody: z.string(),
  aboutHighlights: z.array(z.string()),

  // Services (Slide 3)
  servicesTitle: z.string(),
  services: z.array(serviceItemSchema),

  // Project Details (Slide 4)
  projectDetailsTitle: z.string(),
  projectName: z.string(),
  projectDescription: z.string(),
  projectObjectives: z.array(z.string()),

  // Overview (Slide 5)
  overviewTitle: z.string(),
  overviewBody: z.string(),
  overviewKeyPoints: z.array(z.string()),

  // Scope (Slide 6)
  scopeTitle: z.string(),
  scopeItems: z.array(scopeItemSchema),

  // Timeline (Slide 7)
  timelineTitle: z.string(),
  milestones: z.array(milestoneSchema),

  // Pricing (Slide 8)
  pricingTitle: z.string(),
  pricingItems: z.array(pricingItemSchema),
  pricingTotal: z.string(),
  pricingNotes: z.string(),

  // Back Cover (Slide 9)
  backCoverMessage: z.string(),
  contactEmail: z.string(),
  contactPhone: z.string(),
  contactWebsite: z.string(),
})

export type PitchDeckFormData = z.infer<typeof pitchDeckSchema>
export type ServiceItem = z.infer<typeof serviceItemSchema>
export type ScopeItem = z.infer<typeof scopeItemSchema>
export type Milestone = z.infer<typeof milestoneSchema>
export type PricingItem = z.infer<typeof pricingItemSchema>
