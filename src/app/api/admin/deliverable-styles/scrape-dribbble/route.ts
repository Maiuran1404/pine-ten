import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/require-auth";
import { withErrorHandling, successResponse, Errors } from "@/lib/errors";
import { db } from "@/db";
import { deliverableStyleReferences } from "@/db/schema";
import { classifyDeliverableStyle } from "@/lib/ai/classify-deliverable-style";
import { getAdminStorageClient } from "@/lib/supabase/server";
import FirecrawlApp from "@mendable/firecrawl-js";
import { logger } from "@/lib/logger";

const BUCKET_NAME = "deliverable-styles";

// Initialize Firecrawl if API key is available
const firecrawl = process.env.FIRECRAWL_API_KEY
  ? new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY })
  : null;

interface ScrapeResult {
  dribbbleUrl: string;
  cdnUrl: string | null;
  success: boolean;
  imported?: {
    id: string;
    name: string;
    imageUrl: string;
    deliverableType: string;
    styleAxis: string;
  };
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

// Extract og:image from HTML
function extractOgImage(html: string): string | null {
  // Try multiple patterns for og:image
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// Validate Dribbble shot URL
function isDribbbleShot(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "dribbble.com" &&
      parsed.pathname.startsWith("/shots/")
    );
  } catch (error) {
    logger.debug({ err: error, url }, "Failed to parse Dribbble URL");
    return false;
  }
}

