import Anthropic from "@anthropic-ai/sdk";
import type { DeliverableType, StyleAxis } from "@/lib/constants/reference-libraries";
import { logger } from "@/lib/logger";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface DeliverableStyleClassification {
  name: string;
  description: string;
  deliverableType: DeliverableType;
  styleAxis: StyleAxis;
  subStyle: string | null;
  semanticTags: string[];
  confidence: number;

  // Content type filtering
  isVideoThumbnail?: boolean; // True if this looks like a video thumbnail/UGC/TikTok/Reels content
  contentType?: "designed_graphic" | "video_thumbnail" | "ugc_content" | "photo" | "screenshot";

  // Extended classification fields
  colorTemperature?: "warm" | "cool" | "neutral";
  energyLevel?: "calm" | "balanced" | "energetic";
  densityLevel?: "minimal" | "balanced" | "rich";
  formalityLevel?: "casual" | "balanced" | "formal";
  colorSamples?: string[]; // hex colors

  // Industry & audience targeting
  industries?: string[];
  targetAudience?: "b2b" | "b2c" | "enterprise" | "startup" | "consumer";

  // Visual element tags
  visualElements?: string[];
  moodKeywords?: string[];
}

const CLASSIFICATION_PROMPT = `You are a design style expert. Analyze this design reference image and classify it comprehensively for use as a style suggestion in design conversations.

## CONTENT TYPE DETECTION (IMPORTANT - check this first)

First, determine what type of content this is:

**isVideoThumbnail**: Set to TRUE if this image is:
- A TikTok/Instagram Reels/YouTube Shorts style video thumbnail
- Shows a person (selfie, vlog-style, POV content)
- User-generated content (UGC) with casual phone-shot appearance
- Has video player UI elements or play buttons
- Looks like a screenshot from a video or live stream
- Has "POV:", talking head format, or influencer-style content

**contentType** (choose ONE):
- designed_graphic: Professional graphic design, marketing creative, branded content
- video_thumbnail: Thumbnail from video content (TikTok, Reels, YouTube, etc.)
- ugc_content: User-generated content, selfies, casual photos
- photo: Stock photo or professional photography (not a designed graphic)
- screenshot: Screenshot of an app, website, or other interface

We ONLY want "designed_graphic" content for our library. Set isVideoThumbnail=true for anything that isn't a designed graphic.

## PRIMARY CLASSIFICATION

**Deliverable Type** (choose ONE - what format is this design best suited for):
- instagram_post: Square format social media post
- instagram_story: Vertical story format
- instagram_reel: Vertical video format cover
- linkedin_post: Professional social media post
- linkedin_banner: Wide professional header
- facebook_ad: Facebook advertising format
- twitter_post: Twitter/X social post format
- youtube_thumbnail: Video thumbnail format
- email_header: Email marketing header
- presentation_slide: Slide/deck format
- web_banner: Website banner/hero
- static_ad: General static advertisement
- video_ad: Video advertisement frame

**Style Axis** (choose ONE - the overall visual approach):
- minimal: Clean, simple, lots of whitespace, sparse elements
- bold: Strong contrasts, impactful visuals, large typography
- editorial: Magazine-style, content-rich, grid-based layouts
- corporate: Professional, business-focused, conservative
- playful: Fun, colorful, energetic, whimsical
- premium: Luxury, high-end, refined, elegant
- organic: Natural, flowing, earthy, soft textures
- tech: Modern, digital, futuristic, geometric

## VISUAL PERSONALITY (choose ONE for each)

**Color Temperature**: warm (reds, oranges, yellows), cool (blues, greens, purples), neutral (grays, blacks, whites)
**Energy Level**: calm (quiet, subdued), balanced (moderate), energetic (dynamic, vibrant)
**Density Level**: minimal (sparse, whitespace), balanced (moderate), rich (dense, layered)
**Formality Level**: casual (relaxed, friendly), balanced (versatile), formal (professional, corporate)

## TARGETING

**Industries** (select 1-3 that would use this style):
tech, fashion, food, healthcare, finance, education, entertainment, sports, retail, luxury, real-estate, travel, beauty, fitness, automotive

**Target Audience** (choose ONE):
- b2b: Business-to-business
- b2c: Business-to-consumer (general)
- enterprise: Large corporations
- startup: New/growing companies
- consumer: Direct consumer brands

## VISUAL ELEMENTS & MOOD

**Visual Elements** (select all that apply): typography-heavy, photo-centric, illustration-based, gradient, 3d-elements, geometric, abstract, minimalist-icons, data-viz, texture-rich

**Mood Keywords** (3-5 adjectives): e.g., professional, playful, elegant, bold, sophisticated, edgy, warm, clean, dynamic, luxurious

## COLORS

Extract 3-5 dominant hex colors from the image.

## OUTPUT

Respond in this exact JSON format (no markdown, no explanation):
{
  "isVideoThumbnail": false,
  "contentType": "designed_graphic",
  "name": "Style Name",
  "description": "Brief 1-sentence description",
  "deliverableType": "instagram_post",
  "styleAxis": "minimal",
  "subStyle": "dark-mode" or null,
  "semanticTags": ["tag1", "tag2", "tag3"],
  "confidence": 0.85,
  "colorTemperature": "warm" | "cool" | "neutral",
  "energyLevel": "calm" | "balanced" | "energetic",
  "densityLevel": "minimal" | "balanced" | "rich",
  "formalityLevel": "casual" | "balanced" | "formal",
  "colorSamples": ["#hex1", "#hex2", "#hex3"],
  "industries": ["tech", "startup"],
  "targetAudience": "b2b" | "b2c" | "enterprise" | "startup" | "consumer",
  "visualElements": ["typography-heavy", "gradient"],
  "moodKeywords": ["professional", "modern", "clean"]
}

IMPORTANT: If isVideoThumbnail is true or contentType is not "designed_graphic", set confidence to 0.`;

