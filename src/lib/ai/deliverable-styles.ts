import { db } from "@/db";
import { deliverableStyleReferences } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import type { DeliverableType, StyleAxis } from "@/lib/constants/reference-libraries";

/**
 * Get initial diverse styles for a deliverable type
 * Returns one style per styleAxis for variety
 */
export async function getInitialDeliverableStyles(deliverableType: DeliverableType) {
  // Use a subquery to get the first (by featuredOrder, displayOrder) style per styleAxis
  const styles = await db
    .selectDistinctOn([deliverableStyleReferences.styleAxis], {
      id: deliverableStyleReferences.id,
      name: deliverableStyleReferences.name,
      description: deliverableStyleReferences.description,
      imageUrl: deliverableStyleReferences.imageUrl,
      deliverableType: deliverableStyleReferences.deliverableType,
      styleAxis: deliverableStyleReferences.styleAxis,
      subStyle: deliverableStyleReferences.subStyle,
      semanticTags: deliverableStyleReferences.semanticTags,
      featuredOrder: deliverableStyleReferences.featuredOrder,
      displayOrder: deliverableStyleReferences.displayOrder,
    })
    .from(deliverableStyleReferences)
    .where(
      and(
        eq(deliverableStyleReferences.deliverableType, deliverableType),
        eq(deliverableStyleReferences.isActive, true)
      )
    )
    .orderBy(
      deliverableStyleReferences.styleAxis,
      deliverableStyleReferences.featuredOrder,
      deliverableStyleReferences.displayOrder
    );

  return styles;
}

/**
 * Get more styles of the same style axis (paginated)
 */
export async function getMoreOfStyle(
  deliverableType: DeliverableType,
  styleAxis: StyleAxis,
  offset: number = 0,
  limit: number = 4
) {
  const styles = await db
    .select({
      id: deliverableStyleReferences.id,
      name: deliverableStyleReferences.name,
      description: deliverableStyleReferences.description,
      imageUrl: deliverableStyleReferences.imageUrl,
      deliverableType: deliverableStyleReferences.deliverableType,
      styleAxis: deliverableStyleReferences.styleAxis,
      subStyle: deliverableStyleReferences.subStyle,
      semanticTags: deliverableStyleReferences.semanticTags,
    })
    .from(deliverableStyleReferences)
    .where(
      and(
        eq(deliverableStyleReferences.deliverableType, deliverableType),
        eq(deliverableStyleReferences.styleAxis, styleAxis),
        eq(deliverableStyleReferences.isActive, true)
      )
    )
    .orderBy(deliverableStyleReferences.displayOrder)
    .limit(limit)
    .offset(offset);

  return styles;
}

/**
 * Get different styles (excluding already shown style axes)
 */
export async function getDifferentStyles(
  deliverableType: DeliverableType,
  excludeStyleAxes: StyleAxis[],
  limit: number = 4
) {
  // Get one style per remaining styleAxis
  const styles = await db
    .selectDistinctOn([deliverableStyleReferences.styleAxis], {
      id: deliverableStyleReferences.id,
      name: deliverableStyleReferences.name,
      description: deliverableStyleReferences.description,
      imageUrl: deliverableStyleReferences.imageUrl,
      deliverableType: deliverableStyleReferences.deliverableType,
      styleAxis: deliverableStyleReferences.styleAxis,
      subStyle: deliverableStyleReferences.subStyle,
      semanticTags: deliverableStyleReferences.semanticTags,
    })
    .from(deliverableStyleReferences)
    .where(
      and(
        eq(deliverableStyleReferences.deliverableType, deliverableType),
        eq(deliverableStyleReferences.isActive, true),
        // Exclude already shown style axes
        excludeStyleAxes.length > 0
          ? sql`${deliverableStyleReferences.styleAxis} NOT IN (${sql.join(excludeStyleAxes.map(s => sql`${s}`), sql`, `)})`
          : sql`true`
      )
    )
    .orderBy(
      deliverableStyleReferences.styleAxis,
      deliverableStyleReferences.featuredOrder,
      deliverableStyleReferences.displayOrder
    )
    .limit(limit);

  return styles;
}

/**
 * Increment usage count for selected styles
 */
export async function incrementStyleUsage(styleIds: string[]) {
  if (styleIds.length === 0) return;

  await db
    .update(deliverableStyleReferences)
    .set({
      usageCount: sql`${deliverableStyleReferences.usageCount} + 1`,
    })
    .where(sql`${deliverableStyleReferences.id} IN (${sql.join(styleIds.map(id => sql`${id}`), sql`, `)})`);
}

/**
 * Get all available style axes for a deliverable type
 */
export async function getAvailableStyleAxes(deliverableType: DeliverableType): Promise<StyleAxis[]> {
  const result = await db
    .selectDistinct({ styleAxis: deliverableStyleReferences.styleAxis })
    .from(deliverableStyleReferences)
    .where(
      and(
        eq(deliverableStyleReferences.deliverableType, deliverableType),
        eq(deliverableStyleReferences.isActive, true)
      )
    );

  return result.map((r) => r.styleAxis as StyleAxis);
}

/**
 * Get count of styles for a deliverable type and style axis
 */
export async function getStyleCount(
  deliverableType: DeliverableType,
  styleAxis?: StyleAxis
): Promise<number> {
  const conditions = [
    eq(deliverableStyleReferences.deliverableType, deliverableType),
    eq(deliverableStyleReferences.isActive, true),
  ];

  if (styleAxis) {
    conditions.push(eq(deliverableStyleReferences.styleAxis, styleAxis));
  }

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(deliverableStyleReferences)
    .where(and(...conditions));

  return result?.count || 0;
}
