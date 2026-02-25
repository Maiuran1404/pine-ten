import 'server-only'

import { Errors } from '@/lib/errors'

/**
 * Shared Puppeteer browser launcher.
 * - Production/Vercel: uses @sparticuz/chromium-min
 * - Local dev: uses system Chrome
 */
export async function launchBrowser() {
  const puppeteer = await import('puppeteer-core')

  let executablePath: string
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    const chromium = await import('@sparticuz/chromium-min')
    executablePath = await chromium.default.executablePath(
      'https://github.com/nichochar/chromium-compact/releases/download/chromium-v131.0.1/chromium-v131.0.1-pack.tar'
    )
  } else {
    const fs = await import('fs')
    const possiblePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    ]
    const found = possiblePaths.find((p) => fs.existsSync(p))
    if (!found) {
      throw Errors.internal('Chrome not found. Install Google Chrome for local PDF generation.')
    }
    executablePath = found
  }

  return puppeteer.default.launch({
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    headless: true,
  })
}
