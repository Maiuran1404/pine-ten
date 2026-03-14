import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV === 'development'

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2592000, // 30 days — remote images are content-addressed
    deviceSizes: [640, 828, 1080, 1200, 1920], // Drop 750, 2048, 3840 — unused sizes
    imageSizes: [32, 48, 64, 96, 128, 256], // Drop 16, 384 — unused sizes
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'framerusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'film-grab.com',
        pathname: '/wp-content/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'flim-1-0-2.s3.eu-central-1.amazonaws.com',
        pathname: '/thumbs/**',
      },
    ],
  },
  // Externalize pino and its dependencies to avoid Turbopack bundling issues
  serverExternalPackages: [
    'pino',
    'pino-pretty',
    'thread-stream',
    'twilio',
    '@slack/web-api',
    'pdf-parse',
    '@mendable/firecrawl-js',
    'bcryptjs',
    'sharp',
    'puppeteer-core',
    '@sparticuz/chromium-min',
    'posthog-node',
    '@anthropic-ai/sdk',
    'resend',
    'stripe',
    '@google/genai',
    'bullmq',
    'ioredis',
  ],

  // Increase body size limit for file uploads (default 10MB)
  experimental: {
    proxyClientMaxBodySize: '50mb',
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      'date-fns',
      'posthog-js',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      '@dnd-kit/utilities',
      'react-hook-form',
      '@tanstack/react-query',
      'react-markdown',
      'sonner',
      '@hookform/resolvers',
      'react-resizable-panels',
      'cmdk',
      'react-day-picker',
      'react-dropzone',
      'better-auth',
    ],
  },

  // PostHog reverse proxy — bypasses ad blockers (same pattern as Sentry /monitoring tunnel)
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://eu-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://eu.i.posthog.com/:path*',
      },
      {
        source: '/ingest/decide',
        destination: 'https://eu.i.posthog.com/decide',
      },
    ]
  },

  // Security headers
  async headers() {
    return [
      {
        // Apply security headers to all routes except the website proxy
        // (the proxy intentionally strips frame-blocking headers for iframe previews)
        source: '/((?!api/website-flow/proxy).*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Only allow unsafe-eval in development for hot reload - production is secure
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://va.vercel-scripts.com https://vercel.live https://js.stripe.com`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' data:",
              "connect-src 'self' https: wss:",
              "frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://js.stripe.com https://hooks.stripe.com",
              "worker-src 'self' blob:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  org: 'crafted-0d',
  project: 'javascript-nextjs',
  silent: !process.env.CI,

  // Delete source maps after upload so they're not served to clients
  sourcemaps: {
    filesToDeleteAfterUpload: ['.next/static/**/*.map'],
  },

  // Release tracking
  release: {
    name: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
    deploy: {
      env: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    },
  },

  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',

  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
})
