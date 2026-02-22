import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { CsrfProvider } from '@/providers/csrf-provider'
import { QueryProvider } from '@/providers/query-provider'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { SkipLink } from '@/components/shared/skip-link'
import { DevAgentation } from '@/components/dev-agentation'
import './globals.css'

const geistSans = localFont({
  src: '../fonts/Geist-Latin.woff2',
  variable: '--font-geist-sans',
  display: 'swap',
})

const geistMono = localFont({
  src: '../fonts/GeistMono-Latin.woff2',
  variable: '--font-geist-mono',
  display: 'swap',
})

const satoshi = localFont({
  src: [
    { path: '../fonts/Satoshi-Light.woff2', weight: '300', style: 'normal' },
    { path: '../fonts/Satoshi-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/Satoshi-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/Satoshi-Bold.woff2', weight: '700', style: 'normal' },
    { path: '../fonts/Satoshi-Black.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-satoshi',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Crafted',
    template: '%s | Crafted',
  },
  description:
    'Professional design services on demand. Get static ads, video content, and social media graphics created by talented freelancers.',
  icons: {
    icon: '/craftedfigurewhite.png',
    apple: '/craftedfigurewhite.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Fontshare CDN fallback for components using 'Satoshi' directly */}
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${satoshi.variable} antialiased bg-background text-foreground`}
      >
        <SkipLink />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <QueryProvider>
            <CsrfProvider>
              <main id="main-content">{children}</main>
              <Toaster position="top-right" />
            </CsrfProvider>
          </QueryProvider>
          <SpeedInsights />
          <Analytics />
        </ThemeProvider>
        <DevAgentation />
      </body>
    </html>
  )
}
