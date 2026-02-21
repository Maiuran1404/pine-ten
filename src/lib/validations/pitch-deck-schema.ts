import { z } from 'zod'

export const projectDetailColumnSchema = z.object({
  title: z.string().min(1, 'Column title is required'),
  description: z.string().min(1, 'Column description is required'),
})

export const scopeCategorySchema = z.object({
  title: z.string().min(1, 'Category title is required'),
  items: z.array(z.string()),
})

export const milestoneSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  description: z.string().min(1, 'Description is required'),
})

export const pricingCardSchema = z.object({
  label: z.string(),
  price: z.string().min(1, 'Price is required'),
  priceDescription: z.string(),
  ctaText: z.string(),
  includedItems: z.array(z.string()),
})

export const pitchDeckSchema = z.object({
  // Global
  clientName: z.string().min(1, 'Client name is required'),
  primaryColor: z.string(),
  accentColor: z.string(),

  // Cover (Slide 1)
  coverDate: z.string(),

  // About (Slide 3)
  aboutTitle: z.string(),
  aboutBody: z.string(),

  // Project Details (Slide 4)
  projectDetailsTitle: z.string(),
  projectDetailsColumns: z.array(projectDetailColumnSchema),

  // Overview (Slide 5)
  overviewTitle: z.string(),
  overviewBody: z.string(),

  // Scope (Slide 6)
  scopeTitle: z.string(),
  scopeCategories: z.array(scopeCategorySchema),

  // Timeline (Slide 7)
  timelineTitle: z.string(),
  milestones: z.array(milestoneSchema),

  // Pricing (Slide 8)
  pricingTitle: z.string(),
  pricingSubtitle: z.string(),
  pricingCards: z.array(pricingCardSchema),

  // Back Cover (Slide 9)
  backCoverMessage: z.string(),
  backCoverBody: z.string(),
  contactName: z.string(),
  contactEmail: z.string(),
  contactPhone: z.string(),
  contactWebsite: z.string(),
})

export type PitchDeckFormData = z.infer<typeof pitchDeckSchema>
export type ProjectDetailColumn = z.infer<typeof projectDetailColumnSchema>
export type ScopeCategory = z.infer<typeof scopeCategorySchema>
export type Milestone = z.infer<typeof milestoneSchema>
export type PricingCard = z.infer<typeof pricingCardSchema>
