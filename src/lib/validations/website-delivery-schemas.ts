import { z } from 'zod'

// Push skeleton to external builder
export const pushSkeletonSchema = z.object({
  projectId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
})

// Publish a preview of the pushed skeleton
export const previewSchema = z.object({
  projectId: z.string().uuid(),
})

// Deploy the website to production
export const deploySchema = z.object({
  projectId: z.string().uuid(),
})

// Webhook events from external builders (Framer, etc.)
export const deliveryWebhookSchema = z.object({
  projectId: z.string().uuid(),
  event: z.enum(['build_started', 'build_completed', 'build_failed', 'deployed']),
  data: z.record(z.string(), z.unknown()).optional(),
})

// Delivery status enum — tracks the lifecycle of pushing to an external builder
export const deliveryStatusEnum = z.enum([
  'PENDING',
  'PUSHING',
  'PUSHED',
  'PREVIEWING',
  'PREVIEW_READY',
  'DEPLOYING',
  'DEPLOYED',
  'FAILED',
])

// Type exports
export type PushSkeletonInput = z.infer<typeof pushSkeletonSchema>
export type PreviewInput = z.infer<typeof previewSchema>
export type DeployInput = z.infer<typeof deploySchema>
export type DeliveryWebhookInput = z.infer<typeof deliveryWebhookSchema>
export type DeliveryStatus = z.infer<typeof deliveryStatusEnum>
