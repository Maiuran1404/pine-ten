import { NextRequest, NextResponse } from 'next/server'
import { apiSpec } from '@/lib/api-spec'

const isProduction = process.env.NODE_ENV === 'production'
const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'getcrafted.ai'

// Allowed origins for CORS
const allowedOrigins = isProduction
  ? [
      `https://${baseDomain}`,
      `https://app.${baseDomain}`,
      `https://artist.${baseDomain}`,
      `https://superadmin.${baseDomain}`,
    ]
  : [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://app.localhost:3000',
      'http://artist.localhost:3000',
      'http://superadmin.localhost:3000',
    ]

/**
 * GET /api/openapi
 * Returns the OpenAPI specification as JSON
 * Useful for importing into API testing tools like Postman
 */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin') || ''

  // Check if origin is allowed, or if no origin (same-origin request)
  const isAllowedOrigin = !origin || allowedOrigins.includes(origin)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // Cache for 1 hour
    'Cache-Control': 'public, max-age=3600, s-maxage=3600',
  }

  // Only add CORS headers for allowed origins
  if (isAllowedOrigin && origin) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
    headers['Access-Control-Allow-Headers'] = 'Content-Type'
  }

  return NextResponse.json(apiSpec, { headers })
}

/**
 * OPTIONS /api/openapi
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || ''
  const isAllowedOrigin = allowedOrigins.includes(origin)

  if (!isAllowedOrigin) {
    return new NextResponse(null, { status: 403 })
  }

  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}
