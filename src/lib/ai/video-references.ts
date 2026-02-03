import { db } from "@/db";
import { deliverableStyleReferences } from "@/db/schema";
import { and, eq, isNotNull, sql, desc } from "drizzle-orm";
import type {
  DeliverableType,
  StyleAxis,
} from "@/lib/constants/reference-libraries";
import { VIDEO_DELIVERABLE_TYPES } from "@/lib/constants/reference-libraries";

export interface VideoReference {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string; // Thumbnail URL
  videoUrl: string;
  videoThumbnailUrl: string | null;
  videoDuration: string | null;
  videoTags: string[];
  deliverableType: string;
  styleAxis: string;
  subStyle: string | null;
  semanticTags: string[];
  brandMatchScore: number;
  matchReason?: string;
  isVideoReference: true; // Flag to distinguish from image references
}

/**
 * Check if a deliverable type should show video references
 */
export function isVideoDeliverableType(
  deliverableType: DeliverableType
): boolean {
  return VIDEO_DELIVERABLE_TYPES.includes(deliverableType as any);
}

/**
 * Get video references for video-related deliverable types
 * These are shown in the chat when users request launch videos, video ads, etc.
 */
export async function getVideoReferences(options?: {
  deliverableType?: DeliverableType;
  tags?: string[];
  styleAxis?: StyleAxis;
  limit?: number;
  offset?: number;
}): Promise<VideoReference[]> {
  const limit = options?.limit || 8;
  const offset = options?.offset || 0;

  // Build conditions
  const conditions = [
    isNotNull(deliverableStyleReferences.videoUrl),
    eq(deliverableStyleReferences.isActive, true),
  ];

  if (options?.deliverableType) {
    conditions.push(
      eq(deliverableStyleReferences.deliverableType, options.deliverableType)
    );
  }

  if (options?.styleAxis) {
    conditions.push(
      eq(deliverableStyleReferences.styleAxis, options.styleAxis)
    );
  }

  // Fetch video references
  let videos = await db
    .select({
      id: deliverableStyleReferences.id,
      name: deliverableStyleReferences.name,
      description: deliverableStyleReferences.description,
      imageUrl: deliverableStyleReferences.imageUrl,
      videoUrl: deliverableStyleReferences.videoUrl,
      videoThumbnailUrl: deliverableStyleReferences.videoThumbnailUrl,
      videoDuration: deliverableStyleReferences.videoDuration,
      videoTags: deliverableStyleReferences.videoTags,
      deliverableType: deliverableStyleReferences.deliverableType,
      styleAxis: deliverableStyleReferences.styleAxis,
      subStyle: deliverableStyleReferences.subStyle,
      semanticTags: deliverableStyleReferences.semanticTags,
      usageCount: deliverableStyleReferences.usageCount,
      featuredOrder: deliverableStyleReferences.featuredOrder,
    })
    .from(deliverableStyleReferences)
    .where(and(...conditions))
    .orderBy(
      deliverableStyleReferences.featuredOrder,
      desc(deliverableStyleReferences.usageCount)
    )
    .limit(limit + 10) // Fetch extra to allow tag filtering
    .offset(offset);

  // Filter by tags if provided
  if (options?.tags && options.tags.length > 0) {
    const searchTags = options.tags.map((t) => t.toLowerCase());
    videos = videos.filter((v) => {
      const videoTags = (v.videoTags || []).map((t) => t.toLowerCase());
      return searchTags.some((tag) => videoTags.includes(tag));
    });
  }

  // Score videos based on matching criteria
  return videos.slice(0, limit).map((video) => {
    let score = 50; // Base score
    const matchReasons: string[] = [];

    // Boost popular videos
    if (video.usageCount && video.usageCount > 5) {
      score += 15;
      matchReasons.push("Popular choice");
    }

    // Boost featured videos
    if (video.featuredOrder === 0) {
      score += 10;
      matchReasons.push("Featured style");
    }

    // Boost videos with matching tags
    if (options?.tags && options.tags.length > 0) {
      const videoTags = (video.videoTags || []).map((t) => t.toLowerCase());
      const matchingTags = options.tags.filter((t) =>
        videoTags.includes(t.toLowerCase())
      );
      if (matchingTags.length > 0) {
        score += matchingTags.length * 10;
        matchReasons.push(`Matches: ${matchingTags.slice(0, 2).join(", ")}`);
      }
    }

    return {
      id: video.id,
      name: video.name,
      description: video.description,
      imageUrl: video.videoThumbnailUrl || video.imageUrl,
      videoUrl: video.videoUrl!,
      videoThumbnailUrl: video.videoThumbnailUrl,
      videoDuration: video.videoDuration,
      videoTags: video.videoTags || [],
      deliverableType: video.deliverableType,
      styleAxis: video.styleAxis,
      subStyle: video.subStyle,
      semanticTags: video.semanticTags || [],
      brandMatchScore: Math.min(100, score),
      matchReason:
        matchReasons.length > 0 ? matchReasons[0] : "Video style reference",
      isVideoReference: true as const,
    };
  });
}