export async function classifyDeliverableStyle(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/png"
): Promise<DeliverableStyleClassification> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048, // Increased for comprehensive classification
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: CLASSIFICATION_PROMPT,
            },
          ],
        },
      ],
    });

    // Extract text from response
    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    // Parse JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const classification = JSON.parse(jsonMatch[0]) as DeliverableStyleClassification;

    // Validate required fields
    if (!classification.deliverableType || !classification.styleAxis) {
      throw new Error("Missing required classification fields");
    }

    return classification;
  } catch (error) {
    logger.error({ err: error }, "Failed to classify deliverable style");
    // Return default classification on error
    return {
      name: "Unknown Style",
      description: "Design reference image",
      deliverableType: "instagram_post",
      styleAxis: "minimal",
      subStyle: null,
      semanticTags: [],
      confidence: 0,
      isVideoThumbnail: false,
      contentType: "designed_graphic",
      colorTemperature: "neutral",
      energyLevel: "balanced",
      densityLevel: "balanced",
      formalityLevel: "balanced",
      colorSamples: [],
      industries: [],
      targetAudience: "b2c",
      visualElements: [],
      moodKeywords: [],
    };
  }
}

export async function classifyDeliverableStyleFromUrl(
  imageUrl: string
): Promise<DeliverableStyleClassification> {
  try {
    // Fetch image and convert to base64
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // Determine media type
    let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/png";
    if (contentType.includes("jpeg") || contentType.includes("jpg")) {
      mediaType = "image/jpeg";
    } else if (contentType.includes("gif")) {
      mediaType = "image/gif";
    } else if (contentType.includes("webp")) {
      mediaType = "image/webp";
    }

    return classifyDeliverableStyle(base64, mediaType);
  } catch (error) {
    logger.error({ err: error }, "Failed to classify deliverable style from URL");
    throw error;
  }
}
