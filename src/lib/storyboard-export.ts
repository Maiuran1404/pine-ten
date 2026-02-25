import type { StoryboardScene } from '@/lib/ai/briefing-state-machine'

/**
 * Storyboard export utilities (#19)
 * - PDF: Crafted-branded storyboard document via server-side Puppeteer
 * - Clipboard: formatted text summary
 * - JSON: structured scene data download
 */

export async function exportStoryboardPDF(
  scenes: StoryboardScene[],
  csrfFetch: (url: string, options?: RequestInit) => Promise<Response>
): Promise<void> {
  const payload = {
    scenes: scenes.map((scene) => ({
      sceneNumber: scene.sceneNumber,
      title: scene.title,
      description: scene.description || '',
      duration: scene.duration,
      visualNote: scene.visualNote || '',
      voiceover: scene.voiceover,
      transition: scene.transition,
      cameraNote: scene.cameraNote,
      fullScript: scene.fullScript,
      directorNotes: scene.directorNotes,
      resolvedImageUrl: scene.resolvedImageUrl,
      resolvedImageSource: scene.resolvedImageSource,
      resolvedImageAttribution: scene.resolvedImageAttribution,
    })),
  }

  const res = await csrfFetch('/api/storyboard/generate-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'PDF generation failed' }))
    throw new Error(error.error || 'PDF generation failed')
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `storyboard-${new Date().toISOString().slice(0, 10)}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function formatStoryboardText(scenes: StoryboardScene[]): string {
  const lines: string[] = ['STORYBOARD', '==========', '']
  let cumulative = 0

  for (const scene of scenes) {
    const dur = parseInt(scene.duration.match(/(\d+)/)?.[1] || '0', 10)
    const startMin = Math.floor(cumulative / 60)
    const startSec = cumulative % 60
    const endMin = Math.floor((cumulative + dur) / 60)
    const endSec = (cumulative + dur) % 60
    const ts = `${startMin}:${startSec.toString().padStart(2, '0')} – ${endMin}:${endSec.toString().padStart(2, '0')}`

    lines.push(`Scene ${scene.sceneNumber}: ${scene.title}`)
    lines.push(`Duration: ${scene.duration} (${ts})`)
    if (scene.voiceover) lines.push(`Script: ${scene.voiceover}`)
    if (scene.visualNote) lines.push(`Visual: ${scene.visualNote}`)
    if (scene.description) lines.push(`Description: ${scene.description}`)
    if (scene.directorNotes) lines.push(`Director Notes: ${scene.directorNotes}`)
    lines.push('')
    cumulative += dur
  }

  const totalMin = Math.floor(cumulative / 60)
  const totalSec = cumulative % 60
  lines.push(`Total Duration: ${totalMin}:${totalSec.toString().padStart(2, '0')}`)
  lines.push(`Total Scenes: ${scenes.length}`)

  return lines.join('\n')
}

export function exportStoryboardJSON(scenes: StoryboardScene[]): void {
  const data = {
    exportedAt: new Date().toISOString(),
    totalScenes: scenes.length,
    scenes: scenes.map((scene) => ({
      sceneNumber: scene.sceneNumber,
      title: scene.title,
      description: scene.description,
      duration: scene.duration,
      voiceover: scene.voiceover,
      visualNote: scene.visualNote,
      directorNotes: scene.directorNotes,
      fullScript: scene.fullScript,
      transition: scene.transition,
      hookData: scene.hookData,
    })),
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `storyboard-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function copyStoryboardToClipboard(scenes: StoryboardScene[]): Promise<boolean> {
  const text = formatStoryboardText(scenes)
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
