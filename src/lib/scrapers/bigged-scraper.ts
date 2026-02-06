/**
 * Bigged Ad Spy Scraper
 *
 * A robust scraper for bigged.com/spy that:
 * - Uses Playwright for browser automation
 * - Implements content-based duplicate detection
 * - Has improved scrolling/pagination logic
 * - Validates URLs and image sizes
 * - Filters by confidence threshold
 * - Supports parallel batch processing
 */

import { createClient } from "@supabase/supabase-js";

// Dynamic import for playwright to avoid build errors on Vercel
// Note: This scraper requires Playwright and won't work on serverless platforms
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let playwrightModule: any = null;

async function getPlaywright() {
  if (!playwrightModule) {
    try {
      // Use string variable to prevent TypeScript from trying to resolve the module
      const moduleName = "playwright";
      playwrightModule = await import(/* webpackIgnore: true */ moduleName);
    } catch {
      throw new Error(
        "Playwright is not available. This scraper requires a local environment with Playwright installed. " +
        "Run 'pnpm add playwright' and 'npx playwright install chromium' to set it up."
      );
    }
  }
  return playwrightModule as { chromium: { launch: (options?: { headless?: boolean }) => Promise<any> } };
}
import { db } from "@/db";
import { deliverableStyleReferences, importLogs } from "@/db/schema";
import { eq, or, like } from "drizzle-orm";
import { classifyDeliverableStyle, type DeliverableStyleClassification } from "@/lib/ai/classify-deliverable-style";
import { generateContentHash, isValidImageUrl, validateImageUrl } from "@/lib/utils/image-hash";

// Types
export interface ScrapedMedia {
  thumbnailUrl: string;
  videoUrl?: string;
  pageId: string;
  uuid: string;
  type: "video" | "image";
}

export interface ImportResult {
  url: string;
  success: boolean;
  id?: string;
  name?: string;
  deliverableType?: string;
  styleAxis?: string;
  confidence?: number;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

export interface BiggedScraperOptions {
  query: string;
  limit?: number;
  confidenceThreshold?: number;
  minImageWidth?: number;
  minImageHeight?: number;
  parallelBatchSize?: number;
  preview?: boolean;
  includeVideos?: boolean; // Default false - skip video thumbnails
  onProgress?: (current: number, total: number, item?: ImportResult) => void;
  triggeredBy?: string;
  triggeredByEmail?: string;
}

export interface BiggedScraperResult {
  success: boolean;
  scraped: ScrapedMedia[];
  results: ImportResult[];
  summary: {
    totalScraped: number;
    totalAttempted: number;
    successful: number;
    failed: number;
    skipped: number;
  };
  importLogId?: string;
  error?: string;
}

// Constants
const BUCKET_NAME = "deliverable-styles";
const DEFAULT_LIMIT = 20;
const DEFAULT_CONFIDENCE_THRESHOLD = 0.5;
const DEFAULT_MIN_IMAGE_SIZE = 200;
const DEFAULT_PARALLEL_BATCH_SIZE = 3;
const SCROLL_WAIT_MS = 1500;
const MAX_NO_CHANGE_COUNT = 5; // Increased from 3 for better pagination
const PAGE_LOAD_TIMEOUT = 60000;
const SEARCH_WAIT_MS = 3000;

// Initialize Supabase client
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase configuration");
  }

  return createClient(url, key);
}

/**
 * Scrape media URLs from Bigged Ad Spy
 */
