import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

const mockRecordStyleSelection = vi.fn()
const mockConfirmStyleSelection = vi.fn()
const mockGetUserStylePreferences = vi.fn()
vi.mock('@/lib/ai/selection-history', () => ({
  recordStyleSelection: (...args: unknown[]) => mockRecordStyleSelection(...args),
  confirmStyleSelection: (...args: unknown[]) => mockConfirmStyleSelection(...args),
  getUserStylePreferences: (...args: unknown[]) => mockGetUserStylePreferences(...args),
}))

vi.mock('@/lib/constants/reference-libraries', () => ({
  DELIVERABLE_TYPES: [
    { value: 'logo', label: 'Logo' },
    { value: 'static-ads', label: 'Static Ads' },
  ],
}))

const { POST, PUT, GET } = await import('./route')

function makeRequest(body: unknown, url = 'http://localhost/api/style-history') {
  return {
    url,
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    nextUrl: { searchParams: new URLSearchParams(new URL(url).search) },
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/style-history', () => {
  function setupAuth() {
    mockRequireAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
    })
  }

  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await POST(
      makeRequest({ styleId: 's1', deliverableType: 'logo', styleAxis: 'aesthetic' }) as never
    )
    expect(response.status).toBe(401)
  })

  it('returns 400 when required fields missing', async () => {
    setupAuth()

    const response = await POST(makeRequest({ styleId: 's1' }) as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Missing required')
  })

  it('records style selection', async () => {
    setupAuth()
    mockRecordStyleSelection.mockResolvedValue(undefined)

    const response = await POST(
      makeRequest({
        styleId: 's1',
        deliverableType: 'logo',
        styleAxis: 'aesthetic',
      }) as never
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
    expect(mockRecordStyleSelection).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', styleId: 's1' })
    )
  })
})

describe('PUT /api/style-history', () => {
  function setupAuth() {
    mockRequireAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
    })
  }

  it('returns 400 when styleId missing', async () => {
    setupAuth()

    const response = await PUT(makeRequest({}) as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('styleId')
  })

  it('confirms style selection', async () => {
    setupAuth()
    mockConfirmStyleSelection.mockResolvedValue(undefined)

    const response = await PUT(makeRequest({ styleId: 's1' }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
  })
})

describe('GET /api/style-history', () => {
  it('returns style preferences', async () => {
    mockRequireAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
    })
    mockGetUserStylePreferences.mockResolvedValue({
      topStyles: ['minimalist', 'modern'],
      frequentAxes: ['aesthetic'],
    })

    const response = await GET(
      makeRequest(null, 'http://localhost/api/style-history?deliverableType=logo') as never
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.topStyles).toEqual(['minimalist', 'modern'])
  })
})
