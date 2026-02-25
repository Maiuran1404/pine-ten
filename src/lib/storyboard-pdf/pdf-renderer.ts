import 'server-only'

import { createElement } from 'react'
import fs from 'fs'
import path from 'path'
import type {
  StoryboardPdfInput,
  StoryboardPdfScene,
} from '@/lib/validations/storyboard-pdf-schema'
import { StoryboardCover } from './slides/storyboard-cover'
import { StoryboardScenePage } from './slides/storyboard-scene-page'
import { StoryboardSummary } from './slides/storyboard-summary'

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

function parseDuration(duration: string): number {
  return parseInt(duration.match(/(\d+)/)?.[1] || '0', 10)
}

function formatTotalDuration(totalSeconds: number): string {
  const min = Math.floor(totalSeconds / 60)
  const sec = totalSeconds % 60
  if (min === 0) return `${sec}s`
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`
}

/**
 * Pair scenes into groups of 2 for side-by-side rendering.
 */
function pairScenes(
  scenes: StoryboardPdfScene[]
): Array<[StoryboardPdfScene] | [StoryboardPdfScene, StoryboardPdfScene]> {
  const pairs: Array<[StoryboardPdfScene] | [StoryboardPdfScene, StoryboardPdfScene]> = []
  for (let i = 0; i < scenes.length; i += 2) {
    if (i + 1 < scenes.length) {
      pairs.push([scenes[i], scenes[i + 1]])
    } else {
      pairs.push([scenes[i]])
    }
  }
  return pairs
}

export async function renderStoryboardHTML(data: StoryboardPdfInput): Promise<string> {
  const { renderToStaticMarkup } = await import('react-dom/server')
  const figureWhiteLogo = readLogoAsBase64('craftedfigurewhite.png')
  const combinedBlackLogo = readLogoAsBase64('craftedcombintedblack.png')

  const totalSeconds = data.scenes.reduce((sum, s) => sum + parseDuration(s.duration), 0)
  const totalDuration = formatTotalDuration(totalSeconds)
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const scenePairs = pairScenes(data.scenes)
  // total pages: cover + scene pages + summary
  const totalPages = 1 + scenePairs.length + 1

  const slides = [
    // Cover page
    createElement(StoryboardCover, {
      sceneCount: data.scenes.length,
      totalDuration,
      date,
      figureLogoSrc: figureWhiteLogo,
    }),
    // Scene pages (2 per page)
    ...scenePairs.map((pair, i) =>
      createElement(StoryboardScenePage, {
        key: i,
        scenes: pair,
        pageNumber: i + 2,
        totalPages,
        logoSrc: combinedBlackLogo,
      })
    ),
    // Summary page
    createElement(StoryboardSummary, {
      scenes: data.scenes,
      totalDuration,
      pageNumber: totalPages,
      totalPages,
      logoSrc: combinedBlackLogo,
    }),
  ]

  const slidesHTML = slides
    .map((slide, i) => {
      const html = renderToStaticMarkup(slide)
      return i < slides.length - 1 ? `<div class="slide-page">${html}</div>` : `<div>${html}</div>`
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
