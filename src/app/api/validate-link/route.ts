import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'
import { assertSafeUrl } from '@/lib/ssrf-guard'

const validateLinkSchema = z.object({
  url: z.string().url(),
  provider: z.enum(['google_drive', 'dropbox', 'other']),
})

export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAuth()

      const body = validateLinkSchema.parse(await request.json())
      const { url, provider } = body

      // SECURITY: Block private/internal IP ranges to prevent SSRF
      assertSafeUrl(new URL(url))

      let isAccessible = false
      let fileName: string | null = null
      let fileType: string | null = null

      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)

        const res = await fetch(url, {
          method: 'HEAD',
          redirect: 'follow',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Crafted-Link-Validator/1.0',
          },
        })

        clearTimeout(timeout)

        // For Google Drive: a redirect to accounts.google.com means login required
        const finalUrl = res.url || url
        if (provider === 'google_drive' && finalUrl.includes('accounts.google.com')) {
          isAccessible = false
        } else {
          isAccessible = res.ok || res.status === 302 || res.status === 301
        }

        // Try to extract file info from headers
        const contentDisposition = res.headers.get('content-disposition')
        if (contentDisposition) {
          const nameMatch = contentDisposition.match(/filename[*]?=(?:UTF-8'')?["']?([^"';\n]+)/)
          if (nameMatch) fileName = decodeURIComponent(nameMatch[1])
        }

        fileType = res.headers.get('content-type')?.split(';')[0] || null

        // Derive filename from URL if not in headers
        if (!fileName) {
          try {
            const pathname = new URL(url).pathname
            const lastSegment = pathname.split('/').pop()
            if (lastSegment && lastSegment.includes('.')) {
              fileName = decodeURIComponent(lastSegment)
            }
          } catch {
            // Ignore URL parsing errors
          }
        }
      } catch {
        // Request failed — link may not be accessible
        isAccessible = false
      }

      return successResponse({
        isAccessible,
        fileName,
        fileType,
        provider,
      })
    },
    { endpoint: 'POST /api/validate-link' }
  )
}
