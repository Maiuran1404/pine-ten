import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock next/headers
const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
}

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}))

const { generateCsrfToken, validateCsrfToken, withCsrfProtection } = await import('./csrf')

describe('generateCsrfToken', () => {
  it('should generate a 64-char hex string', () => {
    const token = generateCsrfToken()
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it('should generate unique tokens', () => {
    const tokens = new Set(Array.from({ length: 10 }, () => generateCsrfToken()))
    expect(tokens.size).toBe(10)
  })
})

describe('validateCsrfToken', () => {
  it('should return true when cookie and header tokens match', async () => {
    const token = 'abc123'
    const request = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      headers: { 'x-csrf-token': token },
    })
    // Set cookie on the request
    request.cookies.set('crafted_csrf_token', token)

    const result = await validateCsrfToken(request)
    expect(result).toBe(true)
  })

  it('should return false when tokens do not match', async () => {
    const request = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      headers: { 'x-csrf-token': 'header-token' },
    })
    request.cookies.set('crafted_csrf_token', 'cookie-token')

    const result = await validateCsrfToken(request)
    expect(result).toBe(false)
  })

  it('should return false when cookie token is missing', async () => {
    const request = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      headers: { 'x-csrf-token': 'some-token' },
    })

    const result = await validateCsrfToken(request)
    expect(result).toBe(false)
  })

  it('should return false when header token is missing', async () => {
    const request = new NextRequest('http://localhost/api/test', {
      method: 'POST',
    })
    request.cookies.set('crafted_csrf_token', 'some-token')

    const result = await validateCsrfToken(request)
    expect(result).toBe(false)
  })

  it('should return false when tokens have different lengths', async () => {
    const request = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      headers: { 'x-csrf-token': 'short' },
    })
    request.cookies.set('crafted_csrf_token', 'much-longer-token')

    const result = await validateCsrfToken(request)
    expect(result).toBe(false)
  })
})

describe('withCsrfProtection', () => {
  const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }))

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should skip CSRF check for GET requests', async () => {
    const wrapped = withCsrfProtection(mockHandler)
    const request = new NextRequest('http://localhost/api/test', { method: 'GET' })

    const response = await wrapped(request)
    expect(mockHandler).toHaveBeenCalledWith(request)
    const body = await response.json()
    expect(body).toEqual({ ok: true })
  })

  it('should skip CSRF check for HEAD requests', async () => {
    const wrapped = withCsrfProtection(mockHandler)
    const request = new NextRequest('http://localhost/api/test', { method: 'HEAD' })

    await wrapped(request)
    expect(mockHandler).toHaveBeenCalledWith(request)
  })

  it('should skip CSRF check for OPTIONS requests', async () => {
    const wrapped = withCsrfProtection(mockHandler)
    const request = new NextRequest('http://localhost/api/test', { method: 'OPTIONS' })

    await wrapped(request)
    expect(mockHandler).toHaveBeenCalledWith(request)
  })

  it('should return 403 for POST without valid CSRF token', async () => {
    const wrapped = withCsrfProtection(mockHandler)
    const request = new NextRequest('http://localhost/api/test', { method: 'POST' })

    const response = await wrapped(request)
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toContain('CSRF')
    expect(mockHandler).not.toHaveBeenCalled()
  })

  it('should pass through to handler when CSRF token is valid', async () => {
    const wrapped = withCsrfProtection(mockHandler)
    const token = 'valid-token-123'
    const request = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      headers: { 'x-csrf-token': token },
    })
    request.cookies.set('crafted_csrf_token', token)

    const response = await wrapped(request)
    expect(mockHandler).toHaveBeenCalledWith(request)
    expect(response.status).toBe(200)
  })

  it('should return 403 for DELETE without valid CSRF token', async () => {
    const wrapped = withCsrfProtection(mockHandler)
    const request = new NextRequest('http://localhost/api/test', { method: 'DELETE' })

    const response = await wrapped(request)
    expect(response.status).toBe(403)
    expect(mockHandler).not.toHaveBeenCalled()
  })
})
