import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

const mockGetSession = vi.fn()
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

vi.mock('@/lib/errors', () => ({
  Errors: {
    unauthorized: (msg: string) => {
      const err = new Error(msg || 'Unauthorized')
      ;(err as unknown as Record<string, unknown>).statusCode = 401
      return err
    },
    forbidden: (msg: string) => {
      const err = new Error(msg || 'Insufficient permissions')
      ;(err as unknown as Record<string, unknown>).statusCode = 403
      return err
    },
  },
}))

const {
  requireAuth,
  requireRole,
  requireAdmin,
  requireFreelancer,
  requireClient,
  requireAdminOrFreelancer,
  requireOwnerOrAdmin,
  requireApprovedFreelancer,
} = await import('./require-auth')

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns session when user is authenticated', async () => {
    const mockUser = { id: 'user-1', name: 'Test', email: 'test@test.com', role: 'CLIENT' }
    mockGetSession.mockResolvedValueOnce({ user: mockUser })

    const result = await requireAuth()
    expect(result.user).toEqual(mockUser)
  })

  it('throws when session is null', async () => {
    mockGetSession.mockResolvedValueOnce(null)
    await expect(requireAuth()).rejects.toThrow('Authentication required')
  })

  it('throws when session.user is null', async () => {
    mockGetSession.mockResolvedValueOnce({ user: null })
    await expect(requireAuth()).rejects.toThrow('Authentication required')
  })
})

describe('requireRole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows user with matching role', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'u1', name: 'Admin', email: 'a@b.com', role: 'ADMIN' },
    })
    const result = await requireRole('ADMIN')
    expect(result.user.role).toBe('ADMIN')
  })

  it('allows when user has one of multiple allowed roles', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'u1', name: 'FL', email: 'f@b.com', role: 'FREELANCER' },
    })
    const result = await requireRole('ADMIN', 'FREELANCER')
    expect(result.user.role).toBe('FREELANCER')
  })

  it('throws when user role does not match', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'u1', name: 'Client', email: 'c@b.com', role: 'CLIENT' },
    })
    await expect(requireRole('ADMIN')).rejects.toThrow('roles')
  })
})

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows admin users', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'u1', name: 'Admin', email: 'a@b.com', role: 'ADMIN' },
    })
    const result = await requireAdmin()
    expect(result.user.role).toBe('ADMIN')
  })

  it('rejects non-admin users', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'u1', name: 'Client', email: 'c@b.com', role: 'CLIENT' },
    })
    await expect(requireAdmin()).rejects.toThrow()
  })
})

describe('requireFreelancer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows freelancer users', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'u1', name: 'FL', email: 'f@b.com', role: 'FREELANCER' },
    })
    const result = await requireFreelancer()
    expect(result.user.role).toBe('FREELANCER')
  })
})

describe('requireClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows client users', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'u1', name: 'Client', email: 'c@b.com', role: 'CLIENT' },
    })
    const result = await requireClient()
    expect(result.user.role).toBe('CLIENT')
  })
})

describe('requireAdminOrFreelancer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows admin users', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'u1', name: 'Admin', email: 'a@b.com', role: 'ADMIN' },
    })
    const result = await requireAdminOrFreelancer()
    expect(result.user.role).toBe('ADMIN')
  })

  it('allows freelancer users', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'u1', name: 'FL', email: 'f@b.com', role: 'FREELANCER' },
    })
    const result = await requireAdminOrFreelancer()
    expect(result.user.role).toBe('FREELANCER')
  })

  it('rejects client users', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'u1', name: 'Client', email: 'c@b.com', role: 'CLIENT' },
    })
    await expect(requireAdminOrFreelancer()).rejects.toThrow()
  })
})

describe('requireOwnerOrAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows the resource owner', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'user-1', name: 'Owner', email: 'o@b.com', role: 'CLIENT' },
    })
    const result = await requireOwnerOrAdmin('user-1')
    expect(result.user.id).toBe('user-1')
  })

  it('allows admin even if not the owner', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'admin-1', name: 'Admin', email: 'a@b.com', role: 'ADMIN' },
    })
    const result = await requireOwnerOrAdmin('user-1')
    expect(result.user.id).toBe('admin-1')
  })

  it('rejects non-owner non-admin', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'other-1', name: 'Other', email: 'other@b.com', role: 'CLIENT' },
    })
    await expect(requireOwnerOrAdmin('user-1')).rejects.toThrow('permission')
  })
})

describe('requireApprovedFreelancer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows approved freelancers', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: {
        id: 'u1',
        name: 'FL',
        email: 'f@b.com',
        role: 'FREELANCER',
        freelancerApproved: true,
      },
    })
    const result = await requireApprovedFreelancer()
    expect(result.user.freelancerApproved).toBe(true)
  })

  it('rejects unapproved freelancers', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: {
        id: 'u1',
        name: 'FL',
        email: 'f@b.com',
        role: 'FREELANCER',
        freelancerApproved: false,
      },
    })
    await expect(requireApprovedFreelancer()).rejects.toThrow('pending approval')
  })
})
