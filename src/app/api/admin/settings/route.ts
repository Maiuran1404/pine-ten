import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { auditHelpers, actorFromUser } from '@/lib/audit'
import { getAllSettings, getSetting, setSetting } from '@/lib/app-settings'
import { adminSettingsSchema } from '@/lib/validations'

export async function GET() {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const settings = await getAllSettings()

      return successResponse({ settings })
    },
    { endpoint: 'GET /api/admin/settings' }
  )
}

export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      const session = await requireAdmin()

      const body = await request.json()
      const { key, value } = adminSettingsSchema.parse(body)

      // Get previous value for audit logging
      const previousValue = await getSetting(key)

      await setSetting(key, value, session.user.id)

      // Audit log: Track settings changes for compliance
      auditHelpers.settingsUpdate(
        actorFromUser(session.user),
        key,
        previousValue,
        value,
        'POST /api/admin/settings'
      )

      return successResponse({ success: true })
    },
    { endpoint: 'POST /api/admin/settings' }
  )
}
