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

    // Score each reference based on color similarity
    const scoredReferences = allReferences.map((ref) => {
      let totalScore = 0;
      let matchCount = 0;

      // Check colorSamples from reference
      const refColors = ref.colorSamples as string[] | null;
      if (refColors && Array.isArray(refColors)) {
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
          totalScore += score;
          matchCount++;
        }
      }

      return {
        ...ref,
        matchScore: matchCount > 0 ? totalScore / matchCount : 0,
      };
    });

    // Sort by match score and take top results
    scoredReferences.sort((a, b) => b.matchScore - a.matchScore);
    const topMatches = scoredReferences.slice(0, limit);

    // Shuffle the top matches a bit to add variety
    const result = topMatches
      .map((ref) => ({
        ...ref,
        sortKey: ref.matchScore + Math.random() * 20,
      }))
      .sort((a, b) => b.sortKey - a.sortKey)
      .map(({ sortKey, matchScore, ...ref }) => ref);

    return NextResponse.json({
      success: true,
      data: result,
      matchMethod: "color_similarity",
      brandColors,
    });
  } catch (error) {
    console.error("Style reference match error:", error);
    return NextResponse.json(
      { error: "Failed to fetch style references" },
      { status: 500 }
    );
  }
}
