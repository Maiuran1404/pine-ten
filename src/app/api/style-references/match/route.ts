import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { users, deliverableStyleReferences } from "@/db/schema";
import { eq } from "drizzle-orm";

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

// Color family classification for grouping
type ColorFamily = "red_pink" | "orange_yellow" | "green" | "blue_teal" | "purple" | "neutral" | "mixed";

function getColorFamily(hex: string): ColorFamily {
  const rgb = hexToRgb(hex);
  if (!rgb) return "neutral";

  const { r, g, b } = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;

  // If very low chroma, it's neutral (gray/white/black)
  if (chroma < 30) return "neutral";

  // Calculate hue
  let hue = 0;
  if (chroma > 0) {
    if (max === r) {
      hue = ((g - b) / chroma) % 6;
    } else if (max === g) {
      hue = (b - r) / chroma + 2;
    } else {
      hue = (r - g) / chroma + 4;
    }
    hue = Math.round(hue * 60);
    if (hue < 0) hue += 360;
  }

  // Map hue to color family
  if (hue >= 345 || hue < 15) return "red_pink";
  if (hue >= 15 && hue < 45) return "orange_yellow";
  if (hue >= 45 && hue < 75) return "orange_yellow";
  if (hue >= 75 && hue < 165) return "green";
  if (hue >= 165 && hue < 255) return "blue_teal";
  if (hue >= 255 && hue < 285) return "purple";
  if (hue >= 285 && hue < 345) return "red_pink"; // Magenta/Pink range

  return "neutral";
}

// Get dominant color family from array of colors
function getDominantColorFamily(colors: string[]): ColorFamily {
  if (colors.length === 0) return "neutral";

  const families = colors.map(getColorFamily);
  const counts: Record<ColorFamily, number> = {
    red_pink: 0,
    orange_yellow: 0,
    green: 0,
    blue_teal: 0,
    purple: 0,
    neutral: 0,
    mixed: 0,
  };

  families.forEach((f) => counts[f]++);

  // Find the dominant non-neutral family
  let maxFamily: ColorFamily = "neutral";
  let maxCount = 0;
  const nonNeutralFamilies: ColorFamily[] = ["red_pink", "orange_yellow", "green", "blue_teal", "purple"];

  for (const family of nonNeutralFamilies) {
    if (counts[family] > maxCount) {
      maxCount = counts[family];
      maxFamily = family;
    }
  }

  // If multiple families have same count, it's mixed
  const familiesWithMaxCount = nonNeutralFamilies.filter((f) => counts[f] === maxCount && maxCount > 0);
  if (familiesWithMaxCount.length > 1) return "mixed";

  return maxCount > 0 ? maxFamily : "neutral";
}

