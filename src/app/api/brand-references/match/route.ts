import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { brandReferences } from "@/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import {
  getToneBucket,
  getEnergyBucket,
  getDensityBucket,
  getColorBucket,
  type ToneBucket,
  type EnergyBucket,
  type DensityBucket,
  type ColorBucket,
} from "@/lib/constants/reference-libraries";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      // Accept both old and new parameter names for backwards compatibility
      feelPlayfulSerious,
      feelBoldMinimal,
      signalTone,
      signalDensity,
      signalWarmth,
      signalEnergy,
      visualStyle,
      limit = 12,
      offset = 0,
    } = body;

    // Determine buckets from slider values (0-100 scale)
    // Use new names if provided, fall back to old names for backwards compatibility
    const toneBucket: ToneBucket = getToneBucket(
      signalTone ?? feelPlayfulSerious ?? 50
    );
    const densityBucket: DensityBucket = getDensityBucket(
      signalDensity ?? feelBoldMinimal ?? 50
    );
    const colorBucket: ColorBucket = getColorBucket(signalWarmth ?? 50);
    const energyBucket: EnergyBucket = getEnergyBucket(signalEnergy ?? 50);

    // Build a scoring query using SQL CASE statements
    // Score breakdown (total 10 points possible):
    // - Exact tone match: 3 points
    // - Exact density match: 2 points
    // - Exact color/warmth match: 2 points
    // - Exact energy match: 2 points
    // - Visual style match: 1 point
    const references = await db
      .select({
        id: brandReferences.id,
        name: brandReferences.name,
        description: brandReferences.description,
        imageUrl: brandReferences.imageUrl,
        toneBucket: brandReferences.toneBucket,
        energyBucket: brandReferences.energyBucket,
        densityBucket: brandReferences.densityBucket,
        colorBucket: brandReferences.colorBucket,
        colorSamples: brandReferences.colorSamples,
        visualStyles: brandReferences.visualStyles,
        industries: brandReferences.industries,
        displayOrder: brandReferences.displayOrder,
        usageCount: brandReferences.usageCount,
        score: sql<number>`
          (CASE WHEN ${
            brandReferences.toneBucket
          } = ${toneBucket} THEN 3 ELSE 0 END) +
          (CASE WHEN ${
            brandReferences.densityBucket
          } = ${densityBucket} THEN 2 ELSE 0 END) +
          (CASE WHEN ${
            brandReferences.colorBucket
          } = ${colorBucket} THEN 2 ELSE 0 END) +
          (CASE WHEN ${
            brandReferences.energyBucket
          } = ${energyBucket} THEN 2 ELSE 0 END) +
          (CASE WHEN ${
            visualStyle
              ? sql`${visualStyle} = ANY(${brandReferences.visualStyles})`
              : sql`false`
          } THEN 1 ELSE 0 END)
        `.as("score"),
      })
      .from(brandReferences)
      .where(eq(brandReferences.isActive, true))
      .orderBy(
        desc(sql`score`),
        brandReferences.displayOrder,
        desc(brandReferences.usageCount)
      )
      .limit(limit)
      .offset(offset);

    // Also get the total count for pagination
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(brandReferences)
      .where(eq(brandReferences.isActive, true));

    return NextResponse.json(
      {
        references,
        total: countResult?.count || 0,
        buckets: {
          tone: toneBucket,
          density: densityBucket,
          color: colorBucket,
          energy: energyBucket,
        },
      },
      {
        headers: {
          // Cache for 5 minutes - brand references don't change often
          "Cache-Control": "private, max-age=300",
        },
      }
    );
  } catch (error) {
    console.error("Brand references match error:", error);
    return NextResponse.json(
      { error: "Failed to fetch matching brand references" },
      { status: 500 }
    );
  }
}

// GET endpoint for fetching by specific buckets
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const toneBucket = searchParams.get("toneBucket") as ToneBucket | null;
    const densityBucket = searchParams.get(
      "densityBucket"
    ) as DensityBucket | null;
    const colorBucket = searchParams.get("colorBucket") as ColorBucket | null;
    const energyBucket = searchParams.get(
      "energyBucket"
    ) as EnergyBucket | null;
    const limit = parseInt(searchParams.get("limit") || "12");
    const offset = parseInt(searchParams.get("offset") || "0");

    const conditions = [eq(brandReferences.isActive, true)];

    if (toneBucket) {
      conditions.push(eq(brandReferences.toneBucket, toneBucket));
    }
    if (densityBucket) {
      conditions.push(eq(brandReferences.densityBucket, densityBucket));
    }
    if (colorBucket) {
      conditions.push(eq(brandReferences.colorBucket, colorBucket));
    }
    if (energyBucket) {
      conditions.push(eq(brandReferences.energyBucket, energyBucket));
    }

    const references = await db
      .select()
      .from(brandReferences)
      .where(and(...conditions))
      .orderBy(brandReferences.displayOrder, desc(brandReferences.usageCount))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ references });
  } catch (error) {
    console.error("Brand references fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch brand references" },
      { status: 500 }
    );
  }
}
