import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'

// Force clear all auth-related cookies
// This is useful when session state becomes corrupted
export async function POST() {
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

  return NextResponse.json({
    success: true,
    message: 'Session cleared',
    clearedCookies,
  })
}

export async function GET() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  const clearedCookies: string[] = []

  // Clear all auth-related cookies
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

  logger.info({ clearedCookies }, 'Cleared cookies')

  // Redirect to login after clearing
  return NextResponse.redirect(
    new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
  )
}