// POST: Scrape Dribbble URLs and import them
export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin();

      const body = await request.json();
      const { urls, dryRun = false } = body as {
        urls: string[];
        dryRun?: boolean;
      };

      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        throw Errors.badRequest("No URLs provided");
      }

      // Filter to only valid Dribbble shot URLs
      const validUrls = urls.filter(isDribbbleShot);
      const invalidUrls = urls.filter((u) => !isDribbbleShot(u));

      if (validUrls.length === 0) {
        throw Errors.badRequest(
          "No valid Dribbble shot URLs provided. URLs must be in format: https://dribbble.com/shots/XXXXX-Name"
        );
      }

      // Limit to 20 URLs per request
      const urlsToProcess = validUrls.slice(0, 20);
      const results: ScrapeResult[] = [];

      // Get existing references to check for duplicates
      const existingRefs = await db
        .select({
          name: deliverableStyleReferences.name,
          imageUrl: deliverableStyleReferences.imageUrl,
        })
        .from(deliverableStyleReferences);

      const existingNames = new Set(
        existingRefs.map((r) => r.name.toLowerCase())
      );
      const existingImageIds = new Set(
        existingRefs.map((r) => {
          const match = r.imageUrl.match(/userupload\/(\d+)/);
          return match ? match[1] : null;
        }).filter(Boolean)
      );

      for (const dribbbleUrl of urlsToProcess) {
        try {
          let html: string | null = null;

          // Try Firecrawl first if available (handles JS rendering better)
          if (firecrawl) {
            try {
              const scrapeResult = await firecrawl.scrape(dribbbleUrl, {
                formats: ["html"],
                waitFor: 3000,
              });
              html = scrapeResult.html || null;
            } catch (firecrawlError) {
              logger.debug(
                { error: firecrawlError, url: dribbbleUrl },
                "Firecrawl failed, falling back to fetch"
              );
            }
          }

          // Fallback to simple fetch
          if (!html) {
            const response = await fetch(dribbbleUrl, {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept:
                  "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
              },
            });

            if (!response.ok) {
              results.push({
                dribbbleUrl,
                cdnUrl: null,
                success: false,
                error: `Failed to fetch: ${response.status}`,
              });
              continue;
            }

            html = await response.text();
          }

          // Extract og:image CDN URL
          const cdnUrl = extractOgImage(html);

          if (!cdnUrl) {
            results.push({
              dribbbleUrl,
              cdnUrl: null,
              success: false,
              error: "Could not find og:image in page",
            });
            continue;
          }

          // Check if already imported
          const uploadIdMatch = cdnUrl.match(/userupload\/(\d+)/);
          if (uploadIdMatch && existingImageIds.has(uploadIdMatch[1])) {
            results.push({
              dribbbleUrl,
              cdnUrl,
              success: true,
              skipped: true,
              skipReason: "Image already imported",
            });
            continue;
          }

          // If dry run, just return the CDN URL without importing
          if (dryRun) {
            results.push({
              dribbbleUrl,
              cdnUrl,
              success: true,
            });
            continue;
          }

          // Fetch the image from CDN
          const imageResponse = await fetch(cdnUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; PineBot/1.0)",
            },
          });

          if (!imageResponse.ok) {
            results.push({
              dribbbleUrl,
              cdnUrl,
              success: false,
              error: `Failed to fetch image: ${imageResponse.status}`,
            });
            continue;
          }

          const contentType = imageResponse.headers.get("content-type") || "";
          const arrayBuffer = await imageResponse.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64 = buffer.toString("base64");

          // Check file size (max 10MB)
          if (buffer.length > 10 * 1024 * 1024) {
            results.push({
              dribbbleUrl,
              cdnUrl,
              success: false,
              error: "Image too large (max 10MB)",
            });
            continue;
          }

          // Determine media type
          let mediaType:
            | "image/jpeg"
            | "image/png"
            | "image/gif"
            | "image/webp" = "image/png";
          if (contentType.includes("jpeg") || contentType.includes("jpg")) {
            mediaType = "image/jpeg";
          } else if (contentType.includes("gif")) {
            mediaType = "image/gif";
          } else if (contentType.includes("webp")) {
            mediaType = "image/webp";
          }

          // Classify with AI
          const classification = await classifyDeliverableStyle(
            base64,
            mediaType
          );

          // Check for duplicate name
          if (existingNames.has(classification.name.toLowerCase())) {
            results.push({
              dribbbleUrl,
              cdnUrl,
              success: true,
              skipped: true,
              skipReason: `Duplicate name: "${classification.name}"`,
            });
            continue;
          }

          // Generate storage path
          const timestamp = Date.now();
          const cleanName = classification.name
            .replace(/[^a-zA-Z0-9-]/g, "_")
            .substring(0, 50);
          const storagePath = `${timestamp}-${cleanName}.webp`;

          // Upload to Supabase Storage
          const supabase = getAdminStorageClient();
          const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(storagePath, buffer, {
              contentType: mediaType,
              upsert: false,
            });

          if (uploadError) {
            if (uploadError.message.includes("not found")) {
              await supabase.storage.createBucket(BUCKET_NAME, {
                public: true,
              });
              await supabase.storage
                .from(BUCKET_NAME)
                .upload(storagePath, buffer, {
                  contentType: mediaType,
                  upsert: false,
                });
            } else if (!uploadError.message.includes("already exists")) {
              throw uploadError;
            }
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(storagePath);

          const imageUrl = urlData.publicUrl;

          // Insert into database
          const [newStyle] = await db
            .insert(deliverableStyleReferences)
            .values({
              name: classification.name,
              description: classification.description,
              imageUrl,
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
            .returning();

          // Add to existing sets to prevent duplicates in this batch
          existingNames.add(classification.name.toLowerCase());
          if (uploadIdMatch) {
            existingImageIds.add(uploadIdMatch[1]);
          }

          results.push({
            dribbbleUrl,
            cdnUrl,
            success: true,
            imported: {
              id: newStyle.id,
              name: classification.name,
              imageUrl,
              deliverableType: classification.deliverableType,
              styleAxis: classification.styleAxis,
            },
          });

          // Small delay between imports to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          logger.error({ error, url: dribbbleUrl }, "Error processing Dribbble URL");
          results.push({
            dribbbleUrl,
            cdnUrl: null,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      const summary = {
        total: urlsToProcess.length,
        successful: results.filter((r) => r.success && r.imported).length,
        skipped: results.filter((r) => r.skipped).length,
        failed: results.filter((r) => !r.success).length,
        invalidUrls: invalidUrls.length,
        remaining: validUrls.length - urlsToProcess.length,
      };

      return successResponse({
        dryRun,
        summary,
        results,
        invalidUrls:
          invalidUrls.length > 0
            ? invalidUrls.map((u) => ({
                url: u,
                reason: "Not a valid Dribbble shot URL",
              }))
            : undefined,
      });
    },
    { endpoint: "POST /api/admin/deliverable-styles/scrape-dribbble" }
  );
}
