import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { brandReferences } from "@/db/schema";
import { classifyBrandImage } from "@/lib/ai/classify-brand-image";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client for storage
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET_NAME = "brand-references";

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

    // Get form data
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
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
        const classification = await classifyBrandImage(base64, mediaType);

        // Upload to Supabase Storage
        const timestamp = Date.now();
        const cleanFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const storagePath = `${timestamp}-${cleanFilename}`;

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
        console.error(`Error processing file ${file.name}:`, error);
        results.push({
          filename: file.name,
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
    console.error("Brand reference upload error:", error);
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 }
    );
  }
}

// Endpoint to classify an image without saving (preview)
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Invalid file type. Only images are allowed." },
        { status: 400 }
      );
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

    return NextResponse.json({
      success: true,
      classification,
    });
  } catch (error) {
    console.error("Brand reference preview error:", error);
    return NextResponse.json(
      { error: "Failed to classify image" },
      { status: 500 }
    );
  }
}
