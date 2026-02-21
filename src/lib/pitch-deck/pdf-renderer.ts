import 'server-only'

import { createElement } from 'react'
import fs from 'fs'
import path from 'path'
import type { PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'
import { SlideCover } from '@/components/pitch-deck/slides/slide-cover'
import { SlideToc } from '@/components/pitch-deck/slides/slide-toc'
import { SlideAbout } from '@/components/pitch-deck/slides/slide-about'
import { CLIENT_LOGOS } from '@/components/pitch-deck/slides/client-logos'
import { SlideProjectDetails } from '@/components/pitch-deck/slides/slide-project-details'
import { SlideOverview } from '@/components/pitch-deck/slides/slide-overview'
import { SlideScope } from '@/components/pitch-deck/slides/slide-scope'
import { SlideTimeline } from '@/components/pitch-deck/slides/slide-timeline'
import { SlidePricing } from '@/components/pitch-deck/slides/slide-pricing'
import { SlideBackCover } from '@/components/pitch-deck/slides/slide-back-cover'

function readLogoAsBase64(filename: string): string {
  try {
    const filePath = path.join(process.cwd(), 'public', filename)
    const buffer = fs.readFileSync(filePath)
    const base64 = buffer.toString('base64')
    return `data:image/png;base64,${base64}`
  } catch {
    return ''
  }
}

export async function renderPitchDeckHTML(data: PitchDeckFormData): Promise<string> {
  const { renderToStaticMarkup } = await import('react-dom/server')
  const combinedBlackLogo = readLogoAsBase64('craftedcombintedblack.png')
  const figureWhiteLogo = readLogoAsBase64('craftedfigurewhite.png')

  const clientLogoDataMap: Record<string, string> = {}
  for (const logo of CLIENT_LOGOS) {
    const base64 = readLogoAsBase64(logo.src)
    if (base64) clientLogoDataMap[logo.src] = base64
  }

  const slides = [
    createElement(SlideCover, { data, figureLogoSrc: figureWhiteLogo }),
    createElement(SlideToc),
    createElement(SlideAbout, { data, logoSrc: combinedBlackLogo, clientLogoDataMap }),
    createElement(SlideProjectDetails, { data, logoSrc: combinedBlackLogo }),
    createElement(SlideOverview, { data, logoSrc: combinedBlackLogo }),
    createElement(SlideScope, { data, logoSrc: combinedBlackLogo }),
    createElement(SlideTimeline, { data, logoSrc: combinedBlackLogo }),
    createElement(SlidePricing, { data, logoSrc: combinedBlackLogo }),
    createElement(SlideBackCover, { data, logoSrc: combinedBlackLogo }),
  ]

  const slidesHTML = slides
    .map((slide, i) => {
      const html = renderToStaticMarkup(slide)
      const wrapper =
        i < slides.length - 1 ? `<div class="slide-page">${html}</div>` : `<div>${html}</div>`
      return wrapper
    })
    .join('\n')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: 'Satoshi', 'Inter', 'Helvetica Neue', Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    @page {
      size: 1920px 1080px;
      margin: 0;
    }

    .slide-page {
      page-break-after: always;
    }
  </style>
</head>
<body>
${slidesHTML}
</body>
</html>`
}
