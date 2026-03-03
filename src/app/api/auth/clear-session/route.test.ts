import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockDelete = vi.fn()
const mockCookies = vi.fn()

vi.mock('next/headers', () => ({
  cookies: () => mockCookies(),
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

// Mock auth to simulate authenticated user
const mockGetSession = vi.fn()
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  // Default: authenticated user
  mockGetSession.mockResolvedValue({ user: { id: 'user-1', email: 'test@test.com' } })
})

const { POST } = await import('./route')

describe('POST /api/auth/clear-session', () => {
  it('clears auth-related cookies and returns success', async () => {
    mockCookies.mockResolvedValue({
      getAll: () => [
        { name: 'crafted.session_token', value: 'abc' },
        { name: 'pine_auth', value: 'def' },
        { name: 'unrelated_cookie', value: 'ghi' },
        { name: 'some_session_id', value: 'jkl' },
      ],
      delete: mockDelete,
    })

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('Session cleared')
    // Should clear crafted.session_token, pine_auth, some_session_id
    expect(data.clearedCookies).toContain('crafted.session_token')
    expect(data.clearedCookies).toContain('pine_auth')
    expect(data.clearedCookies).toContain('some_session_id')
    // unrelated_cookie should NOT be cleared
    expect(data.clearedCookies).not.toContain('unrelated_cookie')
  })

  it('returns empty array when no auth cookies exist', async () => {
    mockCookies.mockResolvedValue({
      getAll: () => [{ name: 'random_cookie', value: 'val' }],
      delete: mockDelete,
    })

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.clearedCookies).toEqual([])
  })

  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null)

    mockCookies.mockResolvedValue({
      getAll: () => [],
      delete: mockDelete,
    })

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Not authenticated')
  })
})
