import { NextRequest } from 'next/server'
import {
  recordStyleSelection,
  confirmStyleSelection,
  getUserStylePreferences,
} from '@/lib/ai/selection-history'
import type { DeliverableType } from '@/lib/constants/reference-libraries'
import { DELIVERABLE_TYPES } from '@/lib/constants/reference-libraries'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'

// POST - Record a style selection
export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAuth()

    const body = await request.json()
    const {
      styleId,
      deliverableType,
      styleAxis,
      selectionContext = 'chat',
      wasConfirmed = false,
      draftId,
    } = body

    if (!styleId || !deliverableType || !styleAxis) {
      throw Errors.badRequest('Missing required fields: styleId, deliverableType, styleAxis')
    }

    await recordStyleSelection({
      userId: session.user.id,
      styleId,
      deliverableType,
      styleAxis,
      selectionContext,
      wasConfirmed,
      draftId,
    })

    return successResponse({ success: true })
  })
}

// PUT - Confirm a style selection (when user proceeds with it)
export async function PUT(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAuth()

    const body = await request.json()
    const { styleId, draftId } = body

    if (!styleId) {
      throw Errors.badRequest('Missing required field: styleId')
    }

    await confirmStyleSelection(session.user.id, styleId, draftId)

    return successResponse({ success: true })
  })
}

// GET - Get user's style preferences
export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAuth()

    const searchParams = request.nextUrl.searchParams
    const deliverableTypeParam = searchParams.get('deliverableType')

    // Validate deliverable type parameter against known types
    const validDeliverableTypes = DELIVERABLE_TYPES.map((dt) => dt.value)
    const deliverableType: DeliverableType | undefined =
      deliverableTypeParam &&
      validDeliverableTypes.includes(deliverableTypeParam as DeliverableType)
        ? (deliverableTypeParam as DeliverableType)
        : undefined

    const preferences = await getUserStylePreferences(session.user.id, deliverableType)

    return successResponse(preferences)
  })
}
