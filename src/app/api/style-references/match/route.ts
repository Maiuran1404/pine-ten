import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { users, deliverableStyleReferences } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

// Color distance calculation (simple RGB euclidean)
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function colorDistance(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return Infinity;

  return Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
      Math.pow(rgb1.g - rgb2.g, 2) +
      Math.pow(rgb1.b - rgb2.b, 2)
  );
}

// Determine color temperature from hex color (warm, cool, neutral)
function getColorTemperature(hex: string): "warm" | "cool" | "neutral" {
  const rgb = hexToRgb(hex);
  if (!rgb) return "neutral";

  // Calculate warmth based on red vs blue dominance
  const warmth = rgb.r - rgb.b;

  // If colors are close together (grays, whites, blacks), it's neutral
  const colorRange = Math.max(rgb.r, rgb.g, rgb.b) - Math.min(rgb.r, rgb.g, rgb.b);
  if (colorRange < 30) return "neutral";

  if (warmth > 30) return "warm";
  if (warmth < -30) return "cool";
  return "neutral";
}

// Get dominant temperature from array of colors
function getDominantTemperature(colors: string[]): "warm" | "cool" | "neutral" {
  const temps = colors.map(getColorTemperature);
  const counts = { warm: 0, cool: 0, neutral: 0 };
  temps.forEach(t => counts[t]++);

  if (counts.warm > counts.cool && counts.warm > counts.neutral) return "warm";
  if (counts.cool > counts.warm && counts.cool > counts.neutral) return "cool";
  return "neutral";
}

// GET - Fetch style references that match user's brand
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20");

    // Get user with company
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      with: {
        company: true,
      },
    });

    // Get all active style references
    const allReferences = await db.query.deliverableStyleReferences.findMany({
      where: eq(deliverableStyleReferences.isActive, true),
      limit: 100,
    });

    if (!user?.company || allReferences.length === 0) {
      // Return random references if no brand data
      const shuffled = allReferences.sort(() => 0.5 - Math.random());
      return NextResponse.json({
        success: true,
        data: shuffled.slice(0, limit),
        matchMethod: "random",
      });
    }

    const company = user.company;

    // Collect brand colors
    const brandColors: string[] = [];
    if (company.primaryColor) brandColors.push(company.primaryColor);
    if (company.secondaryColor) brandColors.push(company.secondaryColor);
    if (company.accentColor) brandColors.push(company.accentColor);
    if (company.brandColors && Array.isArray(company.brandColors)) {
      brandColors.push(...company.brandColors.filter((c): c is string => typeof c === 'string'));
    }

    if (brandColors.length === 0) {
      // Return random references if no colors
      const shuffled = allReferences.sort(() => 0.5 - Math.random());
      return NextResponse.json({
        success: true,
        data: shuffled.slice(0, limit),
        matchMethod: "random",
      });
    }

    // Get dominant temperature from brand colors for fallback matching
    const brandTemperature = getDominantTemperature(brandColors);

    // Score each reference based on color similarity
    const scoredReferences = allReferences.map((ref) => {
      let colorScore = 0;
      let matchCount = 0;
      let temperatureBonus = 0;

      // Check colorSamples from reference for exact color matching
      const refColors = ref.colorSamples as string[] | null;
      if (refColors && Array.isArray(refColors) && refColors.length > 0) {
        for (const brandColor of brandColors) {
          let minDistance = Infinity;
          for (const refColor of refColors) {
            const distance = colorDistance(brandColor, refColor);
            if (distance < minDistance) {
              minDistance = distance;
            }
          }
          // Normalize distance to a score (0-100, lower distance = higher score)
          const score = Math.max(0, 100 - minDistance / 4);
          colorScore += score;
          matchCount++;
        }
      }

      // Fallback: Use color temperature matching if no colorSamples or low score
      const refTemperature = ref.colorTemperature as string | null;
      if (refTemperature && refTemperature === brandTemperature) {
        temperatureBonus = 30; // Boost for matching temperature
      } else if (refTemperature === "neutral" || brandTemperature === "neutral") {
        temperatureBonus = 15; // Neutral matches everything moderately
      }

      // If reference has no color samples, rely more on temperature
      const baseScore = matchCount > 0 ? colorScore / matchCount : 20; // Base score of 20 for items without color data
      const totalScore = baseScore + temperatureBonus;

      return {
        ...ref,
        matchScore: totalScore,
        hasColorData: refColors && refColors.length > 0,
      };
    });

    // Sort by match score and take top results
    scoredReferences.sort((a, b) => b.matchScore - a.matchScore);

    // Ensure we always return results - mix high-scoring with some variety
    // Take top 70% by score, and add 30% random for variety
    const scoreThreshold = Math.floor(limit * 0.7);
    const varietyCount = limit - scoreThreshold;

    const topScored = scoredReferences.slice(0, scoreThreshold);
    const remaining = scoredReferences.slice(scoreThreshold);

    // Shuffle remaining and pick some for variety
    const shuffledRemaining = remaining.sort(() => 0.5 - Math.random()).slice(0, varietyCount);

    const combined = [...topScored, ...shuffledRemaining];

    // Final shuffle to mix high-scored and variety items
    const result = combined
      .map((ref) => ({
        ...ref,
        sortKey: ref.matchScore + Math.random() * 15,
      }))
      .sort((a, b) => b.sortKey - a.sortKey)
      .map(({ sortKey, matchScore, hasColorData, ...ref }) => ref);

    return NextResponse.json({
      success: true,
      data: result,
      matchMethod: "color_similarity",
      brandColors,
      brandTemperature,
    });
  } catch (error) {
    console.error("Style reference match error:", error);
    return NextResponse.json(
      { error: "Failed to fetch style references" },
      { status: 500 }
    );
  }
}
