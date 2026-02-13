import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate the "working deadline" for artists - 70% of the actual deadline
 * This gives buffer time for review and revisions before the real deadline
 */
export function calculateWorkingDeadline(
  assignedAt: string | Date | null,
  deadline: string | Date | null
): Date | null {
  if (!assignedAt || !deadline) return null

  const assignedDate = new Date(assignedAt)
  const deadlineDate = new Date(deadline)

  // Calculate 70% of the total time
  const totalTimeMs = deadlineDate.getTime() - assignedDate.getTime()
  const workingTimeMs = totalTimeMs * 0.7

  return new Date(assignedDate.getTime() + workingTimeMs)
}

/**
 * Calculate task progress as a percentage based on status workflow
 */
export function getTaskProgressPercent(status: string): number {
  const progressMap: Record<string, number> = {
    PENDING: 0,
    ASSIGNED: 15,
    IN_PROGRESS: 40,
    IN_REVIEW: 70,
    REVISION_REQUESTED: 55,
    COMPLETED: 100,
    CANCELLED: 0,
  }
  return progressMap[status] ?? 0
}

/**
 * Calculate time progress as a percentage (how much time has elapsed)
 */
export function getTimeProgressPercent(
  assignedAt: string | Date | null,
  deadline: string | Date | null
): number {
  if (!assignedAt || !deadline) return 0

  const assignedDate = new Date(assignedAt)
  const deadlineDate = new Date(deadline)
  const now = new Date()

  const totalTimeMs = deadlineDate.getTime() - assignedDate.getTime()
  const elapsedTimeMs = now.getTime() - assignedDate.getTime()

  if (totalTimeMs <= 0) return 100

  const percent = (elapsedTimeMs / totalTimeMs) * 100
  return Math.min(Math.max(percent, 0), 100)
}

/**
 * Get deadline urgency status for visual indicators
 */
export function getDeadlineUrgency(
  deadline: string | Date | null,
  workingDeadline: Date | null
): 'overdue' | 'urgent' | 'warning' | 'safe' | null {
  if (!deadline) return null

  const now = new Date()
  const deadlineDate = new Date(deadline)

  if (now > deadlineDate) return 'overdue'

  // If past working deadline but before real deadline
  if (workingDeadline && now > workingDeadline) return 'urgent'

  // If within 24 hours of working deadline
  if (workingDeadline) {
    const hoursToWorking = (workingDeadline.getTime() - now.getTime()) / (1000 * 60 * 60)
    if (hoursToWorking <= 24) return 'warning'
  }

  return 'safe'
}

/**
 * Format relative time remaining
 */
export function formatTimeRemaining(deadline: string | Date | null): string {
  if (!deadline) return ''

  const now = new Date()
  const deadlineDate = new Date(deadline)
  const diffMs = deadlineDate.getTime() - now.getTime()

  if (diffMs < 0) {
    const overdueDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24))
    if (overdueDays === 0) return 'Overdue today'
    return `${overdueDays}d overdue`
  }

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (diffDays === 0) {
    if (diffHours === 0) return 'Less than 1h'
    return `${diffHours}h left`
  }
  if (diffDays === 1) return `1d ${diffHours}h left`
  return `${diffDays}d left`
}
