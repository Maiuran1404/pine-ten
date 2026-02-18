import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock server-only
vi.mock('server-only', () => ({}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock db
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    query: {},
  },
}))

// Mock schema
vi.mock('@/db/schema', () => ({
  freelancerProfiles: {},
  users: {},
  tasks: {},
  assignmentAlgorithmConfig: {},
  taskOffers: {},
  clientArtistAffinity: {},
}))

import {
  calculateSkillScore,
  calculateTimezoneScore,
  calculateExperienceScore,
  calculateWorkloadScore,
  calculatePerformanceScore,
  calculateMatchScore,
  calculateOfferExpiration,
  detectTaskComplexity,
  detectTaskUrgency,
  isNightHours,
  DEFAULT_CONFIG,
  type AlgorithmConfig as _AlgorithmConfig,
  type ArtistData,
  type TaskData,
} from './assignment-algorithm'

// ============================================
// Helper: create a mock artist
// ============================================
function createArtist(overrides: Partial<ArtistData> = {}): ArtistData {
  return {
    userId: 'artist-1',
    name: 'Test Artist',
    email: 'artist@test.com',
    timezone: 'America/New_York',
    experienceLevel: 'MID',
    rating: 4.0,
    completedTasks: 20,
    acceptanceRate: 90,
    onTimeRate: 85,
    maxConcurrentTasks: 5,
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00',
    acceptsUrgentTasks: true,
    vacationMode: false,
    skills: ['graphic design', 'illustration'],
    specializations: ['static ads'],
    preferredCategories: ['static-ads'],
    ...overrides,
  }
}

