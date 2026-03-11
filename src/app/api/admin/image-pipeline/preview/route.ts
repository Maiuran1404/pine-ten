import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { buildScenePrompt } from '@/lib/ai/scene-prompt-builder'
import type { ImagePipelineConfig } from '@/lib/ai/image-pipeline-config'
import { DEFAULT_IMAGE_PIPELINE_CONFIG } from '@/lib/ai/image-pipeline-config'
import { z } from 'zod'

const previewSchema = z.object({
  config: z.record(z.string(), z.unknown()).optional(),
  scene: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    visualNote: z.string().optional(),
    cameraNote: z.string().optional(),
    voiceover: z.string().optional(),
    imageGenerationPrompt: z.string().optional(),
  }),
  styleContext: z.string().max(2000).optional(),
})

/**
 * POST /api/admin/image-pipeline/preview
 *
 * Assembles a prompt using the provided config overrides and scene data.
 * Returns the assembled prompt split into labeled parts for inspection.
 * No image generation — just prompt assembly, fast response.
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const body = previewSchema.parse(await request.json())

      // Deep-merge submitted config with defaults
      const config = body.config
        ? deepMerge(DEFAULT_IMAGE_PIPELINE_CONFIG, body.config as Partial<ImagePipelineConfig>)
        : DEFAULT_IMAGE_PIPELINE_CONFIG

      const styleContext = body.styleContext || 'Cinematic, editorial style'

      const prompt = buildScenePrompt(body.scene, styleContext, undefined, undefined, config)

      // Split the prompt into its 5 parts for display
      const lines = prompt.split('\n')
      const parts: Array<{ label: string; content: string }> = []

      for (const line of lines) {
        if (
          line.includes('Consistent cinematic series') ||
          line.includes(config.prompts.batchPrefix.slice(0, 20))
        ) {
          parts.push({ label: 'Visual DNA', content: line })
        } else if (
          line.includes('Dominant palette') ||
          line.includes('Brand color') ||
          line.includes('color grading')
        ) {
          parts.push({ label: 'Color Palette', content: line })
        } else if (
          line === config.prompts.qualityFooter ||
          line.includes('cinematography') ||
          line.includes('No text')
        ) {
          parts.push({ label: 'Quality Footer', content: line })
        } else if (line.includes('lens') || line.includes('lighting') || line.includes('shot')) {
          parts.push({ label: 'Style + Camera', content: line })
        } else if (line.trim()) {
          parts.push({ label: 'Subject + Content', content: line })
        }
      }

      return successResponse({
        assembledPrompt: prompt,
        parts,
        charCount: prompt.length,
        promptCap: config.prompts.promptCap,
      })
    },
    { endpoint: 'POST /api/admin/image-pipeline/preview' }
  )
}

// Simple deep merge for preview (duplicated to avoid circular deps with server-only)
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepMerge<T>(target: T, source: Partial<T>): T {
  if (!isPlainObject(target) || !isPlainObject(source)) {
    return (source ?? target) as T
  }
  const result = { ...target } as Record<string, unknown>
  for (const key of Object.keys(source)) {
    const sourceVal = (source as Record<string, unknown>)[key]
    const targetVal = result[key]
    if (isPlainObject(targetVal) && isPlainObject(sourceVal)) {
      result[key] = deepMerge(targetVal, sourceVal)
    } else if (sourceVal !== undefined) {
      result[key] = sourceVal
    }
  }
  return result as T
}
