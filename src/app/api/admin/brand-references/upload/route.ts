import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/require-auth";
import { withErrorHandling, successResponse, Errors } from "@/lib/errors";
import { db } from "@/db";
import { brandReferences } from "@/db/schema";
import { classifyBrandImage } from "@/lib/ai/classify-brand-image";
import { getAdminStorageClient } from "@/lib/supabase/server";
import { optimizeImage } from "@/lib/image/optimize";
import { logger } from "@/lib/logger";

const BUCKET_NAME = "brand-references";

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin();

    // Get form data
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      throw Errors.badRequest("No files provided");
    }

    const results: Array<{
      filename: string;
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
    }> = [];

    // Process each file
    for (const file of files) {
      try {
        // Validate file type
        if (!file.type.startsWith("image/")) {
          results.push({
            filename: file.name,
            success: false,
            error: "Invalid file type. Only images are allowed.",
          });
          continue;
        }

        // Convert to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Optimize image - creates WebP variants (full, preview, thumbnail)
        const variants = await optimizeImage(buffer);

        // Use optimized full image for AI classification (smaller = faster)
        const base64 = variants.full.buffer.toString("base64");
        const mediaType = "image/webp" as const;

        // Classify with AI
        const classification = await classifyBrandImage(base64, mediaType);

        // Generate folder name from filename
        const timestamp = Date.now();
        const cleanFilename = file.name
          .replace(/\.[^.]+$/, "") // Remove extension
          .replace(/[^a-zA-Z0-9-]/g, "_");
        const folderPath = `${timestamp}-${cleanFilename}`;

        // Helper to upload a variant
        const supabase = getAdminStorageClient();
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
        logger.debug(
          { originalSize, optimizedSize, percentSaved: ((1 - optimizedSize / originalSize) * 100).toFixed(0) },
          "Image optimized"
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
          filename: file.name,
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
        logger.error({ error, filename: file.name }, "Error processing file");
        results.push({
          filename: file.name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return successResponse({
      processed: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    });
  }, { endpoint: "POST /api/admin/brand-references/upload" });
}

// Endpoint to classify an image without saving (preview)
export async function PUT(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      throw Errors.badRequest("No file provided");
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      throw Errors.badRequest("Invalid file type. Only images are allowed.");
    }

    // Convert to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // Determine media type
    let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/png";
    if (file.type.includes("jpeg") || file.type.includes("jpg")) {
      mediaType = "image/jpeg";
    } else if (file.type.includes("gif")) {
      mediaType = "image/gif";
    } else if (file.type.includes("webp")) {
      mediaType = "image/webp";
    }

    // Classify with AI (preview only, don't save)
    const classification = await classifyBrandImage(base64, mediaType);

    return successResponse({ classification });
  }, { endpoint: "PUT /api/admin/brand-references/upload" });
}
