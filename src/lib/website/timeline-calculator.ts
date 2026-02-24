export interface Milestone {
  id: string
  title: string
  description: string
  daysFromStart: number
  status: 'pending' | 'in_progress' | 'completed'
}

export interface TimelineResult {
  milestones: Milestone[]
  estimatedDays: number
  creditsCost: number
}

const BASE_CREDITS = 40
const SECTION_CREDIT_COST = 2
const BASE_SECTIONS = 8

export function calculateTimeline(
  sectionCount: number,
  complexity: 'simple' | 'standard' | 'complex' = 'standard'
): TimelineResult {
  const complexityMultiplier = complexity === 'simple' ? 0.8 : complexity === 'complex' ? 1.4 : 1
  const baseDays = Math.ceil(7 * complexityMultiplier)

  const milestones: Milestone[] = [
    {
      id: 'skeleton-approved',
      title: 'Skeleton Approved',
      description: 'Website structure and sections finalized',
      daysFromStart: 0,
      status: 'completed',
    },
    {
      id: 'first-draft',
      title: 'First Draft',
      description: 'Initial design with dummy content delivered as a preview link',
      daysFromStart: Math.ceil(baseDays * 0.4),
      status: 'pending',
    },
    {
      id: 'feedback-window',
      title: 'Feedback Window',
      description: '48 hours to review and provide feedback on the first draft',
      daysFromStart: Math.ceil(baseDays * 0.4) + 2,
      status: 'pending',
    },
    {
      id: 'revision',
      title: 'Revision',
      description: 'Updated design based on your feedback',
      daysFromStart: Math.ceil(baseDays * 0.7),
      status: 'pending',
    },
    {
      id: 'content-upload',
      title: 'Content Upload',
      description: '48 hours to upload final content and assets',
      daysFromStart: Math.ceil(baseDays * 0.7) + 2,
      status: 'pending',
    },
    {
      id: 'final-delivery',
      title: 'Final Delivery',
      description: 'Polished website ready for launch',
      daysFromStart: baseDays,
      status: 'pending',
    },
  ]

  const extraSections = Math.max(0, sectionCount - BASE_SECTIONS)
  const creditsCost = BASE_CREDITS + extraSections * SECTION_CREDIT_COST

  return {
    milestones,
    estimatedDays: baseDays,
    creditsCost,
  }
}

export function getEstimatedDeliveryDate(startDate: Date, estimatedDays: number): Date {
  const delivery = new Date(startDate)
  delivery.setDate(delivery.getDate() + estimatedDays)
  return delivery
}
