import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { CsrfProvider } from '@/providers/csrf-provider'
import { QueryProvider } from '@/providers/query-provider'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { SkipLink } from '@/components/shared/skip-link'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
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
        {/* Satoshi font from Fontshare - used for auth pages and branding */}
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
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
      </body>
    </html>
  )
}
