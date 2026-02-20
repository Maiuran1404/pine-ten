import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling, Errors } from '@/lib/errors'
import { requireAdmin } from '@/lib/require-auth'
import { pitchDeckSchema } from '@/lib/validations/pitch-deck-schema'
import { renderPitchDeckHTML } from '@/lib/pitch-deck/pdf-renderer'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const body = await request.json()
      const data = pitchDeckSchema.parse(body)
      const html = await renderPitchDeckHTML(data)

      let browser
      try {
        const puppeteer = await import('puppeteer-core')

        let executablePath: string
        if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
          const chromium = await import('@sparticuz/chromium-min')
          executablePath = await chromium.default.executablePath(
            'https://github.com/nichochar/chromium-compact/releases/download/chromium-v131.0.1/chromium-v131.0.1-pack.tar'
          )
        } else {
          // Local dev: use system Chrome
          const possiblePaths = [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/usr/bin/google-chrome',
            '/usr/bin/chromium-browser',
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          ]
          const fs = await import('fs')
          const found = possiblePaths.find((p) => fs.existsSync(p))
          if (!found) {
            throw Errors.internal(
              'Chrome not found. Install Google Chrome for local PDF generation.'
            )
          }
          executablePath = found
        }

        browser = await puppeteer.default.launch({
          executablePath,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
          ],
          headless: true,
        })

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

        const filename = `pitch-deck-${data.clientName.toLowerCase().replace(/\s+/g, '-')}.pdf`

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
    { endpoint: 'POST /api/admin/pitch-decks/generate-pdf' }
  )
}
