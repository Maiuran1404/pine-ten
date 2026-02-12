import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  cn,
  calculateWorkingDeadline,
  getTaskProgressPercent,
  getTimeProgressPercent,
  getDeadlineUrgency,
  formatTimeRemaining,
} from './utils'

describe('cn (classnames)', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    expect(cn('base', true && 'active')).toBe('base active')
    expect(cn('base', false && 'active')).toBe('base')
  })

  it('should merge tailwind classes properly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('should handle arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })

  it('should handle objects', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })

  it('should handle undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
  })

  it('should handle empty strings', () => {
    expect(cn('foo', '', 'bar')).toBe('foo bar')
  })
})

describe('calculateWorkingDeadline', () => {
  it('should return null if assignedAt is null', () => {
    expect(calculateWorkingDeadline(null, '2025-12-31T00:00:00Z')).toBeNull()
  })

  it('should return null if deadline is null', () => {
    expect(calculateWorkingDeadline('2025-01-01T00:00:00Z', null)).toBeNull()
  })

  it('should return null if both are null', () => {
    expect(calculateWorkingDeadline(null, null)).toBeNull()
  })

  it('should calculate 70% of the time window', () => {
    const assigned = new Date('2025-01-01T00:00:00Z')
    const deadline = new Date('2025-01-11T00:00:00Z') // 10 days later
    const result = calculateWorkingDeadline(assigned.toISOString(), deadline.toISOString())

    expect(result).not.toBeNull()
    // 70% of 10 days = 7 days
    const expectedDate = new Date('2025-01-08T00:00:00Z')
    expect(result!.getTime()).toBe(expectedDate.getTime())
  })

  it('should accept Date objects', () => {
    const assigned = new Date('2025-01-01T00:00:00Z')
    const deadline = new Date('2025-01-11T00:00:00Z')
    const result = calculateWorkingDeadline(assigned, deadline)
    expect(result).not.toBeNull()
  })
})

describe('getTaskProgressPercent', () => {
  it('should return correct progress for all statuses', () => {
    expect(getTaskProgressPercent('PENDING')).toBe(0)
    expect(getTaskProgressPercent('ASSIGNED')).toBe(15)
    expect(getTaskProgressPercent('IN_PROGRESS')).toBe(40)
    expect(getTaskProgressPercent('IN_REVIEW')).toBe(70)
    expect(getTaskProgressPercent('REVISION_REQUESTED')).toBe(55)
    expect(getTaskProgressPercent('COMPLETED')).toBe(100)
    expect(getTaskProgressPercent('CANCELLED')).toBe(0)
  })

  it('should return 0 for unknown statuses', () => {
    expect(getTaskProgressPercent('UNKNOWN')).toBe(0)
    expect(getTaskProgressPercent('')).toBe(0)
  })
})

describe('getTimeProgressPercent', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return 0 if assignedAt is null', () => {
    expect(getTimeProgressPercent(null, '2025-12-31T00:00:00Z')).toBe(0)
  })

  it('should return 0 if deadline is null', () => {
    expect(getTimeProgressPercent('2025-01-01T00:00:00Z', null)).toBe(0)
  })

  it('should return correct percentage at midpoint', () => {
    const assigned = new Date('2025-01-01T00:00:00Z')
    const deadline = new Date('2025-01-11T00:00:00Z')
    // Set now to exactly midpoint (5 days in)
    vi.setSystemTime(new Date('2025-01-06T00:00:00Z'))

    const result = getTimeProgressPercent(assigned.toISOString(), deadline.toISOString())
    expect(result).toBe(50)
  })

  it('should return 100 when past deadline', () => {
    const assigned = new Date('2025-01-01T00:00:00Z')
    const deadline = new Date('2025-01-11T00:00:00Z')
    vi.setSystemTime(new Date('2025-01-20T00:00:00Z'))

    const result = getTimeProgressPercent(assigned.toISOString(), deadline.toISOString())
    expect(result).toBe(100)
  })

  it('should return 0 if now is before assignedAt', () => {
    const assigned = new Date('2025-02-01T00:00:00Z')
    const deadline = new Date('2025-02-11T00:00:00Z')
    vi.setSystemTime(new Date('2025-01-15T00:00:00Z'))

    const result = getTimeProgressPercent(assigned.toISOString(), deadline.toISOString())
    expect(result).toBe(0)
  })

  it('should return 100 if total time is zero', () => {
    const sameDate = '2025-01-01T00:00:00Z'
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'))

    const result = getTimeProgressPercent(sameDate, sameDate)
    expect(result).toBe(100)
  })
})

