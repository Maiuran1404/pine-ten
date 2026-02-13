import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
const mockInsert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) })

vi.mock('@/db', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  auditLogs: Symbol('auditLogs'),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn((name: string) => {
      if (name === 'x-forwarded-for') return '1.2.3.4'
      if (name === 'user-agent') return 'test-agent'
      return null
    }),
  }),
}))

const { audit, auditAsync, actorFromUser, auditHelpers } = await import('./audit')

describe('actorFromUser', () => {
  it('should create actor from user with role', () => {
    const actor = actorFromUser({ id: 'u1', email: 'test@test.com', role: 'ADMIN' })
    expect(actor).toEqual({ id: 'u1', email: 'test@test.com', role: 'ADMIN' })
  })

  it('should default role to unknown when not provided', () => {
    const actor = actorFromUser({ id: 'u2', email: 'user@test.com' })
    expect(actor).toEqual({ id: 'u2', email: 'user@test.com', role: 'unknown' })
  })
})

describe('audit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) })
  })

  it('should insert an audit log entry', async () => {
    const actor = { id: 'u1', email: 'admin@test.com', role: 'ADMIN' }

    await audit({
      actor,
      action: 'FREELANCER_APPROVE',
      resourceType: 'freelancer',
      resourceId: 'f1',
      details: { reason: 'Good portfolio' },
      endpoint: 'POST /api/admin/freelancers/approve',
    })

    expect(mockInsert).toHaveBeenCalled()
    const valuesCall = mockInsert.mock.results[0].value.values
    expect(valuesCall).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'u1',
        actorEmail: 'admin@test.com',
        actorRole: 'ADMIN',
        action: 'FREELANCER_APPROVE',
        resourceType: 'freelancer',
        resourceId: 'f1',
        ipAddress: '1.2.3.4',
        userAgent: 'test-agent',
      })
    )
  })

  it('should handle null actor for system actions', async () => {
    await audit({
      actor: null,
      action: 'SECURITY_ALERT',
      resourceType: 'system',
    })

    const valuesCall = mockInsert.mock.results[0].value.values
    expect(valuesCall).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: null,
        actorEmail: null,
        actorRole: null,
      })
    )
  })

  it('should default success to true', async () => {
    await audit({
      actor: { id: 'u1', email: 'a@b.com', role: 'ADMIN' },
      action: 'TASK_CREATE',
      resourceType: 'task',
    })

    const valuesCall = mockInsert.mock.results[0].value.values
    expect(valuesCall).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })

  it('should not throw when DB insert fails', async () => {
    mockInsert.mockReturnValue({
      values: vi.fn().mockRejectedValue(new Error('DB down')),
    })

    await expect(
      audit({
        actor: { id: 'u1', email: 'a@b.com', role: 'ADMIN' },
        action: 'TASK_CREATE',
        resourceType: 'task',
      })
    ).resolves.toBeUndefined()
  })
})

describe('auditAsync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) })
  })

  it('should fire and forget without throwing', () => {
    expect(() =>
      auditAsync({
        actor: { id: 'u1', email: 'a@b.com', role: 'ADMIN' },
        action: 'TASK_CREATE',
        resourceType: 'task',
      })
    ).not.toThrow()
  })
})

describe('auditHelpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) })
  })

  const actor = { id: 'u1', email: 'admin@test.com', role: 'ADMIN' }

  it('databaseAccess should log with correct action', async () => {
    await auditHelpers.databaseAccess(actor, 'users', 'GET /api/admin/db')

    const valuesCall = mockInsert.mock.results[0].value.values
    expect(valuesCall).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ADMIN_DATABASE_ACCESS',
        resourceType: 'database',
        resourceId: 'users',
      })
    )
  })

  it('freelancerApprove should log with correct action', async () => {
    await auditHelpers.freelancerApprove(actor, 'f1', 'freelancer@test.com', 'POST /api/approve')

    const valuesCall = mockInsert.mock.results[0].value.values
    expect(valuesCall).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'FREELANCER_APPROVE',
        resourceType: 'freelancer',
        resourceId: 'f1',
      })
    )
  })

  it('settingsUpdate should log previous and new values', async () => {
    await auditHelpers.settingsUpdate(actor, 'creditPrice', 49, 59, 'POST /api/admin/settings')

    const valuesCall = mockInsert.mock.results[0].value.values
    expect(valuesCall).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SETTINGS_UPDATE',
        resourceType: 'settings',
        resourceId: 'creditPrice',
        previousValue: 49,
        newValue: 59,
      })
    )
  })

  it('loginAttempt should handle failed login with null actor', async () => {
    await auditHelpers.loginAttempt(null, 'bad@test.com', false, 'Wrong password')

    const valuesCall = mockInsert.mock.results[0].value.values
    expect(valuesCall).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: null,
        action: 'AUTH_FAILED_LOGIN',
        success: false,
        errorMessage: 'Wrong password',
      })
    )
  })

  it('loginAttempt should handle successful login', async () => {
    await auditHelpers.loginAttempt('u1', 'user@test.com', true)

    const valuesCall = mockInsert.mock.results[0].value.values
    expect(valuesCall).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'u1',
        action: 'AUTH_LOGIN',
        success: true,
      })
    )
  })

  it('couponCreate should log coupon details', async () => {
    await auditHelpers.couponCreate(actor, 'c1', 'SUMMER20', 'POST /api/admin/coupons')

    const valuesCall = mockInsert.mock.results[0].value.values
    expect(valuesCall).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'COUPON_CREATE',
        resourceType: 'coupon',
        resourceId: 'c1',
      })
    )
  })

  it('freelancerBulkAction should log bulk details', async () => {
    await auditHelpers.freelancerBulkAction(
      actor,
      'approve',
      ['f1', 'f2', 'f3'],
      2,
      1,
      'POST /api/admin/freelancers/bulk'
    )

    const valuesCall = mockInsert.mock.results[0].value.values
    expect(valuesCall).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'FREELANCER_BULK_ACTION',
        resourceType: 'freelancer',
      })
    )
  })
})
