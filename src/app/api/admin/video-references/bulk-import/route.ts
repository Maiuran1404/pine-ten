import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/require-auth";
import { withErrorHandling, successResponse, Errors } from "@/lib/errors";
import { db } from "@/db";
import { deliverableStyleReferences } from "@/db/schema";
import { eq } from "drizzle-orm";

// Helper to extract YouTube video ID from various URL formats
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // Just the ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Get YouTube thumbnail URL from video ID
function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

interface BulkImportItem {
  url: string;
  name?: string;
  description?: string;
  tags?: string[];
  styleAxis?: string;
  deliverableType?: string;
}

// POST - Bulk import video references
export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin();

    const body = await request.json();
    const { videos, defaultTags = [], defaultStyleAxis = "bold", defaultDeliverableType = "launch_video" } = body as {
      videos: BulkImportItem[];
      defaultTags?: string[];
      defaultStyleAxis?: string;
      defaultDeliverableType?: string;
    };

    if (!videos || !Array.isArray(videos) || videos.length === 0) {
      throw Errors.badRequest("Videos array is required and must not be empty");
    }

    const results = {
      imported: [] as { url: string; id: string; name: string }[],
      skipped: [] as { url: string; reason: string }[],
      failed: [] as { url: string; error: string }[],
    };

    for (const item of videos) {
      try {
        const url = typeof item === "string" ? item : item.url;
        
        // Extract video ID
        const videoId = extractYouTubeVideoId(url);
        if (!videoId) {
          results.failed.push({ url, error: "Invalid YouTube URL" });
          continue;
        }

        const normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`;

        // Check if already exists
        const existing = await db
          .select({ id: deliverableStyleReferences.id })
          .from(deliverableStyleReferences)
          .where(eq(deliverableStyleReferences.videoUrl, normalizedUrl))
          .limit(1);

        if (existing.length > 0) {
          results.skipped.push({ url, reason: "Already exists" });
          continue;
        }

        // Get thumbnail
        const thumbnailUrl = getYouTubeThumbnailUrl(videoId);

        // Merge tags
        const itemData = typeof item === "string" ? {} : item;
        const tags = [...new Set([...defaultTags, ...(itemData.tags || [])])];

        // Create the video reference
        const [newVideo] = await db
          .insert(deliverableStyleReferences)
          .values({
            name: itemData.name || `Launch Video ${videoId.substring(0, 6)}`,
            description: itemData.description || null,
            imageUrl: thumbnailUrl,
            videoUrl: normalizedUrl,
            videoThumbnailUrl: thumbnailUrl,
            videoTags: tags,
            videoDuration: null,
            deliverableType: itemData.deliverableType || defaultDeliverableType,
            styleAxis: itemData.styleAxis || defaultStyleAxis,
            featuredOrder: 0,
            displayOrder: 0,
            isActive: true,
            semanticTags: [],
          })
          .returning();

        results.imported.push({
          url: normalizedUrl,
          id: newVideo.id,
          name: newVideo.name,
        });
      } catch (error) {
        const url = typeof item === "string" ? item : item.url;
        results.failed.push({
          url,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return successResponse({
      summary: {
        total: videos.length,
        imported: results.imported.length,
        skipped: results.skipped.length,
        failed: results.failed.length,
      },
      results,
    });
  }, { endpoint: "POST /api/admin/video-references/bulk-import" });
}
