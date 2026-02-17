import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

const mockExtractStyleDNA = vi.fn()
const mockGetStyleDNASummary = vi.fn()
vi.mock('@/lib/ai/style-dna', () => ({
  extractStyleDNA: (...args: unknown[]) => mockExtractStyleDNA(...args),
  getStyleDNASummary: (...args: unknown[]) => mockGetStyleDNASummary(...args),
}))

const { GET } = await import('./route')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/style-dna', () => {
  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('returns 404 when no brand profile found', async () => {
    mockRequireAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
    })
    mockExtractStyleDNA.mockResolvedValue(null)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.message).toContain('brand profile')
  })

  it('returns style DNA with summary', async () => {
    mockRequireAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
    })
    const mockDNA = { palette: ['#FF0000'], typography: 'modern', mood: 'bold' }
    mockExtractStyleDNA.mockResolvedValue(mockDNA)
    mockGetStyleDNASummary.mockReturnValue('Bold modern style with red palette')

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.dna).toEqual(mockDNA)
    expect(data.data.summary).toBe('Bold modern style with red palette')
  })
})
