import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockSetCsrfCookie = vi.fn()
vi.mock('@/lib/csrf', () => ({
  setCsrfCookie: (...args: unknown[]) => mockSetCsrfCookie(...args),
}))

const { GET } = await import('./route')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/csrf', () => {
  it('returns a CSRF token', async () => {
    mockSetCsrfCookie.mockResolvedValue('test-csrf-token-123')

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.csrfToken).toBe('test-csrf-token-123')
  })

  it('returns 500 when token generation fails', async () => {
    mockSetCsrfCookie.mockRejectedValue(new Error('Cookie error'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to generate CSRF token')
  })
})
