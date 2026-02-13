import { db } from '@/db'
import { styleSelectionHistory, deliverableStyleReferences } from '@/db/schema'
import { eq, and, desc, sql, count } from 'drizzle-orm'
import type { DeliverableType } from '@/lib/constants/reference-libraries'

/**
 * Record a style selection event
 */
export async function recordStyleSelection(params: {
  userId: string
  styleId: string
  deliverableType: string
  styleAxis: string
  selectionContext?: 'chat' | 'browse' | 'refinement'
  wasConfirmed?: boolean
  draftId?: string
}): Promise<void> {
  const {
    userId,
    styleId,
    deliverableType,
    styleAxis,
    selectionContext = 'chat',
    wasConfirmed = false,
    draftId,
  } = params

  await db.insert(styleSelectionHistory).values({
    userId,
    styleId,
    deliverableType,
    styleAxis,
    selectionContext,
    wasConfirmed,
    draftId,
  })

  // Also increment the style's usage count
  await db
    .update(deliverableStyleReferences)
    .set({
      usageCount: sql`${deliverableStyleReferences.usageCount} + 1`,
    })
    .where(eq(deliverableStyleReferences.id, styleId))
}

/**
 * Mark a style selection as confirmed (user proceeded with it)
 */
export async function confirmStyleSelection(
  userId: string,
  styleId: string,
  draftId?: string
): Promise<void> {
  const conditions = [
    eq(styleSelectionHistory.userId, userId),
    eq(styleSelectionHistory.styleId, styleId),
  ]

  if (draftId) {
    conditions.push(eq(styleSelectionHistory.draftId, draftId))
  }

  await db
    .update(styleSelectionHistory)
    .set({ wasConfirmed: true })
    .where(and(...conditions))
}

export interface StylePreference {
  styleAxis: string
  count: number
  confirmedCount: number
  recentCount: number // Last 30 days
  preferenceScore: number // 0-100
}

export interface DeliverableTypePreference {
  deliverableType: string
  preferredAxes: StylePreference[]
}

/**
 * Get a user's style preferences based on their selection history
 */
export async function getUserStylePreferences(
  userId: string,
  _deliverableType?: DeliverableType
): Promise<{
  topAxes: StylePreference[]
  byDeliverableType: DeliverableTypePreference[]
  totalSelections: number
}> {
  // Get overall axis preferences
  const axisQuery = db
    .select({
      styleAxis: styleSelectionHistory.styleAxis,
      count: count(),
      confirmedCount: sql<number>`SUM(CASE WHEN ${styleSelectionHistory.wasConfirmed} THEN 1 ELSE 0 END)`,
      recentCount: sql<number>`SUM(CASE WHEN ${styleSelectionHistory.createdAt} > NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END)`,
    })
    .from(styleSelectionHistory)
    .where(eq(styleSelectionHistory.userId, userId))
    .groupBy(styleSelectionHistory.styleAxis)
    .orderBy(desc(count()))

  const axisResults = await axisQuery

  // Calculate preference scores
  const maxCount = Math.max(...axisResults.map((r) => Number(r.count)), 1)
  const topAxes: StylePreference[] = axisResults.map((r) => {
    const cnt = Number(r.count)
    const confirmed = Number(r.confirmedCount)
    const recent = Number(r.recentCount)

    // Score formula:
    // - Base score from selection frequency (0-50)
    // - Bonus for confirmed selections (0-30)
    // - Bonus for recent selections (0-20)
    const frequencyScore = (cnt / maxCount) * 50
    const confirmationRate = cnt > 0 ? confirmed / cnt : 0
    const confirmationScore = confirmationRate * 30
    const recencyScore = recent > 0 ? Math.min((recent / cnt) * 20, 20) : 0

    return {
      styleAxis: r.styleAxis,
      count: cnt,
      confirmedCount: confirmed,
      recentCount: recent,
      preferenceScore: Math.round(frequencyScore + confirmationScore + recencyScore),
    }
  })

  // Get preferences by deliverable type
  const byTypeQuery = db
    .select({
      deliverableType: styleSelectionHistory.deliverableType,
      styleAxis: styleSelectionHistory.styleAxis,
      count: count(),
      confirmedCount: sql<number>`SUM(CASE WHEN ${styleSelectionHistory.wasConfirmed} THEN 1 ELSE 0 END)`,
    })
    .from(styleSelectionHistory)
    .where(eq(styleSelectionHistory.userId, userId))
    .groupBy(styleSelectionHistory.deliverableType, styleSelectionHistory.styleAxis)
    .orderBy(styleSelectionHistory.deliverableType, desc(count()))

  const byTypeResults = await byTypeQuery

  // Group by deliverable type
  const typeMap = new Map<string, StylePreference[]>()
  byTypeResults.forEach((r) => {
    const existing = typeMap.get(r.deliverableType) || []
    existing.push({
      styleAxis: r.styleAxis,
      count: Number(r.count),
      confirmedCount: Number(r.confirmedCount),
      recentCount: 0, // Not tracked per-type for simplicity
      preferenceScore: 0, // Will be calculated below
    })
    typeMap.set(r.deliverableType, existing)
  })

  // Calculate scores per type
  const byDeliverableType: DeliverableTypePreference[] = []
  typeMap.forEach((axes, type) => {
    const typeMax = Math.max(...axes.map((a) => a.count), 1)
    const scoredAxes = axes.map((a) => ({
      ...a,
      preferenceScore: Math.round(
        (a.count / typeMax) * 70 + (a.confirmedCount / Math.max(a.count, 1)) * 30
      ),
    }))
    byDeliverableType.push({
      deliverableType: type,
      preferredAxes: scoredAxes,
    })
  })

  // Get total selections
  const totalResult = await db
    .select({ count: count() })
    .from(styleSelectionHistory)
    .where(eq(styleSelectionHistory.userId, userId))

  return {
    topAxes,
    byDeliverableType,
    totalSelections: Number(totalResult[0]?.count || 0),
  }
}

