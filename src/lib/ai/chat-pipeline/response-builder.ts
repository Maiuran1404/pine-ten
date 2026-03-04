/**
 * Response building utilities for the chat pipeline.
 * Handles marker stripping and deduplication.
 */
import 'server-only'

import type { StructureData } from '@/lib/ai/briefing-state-machine'

/** Remove consecutive duplicate sentences and phrases from AI response */
export function deduplicateResponse(text: string): string {
  const lines = text.split('\n')
  const deduped: string[] = []

  for (const line of lines) {
    if (
      /^\[(?:STORYBOARD|LAYOUT|CALENDAR|DESIGN_SPEC|BRIEF_META|QUICK_OPTIONS|VIDEO_NARRATIVE|DELIVERABLE_STYLES|ASSET_REQUEST)/.test(
        line.trim()
      )
    ) {
      deduped.push(line)
      continue
    }

    const sentences = line.match(/[^.!?]+[.!?]+/g)
    if (!sentences) {
      deduped.push(line)
      continue
    }

    const uniqueSentences: string[] = []
    for (const sentence of sentences) {
      const normalized = sentence.trim().toLowerCase()
      const lastNormalized =
        uniqueSentences.length > 0
          ? uniqueSentences[uniqueSentences.length - 1].trim().toLowerCase()
          : ''
      if (normalized !== lastNormalized) {
        uniqueSentences.push(sentence)
      }
    }

    deduped.push(uniqueSentences.map((s) => s.trim()).join(' '))
  }

  const finalLines: string[] = []
  for (const line of deduped) {
    const trimmed = line.trim().toLowerCase()
    const lastTrimmed =
      finalLines.length > 0 ? finalLines[finalLines.length - 1].trim().toLowerCase() : ''
    if (trimmed !== lastTrimmed || trimmed === '') {
      finalLines.push(line)
    }
  }

  return finalLines.join('\n')
}

/** Strip all structured markers from displayed content */
export function stripMarkers(
  content: string,
  opts: {
    structureData?: StructureData
    clientStage?: string
    clientCategory?: string
  }
): string {
  let cleanContent = content.replace(/\[TASK_READY\][\s\S]*?\[\/TASK_READY\]/, '')
  cleanContent = cleanContent
    .replace(/\[STORYBOARD\][\s\S]*?\[\/STORYBOARD\]/g, '')
    .replace(/\[VIDEO_STORYBOARD\][\s\S]*?\[\/VIDEO_STORYBOARD\]/g, '')
    .replace(/\[LAYOUT\][\s\S]*?\[\/LAYOUT\]/g, '')
    .replace(/\[CALENDAR\][\s\S]*?\[\/CALENDAR\]/g, '')
    .replace(/\[DESIGN_SPEC\][\s\S]*?\[\/DESIGN_SPEC\]/g, '')
    .replace(/\[STRATEGIC_REVIEW\][\s\S]*?\[\/STRATEGIC_REVIEW\]/g, '')
    .replace(/\[STYLE_CARDS\][\s\S]*?\[\/STYLE_CARDS\]/g, '')
    .replace(/\[DELIVERABLE_STYLES[^\]]*\]/g, '')
    .replace(/\[ASSET_REQUEST\][\s\S]*?\[\/ASSET_REQUEST\]/g, '')
    .replace(/\[\/ASSET_REQUEST\]/g, '')
    .replace(/\[BRIEF_META\][\s\S]*?\[\/BRIEF_META\]/g, '')
    .replace(/\[\/BRIEF_META\]/g, '')
    .replace(/\[GLOBAL_STYLES\][\s\S]*?\[\/GLOBAL_STYLES\]/g, '')
    .replace(/\[\/GLOBAL_STYLES\]/g, '')
    .replace(/\[VIDEO_NARRATIVE\][\s\S]*?\[\/VIDEO_NARRATIVE\]/g, '')
    .replace(/\[\/VIDEO_NARRATIVE\]/g, '')
    .replace(/\[REGENERATE_IMAGES:\s*[\d,\s]+\]/g, '')
    // Clean up unclosed [QUICK_OPTIONS] blocks that span to end of content
    .replace(/\[QUICK_OPTIONS\][\s\S]*?\[\/QUICK_OPTIONS\]/g, '')
    .replace(/\[QUICK_OPTIONS\][\s\S]*$/g, '')
    .trim()

  // Strip false "storyboard ready" claims when parse actually failed
  if (
    opts.clientStage === 'STRUCTURE' &&
    !opts.structureData &&
    (opts.clientCategory === 'video' || content.includes('[STORYBOARD]'))
  ) {
    cleanContent = cleanContent
      .replace(/[Yy]our storyboard is ready[^.]*\./g, '')
      .replace(/ready on the canvas[^.]*\./g, '')
      .trim()
    if (!cleanContent || cleanContent.length < 20) {
      cleanContent = "I'm putting together the scene breakdown — one more moment."
    }
  }

  // General fallback: if stripping markers leaves nothing, return empty
  // so the chat UI can skip rendering an empty bubble
  if (!cleanContent) {
    return ''
  }

  return cleanContent
}

// enrichQuickOptions removed — quick options are now derived exclusively
// from the briefing state machine (single source of truth).
