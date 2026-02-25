import { z } from 'zod'

const storyboardSceneSchema = z.object({
  sceneNumber: z.number(),
  title: z.string(),
  description: z.string().optional().default(''),
  duration: z.string(),
  visualNote: z.string().optional().default(''),
  voiceover: z.string().optional(),
  transition: z.string().optional(),
  cameraNote: z.string().optional(),
  fullScript: z.string().optional(),
  directorNotes: z.string().optional(),
  resolvedImageUrl: z.string().url().optional(),
  resolvedImageSource: z.string().optional(),
  resolvedImageAttribution: z
    .object({
      sourceName: z.string(),
      sourceUrl: z.string(),
      filmTitle: z.string().optional(),
      photographer: z.string().optional(),
    })
    .optional(),
})

export const storyboardPdfSchema = z.object({
  scenes: z.array(storyboardSceneSchema).min(1).max(50),
})

export type StoryboardPdfInput = z.infer<typeof storyboardPdfSchema>
export type StoryboardPdfScene = z.infer<typeof storyboardSceneSchema>
