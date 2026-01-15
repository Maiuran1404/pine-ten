import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { brandReferences } from "@/db/schema";
import { classifyBrandImage } from "@/lib/ai/classify-brand-image";
import { createClient } from "@supabase/supabase-js";
import { optimizeImage } from "@/lib/image/optimize";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET_NAME = "brand-references";

interface ImportResult {
  url: string;
  success: boolean;
  data?: {
    id: string;
    name: string;
    imageUrl: string;
    classification: {
      toneBucket: string;
      energyBucket: string;
      densityBucket: string;
      colorBucket: string;
      colorSamples: string[];
      confidence: number;
    };
  };
  error?: string;
}

// POST: Import images from URLs (fetch, classify, and save)
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { role?: string };
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { urls } = body as { urls: string[] };

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "No URLs provided" },
        { status: 400 }
      );
    }

    // Limit to 20 URLs per request
    const urlsToProcess = urls.slice(0, 20);
    const results: ImportResult[] = [];

    for (const url of urlsToProcess) {
      try {
        // Validate URL
        const parsedUrl = new URL(url);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          results.push({
            url,
            success: false,
            error: "Invalid URL protocol",
          });
          continue;
        }

        // Fetch the image
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; PineBot/1.0)",
          },
        });

        if (!response.ok) {
          results.push({
            url,
            success: false,
            error: `Failed to fetch: ${response.status} ${response.statusText}`,
          });
          continue;
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.startsWith("image/")) {
          results.push({
            url,
            success: false,
            error: `Not an image: ${contentType}`,
          });
          continue;
        }

        // Convert to buffer and base64
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Check file size (max 10MB)
        if (buffer.length > 10 * 1024 * 1024) {
          results.push({
            url,
            success: false,
            error: "Image too large (max 10MB)",
          });
          continue;
        }

        // Optimize image - creates WebP variants (full, preview, thumbnail)
        const variants = await optimizeImage(buffer);

        // Use optimized full image for AI classification (smaller = faster)
        const base64 = variants.full.buffer.toString("base64");
        const mediaType = "image/webp" as const;

        // Classify with AI
        const classification = await classifyBrandImage(base64, mediaType);

        // Generate folder name from URL
        const urlPath = parsedUrl.pathname;
        const originalFilename =
          urlPath.split("/").pop() || `imported-${Date.now()}`;
        const cleanFilename = originalFilename
          .replace(/\.[^.]+$/, "") // Remove extension
          .replace(/[^a-zA-Z0-9-]/g, "_");
        const timestamp = Date.now();
        const folderPath = `${timestamp}-${cleanFilename}`;

        // Helper to upload a variant
        const uploadVariant = async (
          variantName: string,
          variantBuffer: Buffer
        ) => {
          const path = `${folderPath}/${variantName}.webp`;
          const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(path, variantBuffer, {
              contentType: "image/webp",
              upsert: false,
            });

          if (error) {
            // If bucket doesn't exist, create it and retry
            if (error.message.includes("not found")) {
              await supabase.storage.createBucket(BUCKET_NAME, {
                public: true,
              });
              const { error: retryError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(path, variantBuffer, {
                  contentType: "image/webp",
                  upsert: false,
                });
              if (retryError) throw retryError;
            } else {
              throw error;
            }
          }
          return path;
        };

        // Upload all variants in parallel
        await Promise.all([
          uploadVariant("full", variants.full.buffer),
          uploadVariant("preview", variants.preview.buffer),
          uploadVariant("thumbnail", variants.thumbnail.buffer),
        ]);

        // Get public URL for full image (main imageUrl)
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(`${folderPath}/full.webp`);

        const imageUrl = urlData.publicUrl;

        // Log size savings
        const originalSize = buffer.length;
        const optimizedSize = variants.full.size + variants.preview.size + variants.thumbnail.size;
        console.log(
          `Image optimized: ${(originalSize / 1024).toFixed(0)}KB → ${(optimizedSize / 1024).toFixed(0)}KB (${((1 - optimizedSize / originalSize) * 100).toFixed(0)}% saved)`
        );

        // Insert into database
        const [newReference] = await db
          .insert(brandReferences)
          .values({
            name: classification.name,
            description: classification.description,
            imageUrl,
            toneBucket: classification.toneBucket,
            energyBucket: classification.energyBucket,
            densityBucket: classification.densityBucket,
            colorBucket: classification.colorBucket,
            colorSamples: classification.colorSamples,
            isActive: true,
          })
          .returning();

        results.push({
          url,
          success: true,
          data: {
            id: newReference.id,
            name: classification.name,
            imageUrl,
            classification: {
              toneBucket: classification.toneBucket,
              energyBucket: classification.energyBucket,
              densityBucket: classification.densityBucket,
              colorBucket: classification.colorBucket,
              colorSamples: classification.colorSamples,
              confidence: classification.confidence,
            },
          },
        });
      } catch (error) {
        console.error(`Error processing URL ${url}:`, error);
        results.push({
          url,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    });
  } catch (error) {
    console.error("URL import error:", error);
    return NextResponse.json(
      { error: "Failed to process URL import" },
      { status: 500 }
    );
  }
}

// PUT: Preview/classify URLs without saving (for review step)
export async function PUT(request: NextRequest) {
  try {
    // Auth check
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { role?: string };
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { urls } = body as { urls: string[] };

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "No URLs provided" },
        { status: 400 }
      );
    }

    // Limit to 20 URLs per request
    const urlsToProcess = urls.slice(0, 20);
    const results: Array<{
      url: string;
      success: boolean;
      classification?: {
        name: string;
        description: string;
        toneBucket: string;
        energyBucket: string;
        densityBucket: string;
        colorBucket: string;
        colorSamples: string[];
        confidence: number;
      };
      error?: string;
    }> = [];

    for (const url of urlsToProcess) {
      try {
        // Validate URL
        const parsedUrl = new URL(url);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          results.push({
            url,
            success: false,
            error: "Invalid URL protocol",
          });
          continue;
        }

        // Fetch the image
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; PineBot/1.0)",
          },
        });

        if (!response.ok) {
          results.push({
            url,
            success: false,
            error: `Failed to fetch: ${response.status} ${response.statusText}`,
          });
          continue;
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.startsWith("image/")) {
          results.push({
            url,
            success: false,
            error: `Not an image: ${contentType}`,
          });
          continue;
        }

        // Convert to base64
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");

        // Determine media type
        let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" =
          "image/png";
        if (contentType.includes("jpeg") || contentType.includes("jpg")) {
          mediaType = "image/jpeg";
        } else if (contentType.includes("gif")) {
          mediaType = "image/gif";
        } else if (contentType.includes("webp")) {
          mediaType = "image/webp";
        }

        // Classify with AI (preview only)
        const classification = await classifyBrandImage(base64, mediaType);

        results.push({
          url,
          success: true,
          classification,
        });
      } catch (error) {
        results.push({
          url,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("URL preview error:", error);
    return NextResponse.json(
      { error: "Failed to preview URLs" },
      { status: 500 }
    );
  }
}
