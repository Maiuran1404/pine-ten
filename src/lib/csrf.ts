import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const CSRF_COOKIE_NAME = 'crafted_csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'
const CSRF_TOKEN_LENGTH = 32

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(CSRF_TOKEN_LENGTH)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Set CSRF token in cookies (call this on page load or after login)
 */
export async function setCsrfCookie(): Promise<string> {
  const token = generateCsrfToken()
  const cookieStore = await cookies()

  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  })

  return token
}

/**
 * Get CSRF token from cookies
 */
export async function getCsrfToken(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(CSRF_COOKIE_NAME)?.value
}

/**
 * Validate CSRF token from request header against cookie
 */
export async function validateCsrfToken(request: NextRequest): Promise<boolean> {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value
  const headerToken = request.headers.get(CSRF_HEADER_NAME)

  if (!cookieToken || !headerToken) {
    return false
  }

  // Constant-time comparison to prevent timing attacks
  if (cookieToken.length !== headerToken.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < cookieToken.length; i++) {
    result |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i)
  }

  return result === 0
}

/**
 * CSRF protection middleware wrapper for API routes
 * Use this for state-changing operations (POST, PUT, PATCH, DELETE)
 */
export function withCsrfProtection(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Skip CSRF check for GET requests (they should be idempotent)
    if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
      return handler(request)
    }

    const isValid = await validateCsrfToken(request)

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid or missing CSRF token' }, { status: 403 })
    }

    return handler(request)
  }
}

/**
 * API route to get a new CSRF token
 * Call this on app initialization and include the token in subsequent requests
 */
export async function getNewCsrfToken(): Promise<{ token: string }> {
  const token = await setCsrfCookie()
  return { token }
}
