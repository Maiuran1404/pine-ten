import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockDelete = vi.fn()
const mockGetAll = vi.fn()
const mockCookies = vi.fn()

vi.mock('next/headers', () => ({
  cookies: () => mockCookies(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

const { POST, GET } = await import('./route')

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
})

describe('GET /api/auth/clear-session', () => {
  it('clears cookies and redirects to login', async () => {
    mockCookies.mockResolvedValue({
      getAll: () => [{ name: 'crafted.session_token', value: 'abc' }],
      delete: mockDelete,
    })

    const response = await GET()

    // Should be a redirect
    expect(response.status).toBe(307)
    const location = response.headers.get('location')
    expect(location).toContain('/login')
  })

  it('clears multiple auth cookies before redirecting', async () => {
    mockCookies.mockResolvedValue({
      getAll: () => [
        { name: 'pine_session', value: 'a' },
        { name: 'auth_token', value: 'b' },
      ],
      delete: mockDelete,
    })

    const response = await GET()

    expect(mockDelete).toHaveBeenCalledWith('pine_session')
    expect(mockDelete).toHaveBeenCalledWith('auth_token')
    expect(response.status).toBe(307)
  })
})
