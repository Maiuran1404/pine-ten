import { db } from "@/db";
import { deliverableStyleReferences, users, companies } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { DeliverableType, StyleAxis } from "@/lib/constants/reference-libraries";
import { analyzeColorBucketFromHex, type ColorBucket } from "@/lib/constants/reference-libraries";
import { getHistoryBoostScores } from "./selection-history";

/**
 * Style axis characteristics for brand matching
 * Maps each style to its typical color temperature, energy level, and density
 */
const STYLE_CHARACTERISTICS: Record<StyleAxis, {
  colorAffinity: ColorBucket[];  // Preferred color temperatures
  energyLevel: "calm" | "balanced" | "energetic";
  densityLevel: "minimal" | "balanced" | "rich";
  industryAffinity: string[];  // Industries that typically prefer this style
}> = {
  minimal: {
    colorAffinity: ["cool", "neutral"],
    energyLevel: "calm",
    densityLevel: "minimal",
    industryAffinity: ["technology", "saas", "finance", "consulting", "healthcare"],
  },
  bold: {
    colorAffinity: ["warm", "cool"],  // Bold works with high contrast in any temperature
    energyLevel: "energetic",
    densityLevel: "rich",
    industryAffinity: ["entertainment", "sports", "gaming", "food", "retail"],
  },
  editorial: {
    colorAffinity: ["neutral", "cool"],
    energyLevel: "balanced",
    densityLevel: "rich",
    industryAffinity: ["media", "publishing", "fashion", "lifestyle", "luxury"],
  },
  corporate: {
    colorAffinity: ["cool", "neutral"],
    energyLevel: "calm",
    densityLevel: "balanced",
    industryAffinity: ["finance", "legal", "consulting", "insurance", "b2b", "enterprise"],
  },
  playful: {
    colorAffinity: ["warm", "neutral"],
    energyLevel: "energetic",
    densityLevel: "balanced",
    industryAffinity: ["education", "kids", "gaming", "food", "entertainment", "consumer"],
  },
  premium: {
    colorAffinity: ["neutral", "cool"],
    energyLevel: "calm",
    densityLevel: "balanced",
    industryAffinity: ["luxury", "fashion", "automotive", "real estate", "jewelry", "hospitality"],
  },
  organic: {
    colorAffinity: ["warm", "neutral"],
    energyLevel: "balanced",
    densityLevel: "balanced",
    industryAffinity: ["wellness", "health", "food", "beauty", "sustainability", "eco"],
  },
  tech: {
    colorAffinity: ["cool", "neutral"],
    energyLevel: "energetic",
    densityLevel: "minimal",
    industryAffinity: ["technology", "saas", "ai", "crypto", "fintech", "startup"],
  },
};

/**
 * Analyze brand colors to determine overall color temperature
 */
function analyzeBrandColorTemperature(company: {
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  brandColors: string[] | null;
}): { dominant: ColorBucket; distribution: Record<ColorBucket, number> } {
  const colors: string[] = [];

  if (company.primaryColor) colors.push(company.primaryColor);
  if (company.secondaryColor) colors.push(company.secondaryColor);
  if (company.accentColor) colors.push(company.accentColor);
  if (company.brandColors?.length) colors.push(...company.brandColors);

  if (colors.length === 0) {
    return { dominant: "neutral", distribution: { warm: 0, cool: 0, neutral: 1 } };
  }

  const bucketCounts: Record<ColorBucket, number> = { warm: 0, cool: 0, neutral: 0 };

  // Primary color has more weight
  const primaryBucket = company.primaryColor
    ? analyzeColorBucketFromHex(company.primaryColor)
    : "neutral";
  bucketCounts[primaryBucket] += 2;

  // Secondary and accent colors
  if (company.secondaryColor) {
    bucketCounts[analyzeColorBucketFromHex(company.secondaryColor)] += 1;
  }
  if (company.accentColor) {
    bucketCounts[analyzeColorBucketFromHex(company.accentColor)] += 1;
  }

  // Additional brand colors
  company.brandColors?.forEach(color => {
    bucketCounts[analyzeColorBucketFromHex(color)] += 0.5;
  });

  const total = bucketCounts.warm + bucketCounts.cool + bucketCounts.neutral;
  const distribution: Record<ColorBucket, number> = {
    warm: bucketCounts.warm / total,
    cool: bucketCounts.cool / total,
    neutral: bucketCounts.neutral / total,
  };

  const dominant = (Object.entries(bucketCounts) as [ColorBucket, number][])
    .sort((a, b) => b[1] - a[1])[0][0];

  return { dominant, distribution };
}

