import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/require-auth";
import { withErrorHandling, successResponse, Errors } from "@/lib/errors";
import { db } from "@/db";
import { deliverableStyleReferences } from "@/db/schema";
import { classifyDeliverableStyle } from "@/lib/ai/classify-deliverable-style";
import { getAdminStorageClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const BUCKET_NAME = "deliverable-styles";

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
          deliverableType: string;
          styleAxis: string;
          subStyle: string | null;
          semanticTags: string[];
          confidence: number;
          // Extended fields
          colorTemperature?: string;
          energyLevel?: string;
          densityLevel?: string;
          formalityLevel?: string;
          colorSamples?: string[];
          industries?: string[];
          targetAudience?: string;
          visualElements?: string[];
          moodKeywords?: string[];
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

        // Convert to base64 for AI classification
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

        // Classify with AI
        const classification = await classifyDeliverableStyle(base64, mediaType);

        // Upload to Supabase Storage
        const timestamp = Date.now();
        const cleanFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const storagePath = `${timestamp}-${cleanFilename}`;

        const supabase = getAdminStorageClient();
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          // If bucket doesn't exist, try to create it
          if (uploadError.message.includes("not found")) {
            await supabase.storage.createBucket(BUCKET_NAME, {
              public: true,
            });
            // Retry upload
            const { error: retryError } = await supabase.storage
              .from(BUCKET_NAME)
              .upload(storagePath, file, {
                contentType: file.type,
                upsert: false,
              });
            if (retryError) {
              throw retryError;
            }
          } else {
            throw uploadError;
          }
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(storagePath);

        const imageUrl = urlData.publicUrl;

        // Insert into database with all classification fields
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
            // Extended classification fields
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

        results.push({
          filename: file.name,
          success: true,
          data: {
            id: newStyle.id,
            name: classification.name,
            imageUrl,
            classification: {
              deliverableType: classification.deliverableType,
              styleAxis: classification.styleAxis,
              subStyle: classification.subStyle,
              semanticTags: classification.semanticTags,
              confidence: classification.confidence,
              // Extended fields
              colorTemperature: classification.colorTemperature,
              energyLevel: classification.energyLevel,
              densityLevel: classification.densityLevel,
              formalityLevel: classification.formalityLevel,
              colorSamples: classification.colorSamples,
              industries: classification.industries,
              targetAudience: classification.targetAudience,
              visualElements: classification.visualElements,
              moodKeywords: classification.moodKeywords,
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
  }, { endpoint: "POST /api/admin/deliverable-styles/upload" });
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
    const classification = await classifyDeliverableStyle(base64, mediaType);

    return successResponse({ classification });
  }, { endpoint: "PUT /api/admin/deliverable-styles/upload" });
}