function createTask(overrides: Partial<TaskData> = {}): TaskData {
  return {
    id: 'task-1',
    title: 'Test Task',
    complexity: 'INTERMEDIATE',
    urgency: 'STANDARD',
    categorySlug: 'static-ads',
    requiredSkills: ['graphic design'],
    clientId: 'client-1',
    deadline: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================
// DEFAULT_CONFIG
// ============================================
describe('DEFAULT_CONFIG', () => {
  it('weights should sum to 100', () => {
    const { weights } = DEFAULT_CONFIG
    const total =
      weights.skillMatch +
      weights.timezoneFit +
      weights.experienceMatch +
      weights.workloadBalance +
      weights.performanceHistory
    expect(total).toBe(100)
  })

  it('acceptance windows should be in ascending order', () => {
    const { acceptanceWindows } = DEFAULT_CONFIG
    expect(acceptanceWindows.critical).toBeLessThan(acceptanceWindows.urgent)
    expect(acceptanceWindows.urgent).toBeLessThan(acceptanceWindows.standard)
    expect(acceptanceWindows.standard).toBeLessThan(acceptanceWindows.flexible)
  })

  it('experience matrix values should be 0-100', () => {
    for (const complexity of Object.values(DEFAULT_CONFIG.experienceMatrix)) {
      for (const score of Object.values(complexity)) {
        expect(score).toBeGreaterThanOrEqual(0)
        expect(score).toBeLessThanOrEqual(100)
      }
    }
  })
})

// ============================================
// calculateSkillScore
// ============================================
describe('calculateSkillScore', () => {
  it('returns 100 when no skills required', () => {
    expect(calculateSkillScore(['graphic design'], [], DEFAULT_CONFIG)).toBe(100)
  })

  it('returns 100 for perfect match', () => {
    expect(
      calculateSkillScore(
        ['graphic design', 'illustration'],
        ['graphic design', 'illustration'],
        DEFAULT_CONFIG
      )
    ).toBe(100)
  })

  it('returns 50 when half the skills match', () => {
    expect(
      calculateSkillScore(['graphic design'], ['graphic design', 'motion graphics'], DEFAULT_CONFIG)
    ).toBe(50)
  })

  it('returns 0 when no skills match', () => {
    expect(
      calculateSkillScore(['video editing'], ['graphic design', 'illustration'], DEFAULT_CONFIG)
    ).toBe(0)
  })

  it('is case-insensitive', () => {
    expect(calculateSkillScore(['Graphic Design'], ['graphic design'], DEFAULT_CONFIG)).toBe(100)
  })

  it('handles partial string matches', () => {
    // "design" includes "design" (partial matching)
    expect(calculateSkillScore(['graphic design'], ['design'], DEFAULT_CONFIG)).toBe(100)
  })

  it('trims whitespace', () => {
    expect(calculateSkillScore([' graphic design '], ['graphic design'], DEFAULT_CONFIG)).toBe(100)
  })

  it('handles empty artist skills', () => {
    expect(calculateSkillScore([], ['graphic design'], DEFAULT_CONFIG)).toBe(0)
  })
})

// ============================================
// calculateTimezoneScore
// ============================================
describe('calculateTimezoneScore', () => {
  it('returns 50 for null timezone', () => {
    expect(calculateTimezoneScore(null, DEFAULT_CONFIG)).toBe(50)
  })

  it('returns 50 for invalid timezone', () => {
    expect(calculateTimezoneScore('Invalid/Zone', DEFAULT_CONFIG)).toBe(50)
  })

  it('returns a score between peak and night values for valid timezones', () => {
    const score = calculateTimezoneScore('America/New_York', DEFAULT_CONFIG)
    expect(score).toBeGreaterThanOrEqual(DEFAULT_CONFIG.timezoneSettings.nightScore)
    expect(score).toBeLessThanOrEqual(DEFAULT_CONFIG.timezoneSettings.peakScore)
  })

  it('returns peak score during work hours', () => {
    vi.useFakeTimers()
    // Set time to 2pm EST (peak hours)
    vi.setSystemTime(new Date('2024-06-15T14:00:00-04:00'))

    const score = calculateTimezoneScore('America/New_York', DEFAULT_CONFIG)
    expect(score).toBe(DEFAULT_CONFIG.timezoneSettings.peakScore)

    vi.useRealTimers()
  })

  it('returns night score during very late hours', () => {
    vi.useFakeTimers()
    // Set time to 3am EST
    vi.setSystemTime(new Date('2024-06-15T03:00:00-04:00'))

    const score = calculateTimezoneScore('America/New_York', DEFAULT_CONFIG)
    expect(score).toBe(DEFAULT_CONFIG.timezoneSettings.nightScore)

    vi.useRealTimers()
  })
})

// ============================================
// isNightHours
// ============================================
describe('isNightHours', () => {
  it('returns false for null timezone', () => {
    expect(isNightHours(null)).toBe(false)
  })

  it('returns false for invalid timezone', () => {
    expect(isNightHours('Invalid/Zone')).toBe(false)
  })

  it('returns true during night hours (23-7)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T03:00:00-04:00'))

    expect(isNightHours('America/New_York')).toBe(true)

    vi.useRealTimers()
  })

  it('returns false during day hours', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T14:00:00-04:00'))

    expect(isNightHours('America/New_York')).toBe(false)

    vi.useRealTimers()
  })
})