export async function scrapeBiggedUrls(
  query: string,
  maxItems: number = DEFAULT_LIMIT,
  onProgress?: (message: string) => void,
  includeVideos: boolean = false
): Promise<ScrapedMedia[]> {
  const { chromium } = await getPlaywright();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let browser: any = null;

  try {
    onProgress?.(`Starting scrape for: "${query}"`);

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Navigate to Bigged
    await page.goto("https://bigged.com/spy", {
      waitUntil: "domcontentloaded",
      timeout: PAGE_LOAD_TIMEOUT,
    });
    await page.waitForTimeout(5000);

    // Find and interact with the iframe
    const iframe = page.frameLocator("iframe").first();

    // Search
    const searchBox = iframe.getByRole("textbox", { name: "Search Bigged..." });
    await searchBox.click();
    await searchBox.fill(query);
    await searchBox.press("Enter");
    await page.waitForTimeout(SEARCH_WAIT_MS);

    // Scroll and collect with improved logic
    const allMedia: Map<string, ScrapedMedia> = new Map();
    let prevCount = 0;
    let noChangeCount = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 50; // Safety limit

    onProgress?.("Scrolling to load content...");

    while (allMedia.size < maxItems && noChangeCount < MAX_NO_CHANGE_COUNT && scrollAttempts < maxScrollAttempts) {
      scrollAttempts++;

      // Extract media URLs
      const media = await iframe.locator("img, video").evaluateAll((elements) => {
        const results: Array<{ src: string; type: string }> = [];
        elements.forEach((el) => {
          const src = (el as HTMLImageElement | HTMLVideoElement).src;
          if (src && src.includes("library.bigged.com")) {
            results.push({ src, type: el.tagName });
          }
        });
        return results;
      });

      // Process and deduplicate
      for (const { src, type } of media) {
        // Extract page_id and uuid from URL
        const pageIdMatch = src.match(/page_id=(\d+)/);
        const uuidMatch = src.match(/\/([a-f0-9-]{36})\.(jpg|mp4)$/);

        if (pageIdMatch && uuidMatch) {
          const pageId = pageIdMatch[1];
          const uuid = uuidMatch[1];
          const key = `${pageId}-${uuid}`;

          if (!allMedia.has(key)) {
            if (type === "VIDEO") {
              // Skip videos unless includeVideos is true
              if (includeVideos) {
                allMedia.set(key, {
                  thumbnailUrl: src.replace(".mp4", ".jpg").replace("/videos/", "/videos/thumbnails/"),
                  videoUrl: src,
                  pageId,
                  uuid,
                  type: "video",
                });
              }
            } else if (src.includes("/videos/thumbnails/")) {
              // Skip video thumbnails unless includeVideos is true
              if (includeVideos) {
                allMedia.set(key, {
                  thumbnailUrl: src,
                  videoUrl: src.replace("/thumbnails/", "/").replace(".jpg", ".mp4"),
                  pageId,
                  uuid,
                  type: "video",
                });
              }
            } else if (src.includes("/images/")) {
              allMedia.set(key, {
                thumbnailUrl: src,
                pageId,
                uuid,
                type: "image",
              });
            }
          }
        }
      }

      onProgress?.(`Found ${allMedia.size} unique items...`);

      // Improved scrolling - try multiple scroll strategies
      try {
        // Strategy 1: Scroll the iframe body
        await iframe.locator("body").evaluate((el) => {
          el.scrollTo(0, el.scrollHeight);
        });
      } catch {
        // Strategy 2: Scroll the main content area
        try {
          await iframe.locator('[class*="scroll"], [class*="content"]').first().evaluate((el) => {
            el.scrollTo(0, el.scrollHeight);
          });
        } catch {
          // Fallback: page-level scroll
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        }
      }

      await page.waitForTimeout(SCROLL_WAIT_MS);

      // Check if we found new items
      if (allMedia.size === prevCount) {
        noChangeCount++;
        // Try clicking "Load More" button if it exists
        try {
          const loadMoreBtn = iframe.locator('button:has-text("Load More"), button:has-text("Show More")');
          if (await loadMoreBtn.count() > 0) {
            await loadMoreBtn.first().click();
            await page.waitForTimeout(SCROLL_WAIT_MS);
            noChangeCount = 0; // Reset if we found a load more button
          }
        } catch {
          // No load more button, continue scrolling
        }
      } else {
        noChangeCount = 0;
      }
      prevCount = allMedia.size;
    }

    await browser.close();
    browser = null;

    const results = Array.from(allMedia.values()).slice(0, maxItems);
    onProgress?.(`Scraped ${results.length} items`);

    return results;
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

/**
 * Check for existing duplicates in the database
 */
async function checkDuplicates(
  items: ScrapedMedia[]
): Promise<Map<string, { isDuplicate: boolean; reason?: string }>> {
  const results = new Map<string, { isDuplicate: boolean; reason?: string }>();

  // Get all source URLs to check
  const sourceUrls = items.map((item) => item.thumbnailUrl);

  // Check for URL matches
  const existingByUrl = await db
    .select({ imageUrl: deliverableStyleReferences.imageUrl, sourceUrl: deliverableStyleReferences.sourceUrl })
    .from(deliverableStyleReferences)
    .where(
      or(
        ...sourceUrls.slice(0, 50).map((url) => eq(deliverableStyleReferences.sourceUrl, url)),
        ...sourceUrls.slice(0, 50).map((url) => like(deliverableStyleReferences.imageUrl, `%${url.split("/").pop()}%`))
      )
    );

  const existingUrls = new Set(existingByUrl.map((e) => e.sourceUrl).filter(Boolean));
  const existingImageNames = new Set(
    existingByUrl.map((e) => e.imageUrl?.split("/").pop()).filter(Boolean)
  );

  for (const item of items) {
    const key = `${item.pageId}-${item.uuid}`;

    // Check if source URL exists
    if (existingUrls.has(item.thumbnailUrl)) {
      results.set(key, { isDuplicate: true, reason: "URL already imported" });
      continue;
    }

    // Check if similar image name exists (bigged pattern)
    const imageName = `${item.pageId}-${item.uuid.substring(0, 8)}`;
    const matchingName = Array.from(existingImageNames).find((name) =>
      name?.includes(imageName)
    );
    if (matchingName) {
      results.set(key, { isDuplicate: true, reason: "Similar image already exists" });
      continue;
    }

    results.set(key, { isDuplicate: false });
  }

  return results;
}

/**
 * Process a batch of items in parallel
 */
async function processBatch(
  items: ScrapedMedia[],
  options: BiggedScraperOptions,
  supabase: ReturnType<typeof getSupabaseClient>,
  duplicateMap: Map<string, { isDuplicate: boolean; reason?: string }>
): Promise<ImportResult[]> {
  const results: ImportResult[] = [];

  await Promise.all(
    items.map(async (item) => {
      const key = `${item.pageId}-${item.uuid}`;
      const url = item.thumbnailUrl;

      try {
        // Check if duplicate
        const duplicateInfo = duplicateMap.get(key);
        if (duplicateInfo?.isDuplicate) {
          results.push({
            url,
            success: false,
            skipped: true,
            skipReason: duplicateInfo.reason || "Duplicate",
          });
          return;
        }

        // Validate URL
        if (!isValidImageUrl(url)) {
          results.push({
            url,
            success: false,
            error: "Invalid image URL",
          });
          return;
        }

        // Validate image (check if accessible and meets size requirements)
        const validation = await validateImageUrl(
          url,
          options.minImageWidth || DEFAULT_MIN_IMAGE_SIZE,
          options.minImageHeight || DEFAULT_MIN_IMAGE_SIZE
        );

        if (!validation.valid) {
          results.push({
            url,
            success: false,
            error: validation.error || "Validation failed",
          });
          return;
        }

        // Fetch the image
        const response = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; PineBot/1.0)" },
        });

        if (!response.ok) {
          results.push({
            url,
            success: false,
            error: `Failed to fetch: ${response.status}`,
          });
          return;
        }

        const contentType = response.headers.get("content-type") || "image/jpeg";
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString("base64");

        // Generate hash for duplicate detection
        const imageHash = generateContentHash(buffer);

        // Check hash against existing
        const existingByHash = await db
          .select({ id: deliverableStyleReferences.id })
          .from(deliverableStyleReferences)
          .where(eq(deliverableStyleReferences.imageHash, imageHash))
          .limit(1);

        if (existingByHash.length > 0) {
          results.push({
            url,
            success: false,
            skipped: true,
            skipReason: "Content hash match (exact duplicate)",
          });
          return;
        }

        // Determine media type
        let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg";
        if (contentType.includes("png")) mediaType = "image/png";
        else if (contentType.includes("webp")) mediaType = "image/webp";
        else if (contentType.includes("gif")) mediaType = "image/gif";

        // Classify with AI
        const classification = await classifyDeliverableStyle(base64, mediaType);

        // Filter out video thumbnails and UGC content
        if (classification.isVideoThumbnail || (classification.contentType && classification.contentType !== "designed_graphic")) {
          results.push({
            url,
            success: false,
            skipped: true,
            skipReason: `Not a designed graphic: ${classification.contentType || "video_thumbnail"}`,
            confidence: classification.confidence,
          });
          return;
        }

        // Check confidence threshold
        const confidenceThreshold = options.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
        if (classification.confidence < confidenceThreshold) {
          results.push({
            url,
            success: false,
            skipped: true,
            skipReason: `Low confidence: ${Math.round(classification.confidence * 100)}% (threshold: ${Math.round(confidenceThreshold * 100)}%)`,
            confidence: classification.confidence,
          });
          return;
        }

        // If preview mode, don't upload
        if (options.preview) {
          results.push({
            url,
            success: true,
            name: classification.name,
            deliverableType: classification.deliverableType,
            styleAxis: classification.styleAxis,
            confidence: classification.confidence,
          });
          return;
        }

        // Upload to Supabase Storage
        const timestamp = Date.now();
        const storagePath = `bigged/${timestamp}-${item.pageId}-${item.uuid.substring(0, 8)}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, buffer, {
            contentType: mediaType,
            upsert: false,
          });

        if (uploadError) {
          // Try to create bucket if it doesn't exist
          if (uploadError.message.includes("not found")) {
            await supabase.storage.createBucket(BUCKET_NAME, { public: true });
            const { error: retryError } = await supabase.storage
              .from(BUCKET_NAME)
              .upload(storagePath, buffer, {
                contentType: mediaType,
                upsert: false,
              });
            if (retryError) throw retryError;
          } else {
            throw uploadError;
          }
        }

        // Get public URL
        const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
        const imageUrl = urlData.publicUrl;

        // Insert into database
        const [inserted] = await db
          .insert(deliverableStyleReferences)
          .values({
            name: classification.name,
            description: classification.description,
            imageUrl,
            sourceUrl: url,
            imageHash,
            deliverableType: classification.deliverableType,
            styleAxis: classification.styleAxis,
            subStyle: classification.subStyle,
            semanticTags: classification.semanticTags,
            colorTemperature: classification.colorTemperature,
            energyLevel: classification.energyLevel,
            densityLevel: classification.densityLevel,
            formalityLevel: classification.formalityLevel,
            colorSamples: classification.colorSamples || [],
            industries: classification.industries || [],
            targetAudience: classification.targetAudience,
            visualElements: classification.visualElements || [],
            moodKeywords: classification.moodKeywords || [],
            isActive: true,
          })
          .returning({ id: deliverableStyleReferences.id });

        results.push({
          url,
          success: true,
          id: inserted.id,
          name: classification.name,
          deliverableType: classification.deliverableType,
          styleAxis: classification.styleAxis,
          confidence: classification.confidence,
        });
      } catch (error) {
        results.push({
          url,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    })
  );

  return results;
}

/**
 * Main scraper function
 */
export async function scrapeBigged(options: BiggedScraperOptions): Promise<BiggedScraperResult> {
  const startTime = Date.now();
  const supabase = getSupabaseClient();

  try {
    // Step 1: Scrape URLs (skip videos by default)
    const scraped = await scrapeBiggedUrls(
      options.query,
      options.limit || DEFAULT_LIMIT,
      (msg) => options.onProgress?.(0, 0, { url: msg, success: true }),
      options.includeVideos ?? false
    );

    if (scraped.length === 0) {
      return {
        success: true,
        scraped: [],
        results: [],
        summary: {
          totalScraped: 0,
          totalAttempted: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
        },
      };
    }

    // Step 2: Check for duplicates
    const duplicateMap = await checkDuplicates(scraped);

    // Step 3: Process in parallel batches
    const batchSize = options.parallelBatchSize || DEFAULT_PARALLEL_BATCH_SIZE;
    const allResults: ImportResult[] = [];

    for (let i = 0; i < scraped.length; i += batchSize) {
      const batch = scraped.slice(i, i + batchSize);
      const batchResults = await processBatch(batch, options, supabase, duplicateMap);

      allResults.push(...batchResults);

      // Report progress
      for (const result of batchResults) {
        options.onProgress?.(i + batchResults.indexOf(result) + 1, scraped.length, result);
      }

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < scraped.length) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    // Calculate summary
    const successful = allResults.filter((r) => r.success && !r.skipped).length;
    const skipped = allResults.filter((r) => r.skipped).length;
    const failed = allResults.filter((r) => !r.success && !r.skipped).length;

    // Log the import
    let importLogId: string | undefined;
    if (!options.preview) {
      const [logEntry] = await db
        .insert(importLogs)
        .values({
          source: "bigged",
          target: "deliverable_style",
          triggeredBy: options.triggeredBy || null,
          triggeredByEmail: options.triggeredByEmail || null,
          searchQuery: options.query,
          totalAttempted: allResults.length,
          totalSuccessful: successful,
          totalFailed: failed,
          totalSkipped: skipped,
          importedItems: allResults
            .filter((r) => r.success && !r.skipped)
            .map((r) => ({
              id: r.id!,
              name: r.name!,
              imageUrl: r.url,
              deliverableType: r.deliverableType,
              styleAxis: r.styleAxis,
              confidence: r.confidence,
            })),
          failedItems: allResults
            .filter((r) => !r.success && !r.skipped)
            .map((r) => ({
              url: r.url,
              error: r.error || "Unknown error",
            })),
          skippedItems: allResults
            .filter((r) => r.skipped)
            .map((r) => ({
              url: r.url,
              reason: r.skipReason || "Duplicate",
            })),
          processingTimeMs: Date.now() - startTime,
          confidenceThreshold: String(options.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD),
          status: failed === allResults.length ? "failed" : failed > 0 ? "partial" : "completed",
          completedAt: new Date(),
        })
        .returning({ id: importLogs.id });

      importLogId = logEntry.id;
    }

    return {
      success: true,
      scraped,
      results: allResults,
      summary: {
        totalScraped: scraped.length,
        totalAttempted: allResults.length,
        successful,
        failed,
        skipped,
      },
      importLogId,
    };
  } catch (error) {
    return {
      success: false,
      scraped: [],
      results: [],
      summary: {
        totalScraped: 0,
        totalAttempted: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
      },
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
