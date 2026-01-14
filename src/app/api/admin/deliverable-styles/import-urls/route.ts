import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { deliverableStyleReferences } from "@/db/schema";
import { classifyDeliverableStyle } from "@/lib/ai/classify-deliverable-style";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET_NAME = "deliverable-styles";

interface ImportResult {
  url: string;
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
        const base64 = buffer.toString("base64");

        // Check file size (max 10MB)
        if (buffer.length > 10 * 1024 * 1024) {
          results.push({
            url,
            success: false,
            error: "Image too large (max 10MB)",
          });
          continue;
        }

        // Determine media type
        let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" =
          "image/png";
        if (contentType.includes("jpeg") || contentType.includes("jpg")) {
          mediaType = "image/jpeg";
        } else if (contentType.includes("gif")) {
          mediaType = "image/gif";
        } else if (contentType.includes("webp")) {
          mediaType = "image/webp";
        } else if (contentType.includes("png")) {
          mediaType = "image/png";
        }

        // Classify with AI
        const classification = await classifyDeliverableStyle(base64, mediaType);

        // Generate filename from URL
        const urlPath = parsedUrl.pathname;
        const originalFilename =
          urlPath.split("/").pop() || `imported-${Date.now()}`;
        const cleanFilename = originalFilename.replace(/[^a-zA-Z0-9.-]/g, "_");
        const timestamp = Date.now();
        const storagePath = `${timestamp}-${cleanFilename}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, buffer, {
            contentType: mediaType,
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
              .upload(storagePath, buffer, {
                contentType: mediaType,
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

        results.push({
          url,
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
        deliverableType: string;
        styleAxis: string;
        subStyle: string | null;
        semanticTags: string[];
        confidence: number;
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
        const classification = await classifyDeliverableStyle(base64, mediaType);

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
