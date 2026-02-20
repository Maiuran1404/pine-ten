import 'server-only'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import fs from 'fs'
import path from 'path'
import type { PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'
import { SlideCover } from '@/components/pitch-deck/slides/slide-cover'
import { SlideAbout } from '@/components/pitch-deck/slides/slide-about'
import { SlideServices } from '@/components/pitch-deck/slides/slide-services'
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

export function renderPitchDeckHTML(data: PitchDeckFormData): string {
  const combinedWhiteLogo = readLogoAsBase64('craftedcombinedwhite.png')
  const figureWhiteLogo = readLogoAsBase64('craftedfigurewhite.png')

  const slides = [
    createElement(SlideCover, { data, logoSrc: combinedWhiteLogo }),
    createElement(SlideAbout, { data, logoSrc: figureWhiteLogo }),
    createElement(SlideServices, { data, logoSrc: figureWhiteLogo }),
    createElement(SlideProjectDetails, { data, logoSrc: figureWhiteLogo }),
    createElement(SlideOverview, { data, logoSrc: figureWhiteLogo }),
    createElement(SlideScope, { data, logoSrc: figureWhiteLogo }),
    createElement(SlideTimeline, { data, logoSrc: figureWhiteLogo }),
    createElement(SlidePricing, { data, logoSrc: figureWhiteLogo }),
    createElement(SlideBackCover, { data, logoSrc: combinedWhiteLogo }),
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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
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
