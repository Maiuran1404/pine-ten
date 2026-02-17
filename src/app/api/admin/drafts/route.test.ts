import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

const mockDbSelect = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockDbSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  chatDrafts: { id: 'id', clientId: 'clientId', updatedAt: 'updatedAt' },
  users: { id: 'id', name: 'name', email: 'email', companyId: 'companyId' },
  companies: { id: 'id', name: 'name' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  desc: vi.fn(),
}))

const { GET } = await import('./route')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/admin/drafts', () => {
  it('returns 401 when not admin', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('returns all drafts with client info', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([
              {
                id: 'draft-1',
                title: 'Logo Request',
                clientName: 'Client A',
                clientEmail: 'a@test.com',
                companyName: 'Acme Corp',
                createdAt: new Date(),
              },
            ]),
          }),
        }),
      }),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.drafts).toHaveLength(1)
    expect(data.data.drafts[0].clientName).toBe('Client A')
    expect(data.data.drafts[0].companyName).toBe('Acme Corp')
  })
})