// ============================================
// calculateExperienceScore
// ============================================
describe('calculateExperienceScore', () => {
  it('returns perfect score for matching complexity-experience', () => {
    expect(calculateExperienceScore('MID', 'INTERMEDIATE', DEFAULT_CONFIG)).toBe(100)
    expect(calculateExperienceScore('EXPERT', 'EXPERT', DEFAULT_CONFIG)).toBe(100)
    expect(calculateExperienceScore('JUNIOR', 'SIMPLE', DEFAULT_CONFIG)).toBe(100)
    expect(calculateExperienceScore('SENIOR', 'ADVANCED', DEFAULT_CONFIG)).toBe(100)
  })

  it('returns 0 for JUNIOR on EXPERT tasks', () => {
    expect(calculateExperienceScore('JUNIOR', 'EXPERT', DEFAULT_CONFIG)).toBe(0)
  })

  it('returns reduced score for overqualified artists', () => {
    const expertOnSimple = calculateExperienceScore('EXPERT', 'SIMPLE', DEFAULT_CONFIG)
    const midOnSimple = calculateExperienceScore('MID', 'SIMPLE', DEFAULT_CONFIG)
    expect(expertOnSimple).toBeLessThan(midOnSimple)
  })

  it('returns all values from the matrix correctly', () => {
    for (const complexity of ['SIMPLE', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const) {
      for (const level of ['JUNIOR', 'MID', 'SENIOR', 'EXPERT'] as const) {
        expect(calculateExperienceScore(level, complexity, DEFAULT_CONFIG)).toBe(
          DEFAULT_CONFIG.experienceMatrix[complexity][level]
        )
      }
    }
  })
})

// ============================================
// calculateWorkloadScore
// ============================================
describe('calculateWorkloadScore', () => {
  it('returns 100 for 0 active tasks', () => {
    expect(calculateWorkloadScore(0, DEFAULT_CONFIG)).toBe(100)
  })

  it('decreases by scorePerTask for each active task', () => {
    expect(calculateWorkloadScore(1, DEFAULT_CONFIG)).toBe(80) // 100 - 20
    expect(calculateWorkloadScore(2, DEFAULT_CONFIG)).toBe(60)
    expect(calculateWorkloadScore(3, DEFAULT_CONFIG)).toBe(40)
  })

  it('never goes below 0', () => {
    expect(calculateWorkloadScore(10, DEFAULT_CONFIG)).toBe(0)
    expect(calculateWorkloadScore(100, DEFAULT_CONFIG)).toBe(0)
  })

  it('returns 0 at max active tasks', () => {
    expect(calculateWorkloadScore(5, DEFAULT_CONFIG)).toBe(0)
  })
})

// ============================================
// calculatePerformanceScore
// ============================================
describe('calculatePerformanceScore', () => {
  it('calculates weighted score from rating, onTimeRate, and acceptanceRate', () => {
    // rating=5 → 100*0.5=50, onTime=100*0.3=30, acceptance=100*0.2=20 → 100
    expect(calculatePerformanceScore(5, 100, 100)).toBe(100)
  })

  it('uses defaults when rates are null', () => {
    // rating=4 → 80*0.5=40, onTime=default 80*0.3=24, acceptance=default 80*0.2=16 → 80
    expect(calculatePerformanceScore(4, null, null)).toBe(80)
  })

  it('returns 0 for zero rating and zero rates', () => {
    expect(calculatePerformanceScore(0, 0, 0)).toBe(0)
  })

  it('weighs rating at 50%, onTimeRate at 30%, acceptanceRate at 20%', () => {
    // rating=5 → 100, onTime=0, acceptance=0
    // 100*0.5 + 0*0.3 + 0*0.2 = 50
    expect(calculatePerformanceScore(5, 0, 0)).toBe(50)

    // rating=0, onTime=100, acceptance=0 → 0*0.5 + 100*0.3 + 0*0.2 = 30
    expect(calculatePerformanceScore(0, 100, 0)).toBe(30)

    // rating=0, onTime=0, acceptance=100 → 0*0.5 + 0*0.3 + 100*0.2 = 20
    expect(calculatePerformanceScore(0, 0, 100)).toBe(20)
  })
})

// ============================================
// calculateMatchScore
// ============================================
describe('calculateMatchScore', () => {
  it('returns a composite score for a non-excluded artist', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T14:00:00-04:00'))

    const artist = createArtist()
    const task = createTask()
    const result = calculateMatchScore(artist, task, 1, DEFAULT_CONFIG)

    expect(result.excluded).toBe(false)
    expect(result.totalScore).toBeGreaterThan(0)
    expect(result.totalScore).toBeLessThanOrEqual(100)
    expect(result.breakdown).toHaveProperty('skillScore')
    expect(result.breakdown).toHaveProperty('timezoneScore')
    expect(result.breakdown).toHaveProperty('experienceScore')
    expect(result.breakdown).toHaveProperty('workloadScore')
    expect(result.breakdown).toHaveProperty('performanceScore')

    vi.useRealTimers()
  })

  it('excludes artists on vacation', () => {
    const artist = createArtist({ vacationMode: true })
    const task = createTask()
    const result = calculateMatchScore(artist, task, 0, DEFAULT_CONFIG)

    expect(result.excluded).toBe(true)
    expect(result.exclusionReason).toBe('Artist is on vacation')
    expect(result.totalScore).toBe(-1)
  })

  it('excludes artists below min skill threshold', () => {
    const artist = createArtist({ skills: ['video editing'], specializations: [] })
    const task = createTask({ requiredSkills: ['3d animation', 'motion graphics'] })
    const result = calculateMatchScore(artist, task, 0, DEFAULT_CONFIG)

    expect(result.excluded).toBe(true)
    expect(result.exclusionReason).toContain('Skill score')
    expect(result.exclusionReason).toContain('below threshold')
  })

  it('excludes overloaded artists', () => {
    const artist = createArtist()
    const task = createTask()
    const result = calculateMatchScore(artist, task, 5, DEFAULT_CONFIG) // at max

    expect(result.excluded).toBe(true)
    expect(result.exclusionReason).toContain('max capacity')
  })

  it('excludes artists who dont accept urgent tasks', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T14:00:00-04:00')) // daytime to avoid night-hours exclusion

    const artist = createArtist({ acceptsUrgentTasks: false })
    const task = createTask({ urgency: 'CRITICAL' })
    const result = calculateMatchScore(artist, task, 0, DEFAULT_CONFIG)

    expect(result.excluded).toBe(true)
    expect(result.exclusionReason).toBe('Artist does not accept urgent tasks')

    vi.useRealTimers()
  })

  it('applies category specialization bonus', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T14:00:00-04:00'))

    const artist = createArtist({ preferredCategories: ['static-ads'] })
    const task = createTask({ categorySlug: 'static-ads' })
    const scoreWith = calculateMatchScore(artist, task, 0, DEFAULT_CONFIG)

    const artistNoMatch = createArtist({ preferredCategories: ['video-motion'] })
    const scoreWithout = calculateMatchScore(artistNoMatch, task, 0, DEFAULT_CONFIG)

    expect(scoreWith.totalScore).toBeGreaterThan(scoreWithout.totalScore)

    vi.useRealTimers()
  })

  it('applies favorite artist bonus', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T14:00:00-04:00'))

    // Use an artist with lower scores so the bonus is visible (not capped at 100)
    const artist = createArtist({
      rating: 2.5,
      onTimeRate: 50,
      acceptanceRate: 50,
      preferredCategories: [],
    })
    const task = createTask({ categorySlug: null })
    const withFav = calculateMatchScore(artist, task, 2, DEFAULT_CONFIG, true)
    const withoutFav = calculateMatchScore(artist, task, 2, DEFAULT_CONFIG, false)

    expect(withFav.totalScore).toBeGreaterThan(withoutFav.totalScore)

    vi.useRealTimers()
  })

  it('caps total score at 100', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T14:00:00-04:00'))

    const artist = createArtist({ rating: 5, onTimeRate: 100, acceptanceRate: 100 })
    const task = createTask({ categorySlug: 'static-ads' })

    // With category bonus + favorite bonus, it could exceed 100
    const result = calculateMatchScore(artist, task, 0, DEFAULT_CONFIG, true)
    expect(result.totalScore).toBeLessThanOrEqual(100)

    vi.useRealTimers()
  })

  it('excludes artists during night hours for urgent tasks', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T03:00:00-04:00'))

    const artist = createArtist({ timezone: 'America/New_York' })
    const task = createTask({ urgency: 'URGENT' })
    const result = calculateMatchScore(artist, task, 0, DEFAULT_CONFIG)

    expect(result.excluded).toBe(true)
    expect(result.exclusionReason).toBe('Urgent task during night hours')

    vi.useRealTimers()
  })
})