/**
 * Get history-based boost scores for a specific deliverable type
 * Returns a map of styleAxis -> boost score (0-30)
 */
export async function getHistoryBoostScores(
  userId: string,
  deliverableType: DeliverableType
): Promise<Map<string, number>> {
  const preferences = await getUserStylePreferences(userId, deliverableType)

  // Find the type-specific preferences
  const typePrefs = preferences.byDeliverableType.find((p) => p.deliverableType === deliverableType)

  const boostMap = new Map<string, number>()

  // If user has type-specific history, use that
  if (typePrefs && typePrefs.preferredAxes.length > 0) {
    const maxScore = Math.max(...typePrefs.preferredAxes.map((p) => p.preferenceScore), 1)
    typePrefs.preferredAxes.forEach((pref) => {
      // Boost score is 0-30 based on preference
      const boost = Math.round((pref.preferenceScore / maxScore) * 30)
      boostMap.set(pref.styleAxis, boost)
    })
  }
  // Fall back to overall preferences
  else if (preferences.topAxes.length > 0) {
    const maxScore = Math.max(...preferences.topAxes.map((p) => p.preferenceScore), 1)
    preferences.topAxes.forEach((pref) => {
      // Slightly lower boost for general preferences (0-20)
      const boost = Math.round((pref.preferenceScore / maxScore) * 20)
      boostMap.set(pref.styleAxis, boost)
    })
  }

  return boostMap
}

/**
 * Get recently selected styles for a user
 */
export async function getRecentlySelectedStyles(
  userId: string,
  limit: number = 5
): Promise<
  {
    id: string
    name: string
    styleAxis: string
    deliverableType: string
    selectedAt: Date
  }[]
> {
  const results = await db
    .select({
      id: deliverableStyleReferences.id,
      name: deliverableStyleReferences.name,
      styleAxis: deliverableStyleReferences.styleAxis,
      deliverableType: deliverableStyleReferences.deliverableType,
      selectedAt: styleSelectionHistory.createdAt,
    })
    .from(styleSelectionHistory)
    .innerJoin(
      deliverableStyleReferences,
      eq(styleSelectionHistory.styleId, deliverableStyleReferences.id)
    )
    .where(eq(styleSelectionHistory.userId, userId))
    .orderBy(desc(styleSelectionHistory.createdAt))
    .limit(limit)

  return results
}
