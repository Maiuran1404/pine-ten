import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'
import { storyboardPdfSchema } from '@/lib/validations/storyboard-pdf-schema'
import { renderStoryboardHTML } from '@/lib/storyboard-pdf/pdf-renderer'
import { launchBrowser } from '@/lib/puppeteer'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAuth()

      const body = await request.json()
      const data = storyboardPdfSchema.parse(body)
      const html = await renderStoryboardHTML(data)

      let browser
      try {
        browser = await launchBrowser()

        const page = await browser.newPage()
        await page.setViewport({ width: 1920, height: 1080 })
        await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 })

        const pdfUint8 = await page.pdf({
          printBackground: true,
          preferCSSPageSize: true,
          width: '1920px',
          height: '1080px',
        })
        const pdfBuffer = Buffer.from(pdfUint8)

        const filename = `storyboard-${new Date().toISOString().slice(0, 10)}.pdf`

        return new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': String(pdfBuffer.byteLength),
          },
        })
      } finally {
        if (browser) {
          await browser.close()
        }
      }
    },
    { endpoint: 'POST /api/storyboard/generate-pdf' }
  )
}