describe('getDeadlineUrgency', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return null if deadline is null', () => {
    expect(getDeadlineUrgency(null, null)).toBeNull()
  })

  it('should return overdue if past deadline', () => {
    vi.setSystemTime(new Date('2025-01-15T00:00:00Z'))
    expect(getDeadlineUrgency('2025-01-10T00:00:00Z', null)).toBe('overdue')
  })

  it('should return urgent if past working deadline but before real deadline', () => {
    vi.setSystemTime(new Date('2025-01-09T00:00:00Z'))
    const workingDeadline = new Date('2025-01-08T00:00:00Z')
    expect(getDeadlineUrgency('2025-01-15T00:00:00Z', workingDeadline)).toBe('urgent')
  })

  it('should return warning if within 24h of working deadline', () => {
    const workingDeadline = new Date('2025-01-10T12:00:00Z')
    vi.setSystemTime(new Date('2025-01-10T00:00:00Z')) // 12h before working deadline

    expect(getDeadlineUrgency('2025-01-15T00:00:00Z', workingDeadline)).toBe('warning')
  })

  it('should return safe if well before both deadlines', () => {
    const workingDeadline = new Date('2025-01-20T00:00:00Z')
    vi.setSystemTime(new Date('2025-01-10T00:00:00Z')) // 10 days before working deadline

    expect(getDeadlineUrgency('2025-01-25T00:00:00Z', workingDeadline)).toBe('safe')
  })

  it('should return safe if no working deadline and before real deadline', () => {
    vi.setSystemTime(new Date('2025-01-05T00:00:00Z'))
    expect(getDeadlineUrgency('2025-01-15T00:00:00Z', null)).toBe('safe')
  })
})

describe('formatTimeRemaining', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return empty string for null deadline', () => {
    expect(formatTimeRemaining(null)).toBe('')
  })

  it('should show days overdue', () => {
    vi.setSystemTime(new Date('2025-01-15T00:00:00Z'))
    expect(formatTimeRemaining('2025-01-10T00:00:00Z')).toBe('5d overdue')
  })

  it('should show overdue today if less than a day overdue', () => {
    vi.setSystemTime(new Date('2025-01-10T12:00:00Z'))
    expect(formatTimeRemaining('2025-01-10T00:00:00Z')).toBe('Overdue today')
  })

  it('should show hours left when less than a day', () => {
    vi.setSystemTime(new Date('2025-01-10T00:00:00Z'))
    expect(formatTimeRemaining('2025-01-10T12:00:00Z')).toBe('12h left')
  })

  it('should show less than 1h when very close', () => {
    vi.setSystemTime(new Date('2025-01-10T23:30:00Z'))
    expect(formatTimeRemaining('2025-01-10T23:59:59Z')).toBe('Less than 1h')
  })

  it('should show days and hours for multi-day deadlines', () => {
    vi.setSystemTime(new Date('2025-01-10T00:00:00Z'))
    expect(formatTimeRemaining('2025-01-11T12:00:00Z')).toBe('1d 12h left')
  })

  it('should show days left for multi-day deadlines', () => {
    vi.setSystemTime(new Date('2025-01-10T00:00:00Z'))
    expect(formatTimeRemaining('2025-01-15T00:00:00Z')).toBe('5d left')
  })
})
