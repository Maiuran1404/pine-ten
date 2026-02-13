import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Gate /register behind invite code
  if (pathname === '/register') {
    const code = searchParams.get('code')
    if (!code) {
      const earlyAccessUrl = new URL('/early-access', request.url)
      return NextResponse.redirect(earlyAccessUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/register'],
}