/**
 * Calculate brand match score for a style axis
 */
function calculateStyleScore(
  styleAxis: StyleAxis,
  brandColorProfile: { dominant: ColorBucket; distribution: Record<ColorBucket, number> },
  industry: string | null
): number {
  const characteristics = STYLE_CHARACTERISTICS[styleAxis];
  let score = 0;

  // Color affinity score (0-40 points)
  const colorMatch = characteristics.colorAffinity.includes(brandColorProfile.dominant);
  if (colorMatch) {
    score += 30;
    // Bonus for strong color match
    const affinityScore = characteristics.colorAffinity.reduce((acc, bucket) => {
      return acc + (brandColorProfile.distribution[bucket] || 0);
    }, 0);
    score += affinityScore * 10;
  } else {
    // Partial score for neutral brands (they work with most styles)
    if (brandColorProfile.dominant === "neutral") {
      score += 20;
    }
  }

  // Industry affinity score (0-30 points)
  if (industry) {
    const normalizedIndustry = industry.toLowerCase();
    const industryMatch = characteristics.industryAffinity.some(ind =>
      normalizedIndustry.includes(ind) || ind.includes(normalizedIndustry)
    );
    if (industryMatch) {
      score += 30;
    } else {
      // Partial score for related industries
      score += 10;
    }
  } else {
    // No industry specified, give neutral score
    score += 15;
  }

  // Base score for variety (ensure all styles get some score)
  score += 20;

  return Math.min(100, score);
}

export interface BrandAwareStyle {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  deliverableType: string;
  styleAxis: string;
  subStyle: string | null;
  semanticTags: string[];
  brandMatchScore: number;
  matchReason?: string;
  historyBoost?: number;  // Bonus from user's selection history
}

/**
 * Get deliverable styles scored and sorted by brand match
 */
