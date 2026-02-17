import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockExecute = vi.fn()
vi.mock('@/db', () => ({
  db: {
    execute: (...args: unknown[]) => mockExecute(...args),
  },
}))

vi.mock('drizzle-orm', () => ({
  sql: vi.fn(),
}))

const mockCheckEnvHealth = vi.fn()
vi.mock('@/lib/env', () => ({
  checkEnvHealth: (...args: unknown[]) => mockCheckEnvHealth(...args),
}))

const { GET } = await import('./route')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/health', () => {
  it('returns healthy when all checks pass', async () => {
    mockExecute.mockResolvedValue(undefined)
    mockCheckEnvHealth.mockReturnValue({ healthy: true, missing: [] })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('healthy')
    expect(data.checks.database.status).toBe('healthy')
    expect(data.checks.environment.status).toBe('healthy')
  })

  it('returns unhealthy when database fails', async () => {
    mockExecute.mockRejectedValue(new Error('Connection refused'))
    mockCheckEnvHealth.mockReturnValue({ healthy: true, missing: [] })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.status).toBe('unhealthy')
    expect(data.checks.database.status).toBe('unhealthy')
  })

  it('returns degraded when env vars are missing', async () => {
    mockExecute.mockResolvedValue(undefined)
    mockCheckEnvHealth.mockReturnValue({ healthy: false, missing: ['SOME_VAR'] })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('degraded')
    expect(data.checks.environment.status).toBe('degraded')
    expect(data.checks.environment.missing).toContain('SOME_VAR')
  })

  it('includes timestamp and version in response', async () => {
    mockExecute.mockResolvedValue(undefined)
    mockCheckEnvHealth.mockReturnValue({ healthy: true, missing: [] })

    const response = await GET()
    const data = await response.json()

    expect(data.timestamp).toBeDefined()
    expect(data.version).toBeDefined()
  })
})
