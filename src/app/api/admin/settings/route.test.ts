import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { APIError, ErrorCodes } from '@/lib/errors'

const mockGetAllSettings = vi.fn()
const mockGetSetting = vi.fn()
const mockSetSetting = vi.fn()
const mockRequireAdmin = vi.fn()
const mockSettingsUpdate = vi.fn()

vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

vi.mock('@/lib/app-settings', () => ({
  getAllSettings: (...args: unknown[]) => mockGetAllSettings(...args),
  getSetting: (...args: unknown[]) => mockGetSetting(...args),
  setSetting: (...args: unknown[]) => mockSetSetting(...args),
}))

vi.mock('@/lib/audit', () => ({
  auditHelpers: {
    settingsUpdate: (...args: unknown[]) => mockSettingsUpdate(...args),
  },
  actorFromUser: (user: { id: string; email: string; role?: string }) => ({
    id: user.id,
    email: user.email,
    role: user.role ?? 'unknown',
  }),
}))

const { GET, POST } = await import('./route')

const adminSession = {
  user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
}

describe('GET /api/admin/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue(adminSession)
  })

  it('should return all settings', async () => {
    const settings = { creditPrice: 49, maintenanceMode: false }
    mockGetAllSettings.mockResolvedValue(settings)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.settings).toEqual(settings)
  })

  it('should return 401 if not admin', async () => {
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const response = await GET()
    expect(response.status).toBe(401)
  })
})

describe('POST /api/admin/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue(adminSession)
    mockGetSetting.mockResolvedValue(49)
    mockSetSetting.mockResolvedValue(undefined)
  })

  it('should update a setting', async () => {
    const request = new NextRequest('http://localhost/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'creditPrice', value: 59 }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockSetSetting).toHaveBeenCalledWith('creditPrice', 59, 'admin-1')
    expect(mockSettingsUpdate).toHaveBeenCalled()
  })

  it('should reject invalid key', async () => {
    const request = new NextRequest('http://localhost/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: '', value: 'test' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
