import Anthropic from "@anthropic-ai/sdk";
import type { DeliverableType, StyleAxis } from "@/lib/constants/reference-libraries";

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
}

const CLASSIFICATION_PROMPT = `You are a design style expert. Analyze this design reference image and classify it for use as a style suggestion in design conversations.

First, identify what TYPE of deliverable this design is most suited for (choose ONE):
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

Then, classify the STYLE AXIS (choose ONE that best describes the overall visual approach):
- minimal: Clean, simple, lots of whitespace, sparse elements
- bold: Strong contrasts, impactful visuals, large typography
- editorial: Magazine-style, content-rich, grid-based layouts
- corporate: Professional, business-focused, conservative
- playful: Fun, colorful, energetic, whimsical
- premium: Luxury, high-end, refined, elegant
- organic: Natural, flowing, earthy, soft textures
- tech: Modern, digital, futuristic, geometric

Also provide:
- A short descriptive name for this style (2-4 words)
- A brief 1-sentence description
- Optional sub-style (e.g., "dark-mode", "gradient", "3d-elements")
- 3-6 semantic tags that describe the aesthetic (e.g., "gen-z", "luxury", "startup", "tech-forward", "minimalist")

Respond in this exact JSON format (no markdown, no explanation):
{
  "name": "Style Name",
  "description": "Brief description of the visual style",
  "deliverableType": "instagram_post",
  "styleAxis": "minimal",
  "subStyle": "dark-mode" or null,
  "semanticTags": ["tag1", "tag2", "tag3"],
  "confidence": 0.85
}`;

export async function classifyDeliverableStyle(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/png"
): Promise<DeliverableStyleClassification> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
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
    console.error("Failed to classify deliverable style:", error);
    // Return default classification on error
    return {
      name: "Unknown Style",
      description: "Design reference image",
      deliverableType: "instagram_post",
      styleAxis: "minimal",
      subStyle: null,
      semanticTags: [],
      confidence: 0,
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
    console.error("Failed to classify deliverable style from URL:", error);
    throw error;
  }
}
