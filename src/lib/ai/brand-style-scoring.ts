import { db } from "@/db";
import { deliverableStyleReferences, users, companies } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { DeliverableType, StyleAxis } from "@/lib/constants/reference-libraries";
import { analyzeColorBucketFromHex, type ColorBucket } from "@/lib/constants/reference-libraries";
import { getHistoryBoostScores } from "./selection-history";

/**
 * Multi-Factor Scoring Weights
 * These control the relative importance of each scoring factor.
 * All weights should sum to 1.0
 */
const SCORING_WEIGHTS = {
  brand: 0.35,      // Brand color + industry match
  history: 0.30,    // User selection history
  popularity: 0.20, // Overall usage popularity
  freshness: 0.15,  // Recently added bonus
};

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

/**
 * Calculate popularity score (0-100)
 * Based on usage count relative to the most popular style
 */
function calculatePopularityScore(usageCount: number, maxUsageCount: number): number {
  if (maxUsageCount === 0) return 50;

  const normalizedPopularity = usageCount / maxUsageCount;
  // Use sqrt to give a boost to moderately popular items
  return Math.round(Math.sqrt(normalizedPopularity) * 100);
}

/**
 * Calculate freshness score (0-100)
 * Gives bonus to recently added styles
 */
function calculateFreshnessScore(createdAt: Date | null): number {
  if (!createdAt) return 50;

  const now = new Date();
  const ageInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

  // Brand new styles get 100, decays over 60 days to 50
  if (ageInDays <= 7) return 100;
  if (ageInDays <= 14) return 90;
  if (ageInDays <= 30) return 75;
  if (ageInDays <= 60) return 60;
  return 50;
}

/**
 * Calculate multi-factor score with configurable weights
 */
function calculateMultiFactorScore(factors: {
  brand: number;
  history: number;
  popularity: number;
  freshness: number;
}, hasHistory: boolean): number {
  const weights = { ...SCORING_WEIGHTS };

  // If no history, redistribute that weight
  if (!hasHistory) {
    weights.brand += weights.history * 0.5;
    weights.popularity += weights.history * 0.5;
    weights.history = 0;
  }

  return Math.round(
    factors.brand * weights.brand +
    factors.history * weights.history +
    factors.popularity * weights.popularity +
    factors.freshness * weights.freshness
  );
}

export interface ScoreFactors {
  brand: number;
  history: number;
  popularity: number;
  freshness: number;
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
  matchReasons?: string[];  // Multiple reasons for rich tooltips
  historyBoost?: number;  // Bonus from user's selection history
  scoreFactors?: ScoreFactors;  // Breakdown of scoring factors
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
      createdAt: deliverableStyleReferences.createdAt,
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

  // Calculate max usage for popularity normalization
  const maxUsage = Math.max(...styles.map(s => s.usageCount || 0), 1);

  // If no company data, use popularity and freshness scoring only
  if (!company) {
    const neutralScored: BrandAwareStyle[] = styles.map(style => {
      const popularityScore = calculatePopularityScore(style.usageCount || 0, maxUsage);
      const freshnessScore = calculateFreshnessScore(style.createdAt);

      // Use multi-factor with no brand/history, redistributed weights
      const totalScore = calculateMultiFactorScore(
        { brand: 50, history: 0, popularity: popularityScore, freshness: freshnessScore },
        false
      );

      const matchReasons: string[] = [];
      if (popularityScore >= 70) matchReasons.push("Popular choice");
      if (freshnessScore >= 90) matchReasons.push("Recently added");

      return {
        ...style,
        semanticTags: style.semanticTags || [],
        brandMatchScore: totalScore,
        matchReason: matchReasons.length > 0 ? matchReasons[0] : "No brand profile available",
        matchReasons,
        scoreFactors: { brand: 50, history: 0, popularity: popularityScore, freshness: freshnessScore },
      };
    });

    // Sort by score
    neutralScored.sort((a, b) => b.brandMatchScore - a.brandMatchScore);

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

  const hasHistory = historyBoosts.size > 0;

  // Score each style using multi-factor scoring
  const scoredStyles: BrandAwareStyle[] = styles.map(style => {
    const characteristics = STYLE_CHARACTERISTICS[style.styleAxis as StyleAxis];

    // Calculate individual factor scores
    const brandScore = calculateStyleScore(
      style.styleAxis as StyleAxis,
      colorProfile,
      company.industry
    );

    // Convert history boost (0-30) to 0-100 scale
    const historyBoost = historyBoosts.get(style.styleAxis) || 0;
    const historyScore = Math.round((historyBoost / 30) * 100);

    const popularityScore = calculatePopularityScore(style.usageCount || 0, maxUsage);
    const freshnessScore = calculateFreshnessScore(style.createdAt);

    // Calculate multi-factor total score
    const scoreFactors: ScoreFactors = {
      brand: brandScore,
      history: historyScore,
      popularity: popularityScore,
      freshness: freshnessScore,
    };

    const totalScore = calculateMultiFactorScore(scoreFactors, hasHistory);

    // Generate match reasons
    const matchReasons: string[] = [];

    // History-based reason (highest priority)
    if (historyScore >= 50) {
      matchReasons.push("Based on your preferences");
    }

    // Brand-based reasons
    if (characteristics && characteristics.colorAffinity.includes(colorProfile.dominant)) {
      matchReasons.push(`Matches your ${colorProfile.dominant} palette`);
    }
    if (company.industry) {
      const industryMatch = characteristics?.industryAffinity.some(ind =>
        company.industry!.toLowerCase().includes(ind)
      );
      if (industryMatch) {
        matchReasons.push(`Popular in ${company.industry}`);
      }
    }

    // Popularity-based reason
    if (popularityScore >= 70) {
      matchReasons.push("Popular choice");
    }

    // Freshness-based reason
    if (freshnessScore >= 90) {
      matchReasons.push("Recently added");
    }

    // Determine primary match reason
    let matchReason = "Versatile style option";
    if (matchReasons.length > 0) {
      matchReason = matchReasons[0];
    } else if (totalScore < 50) {
      matchReason = "Alternative direction";
    }

    return {
      ...style,
      semanticTags: style.semanticTags || [],
      brandMatchScore: totalScore,
      matchReason,
      matchReasons,
      historyBoost: historyBoost > 0 ? historyBoost : undefined,
      scoreFactors,
    };
  });

  // Sort by total score (descending)
  scoredStyles.sort((a, b) => b.brandMatchScore - a.brandMatchScore);

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
