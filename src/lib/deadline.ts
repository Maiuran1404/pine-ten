/**
 * Deadline calculation utilities for tasks.
 * Handles delivery time computation, artist deadlines, and revision extensions.
 */

import { deliveryDaysMatrix, urgencyMultipliers, revisionExtensionDays } from '@/lib/config'

/**
 * Calculate the number of business days for delivery based on category, complexity, urgency, and quantity.
 */
export function calculateDeliveryDays(
  categorySlug: string | null,
  complexity: string,
  urgency: string,
  quantity: number = 1
): number {
  // Look up base days from matrix, default to 3 if not found
  const categoryMatrix = categorySlug ? deliveryDaysMatrix[categorySlug] : null
  const baseDays = categoryMatrix?.[complexity] ?? 3

  // Apply urgency multiplier
  const multiplier = urgencyMultipliers[urgency] ?? 1
  let days = Math.ceil(baseDays * multiplier)

  // Add 1 business day per 3 extra items beyond the first
  if (quantity > 1) {
    days += Math.floor((quantity - 1) / 3)
  }

  // Minimum 1 business day
  return Math.max(days, 1)
}

/**
 * Calculate a deadline Date from now, skipping weekends.
 */
export function calculateDeadlineFromNow(businessDays: number): Date {
  const date = new Date()
  let daysAdded = 0
  while (daysAdded < businessDays) {
    date.setDate(date.getDate() + 1)
    const dayOfWeek = date.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++
    }
  }
  // Set to end of business day (6 PM)
  date.setHours(18, 0, 0, 0)
  return date
}

/**
 * Calculate the artist deadline at 50% of the window between assignedAt and clientDeadline.
 * Falls back to estimatedHours if no client deadline is set.
 */
export function calculateArtistDeadline(
  assignedAt: string | Date | null,
  clientDeadline: string | Date | null,
  estimatedHours?: string | number | null
): Date | null {
  if (!assignedAt) return null

  const assignedDate = new Date(assignedAt)

  if (clientDeadline) {
    const deadlineDate = new Date(clientDeadline)
    const totalMs = deadlineDate.getTime() - assignedDate.getTime()
    return new Date(assignedDate.getTime() + totalMs * 0.5)
  }

  // Fallback: use estimated hours
  if (estimatedHours) {
    const hours = typeof estimatedHours === 'string' ? parseFloat(estimatedHours) : estimatedHours
    if (!isNaN(hours)) {
      const estMs = hours * 60 * 60 * 1000
      return new Date(assignedDate.getTime() + estMs)
    }
  }

  return null
}

/**
 * Calculate the number of business days to add for a revision based on task complexity.
 */
export function calculateRevisionExtension(complexity: string): number {
  return revisionExtensionDays[complexity] ?? 2
}

/**
 * Extend a deadline by a given number of business days, skipping weekends.
 */
export function extendDeadline(currentDeadline: string | Date, businessDays: number): Date {
  const date = new Date(currentDeadline)
  let daysAdded = 0
  while (daysAdded < businessDays) {
    date.setDate(date.getDate() + 1)
    const dayOfWeek = date.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++
    }
  }
  return date
}
