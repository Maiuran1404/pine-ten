import { z } from 'zod'

// Screenshot request schema
export const screenshotRequestSchema = z.object({
  url: z.string().url('Please provide a valid URL').max(2000),
  fullPage: z.boolean().optional().default(false),
})

// Inspiration selection schema
export const inspirationSelectionSchema = z.object({
  inspirationId: z.string().uuid(),
  notes: z.string().max(1000).optional(),
})

// Website project creation schema
export const createWebsiteProjectSchema = z.object({
  selectedInspirations: z
    .array(
      z.object({
        id: z.string(),
        url: z.string().url(),
        screenshotUrl: z.string().url(),
        name: z.string().max(200),
        notes: z.string().max(1000).optional(),
        isUserSubmitted: z.boolean().optional(),
      })
    )
    .min(1, 'At least one inspiration is required')
    .max(5),
  userNotes: z.string().max(2000).optional(),
})

// Website project update schema
export const updateWebsiteProjectSchema = z.object({
  phase: z.enum(['INSPIRATION', 'SKELETON', 'APPROVAL']).optional(),
  selectedInspirations: z
    .array(
      z.object({
        id: z.string(),
        url: z.string().url(),
        screenshotUrl: z.string().url(),
        name: z.string().max(200),
        notes: z.string().max(1000).optional(),
        isUserSubmitted: z.boolean().optional(),
      })
    )
    .optional(),
  userNotes: z.string().max(2000).optional(),
  skeleton: z.record(z.string(), z.unknown()).optional(),
  chatHistory: z
    .array(
      z.object({
        id: z.string(),
        role: z.enum(['user', 'assistant']),
        content: z.string().max(10000),
        timestamp: z.string(),
        skeletonDelta: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .optional(),
  skeletonStage: z.string().optional(),
})

// Skeleton chat message schema
export const skeletonChatSchema = z.object({
  projectId: z.string().uuid(),
  message: z.string().min(1, 'Message is required').max(5000),
  currentSkeleton: z.record(z.string(), z.unknown()).optional(),
})

// Similar websites request schema
export const similarWebsitesSchema = z.object({
  inspirationIds: z.array(z.string().uuid()).min(1).max(5),
  limit: z.number().int().min(1).max(20).optional().default(5),
})

// Approval schema
export const approveWebsiteProjectSchema = z.object({
  projectId: z.string().uuid(),
  timelineAccepted: z.boolean().refine((val) => val === true, {
    message: 'Timeline must be accepted before approval',
  }),
})

// Type exports
export type ScreenshotRequest = z.infer<typeof screenshotRequestSchema>
export type InspirationSelection = z.infer<typeof inspirationSelectionSchema>
export type CreateWebsiteProject = z.infer<typeof createWebsiteProjectSchema>
export type UpdateWebsiteProject = z.infer<typeof updateWebsiteProjectSchema>
export type SkeletonChatInput = z.infer<typeof skeletonChatSchema>
export type SimilarWebsitesRequest = z.infer<typeof similarWebsitesSchema>
export type ApproveWebsiteProject = z.infer<typeof approveWebsiteProjectSchema>
