import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { scrapeBigged, type BiggedScraperOptions } from "@/lib/scrapers/bigged-scraper";
import { logger } from "@/lib/logger";

export const maxDuration = 300; // 5 minutes for long scraping operations

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      query,
      limit = 20,
      confidenceThreshold = 0.5,
      minImageWidth = 200,
      minImageHeight = 200,
      parallelBatchSize = 3,
      preview = false,
    } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );
    }

    if (limit > 100) {
      return NextResponse.json(
        { error: "Limit cannot exceed 100" },
        { status: 400 }
      );
    }

    const options: BiggedScraperOptions = {
      query: query.trim(),
      limit,
      confidenceThreshold,
      minImageWidth,
      minImageHeight,
      parallelBatchSize,
      preview,
      triggeredBy: session.user.id,
      triggeredByEmail: session.user.email,
    };

    const result = await scrapeBigged(options);

    return NextResponse.json({
      success: result.success,
      data: {
        results: result.results,
        summary: result.summary,
        importLogId: result.importLogId,
      },
      error: result.error,
    });
  } catch (error) {
    logger.error({ error }, "Bigged scrape error");
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
