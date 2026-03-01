import { z } from 'zod'

/**
 * Schema for generating a style preview image (no DB save)
 */
export const stylePreviewSchema = z.object({
  subject: z
    .string()
    .min(5, 'Subject must be at least 5 characters')
    .max(500, 'Subject must be less than 500 characters')
    .transform((val) => val.trim()),
  promptGuide: z
    .string()
    .min(10, 'Prompt guide must be at least 10 characters')
    .max(3000, 'Prompt guide must be less than 3000 characters'),
  styleName: z.string().min(1).max(200),
  size: z.enum(['1536x1024', '1024x1024', '1024x1536']).optional().default('1024x1024'),
  quality: z.enum(['low', 'medium', 'high']).optional().default('medium'),
})

/**
 * Schema for saving a generated preview as the style's reference image
 */
export const saveStylePreviewSchema = z.object({
  styleId: z.string().uuid('Invalid style ID'),
  base64: z.string().min(1, 'Base64 image data is required'),
})

export type StylePreviewInput = z.infer<typeof stylePreviewSchema>
export type SaveStylePreviewInput = z.infer<typeof saveStylePreviewSchema>
