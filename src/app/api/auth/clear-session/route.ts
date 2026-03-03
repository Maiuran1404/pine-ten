import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { logger } from '@/lib/logger'

// Force clear all auth-related cookies
// This is useful when session state becomes corrupted
// SECURITY: Requires authentication — prevents unauthenticated session destruction via CSRF
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  const clearedCookies: string[] = []

  // Clear all auth-related cookies (both old "pine" and new "crafted" prefixes)
  for (const cookie of allCookies) {
    if (
      cookie.name.startsWith('pine') ||
      cookie.name.startsWith('crafted') ||
      cookie.name.includes('session') ||
      cookie.name.includes('auth')
    ) {
      cookieStore.delete(cookie.name)
      clearedCookies.push(cookie.name)
    }
  }

  logger.info({ userId: session.user.id, clearedCookies }, 'Session cleared by user')

  return NextResponse.json({
    success: true,
    message: 'Session cleared',
    clearedCookies,
  })
}

// SECURITY: GET handler removed — session clearing is a mutation and must not
// be triggered by image tags or link prefetching (CSRF via GET).
