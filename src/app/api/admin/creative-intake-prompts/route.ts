import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { db } from '@/db'
import { platformSettings } from '@/db/schema'
import { eq } from 'drizzle-orm'

const CREATIVE_INTAKE_PROMPTS_KEY = 'creative_intake_prompts'

/**
 * GET /api/admin/creative-intake-prompts
 *
 * Retrieves the creative intake prompts configuration.
 * Returns null if no custom config has been saved (use defaults in frontend).
 */
export async function GET() {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const result = await db
        .select()
        .from(platformSettings)
        .where(eq(platformSettings.key, CREATIVE_INTAKE_PROMPTS_KEY))
        .limit(1)

      if (result.length > 0) {
        return successResponse({ config: result[0].value })
      }

      // Return null to indicate frontend should use defaults
      return successResponse({ config: null })
    },
    { endpoint: 'GET /api/admin/creative-intake-prompts' }
  )
}

/**
 * POST /api/admin/creative-intake-prompts
 *
 * Saves the creative intake prompts configuration.
 * Expects a JSON body with { config: PromptConfig }
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const body = await request.json()
      const { config } = body

      if (!config) {
        throw Errors.badRequest('Config is required')
      }

      // Validate required config fields
      if (!config.basePrompt || typeof config.basePrompt !== 'string') {
        throw Errors.badRequest('basePrompt is required and must be a string')
      }

      if (!config.servicePrompts || typeof config.servicePrompts !== 'object') {
        throw Errors.badRequest('servicePrompts is required and must be an object')
      }

      if (!config.settings || typeof config.settings !== 'object') {
        throw Errors.badRequest('settings is required and must be an object')
      }

      // Upsert the creative intake prompts config
      const existing = await db
        .select()
        .from(platformSettings)
        .where(eq(platformSettings.key, CREATIVE_INTAKE_PROMPTS_KEY))
        .limit(1)

      if (existing.length > 0) {
        await db
          .update(platformSettings)
          .set({
            value: config,
            description: 'Creative intake AI prompts and smart defaults configuration',
            updatedAt: new Date(),
          })
          .where(eq(platformSettings.key, CREATIVE_INTAKE_PROMPTS_KEY))
      } else {
        await db.insert(platformSettings).values({
          key: CREATIVE_INTAKE_PROMPTS_KEY,
          value: config,
          description: 'Creative intake AI prompts and smart defaults configuration',
        })
      }

      return successResponse({ success: true })
    },
    { endpoint: 'POST /api/admin/creative-intake-prompts' }
  )
}