// Check if a color is very close to white or black (neutral)
function isNeutralColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;

  const { r, g, b } = rgb;
  // White-ish (all values high and similar)
  if (r > 220 && g > 220 && b > 220) return true;
  // Black-ish (all values low)
  if (r < 35 && g < 35 && b < 35) return true;
  // Gray-ish (all values similar)
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 30 && max < 200 && min > 55) return true;

  return false;
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
      limit: 200,
    });

    if (!user?.company || allReferences.length === 0) {
      // Return references grouped by color family if no brand data
      return groupByColorFamily(allReferences, limit, null);
    }

    const company = user.company;

    // Collect brand colors (excluding pure white/black which match everything)
    const brandColors: string[] = [];
    const brandColorsForMatching: string[] = [];
    if (company.primaryColor) {
      brandColors.push(company.primaryColor);
      if (!isNeutralColor(company.primaryColor)) {
        brandColorsForMatching.push(company.primaryColor);
      }
    }
    if (company.secondaryColor) {
      brandColors.push(company.secondaryColor);
      if (!isNeutralColor(company.secondaryColor)) {
        brandColorsForMatching.push(company.secondaryColor);
      }
    }
    if (company.accentColor) {
      brandColors.push(company.accentColor);
      if (!isNeutralColor(company.accentColor)) {
        brandColorsForMatching.push(company.accentColor);
      }
    }
    if (company.brandColors && Array.isArray(company.brandColors)) {
      const filtered = company.brandColors.filter((c): c is string => typeof c === "string");
      brandColors.push(...filtered);
      brandColorsForMatching.push(...filtered.filter((c) => !isNeutralColor(c)));
    }

    if (brandColorsForMatching.length === 0) {
      // Return references grouped by color family if no meaningful colors
      return groupByColorFamily(allReferences, limit, brandColors);
    }

    // Get brand color families for matching
    const brandColorFamilies = new Set(brandColorsForMatching.map(getColorFamily));

    // STRICT color matching: only match if reference has a color very close to brand colors
    // Distance threshold: ~50 (fairly close in RGB space)
    const STRICT_DISTANCE_THRESHOLD = 60;

    const scoredReferences = allReferences.map((ref) => {
      const refColors = ref.colorSamples as string[] | null;
      let bestMatchDistance = Infinity;
      let matchedBrandColor: string | null = null;
      let refDominantFamily: ColorFamily = "neutral";

      if (refColors && Array.isArray(refColors) && refColors.length > 0) {
        // Get dominant color family of the reference
        refDominantFamily = getDominantColorFamily(refColors);

        // Check for strict color matches
        for (const brandColor of brandColorsForMatching) {
          for (const refColor of refColors) {
            const distance = colorDistance(brandColor, refColor);
            if (distance < bestMatchDistance) {
              bestMatchDistance = distance;
              matchedBrandColor = brandColor;
            }
          }
        }
      } else {
        // If no color samples, use colorTemperature field to determine family
        const temp = ref.colorTemperature as string | null;
        if (temp === "warm") refDominantFamily = "orange_yellow";
        else if (temp === "cool") refDominantFamily = "blue_teal";
        else refDominantFamily = "neutral";
      }

      return {
        ...ref,
        matchDistance: bestMatchDistance,
        matchedBrandColor,
        refDominantFamily,
        isBrandMatch: bestMatchDistance < STRICT_DISTANCE_THRESHOLD,
      };
    });

    // Separate into brand matches and others
    const brandMatches = scoredReferences
      .filter((r) => r.isBrandMatch)
      .sort((a, b) => a.matchDistance - b.matchDistance);

    const otherRefs = scoredReferences.filter((r) => !r.isBrandMatch);

    // Group others by their dominant color family
    const colorFamilyGroups: Record<ColorFamily, typeof scoredReferences> = {
      red_pink: [],
      orange_yellow: [],
      green: [],
      blue_teal: [],
      purple: [],
      neutral: [],
      mixed: [],
    };

    for (const ref of otherRefs) {
      colorFamilyGroups[ref.refDominantFamily].push(ref);
    }

    // Build result
    const result: Array<(typeof scoredReferences)[0] & { colorGroup: string }> = [];

    // Add brand matches first
    for (const ref of brandMatches) {
      if (result.length >= limit) break;
      result.push({ ...ref, colorGroup: "matches_brand" });
    }

    // Define display order for color families (brand-related families first)
    const familyOrder: ColorFamily[] = [];

    // Put brand color families first
    if (brandColorFamilies.has("red_pink")) familyOrder.push("red_pink");
    if (brandColorFamilies.has("blue_teal")) familyOrder.push("blue_teal");
    if (brandColorFamilies.has("green")) familyOrder.push("green");
    if (brandColorFamilies.has("orange_yellow")) familyOrder.push("orange_yellow");
    if (brandColorFamilies.has("purple")) familyOrder.push("purple");

    // Then add remaining families
    const allFamilies: ColorFamily[] = ["red_pink", "blue_teal", "green", "orange_yellow", "purple", "neutral", "mixed"];
    for (const family of allFamilies) {
      if (!familyOrder.includes(family)) {
        familyOrder.push(family);
      }
    }

    const familyLabels: Record<ColorFamily, string> = {
      red_pink: "pink_coral",
      orange_yellow: "orange_yellow",
      green: "green",
      blue_teal: "blue_teal",
      purple: "purple",
      neutral: "neutral_tones",
      mixed: "colorful",
    };

    // Add from each color family
    for (const family of familyOrder) {
      const familyRefs = colorFamilyGroups[family];
      // Shuffle within each family for variety
      familyRefs.sort(() => 0.5 - Math.random());

      for (const ref of familyRefs) {
        if (result.length >= limit) break;
        result.push({ ...ref, colorGroup: familyLabels[family] });
      }
    }

    // Clean up internal scoring fields from response
    const cleanResult = result.map(
      ({ matchDistance, matchedBrandColor, refDominantFamily, isBrandMatch, ...ref }) => ref
    );

    return NextResponse.json({
      success: true,
      data: cleanResult,
      matchMethod: "color_grouped",
      brandColors,
      brandColorFamilies: Array.from(brandColorFamilies),
      groups: {
        matchesBrand: brandMatches.length,
        total: allReferences.length,
      },
    });
  } catch (error) {
    console.error("Style reference match error:", error);
    return NextResponse.json(
      { error: "Failed to fetch style references" },
      { status: 500 }
    );
  }
}

// Helper function to group references by color family when no brand data
function groupByColorFamily(
  references: typeof deliverableStyleReferences.$inferSelect[],
  limit: number,
  brandColors: string[] | null
) {
  const colorFamilyGroups: Record<ColorFamily, typeof references> = {
    red_pink: [],
    orange_yellow: [],
    green: [],
    blue_teal: [],
    purple: [],
    neutral: [],
    mixed: [],
  };

  for (const ref of references) {
    const refColors = ref.colorSamples as string[] | null;
    let family: ColorFamily = "neutral";

    if (refColors && Array.isArray(refColors) && refColors.length > 0) {
      family = getDominantColorFamily(refColors);
    } else {
      const temp = ref.colorTemperature as string | null;
      if (temp === "warm") family = "orange_yellow";
      else if (temp === "cool") family = "blue_teal";
    }

    colorFamilyGroups[family].push(ref);
  }

  const familyLabels: Record<ColorFamily, string> = {
    red_pink: "pink_coral",
    orange_yellow: "orange_yellow",
    green: "green",
    blue_teal: "blue_teal",
    purple: "purple",
    neutral: "neutral_tones",
    mixed: "colorful",
  };

  const familyOrder: ColorFamily[] = [
    "red_pink",
    "blue_teal",
    "green",
    "orange_yellow",
    "purple",
    "neutral",
    "mixed",
  ];

  const result: Array<(typeof references)[0] & { colorGroup: string }> = [];

  for (const family of familyOrder) {
    const familyRefs = colorFamilyGroups[family];
    familyRefs.sort(() => 0.5 - Math.random());

    for (const ref of familyRefs) {
      if (result.length >= limit) break;
      result.push({ ...ref, colorGroup: familyLabels[family] });
    }
  }

  return NextResponse.json({
    success: true,
    data: result,
    matchMethod: "color_grouped",
    brandColors,
  });
}
