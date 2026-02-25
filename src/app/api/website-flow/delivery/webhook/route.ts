import { NextRequest } from 'next/server'
import { db } from '@/db'
import { websiteProjects } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { deliveryWebhookSchema } from '@/lib/validations/website-delivery-schemas'
import { logger } from '@/lib/logger'
import type { WebsiteDeliveryStatus } from '@/db/schema'

/**
 * Webhook handler for external builder status updates (Framer, etc.)
 * No auth required — verify via webhook signature instead.
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      // Verify webhook signature if configured
      const webhookSecret = process.env.FRAMER_WEBHOOK_SECRET
      if (webhookSecret) {
        const signature = request.headers.get('x-framer-signature')
        if (!signature) {
          throw Errors.unauthorized('Missing webhook signature')
        }

        // Compute expected signature using HMAC-SHA256
        const rawBody = await request.clone().text()
        const encoder = new TextEncoder()
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(webhookSecret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        )
        const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
        const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')

        if (signature !== expectedSignature) {
          throw Errors.unauthorized('Invalid webhook signature')
        }
      }

      const body = await request.json()
      const validated = deliveryWebhookSchema.parse(body)

      logger.info(
        { projectId: validated.projectId, event: validated.event },
        'Received Framer delivery webhook'
      )

      // Map webhook events to delivery statuses
      const statusMap: Record<string, WebsiteDeliveryStatus> = {
        build_started: 'PUSHING',
        build_completed: 'PUSHED',
        build_failed: 'FAILED',
        deployed: 'DEPLOYED',
      }

      const newStatus = statusMap[validated.event]
      if (!newStatus) {
        throw Errors.badRequest(`Unknown webhook event: ${validated.event}`)
      }

      // Verify the project exists
      const [project] = await db
        .select({ id: websiteProjects.id })
        .from(websiteProjects)
        .where(eq(websiteProjects.id, validated.projectId))
        .limit(1)

      if (!project) {
        throw Errors.notFound('Website project')
      }

      // Update delivery status
      const updateData: {
        deliveryStatus: WebsiteDeliveryStatus
        updatedAt: Date
        framerDeployedUrl?: string
      } = {
        deliveryStatus: newStatus,
        updatedAt: new Date(),
      }

      // If deployed, also update the deployed URL from webhook data
      if (validated.event === 'deployed' && validated.data?.url) {
        updateData.framerDeployedUrl = validated.data.url as string
      }

      await db
        .update(websiteProjects)
        .set(updateData)
        .where(eq(websiteProjects.id, validated.projectId))

      return successResponse({ received: true, status: newStatus }, 200)
    },
    { endpoint: 'POST /api/website-flow/delivery/webhook' }
  )
}