// ============================================
// calculateOfferExpiration
// ============================================
describe('calculateOfferExpiration', () => {
  it('adds correct minutes for each urgency level', () => {
    vi.useFakeTimers()
    const now = new Date('2024-06-15T12:00:00Z')
    vi.setSystemTime(now)

    const critical = calculateOfferExpiration('CRITICAL', DEFAULT_CONFIG)
    expect(critical.getTime() - now.getTime()).toBe(10 * 60 * 1000)

    const urgent = calculateOfferExpiration('URGENT', DEFAULT_CONFIG)
    expect(urgent.getTime() - now.getTime()).toBe(30 * 60 * 1000)

    const standard = calculateOfferExpiration('STANDARD', DEFAULT_CONFIG)
    expect(standard.getTime() - now.getTime()).toBe(120 * 60 * 1000)

    const flexible = calculateOfferExpiration('FLEXIBLE', DEFAULT_CONFIG)
    expect(flexible.getTime() - now.getTime()).toBe(240 * 60 * 1000)

    vi.useRealTimers()
  })
})

// ============================================
// detectTaskComplexity
// ============================================
describe('detectTaskComplexity', () => {
  it('returns SIMPLE for low-effort tasks', () => {
    expect(detectTaskComplexity(1, 0, 'a simple edit')).toBe('SIMPLE')
    expect(detectTaskComplexity(2, 1, 'basic design')).toBe('SIMPLE')
  })

  it('returns INTERMEDIATE for moderate tasks', () => {
    expect(detectTaskComplexity(4, 2, 'design a banner')).toBe('INTERMEDIATE')
  })

  it('returns ADVANCED for high-effort tasks', () => {
    // 8 hours = +2, 3 skills = +2, no keywords = 0 → score 4 → ADVANCED
    expect(detectTaskComplexity(8, 3, 'design a full set of assets')).toBe('ADVANCED')
  })

  it('returns EXPERT for very high-effort tasks', () => {
    expect(detectTaskComplexity(10, 5, 'complex multi-page 3d animation campaign')).toBe('EXPERT')
  })

  it('detects complexity from description keywords', () => {
    expect(detectTaskComplexity(null, 0, 'create a 3d animation series')).toBe('INTERMEDIATE')
    expect(detectTaskComplexity(null, 0, 'a quick small edit')).toBe('SIMPLE')
  })

  it('handles null estimated hours', () => {
    expect(detectTaskComplexity(null, 0, 'nothing special')).toBe('SIMPLE')
  })

  it('weights skills count', () => {
    const manySkills = detectTaskComplexity(null, 5, 'design task')
    const fewSkills = detectTaskComplexity(null, 1, 'design task')
    expect(['INTERMEDIATE', 'ADVANCED', 'EXPERT']).toContain(manySkills)
    expect(fewSkills).toBe('SIMPLE')
  })
})

