import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Store for mock DB results
let mockDbResult: unknown[] = []

vi.mock('@/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => mockDbResult,
        }),
      }),
    }),
  },
  earlyAccessCodes: {
    code: 'code',
    isActive: 'is_active',
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => ({ limited: false, remaining: 10, resetIn: 60 }),
}))

// Dynamic import after mocks are set up
const { POST } = await import('./route')

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/early-access/validate-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/early-access/validate-code', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDbResult = []
  })

  it('should return valid for an active, non-expired code', async () => {
    mockDbResult = [
      {
        id: 'code-1',
        code: 'TEST123',
        isActive: true,
        maxUses: 10,
        usedCount: 0,
        expiresAt: null,
      },
    ]

    const request = createRequest({ code: 'test123' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.valid).toBe(true)
    expect(data.data.code).toBe('TEST123')
  })

  it('should reject an invalid code', async () => {
    mockDbResult = []

    const request = createRequest({ code: 'INVALID' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('should reject an expired code', async () => {
    const pastDate = new Date('2020-01-01')
    mockDbResult = [
      {
        id: 'code-2',
        code: 'EXPIRED',
        isActive: true,
        maxUses: null,
        usedCount: 0,
        expiresAt: pastDate,
      },
    ]

    const request = createRequest({ code: 'EXPIRED' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.message).toContain('expired')
  })

  it('should reject a code at max uses', async () => {
    mockDbResult = [
      {
        id: 'code-3',
        code: 'MAXED',
        isActive: true,
        maxUses: 5,
        usedCount: 5,
        expiresAt: null,
      },
    ]

    const request = createRequest({ code: 'MAXED' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.message).toContain('maximum')
  })

  it('should reject empty code with validation error', async () => {
    const request = createRequest({ code: '' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('should reject missing code field', async () => {
    const request = createRequest({})
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })
})
