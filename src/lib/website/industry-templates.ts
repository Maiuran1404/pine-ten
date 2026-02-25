/**
 * Shared industry template definitions for website flows.
 *
 * Used by both the website-flow skeleton phase (UI) and the
 * briefing prompt builder (AI) so the list stays in sync.
 */

export { getDefaultSections, getSectionTemplate } from './section-templates'

// =============================================================================
// INDUSTRY OPTIONS
// =============================================================================

export const INDUSTRY_OPTIONS = [
  { value: 'law-firm', label: 'Law Firm' },
  { value: 'saas', label: 'SaaS' },
  { value: 'agency', label: 'Agency' },
  { value: 'ecommerce', label: 'E-Commerce' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'finance', label: 'Finance' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'education', label: 'Education' },
] as const

// =============================================================================
// TYPES
// =============================================================================

export type IndustryOption = (typeof INDUSTRY_OPTIONS)[number]