// ============================================
// detectTaskUrgency
// ============================================
describe('detectTaskUrgency', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns FLEXIBLE for null deadline', () => {
    expect(detectTaskUrgency(null)).toBe('FLEXIBLE')
  })

  it('returns CRITICAL for deadline within 4 hours', () => {
    const deadline = new Date('2024-06-15T15:00:00Z') // 3 hours from now
    expect(detectTaskUrgency(deadline)).toBe('CRITICAL')
  })

  it('returns URGENT for deadline within 24 hours', () => {
    const deadline = new Date('2024-06-16T06:00:00Z') // 18 hours from now
    expect(detectTaskUrgency(deadline)).toBe('URGENT')
  })

  it('returns STANDARD for deadline within 72 hours', () => {
    const deadline = new Date('2024-06-17T12:00:00Z') // 48 hours from now
    expect(detectTaskUrgency(deadline)).toBe('STANDARD')
  })

  it('returns FLEXIBLE for deadline beyond 72 hours', () => {
    const deadline = new Date('2024-06-20T12:00:00Z') // 5 days from now
    expect(detectTaskUrgency(deadline)).toBe('FLEXIBLE')
  })

  it('returns CRITICAL for deadline exactly at 4 hours', () => {
    const deadline = new Date('2024-06-15T16:00:00Z') // exactly 4 hours
    expect(detectTaskUrgency(deadline)).toBe('CRITICAL')
  })

  it('returns CRITICAL for past deadline', () => {
    const deadline = new Date('2024-06-15T10:00:00Z') // 2 hours ago
    expect(detectTaskUrgency(deadline)).toBe('CRITICAL')
  })
})
