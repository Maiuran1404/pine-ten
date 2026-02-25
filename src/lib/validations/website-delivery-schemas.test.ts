import { describe, it, expect } from 'vitest'
import {
  pushSkeletonSchema,
  previewSchema,
  deploySchema,
  deliveryWebhookSchema,
  deliveryStatusEnum,
} from './website-delivery-schemas'

describe('Website Delivery Schemas', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000'

  describe('pushSkeletonSchema', () => {
    it('should validate with a valid projectId', () => {
      const result = pushSkeletonSchema.safeParse({ projectId: validUUID })
      expect(result.success).toBe(true)
    })

    it('should validate with projectId and optional templateId', () => {
      const result = pushSkeletonSchema.safeParse({
        projectId: validUUID,
        templateId: '660e8400-e29b-41d4-a716-446655440000',
      })
      expect(result.success).toBe(true)
    })

    it('should reject when projectId is missing', () => {
      const result = pushSkeletonSchema.safeParse({})
      expect(result.success).toBe(false)
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path.join('.'))
        expect(paths).toContain('projectId')
      }
    })

    it('should reject an invalid UUID for projectId', () => {
      const result = pushSkeletonSchema.safeParse({ projectId: 'not-a-uuid' })
      expect(result.success).toBe(false)
    })

    it('should reject an invalid UUID for templateId', () => {
      const result = pushSkeletonSchema.safeParse({
        projectId: validUUID,
        templateId: 'bad-uuid',
      })
      expect(result.success).toBe(false)
    })

    it('should allow templateId to be omitted', () => {
      const result = pushSkeletonSchema.safeParse({ projectId: validUUID })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.templateId).toBeUndefined()
      }
    })
  })

  describe('previewSchema', () => {
    it('should validate with a valid projectId', () => {
      const result = previewSchema.safeParse({ projectId: validUUID })
      expect(result.success).toBe(true)
    })

    it('should reject when projectId is missing', () => {
      const result = previewSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('should reject an invalid UUID for projectId', () => {
      const result = previewSchema.safeParse({ projectId: 'invalid' })
      expect(result.success).toBe(false)
    })
  })

  describe('deploySchema', () => {
    it('should validate with a valid projectId', () => {
      const result = deploySchema.safeParse({ projectId: validUUID })
      expect(result.success).toBe(true)
    })

    it('should reject when projectId is missing', () => {
      const result = deploySchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('should reject an invalid UUID for projectId', () => {
      const result = deploySchema.safeParse({ projectId: '12345' })
      expect(result.success).toBe(false)
    })
  })

  describe('deliveryWebhookSchema', () => {
    it('should validate with valid event types', () => {
      const validEvents = ['build_started', 'build_completed', 'build_failed', 'deployed'] as const

      validEvents.forEach((event) => {
        const result = deliveryWebhookSchema.safeParse({
          projectId: validUUID,
          event,
        })
        expect(result.success).toBe(true)
      })
    })

    it('should validate with optional data field', () => {
      const result = deliveryWebhookSchema.safeParse({
        projectId: validUUID,
        event: 'build_completed',
        data: { buildId: 'build-123', duration: 45 },
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data).toEqual({ buildId: 'build-123', duration: 45 })
      }
    })

    it('should reject an invalid event type', () => {
      const result = deliveryWebhookSchema.safeParse({
        projectId: validUUID,
        event: 'invalid_event',
      })
      expect(result.success).toBe(false)
    })

    it('should reject when projectId is missing', () => {
      const result = deliveryWebhookSchema.safeParse({
        event: 'build_started',
      })
      expect(result.success).toBe(false)
    })

    it('should reject when event is missing', () => {
      const result = deliveryWebhookSchema.safeParse({
        projectId: validUUID,
      })
      expect(result.success).toBe(false)
    })

    it('should reject when both required fields are missing', () => {
      const result = deliveryWebhookSchema.safeParse({})
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(2)
      }
    })
  })

  describe('deliveryStatusEnum', () => {
    it('should accept all valid delivery statuses', () => {
      const validStatuses = [
        'PENDING',
        'PUSHING',
        'PUSHED',
        'PREVIEWING',
        'PREVIEW_READY',
        'DEPLOYING',
        'DEPLOYED',
        'FAILED',
      ] as const

      validStatuses.forEach((status) => {
        const result = deliveryStatusEnum.safeParse(status)
        expect(result.success).toBe(true)
      })
    })

    it('should reject an invalid status', () => {
      const result = deliveryStatusEnum.safeParse('UNKNOWN')
      expect(result.success).toBe(false)
    })
  })
})