export async function getBrandAwareStyles(
  deliverableType: DeliverableType,
  userId: string,
  options?: {
    limit?: number;
    includeAllAxes?: boolean;  // If true, returns top style per axis
  }
): Promise<BrandAwareStyle[]> {
  // Fetch user's company data
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      company: true,
    },
  });

  const company = user?.company;

  // Get all active styles for this deliverable type
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
      featuredOrder: deliverableStyleReferences.featuredOrder,
      displayOrder: deliverableStyleReferences.displayOrder,
      usageCount: deliverableStyleReferences.usageCount,
    })
    .from(deliverableStyleReferences)
    .where(
      and(
        eq(deliverableStyleReferences.deliverableType, deliverableType),
        eq(deliverableStyleReferences.isActive, true)
      )
    )
    .orderBy(
      deliverableStyleReferences.featuredOrder,
      deliverableStyleReferences.displayOrder
    );

  // If no company data, return styles with neutral scoring
  if (!company) {
    const neutralScored: BrandAwareStyle[] = styles.map(style => ({
      ...style,
      semanticTags: style.semanticTags || [],
      brandMatchScore: 50,
      matchReason: "No brand profile available",
    }));

    if (options?.includeAllAxes) {
      return getTopPerAxis(neutralScored, options.limit);
    }
    return neutralScored.slice(0, options?.limit || 8);
  }

  // Analyze brand color temperature
  const colorProfile = analyzeBrandColorTemperature({
    primaryColor: company.primaryColor,
    secondaryColor: company.secondaryColor,
    accentColor: company.accentColor,
    brandColors: company.brandColors,
  });

  // Get history-based boosts for personalization
  let historyBoosts = new Map<string, number>();
  try {
    historyBoosts = await getHistoryBoostScores(userId, deliverableType);
  } catch (error) {
    console.error("Error fetching history boosts:", error);
    // Continue without history boosts
  }

  // Score each style
  const scoredStyles: BrandAwareStyle[] = styles.map(style => {
    const brandScore = calculateStyleScore(
      style.styleAxis as StyleAxis,
      colorProfile,
      company.industry
    );

    // Add history boost (0-30 points)
    const historyBoost = historyBoosts.get(style.styleAxis) || 0;
    const totalScore = Math.min(100, brandScore + historyBoost);

    // Generate match reason
    const characteristics = STYLE_CHARACTERISTICS[style.styleAxis as StyleAxis];
    let matchReason = "";

    if (historyBoost >= 15) {
      matchReason = "Based on your preferences";
    } else if (totalScore >= 70) {
      if (characteristics.colorAffinity.includes(colorProfile.dominant)) {
        matchReason = `Matches your ${colorProfile.dominant} brand palette`;
      }
      if (company.industry) {
        const industryMatch = characteristics.industryAffinity.some(ind =>
          company.industry!.toLowerCase().includes(ind)
        );
        if (industryMatch) {
          matchReason = matchReason
            ? `${matchReason} and ${company.industry} industry`
            : `Popular in ${company.industry}`;
        }
      }
    } else if (totalScore >= 50) {
      matchReason = "Versatile style option";
    } else {
      matchReason = "Alternative direction";
    }

    return {
      ...style,
      semanticTags: style.semanticTags || [],
      brandMatchScore: totalScore,
      matchReason,
      historyBoost: historyBoost > 0 ? historyBoost : undefined,
    };
  });

  // Sort by brand match score (descending), then by featured/display order
  scoredStyles.sort((a, b) => {
    if (b.brandMatchScore !== a.brandMatchScore) {
      return b.brandMatchScore - a.brandMatchScore;
    }
    return 0; // Keep original order for same scores
  });

  if (options?.includeAllAxes) {
    return getTopPerAxis(scoredStyles, options.limit);
  }

  return scoredStyles.slice(0, options?.limit || 8);
}

/**
 * Get top scoring style per axis for variety
 */
function getTopPerAxis(
  styles: BrandAwareStyle[],
  limit?: number
): BrandAwareStyle[] {
  const seenAxes = new Set<string>();
  const result: BrandAwareStyle[] = [];

  // First pass: get highest scoring style per axis
  for (const style of styles) {
    if (!seenAxes.has(style.styleAxis)) {
      seenAxes.add(style.styleAxis);
      result.push(style);
    }
  }

  // Sort result by score to show best matches first
  result.sort((a, b) => b.brandMatchScore - a.brandMatchScore);

  return limit ? result.slice(0, limit) : result;
}

/**
 * Get more styles of a specific axis, scored by brand match
 */
export async function getBrandAwareStylesOfAxis(
  deliverableType: DeliverableType,
  styleAxis: StyleAxis,
  userId: string,
  offset: number = 0,
  limit: number = 4
): Promise<BrandAwareStyle[]> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      company: true,
    },
  });

  const company = user?.company;

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

  // Score styles if we have company data
  if (company) {
    const colorProfile = analyzeBrandColorTemperature({
      primaryColor: company.primaryColor,
      secondaryColor: company.secondaryColor,
      accentColor: company.accentColor,
      brandColors: company.brandColors,
    });

    return styles.map(style => ({
      ...style,
      semanticTags: style.semanticTags || [],
      brandMatchScore: calculateStyleScore(styleAxis, colorProfile, company.industry),
      matchReason: `More ${styleAxis} options`,
    }));
  }

  return styles.map(style => ({
    ...style,
    semanticTags: style.semanticTags || [],
    brandMatchScore: 50,
    matchReason: `More ${styleAxis} options`,
  }));
}