/**
 * Get video references by tags (for semantic matching)
 */
export async function getVideoReferencesByTags(
  tags: string[],
  limit: number = 6
): Promise<VideoReference[]> {
  return getVideoReferences({ tags, limit });
}

/**
 * Extract relevant video tags from user message
 * This helps match videos to user intent
 */
export function extractVideoTagsFromMessage(message: string): string[] {
  const messageLower = message.toLowerCase();
  const detectedTags: string[] = [];

  // Style detection
  const styleKeywords: Record<string, string[]> = {
    cinematic: ["cinematic", "film", "movie", "dramatic", "epic"],
    "motion-graphics": [
      "motion",
      "animated",
      "animation",
      "graphics",
      "kinetic",
    ],
    documentary: ["documentary", "real", "authentic", "story"],
    "fast-paced": ["fast", "quick", "dynamic", "energetic", "action"],
    "slow-motion": ["slow", "smooth", "elegant", "calm"],
    playful: ["playful", "fun", "colorful", "vibrant", "creative"],
    professional: ["professional", "corporate", "business", "formal"],
  };

  for (const [tag, keywords] of Object.entries(styleKeywords)) {
    if (keywords.some((kw) => messageLower.includes(kw))) {
      detectedTags.push(tag);
    }
  }

  // Industry detection
  const industryKeywords: Record<string, string[]> = {
    tech: ["tech", "software", "app", "saas", "startup", "digital"],
    ecommerce: ["ecommerce", "product", "shop", "store", "retail"],
    lifestyle: ["lifestyle", "wellness", "health", "fitness"],
    corporate: ["corporate", "b2b", "enterprise", "business"],
  };

  for (const [tag, keywords] of Object.entries(industryKeywords)) {
    if (keywords.some((kw) => messageLower.includes(kw))) {
      detectedTags.push(tag);
    }
  }

  // Format detection
  const formatKeywords: Record<string, string[]> = {
    "product-showcase": ["product", "showcase", "demo", "feature"],
    explainer: ["explain", "how", "tutorial", "guide"],
    teaser: ["teaser", "preview", "coming soon", "announcement"],
    testimonial: ["testimonial", "review", "customer", "case study"],
  };

  for (const [tag, keywords] of Object.entries(formatKeywords)) {
    if (keywords.some((kw) => messageLower.includes(kw))) {
      detectedTags.push(tag);
    }
  }

  return [...new Set(detectedTags)];
}

/**
 * Get video references for a chat context
 * Combines deliverable type with message analysis for better matching
 */
export async function getVideoReferencesForChat(
  deliverableType: DeliverableType,
  userMessage?: string,
  limit: number = 6
): Promise<VideoReference[]> {
  // Extract relevant tags from user message
  const messageTags = userMessage
    ? extractVideoTagsFromMessage(userMessage)
    : [];

  console.log(`[Video References] Getting videos for type: ${deliverableType}`);
  console.log(
    `[Video References] Detected tags from message: ${
      messageTags.join(", ") || "none"
    }`
  );

  // For video requests, show ALL video references (not filtered by exact deliverable type)
  // since all our video references are relevant launch video examples
  const videos = await getVideoReferences({
    // Don't filter by deliverable type - show all video references
    tags: messageTags.length > 0 ? messageTags : undefined,
    limit,
  });

  console.log(
    `[Video References] Found ${videos.length} videos with tag filter`
  );

  // If we got good results with tags, return them
  if (videos.length >= 3) {
    return videos;
  }

  // Otherwise, get all videos without tag filtering
  const allVideos = await getVideoReferences({
    limit,
  });

  console.log(
    `[Video References] Found ${allVideos.length} total videos without filter`
  );
  return allVideos;
}
