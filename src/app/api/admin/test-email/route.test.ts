import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIError, ErrorCodes } from '@/lib/errors'

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}))

const mockSendEmail = vi.fn()
vi.mock('@/lib/notifications', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}))

const { GET } = await import('./route')

describe('GET /api/admin/test-email', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error.code).toBe(ErrorCodes.UNAUTHORIZED)
  })

  it('should send test email and return success', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' },
    })
    mockSendEmail.mockResolvedValue({ success: true, error: null })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
    expect(data.data.sentTo).toBe('admin@example.com')
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@example.com',
        subject: 'Test Email from Crafted',
      })
    )
  })

  it('should return error details when email fails', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' },
    })
    mockSendEmail.mockResolvedValue({ success: false, error: 'SMTP connection failed' })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(false)
    expect(data.data.error).toBe('SMTP connection failed')
  })

  it('should include timestamp in response', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' },
    })
    mockSendEmail.mockResolvedValue({ success: true, error: null })

    const response = await GET()
    const data = await response.json()

    expect(data.data.timestamp).toBeDefined()
    expect(typeof data.data.timestamp).toBe('string')
  })
})
