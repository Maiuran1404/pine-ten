/**
 * Silent Inference Engine
 * Parses user messages to extract task context without asking questions
 * Only surfaces clarifying questions when confidence is below threshold
 */

import type {
  Platform,
  Intent,
  TaskType,
  ContentType,
  InferredField,
  InferenceResult,
  ClarifyingQuestion,
  AudienceBrief,
  LiveBrief,
} from "@/components/chat/brief-panel/types";
import {
  normalizePlatform,
  normalizeContentType,
  getDimensionsForPlatform,
} from "@/lib/constants/platform-dimensions";
import type { InferredAudience } from "@/components/onboarding/types";

// =============================================================================
// CONFIDENCE THRESHOLD
// =============================================================================

const CONFIDENCE_THRESHOLD = 0.75; // Ask clarifying questions below this

// =============================================================================
// PATTERN DEFINITIONS
// =============================================================================

interface PatternMatch {
  pattern: RegExp;
  value: string;
  confidence: number;
  boost?: number; // Additional confidence when multiple patterns match
}

// Platform patterns
const PLATFORM_PATTERNS: PatternMatch[] = [
  // Instagram
  {
    pattern: /\b(instagram|insta|ig)\b/i,
    value: "instagram",
    confidence: 0.95,
  },
  { pattern: /\b(story|stories)\b/i, value: "instagram", confidence: 0.7 },
  { pattern: /\b(reel|reels)\b/i, value: "instagram", confidence: 0.85 },
  { pattern: /\b(carousel)\b/i, value: "instagram", confidence: 0.6 },

  // LinkedIn
  { pattern: /\b(linkedin|li)\b/i, value: "linkedin", confidence: 0.95 },
  {
    pattern: /\b(professional|b2b|business)\s*(post|content)/i,
    value: "linkedin",
    confidence: 0.65,
  },

  // Facebook
  { pattern: /\b(facebook|fb)\b/i, value: "facebook", confidence: 0.95 },

  // Twitter/X
  {
    pattern: /\b(twitter|tweet|x\s+post)\b/i,
    value: "twitter",
    confidence: 0.95,
  },

  // YouTube
  { pattern: /\b(youtube|yt)\b/i, value: "youtube", confidence: 0.95 },
  { pattern: /\b(thumbnail)\b/i, value: "youtube", confidence: 0.75 },

  // TikTok
  { pattern: /\b(tiktok|tik\s*tok)\b/i, value: "tiktok", confidence: 0.95 },

  // Print
  {
    pattern: /\b(print|poster|flyer|brochure|leaflet)\b/i,
    value: "print",
    confidence: 0.9,
  },

  // Web
  {
    pattern: /\b(web|website|banner|display\s*ad|landing)\b/i,
    value: "web",
    confidence: 0.85,
  },

  // Email
  { pattern: /\b(email|newsletter|mail)\b/i, value: "email", confidence: 0.9 },

  // Presentation
  {
    pattern: /\b(presentation|slide|deck|pitch|powerpoint|keynote)\b/i,
    value: "presentation",
    confidence: 0.9,
  },

  // Social media (generic) - defaults to instagram as most common
  {
    pattern: /\b(social\s*media)\s*(content|post|announcement|video|graphic)?/i,
    value: "instagram",
    confidence: 0.6,
  },
  // Video content without specific platform - often for web/social
  {
    pattern: /\b(video|cinematic|promotional\s*video|product\s*video)\b/i,
    value: "web",
    confidence: 0.5,
  },
];

// Intent patterns
const INTENT_PATTERNS: PatternMatch[] = [
  // Signups / Downloads / Conversions (high priority - specific action requested)
  {
    pattern: /\b(sign\s*up|signup|register|registration|join|subscribe)\b/i,
    value: "signups",
    confidence: 0.9,
  },
  {
    pattern: /\b(get\s*(more\s*)?(users|members|subscribers))\b/i,
    value: "signups",
    confidence: 0.85,
  },
  {
    pattern: /\b(grow\s*(my|our|the)?\s*(audience|list|base))\b/i,
    value: "signups",
    confidence: 0.75,
  },
  {
    pattern: /\b(download|downloads|install|installs|app\s*download)\b/i,
    value: "signups",
    confidence: 0.9,
  },
  {
    pattern:
      /\b(drive|increase|boost|get)\s*(more\s*)?(downloads?|installs?|signups?|registrations?)\b/i,
    value: "signups",
    confidence: 0.95,
  },

  // Authority / Thought Leadership
  {
    pattern: /\b(authority|thought\s*leader|expertise|expert)\b/i,
    value: "authority",
    confidence: 0.9,
  },
  {
    pattern: /\b(establish|build|position)\s*(as|myself|ourselves|us)\b/i,
    value: "authority",
    confidence: 0.7,
  },
  {
    pattern: /\b(industry\s*(leader|expert|insight))\b/i,
    value: "authority",
    confidence: 0.85,
  },
  {
    pattern: /\b(thought\s*leadership)\b/i,
    value: "authority",
    confidence: 0.95,
  },

  // Awareness
  {
    pattern: /\b(awareness|brand\s*awareness|visibility)\b/i,
    value: "awareness",
    confidence: 0.9,
  },
  {
    pattern: /\b(get\s*(the\s*)?word\s*out|spread\s*the\s*word)\b/i,
    value: "awareness",
    confidence: 0.85,
  },
  {
    pattern: /\b(introduce|introducing)\b/i,
    value: "awareness",
    confidence: 0.7,
  },

  // Sales
  {
    pattern: /\b(sale|sales|sell|selling|purchase|buy|revenue)\b/i,
    value: "sales",
    confidence: 0.9,
  },
  {
    pattern: /\b(convert|conversion|checkout|cart)\b/i,
    value: "sales",
    confidence: 0.85,
  },
  {
    pattern: /\b(promo|promotion|discount|offer|deal)\b/i,
    value: "sales",
    confidence: 0.8,
  },

  // Engagement
  {
    pattern: /\b(engage|engagement|interact|interaction)\b/i,
    value: "engagement",
    confidence: 0.9,
  },
  {
    pattern: /\b(community|followers|fans)\b/i,
    value: "engagement",
    confidence: 0.7,
  },
  {
    pattern: /\b(comments?|likes?|shares?)\b/i,
    value: "engagement",
    confidence: 0.65,
  },

  // Education
  {
    pattern: /\b(educate|education|teach|learn|tutorial|how\s*to)\b/i,
    value: "education",
    confidence: 0.9,
  },
  {
    pattern: /\b(tips?|advice|guide|explain)\b/i,
    value: "education",
    confidence: 0.75,
  },

  // Announcement (lower priority than conversion intents)
  {
    pattern: /\b(announce|announcement|news|update|release)\b/i,
    value: "announcement",
    confidence: 0.85,
  },
  {
    pattern:
      /\b(launch|launching)\s*(my|our|the|a|an)?\s*(new\s*)?(product|feature|service|app|business)?\b/i,
    value: "announcement",
    confidence: 0.7,
  },
  {
    pattern:
      /\b(introduc(?:e|es|ing)|unveil(?:s|ing)?)\s*(my|our|the|a|an)?\s*(product|service|brand|company|business)?\b/i,
    value: "announcement",
    confidence: 0.85,
  },
  {
    pattern:
      /\b(introduc(?:e|es|ing))\s*.{0,30}\s*(to\s+the\s+world|to\s+(?:my|our)\s+audience)\b/i,
    value: "announcement",
    confidence: 0.9,
  },
  {
    pattern: /\b(cinematic|promotional)\s*(video|intro|introduction)\b/i,
    value: "announcement",
    confidence: 0.8,
  },
];

// Task type patterns
const TASK_TYPE_PATTERNS: PatternMatch[] = [
  // Multi-asset plan - duration based
  {
    pattern:
      /\b(\d+)\s*(day|week|month)\s*(content\s*)?(plan|calendar|schedule)\b/i,
    value: "multi_asset_plan",
    confidence: 0.95,
  },
  {
    pattern:
      /\b(content\s*)?(plan|calendar|schedule)\s*for\s*(\d+)\s*(day|week|month)/i,
    value: "multi_asset_plan",
    confidence: 0.95,
  },
  {
    pattern: /\b(series|multiple|batch|set\s*of)\s*(post|content|asset)/i,
    value: "multi_asset_plan",
    confidence: 0.85,
  },

  // Multi-asset plan - quantity based (3+ items)
  // Allow words between number and content type (e.g., "5 Instagram posts", "10 social media graphics")
  {
    pattern:
      /\b([3-9]|\d{2,})\s+(?:\w+\s+)*(post|posts|image|images|graphic|graphics|carousel|carousels|asset|assets|slide|slides|banner|banners)\b/i,
    value: "multi_asset_plan",
    confidence: 0.9,
  },
  {
    pattern:
      /\b(several|many|few)\s+(?:\w+\s+)*(post|posts|image|images|graphic|graphics|carousel|carousels)\b/i,
    value: "multi_asset_plan",
    confidence: 0.8,
  },

  // Campaign
  {
    pattern: /\b(campaign|launch\s*campaign|marketing\s*campaign)\b/i,
    value: "campaign",
    confidence: 0.9,
  },

  // Single asset (default, lower confidence)
  {
    pattern:
      /\b(a|an|one|1|single)\s*(post|image|graphic|banner|ad|flyer|poster|carousel|thumbnail)\b/i,
    value: "single_asset",
    confidence: 0.85,
  },
  {
    pattern:
      /\b(create|make|design)\s*(a|an|the)?\s*(post|image|graphic|thumbnail)\b/i,
    value: "single_asset",
    confidence: 0.7,
  },
  // 2 items is borderline - could be single design with variations
  {
    pattern:
      /\b(2|two)\s*(post|posts|image|images|graphic|graphics|carousel|carousels)\b/i,
    value: "single_asset",
    confidence: 0.6,
  },
];

// Content type patterns
const CONTENT_TYPE_PATTERNS: PatternMatch[] = [
  { pattern: /\b(posts?|feed\s*posts?)\b/i, value: "post", confidence: 0.85 },
  { pattern: /\b(stor(y|ies))\b/i, value: "story", confidence: 0.9 },
  { pattern: /\b(reels?)\b/i, value: "reel", confidence: 0.9 },
  {
    pattern: /\b(carousels?|slide\s*shows?|swipes?)\b/i,
    value: "carousel",
    confidence: 0.9,
  },
  {
    pattern: /\b(banners?|headers?|covers?)\b/i,
    value: "banner",
    confidence: 0.85,
  },
  {
    pattern: /\b(ads?|advertisements?|sponsored)\b/i,
    value: "ad",
    confidence: 0.85,
  },
  { pattern: /\b(thumbnails?)\b/i, value: "thumbnail", confidence: 0.9 },
  {
    pattern: /\b(slides?|presentations?)\b/i,
    value: "slide",
    confidence: 0.85,
  },
  { pattern: /\b(flyers?|leaflets?)\b/i, value: "flyer", confidence: 0.9 },
  { pattern: /\b(posters?)\b/i, value: "poster", confidence: 0.9 },
  {
    pattern: /\b(videos?|motion|animations?)\b/i,
    value: "video",
    confidence: 0.85,
  },
  {
    pattern:
      /\b(cinematic|promotional\s*video|product\s*video|intro\s*video)\b/i,
    value: "video",
    confidence: 0.95,
  },
  { pattern: /\b(\d+[-–]\d+\s*seconds?)\b/i, value: "video", confidence: 0.7 },
];

// =============================================================================
// INFERENCE FUNCTIONS
// =============================================================================

function inferFromPatterns<T extends string>(
  text: string,
  patterns: PatternMatch[],
  defaultValue: T | null = null
): InferredField<T> {
  const matches: Array<{ value: T; confidence: number; pattern: string }> = [];

  for (const { pattern, value, confidence } of patterns) {
    if (pattern.test(text)) {
      matches.push({
        value: value as T,
        confidence,
        pattern: pattern.source,
      });
    }
  }

  if (matches.length === 0) {
    return {
      value: defaultValue,
      confidence: defaultValue ? 0.3 : 0,
      source: "pending",
    };
  }

  // Group by value and sum confidence (capped at 0.98)
  const valueScores = new Map<T, { confidence: number; patterns: string[] }>();
  for (const match of matches) {
    const existing = valueScores.get(match.value);
    if (existing) {
      existing.confidence = Math.min(
        0.98,
        existing.confidence + match.confidence * 0.2
      );
      existing.patterns.push(match.pattern);
    } else {
      valueScores.set(match.value, {
        confidence: match.confidence,
        patterns: [match.pattern],
      });
    }
  }

  // Get highest scoring value
  let bestValue: T | null = null;
  let bestScore = 0;

  valueScores.forEach((score, value) => {
    if (score.confidence > bestScore) {
      bestScore = score.confidence;
      bestValue = value;
    }
  });

  return {
    value: bestValue,
    confidence: bestScore,
    source: bestScore >= CONFIDENCE_THRESHOLD ? "inferred" : "pending",
    inferredFrom: matches.map((m) => m.pattern).join(", "),
  };
}

// =============================================================================
// QUANTITY EXTRACTION
// =============================================================================

function extractQuantity(text: string): InferredField<number> {
  // Match patterns like "30 day", "7 posts", "4 weeks", "5 Instagram posts", etc.
  const patterns = [
    /(\d+)\s*(day|days)\s*(content\s*)?(plan|calendar)?/i,
    /(\d+)\s*(week|weeks)\s*(content\s*)?(plan|calendar)?/i,
    /(\d+)\s*(month|months)\s*(content\s*)?(plan|calendar)?/i,
    /(\d+)\s+(?:\w+\s+)*(post|posts|piece|pieces|asset|assets|image|images|graphic|graphics|carousel|carousels|slide|slides|banner|banners)/i,
    /(plan|calendar)\s*for\s*(\d+)\s*(day|week|month)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Find the number in the match
      const numMatch = match[0].match(/\d+/);
      if (numMatch) {
        const num = parseInt(numMatch[0], 10);

        // Convert weeks/months to days if needed
        if (/week/i.test(match[0])) {
          return { value: num * 7, confidence: 0.9, source: "inferred" };
        }
        if (/month/i.test(match[0])) {
          return { value: num * 30, confidence: 0.85, source: "inferred" };
        }
        return { value: num, confidence: 0.9, source: "inferred" };
      }
    }
  }

  return { value: null, confidence: 0, source: "pending" };
}

// =============================================================================
// DURATION EXTRACTION
// =============================================================================

function extractDuration(text: string): InferredField<string> {
  const patterns = [
    { pattern: /(\d+)\s*(day|days)/i, format: (n: number) => `${n} days` },
    { pattern: /(\d+)\s*(week|weeks)/i, format: (n: number) => `${n} weeks` },
    {
      pattern: /(\d+)\s*(month|months)/i,
      format: (n: number) => `${n} months`,
    },
  ];

  for (const { pattern, format } of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      return {
        value: format(num),
        confidence: 0.9,
        source: "inferred",
      };
    }
  }

  return { value: null, confidence: 0, source: "pending" };
}

// =============================================================================
// TOPIC EXTRACTION
// =============================================================================

/**
 * Check if a message is a modification/adjustment request rather than a new topic
 * These messages should not override the existing topic
 */
function isModificationMessage(text: string): boolean {
  const modificationPatterns = [
    // Direct modification phrases
    /\b(instead of|rather than|change to|switch to|let's (go with|do|focus on|use)|actually,? let's)\b/i,
    // Quantity/scope adjustments
    /\b(\d+)\s+(instead|rather)\b/i,
    /\b(fewer|more|less)\s+(than|posts?|carousels?|pieces?|items?)\b/i,
    // Style/approach adjustments
    /\b(make (it|them|this) more|make (it|them|this) less)\b/i,
    /\b(more|less)\s+(beginner|advanced|professional|casual|formal|friendly)\b/i,
    // Refinement language
    /\b(tweak|adjust|modify|update|refine|revise)\b/i,
    // Preference changes
    /\b(prefer|would rather|I'd rather|I think|on second thought)\b/i,
  ];

  return modificationPatterns.some((pattern) => pattern.test(text));
}

function extractTopic(text: string): InferredField<string> {
  // Skip topic extraction for modification messages
  // These messages adjust existing requests, not define new topics
  if (isModificationMessage(text)) {
    return { value: null, confidence: 0, source: "pending" };
  }

  // First, try to find explicit topic patterns
  // Pattern: "about X", "for X", "on X", "regarding X"
  const topicPatterns = [
    /(?:content\s+)?(?:about|on|regarding)\s+(.+?)(?:\s+(?:to|for|that|which|on|and|,|\.)|$)/i,
    /(?:post|content|ad|banner|campaign)\s+for\s+(?:my|our|the|a|an)?\s*(.+?)(?:\s+(?:to|that|which|on|and|,|\.)|$)/i,
    /(?:promoting|promote|launch|launching)\s+(?:my|our|the|a|an)?\s*(.+?)(?:\s+(?:to|for|that|which|on|and|,|\.)|$)/i,
    // "introduces X" or "introducing X"
    /(?:introduc(?:es?|ing))\s+(?:my|our|the|a|an)?\s*(.+?)(?:\s+(?:to|for|that|which|on|and|,|\.)|$)/i,
  ];

  for (const pattern of topicPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let topic = match[1]
        .trim()
        .replace(/\s+/g, " ")
        .replace(/^(my|our|the|a|an)\s+/i, ""); // Remove leading articles

      // Limit length and clean up
      if (topic.length > 3 && topic.length <= 60) {
        // Capitalize first letter
        topic = topic.charAt(0).toUpperCase() + topic.slice(1);
        return {
          value: topic,
          confidence: 0.85,
          source: "inferred",
        };
      }
    }
  }

  // Look for quoted text as topic
  const quotedMatch = text.match(/"([^"]+)"|'([^']+)'/);
  if (quotedMatch) {
    const quoted = (quotedMatch[1] || quotedMatch[2]).trim();
    if (quoted.length > 2 && quoted.length <= 60) {
      return {
        value: quoted.charAt(0).toUpperCase() + quoted.slice(1),
        confidence: 0.9,
        source: "inferred",
      };
    }
  }

  // Extract product/service/app names - more patterns
  const productPatterns = [
    /(?:my|our|the|a|an)\s+([\w\s]+?)\s+(?:app|product|service|platform|business|company|brand|tool)/i,
    /(?:video|content|post)\s+(?:that\s+)?(?:introduces?|showcases?|presents?|highlights?)\s+(?:my|our|the|a|an)?\s*([\w\s]+?)(?:\s+to|\s*$|\.)/i,
  ];

  for (const pattern of productPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const product = match[1].trim().replace(/^(my|our|the|a|an)\s+/i, "");
      if (product.length > 2 && product.length <= 40) {
        return {
          value: product.charAt(0).toUpperCase() + product.slice(1),
          confidence: 0.8,
          source: "inferred",
        };
      }
    }
  }

  // Try to extract the main purpose/subject from descriptive messages
  // E.g., "A polished 30-60 second cinematic video" -> "Cinematic video introduction"
  const descriptivePatterns = [
    /(?:polished|professional|creative|stunning|engaging)\s+(?:\d+[-–]\d+\s*(?:second|minute)?\s*)?(.+?)(?:\s+(?:that|which|to|for)\s+|$)/i,
    /(?:cinematic|promotional|marketing|brand)\s+(.+?)(?:\s+(?:that|which|to|for)\s+|$)/i,
  ];

  for (const pattern of descriptivePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let desc = match[1].trim();
      // Clean up any trailing articles or connectors
      desc = desc.replace(/\s+(the|a|an|my|our)$/i, "").trim();
      if (desc.length > 2 && desc.length <= 50) {
        // Add "introduction" if it's about introducing something
        if (/introduc/i.test(text)) {
          desc = `${desc.charAt(0).toUpperCase() + desc.slice(1)} introduction`;
        } else {
          desc = desc.charAt(0).toUpperCase() + desc.slice(1);
        }
        return {
          value: desc,
          confidence: 0.7,
          source: "inferred",
        };
      }
    }
  }

  // Last resort: clean up the text and extract key phrases
  const cleanedText = text
    .replace(
      /\b(create|make|design|build|need|want|help|me|with|a|an|the|for|my|our|please|can|could|would|i|we|you)\b/gi,
      ""
    )
    .replace(
      /\b(instagram|linkedin|facebook|twitter|tiktok|youtube|post|story|reel|carousel|banner|ad|content|plan|campaign)\b/gi,
      ""
    )
    .replace(/\b(\d+)\s*(day|week|month)/gi, "")
    .replace(
      /\b(to|drive|increase|boost|get|more|downloads?|signups?|awareness|sales|engagement)\b/gi,
      ""
    )
    .replace(/[.,!?]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Only use cleaned text if it's reasonable
  if (
    cleanedText.length >= 3 &&
    cleanedText.length <= 40 &&
    cleanedText.split(" ").length <= 6
  ) {
    return {
      value: cleanedText.charAt(0).toUpperCase() + cleanedText.slice(1),
      confidence: 0.5,
      source: "inferred",
    };
  }

  return { value: null, confidence: 0, source: "pending" };
}

// =============================================================================
// AUDIENCE MATCHING
// =============================================================================

// Extract audience from text patterns (when user specifies directly)
function extractAudienceFromText(text: string): AudienceBrief | null {
  const textLower = text.toLowerCase();

  // Pattern: "target audience is/are X" or "targeting X" or "for X"
  const audiencePatterns = [
    /(?:target(?:ing)?|aimed at|for|audience[:\s]+(?:is|are)?)\s+(.+?)(?:\.|,|who|that|$)/i,
    /(?:targeting|reach(?:ing)?)\s+(.+?)(?:\.|,|who|that|$)/i,
  ];

  for (const pattern of audiencePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const audienceText = match[1].trim();
      if (audienceText.length > 3 && audienceText.length < 100) {
        // Extract age range if mentioned
        const ageMatch = audienceText.match(
          /(?:ages?|aged)\s*(\d+)\s*[-–to]+\s*(\d+)/i
        );
        const demographics = ageMatch
          ? `Ages ${ageMatch[1]}-${ageMatch[2]}`
          : undefined;

        // Clean up the audience name
        const cleanName = audienceText
          .replace(/(?:ages?|aged)\s*\d+\s*[-–to]+\s*\d+/gi, "")
          .replace(/\s+/g, " ")
          .trim();

        return {
          name: cleanName || audienceText,
          demographics,
          source: "inferred",
        };
      }
    }
  }

  // Check for demographic keywords
  const demographicKeywords = [
    { pattern: /\b(millennials?)\b/i, name: "Millennials" },
    { pattern: /\b(gen\s*z|generation\s*z)\b/i, name: "Gen Z" },
    { pattern: /\b(boomers?|baby\s*boomers?)\b/i, name: "Baby Boomers" },
    { pattern: /\b(gen\s*x|generation\s*x)\b/i, name: "Gen X" },
    {
      pattern: /\b(small\s*business\s*owners?|smb\s*owners?)\b/i,
      name: "Small Business Owners",
    },
    {
      pattern: /\b(enterprise|enterprises|large\s*companies)\b/i,
      name: "Enterprise Companies",
    },
    { pattern: /\b(startups?|founders?)\b/i, name: "Startups & Founders" },
    {
      pattern: /\b(developers?|engineers?|programmers?)\b/i,
      name: "Developers",
    },
    {
      pattern: /\b(ctos?|ceos?|executives?|c-suite|decision\s*makers?)\b/i,
      name: "C-Suite Executives",
    },
    {
      pattern: /\b(marketers?|marketing\s*(team|professionals?)?)\b/i,
      name: "Marketing Professionals",
    },
    { pattern: /\b(designers?|creatives?)\b/i, name: "Designers & Creatives" },
    {
      pattern:
        /\b(health\s*conscious|fitness\s*enthusiasts?|health\s*focused)\b/i,
      name: "Health-Conscious Consumers",
    },
    {
      pattern: /\b(parents?|moms?|dads?|families)\b/i,
      name: "Parents & Families",
    },
    { pattern: /\b(students?|college|university)\b/i, name: "Students" },
    {
      pattern: /\b(professionals?|working\s*professionals?)\b/i,
      name: "Working Professionals",
    },
  ];

  for (const { pattern, name } of demographicKeywords) {
    if (pattern.test(textLower)) {
      // Check for age range
      const ageMatch = text.match(/(?:ages?|aged)\s*(\d+)\s*[-–to]+\s*(\d+)/i);
      return {
        name,
        demographics: ageMatch
          ? `Ages ${ageMatch[1]}-${ageMatch[2]}`
          : undefined,
        source: "inferred",
      };
    }
  }

  return null;
}

export function matchAudience(
  text: string,
  audiences: InferredAudience[]
): InferredField<AudienceBrief> {
  // First try to extract audience directly from text
  const extractedAudience = extractAudienceFromText(text);
  if (extractedAudience) {
    return {
      value: extractedAudience,
      confidence: 0.85,
      source: "inferred",
    };
  }

  // Then try to match against brand's predefined audiences
  if (audiences && audiences.length > 0) {
    const textLower = text.toLowerCase();

    for (const audience of audiences) {
      const audienceName = audience.name.toLowerCase();
      const keywords = [
        audienceName,
        ...(audience.firmographics?.jobTitles || []).map((t) =>
          t.toLowerCase()
        ),
        ...(audience.firmographics?.industries || []).map((i) =>
          i.toLowerCase()
        ),
        ...(audience.psychographics?.values || []).map((v) => v.toLowerCase()),
      ];

      for (const keyword of keywords) {
        if (keyword && textLower.includes(keyword)) {
          return {
            value: {
              name: audience.name,
              demographics: formatDemographics(audience.demographics),
              psychographics: audience.psychographics?.values?.join(", "),
              painPoints: audience.psychographics?.painPoints,
              goals: audience.psychographics?.goals,
              source: "inferred",
            },
            confidence: 0.85,
            source: "inferred",
          };
        }
      }
    }

    // Default to primary audience if exists
    const primaryAudience = audiences.find((a) => a.isPrimary);
    if (primaryAudience) {
      return {
        value: {
          name: primaryAudience.name,
          demographics: formatDemographics(primaryAudience.demographics),
          psychographics: primaryAudience.psychographics?.values?.join(", "),
          painPoints: primaryAudience.psychographics?.painPoints,
          goals: primaryAudience.psychographics?.goals,
          source: "inferred",
        },
        confidence: 0.6,
        source: "inferred",
      };
    }
  }

  return { value: null, confidence: 0, source: "pending" };
}

function formatDemographics(
  demographics?: InferredAudience["demographics"]
): string | undefined {
  if (!demographics) return undefined;

  const parts: string[] = [];
  if (demographics.ageRange) {
    parts.push(
      `Ages ${demographics.ageRange.min}-${demographics.ageRange.max}`
    );
  }
  if (demographics.income) {
    parts.push(`${demographics.income} income`);
  }
  return parts.length > 0 ? parts.join(", ") : undefined;
}

// =============================================================================
// MAIN INFERENCE FUNCTION
// =============================================================================

export interface InferenceInput {
  message: string;
  conversationHistory?: string[];
  brandAudiences?: InferredAudience[];
}

export function inferFromMessage(input: InferenceInput): InferenceResult {
  const { message, conversationHistory = [], brandAudiences = [] } = input;

  // Combine current message with recent history for context
  const fullContext = [...conversationHistory.slice(-3), message].join(" ");

  // Run all inferences
  const taskType = inferFromPatterns<TaskType>(
    fullContext,
    TASK_TYPE_PATTERNS,
    "single_asset" // Default to single asset
  );

  const intent = inferFromPatterns<Intent>(fullContext, INTENT_PATTERNS);
  const platform = inferFromPatterns<Platform>(fullContext, PLATFORM_PATTERNS);
  const contentType = inferFromPatterns<ContentType>(
    fullContext,
    CONTENT_TYPE_PATTERNS
  );
  const quantity = extractQuantity(fullContext);
  const duration = extractDuration(fullContext);
  const topic = extractTopic(message); // Use only current message for topic
  const audienceMatch = matchAudience(fullContext, brandAudiences);

  // Boost confidence if platform explicitly mentioned in current message
  if (platform.value && new RegExp(platform.value, "i").test(message)) {
    platform.confidence = Math.min(0.98, platform.confidence + 0.1);
    platform.source =
      platform.confidence >= CONFIDENCE_THRESHOLD ? "inferred" : "pending";
  }

  return {
    taskType,
    intent,
    platform,
    contentType,
    quantity,
    duration,
    topic,
    audienceId: {
      value: audienceMatch.value?.name || null,
      confidence: audienceMatch.confidence,
      source: audienceMatch.source,
    },
  };
}

// =============================================================================
// GENERATE TASK SUMMARY
// =============================================================================

export function generateTaskSummary(inference: InferenceResult): string {
  const parts: string[] = [];

  // Quantity/Duration - include specific quantity for multi-asset requests
  if (inference.duration.value) {
    parts.push(`${inference.duration.value}`);
  } else if (
    inference.quantity.value &&
    inference.quantity.value >= 2 &&
    inference.taskType.value === "multi_asset_plan"
  ) {
    // Include the quantity for multi-asset plans (e.g., "5")
    parts.push(`${inference.quantity.value}`);
  }

  // Platform
  if (inference.platform.value) {
    const platformNames: Record<Platform, string> = {
      instagram: "Instagram",
      linkedin: "LinkedIn",
      facebook: "Facebook",
      twitter: "Twitter/X",
      youtube: "YouTube",
      tiktok: "TikTok",
      print: "Print",
      web: "Web",
      email: "Email",
      presentation: "Presentation",
    };
    parts.push(platformNames[inference.platform.value]);
  }

  // Content type or task type
  if (inference.taskType.value === "multi_asset_plan") {
    // For multi-asset with quantity, use "Posts" instead of "Content Plan"
    if (inference.quantity.value && inference.quantity.value >= 2) {
      const contentLabel =
        inference.contentType.value === "carousel"
          ? "Carousels"
          : inference.contentType.value === "story"
          ? "Stories"
          : inference.contentType.value === "reel"
          ? "Reels"
          : "Posts";
      parts.push(contentLabel);
    } else {
      parts.push("Content Plan");
    }
  } else if (inference.taskType.value === "campaign") {
    parts.push("Campaign");
  } else if (inference.contentType.value) {
    const contentNames: Record<ContentType, string> = {
      post: "Post",
      story: "Story",
      reel: "Reel",
      carousel: "Carousel",
      banner: "Banner",
      ad: "Ad",
      thumbnail: "Thumbnail",
      slide: "Slide",
      header: "Header",
      flyer: "Flyer",
      poster: "Poster",
      video: "Video",
    };
    parts.push(contentNames[inference.contentType.value]);
  } else if (inference.platform.value && parts.length === 1) {
    // If we only have platform, add generic "Content"
    parts.push("Content");
  }

  // Intent (add if no content type and we have intent)
  if (parts.length <= 1 && inference.intent.value) {
    const intentDescriptions: Record<Intent, string> = {
      signups: "for Signups",
      authority: "for Authority",
      awareness: "for Awareness",
      sales: "for Sales",
      engagement: "for Engagement",
      education: "Educational",
      announcement: "Announcement",
    };
    parts.push(intentDescriptions[inference.intent.value]);
  }

  // Topic (as suffix) - only if it adds meaningful context
  if (inference.topic.value) {
    // Clean up the topic - capitalize first letter, limit length
    let cleanTopic = inference.topic.value
      .replace(/^(a|an|the|my|our)\s+/i, "")
      // Remove trailing dangling prepositions/articles
      .replace(/\s+(of|for|to|in|on|at|by|with|my|our|the|a|an)\s*$/i, "")
      .trim();

    if (cleanTopic.length > 3 && cleanTopic.length < 50) {
      const formattedTopic =
        cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1);
      if (parts.length > 0) {
        parts.push(`- ${formattedTopic}`);
      } else {
        parts.push(formattedTopic);
      }
    }
  }

  // Fallback: if we only have topic, make it the whole summary
  if (parts.length === 0 && inference.topic.value) {
    const fallback = inference.topic.value
      .replace(/\s+(of|for|to|in|on|at|by|with|my|our|the|a|an)\s*$/i, "")
      .trim();
    if (fallback.length > 3) {
      return fallback.charAt(0).toUpperCase() + fallback.slice(1);
    }
  }

  return parts.join(" ") || "New Brief";
}

// =============================================================================
// CLARIFYING QUESTIONS
// =============================================================================

export function generateClarifyingQuestions(
  inference: InferenceResult,
  alreadyAsked: string[] = []
): ClarifyingQuestion[] {
  const questions: ClarifyingQuestion[] = [];

  // Platform question
  if (
    !inference.platform.value ||
    inference.platform.confidence < CONFIDENCE_THRESHOLD
  ) {
    if (!alreadyAsked.includes("platform")) {
      questions.push({
        id: "platform",
        field: "platform",
        question: "Which platform is this for?",
        options: [
          { label: "Instagram", value: "instagram" },
          { label: "LinkedIn", value: "linkedin" },
          { label: "YouTube", value: "youtube" },
          { label: "Facebook", value: "facebook" },
          { label: "Twitter/X", value: "twitter" },
          { label: "TikTok", value: "tiktok" },
          { label: "Web/Banner", value: "web" },
          { label: "Print", value: "print" },
        ],
        priority: 1,
      });
    }
  }

  // Intent question
  if (
    !inference.intent.value ||
    inference.intent.confidence < CONFIDENCE_THRESHOLD
  ) {
    if (!alreadyAsked.includes("intent")) {
      questions.push({
        id: "intent",
        field: "intent",
        question: "What's the main goal?",
        options: [
          {
            label: "Get signups",
            value: "signups",
            description: "Drive registrations",
          },
          {
            label: "Build authority",
            value: "authority",
            description: "Establish expertise",
          },
          {
            label: "Increase awareness",
            value: "awareness",
            description: "Brand visibility",
          },
          {
            label: "Drive sales",
            value: "sales",
            description: "Generate revenue",
          },
        ],
        priority: 2,
      });
    }
  }

  // Sort by priority
  questions.sort((a, b) => a.priority - b.priority);

  // Return only the first question (ask one at a time)
  return questions.slice(0, 1);
}

// =============================================================================
// UPDATE BRIEF FROM INFERENCE
// =============================================================================

export function applyInferenceToBrief(
  brief: LiveBrief,
  inference: InferenceResult,
  brandAudiences?: InferredAudience[],
  messageText?: string
): LiveBrief {
  const updated = { ...brief, updatedAt: new Date() };

  // Apply task type - only if confidence is higher
  if (
    inference.taskType.value &&
    inference.taskType.confidence > (updated.taskType.confidence || 0)
  ) {
    updated.taskType = inference.taskType;
  }

  // Apply intent - be VERY aggressive, show any detected value
  // Users want to see the brief populated immediately
  if (inference.intent.value) {
    const shouldUpdate =
      inference.intent.confidence > (updated.intent.confidence || 0) ||
      (!updated.intent.value && inference.intent.confidence > 0.1);
    if (shouldUpdate) {
      updated.intent = {
        ...inference.intent,
        // Always show as inferred or pending, never hide
        source: inference.intent.confidence >= 0.5 ? "inferred" : "pending",
      };
    }
  }

  // Apply platform and dimensions - be VERY aggressive for first message
  if (inference.platform.value) {
    const shouldUpdate =
      inference.platform.confidence > (updated.platform.confidence || 0) ||
      (!updated.platform.value && inference.platform.confidence > 0.1);
    if (shouldUpdate) {
      updated.platform = {
        ...inference.platform,
        source: inference.platform.confidence >= 0.5 ? "inferred" : "pending",
      };

      // Auto-apply dimensions
      const dimensions = getDimensionsForPlatform(
        inference.platform.value,
        inference.contentType.value || undefined
      );
      updated.dimensions = dimensions;
    }
  }

  // Apply topic - extract something from every message if possible
  if (inference.topic.value) {
    const shouldUpdate =
      inference.topic.confidence > (updated.topic.confidence || 0) ||
      (!updated.topic.value && inference.topic.confidence > 0.1);
    if (shouldUpdate) {
      updated.topic = {
        ...inference.topic,
        source: inference.topic.confidence >= 0.4 ? "inferred" : "pending",
      };
    }
  }

  // FALLBACK: If no topic extracted but we have message text, try to extract something
  if (!updated.topic.value && messageText) {
    const fallbackTopic = extractTopicFallback(messageText);
    if (fallbackTopic) {
      updated.topic = {
        value: fallbackTopic,
        confidence: 0.4,
        source: "pending",
      };
    }
  }

  // Apply audience - use the actual message context for matching, not empty string
  if (brandAudiences && brandAudiences.length > 0) {
    // Re-match using the original message if provided, otherwise use empty string for default
    const audienceMatch = matchAudience(messageText || "", brandAudiences);
    // Be more aggressive about showing audience - default to primary if nothing better found
    if (
      audienceMatch.value &&
      (audienceMatch.confidence > (updated.audience.confidence || 0) ||
        !updated.audience.value)
    ) {
      updated.audience = audienceMatch;
    }
  }

  // Generate task summary from the message - always try to extract something meaningful
  const summary = generateTaskSummary(inference);
  const hasAnyContent =
    inference.platform.value ||
    inference.taskType.value ||
    inference.topic.value ||
    inference.intent.value ||
    inference.contentType.value;

  if (hasAnyContent || messageText) {
    // Calculate confidence based on available fields
    const confidences = [
      inference.platform.confidence,
      inference.taskType.confidence,
      inference.topic.confidence,
      inference.intent.confidence,
    ].filter((c) => c > 0);

    const avgConfidence =
      confidences.length > 0
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : 0.3;

    // Update summary if we have one and it's better than current
    // Or if we have no summary at all, extract one from the message
    const shouldUpdateSummary =
      !updated.taskSummary.value ||
      avgConfidence > (updated.taskSummary.confidence || 0) ||
      (summary && summary !== "New Brief" && avgConfidence >= 0.3);

    if (shouldUpdateSummary) {
      let newSummary = summary;

      // If generated summary is weak but we have message text, create a better one
      if ((summary === "New Brief" || !summary) && messageText) {
        newSummary = extractSummaryFromMessage(messageText);
      } else if (summary === "New Brief" && inference.topic.value) {
        newSummary = inference.topic.value;
      }

      // Validate summary isn't a fragment (less than 5 chars, or just prepositions/articles)
      const isSummaryValid = (s: string) => {
        if (!s || s.length < 5 || s === "New Brief" || s === "New project request") return false;
        // Reject summaries that are just dangling words like "Of my", "For the"
        if (/^(of|for|to|in|on|at|by|with|my|our|the|a|an)\b/i.test(s) && s.split(" ").length <= 2) return false;
        return true;
      };

      if (newSummary && isSummaryValid(newSummary)) {
        updated.taskSummary = {
          value: newSummary,
          confidence: Math.max(avgConfidence, 0.4),
          source: avgConfidence >= 0.5 ? "inferred" : "pending",
        };
      }
    }
  }

  // FALLBACK: Always try to populate taskSummary from message if empty
  if (!updated.taskSummary.value && messageText) {
    const fallbackSummary = extractSummaryFromMessage(messageText);
    if (fallbackSummary && fallbackSummary !== "New project request" && fallbackSummary.length >= 5) {
      updated.taskSummary = {
        value: fallbackSummary,
        confidence: 0.35,
        source: "pending",
      };
    }
  }

  return updated;
}

/**
 * Fallback topic extraction when pattern matching fails
 * Extracts the most meaningful noun phrase from the message
 */
function extractTopicFallback(message: string): string | null {
  // Look for key descriptive phrases
  const descriptors = [
    /\b(cinematic|promotional|marketing|brand|product)\s+(video|intro|introduction|content|ad|commercial)/i,
    /\b(video|content|post|ad)\s+(?:that\s+)?(?:introduces?|showcases?|announces?|promotes?)\s+(?:my|our|the|a)?\s*([\w\s]+?)(?:\s+to|\.|,|$)/i,
    /\b(launch|launching|announcing|introducing)\s+(?:my|our|the|a)?\s*([\w\s]+?)(?:\s+to|\.|,|$)/i,
    /\b(?:my|our)\s+(product|service|app|platform|business|brand|company)\b/i,
  ];

  for (const pattern of descriptors) {
    const match = message.match(pattern);
    if (match) {
      // Get the best capture group (last non-empty one)
      const captured = match.slice(1).filter(Boolean).pop();
      if (captured && captured.length > 2 && captured.length < 50) {
        const cleaned = captured.trim().replace(/^(my|our|the|a|an)\s+/i, "");
        if (cleaned.length > 2) {
          return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        }
      }
    }
  }

  // Look for quoted text
  const quoted = message.match(/"([^"]+)"|'([^']+)'/);
  if (quoted) {
    const text = (quoted[1] || quoted[2]).trim();
    if (text.length > 2 && text.length < 50) {
      return text.charAt(0).toUpperCase() + text.slice(1);
    }
  }

  // Extract first meaningful phrase (skip common words)
  const words = message
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .filter(
      (w) =>
        !/^(the|and|for|that|with|from|this|have|will|can|could|would|please|need|want|help|create|make|design|build|get|more|just|also|really|very)$/i.test(
          w
        )
    );

  // Find a meaningful content word sequence — ensure it doesn't end with a dangling word
  let contentWords = words.slice(0, 5).join(" ");
  // Remove trailing prepositions, articles, possessives
  contentWords = contentWords
    .replace(/\s+(of|for|to|in|on|at|by|with|my|our|the|a|an)\s*$/i, "")
    .trim();
  if (contentWords.length > 3 && contentWords.length < 40) {
    return contentWords.charAt(0).toUpperCase() + contentWords.slice(1);
  }

  return null;
}

/**
 * Extract a meaningful summary from a user message
 * Used when pattern-based inference doesn't produce a clear summary
 */
function extractSummaryFromMessage(message: string): string {
  // First, try to extract the core request using natural patterns
  const requestPatterns = [
    // "I want/need a X" or "Create a X"
    /(?:i\s+(?:want|need|would like)(?:\s+to)?|(?:please\s+)?(?:create|make|design|build))\s+(?:me\s+)?(?:a\s+)?(.+?)(?:\.|$)/i,
    // "Can you make X" 
    /(?:can|could)\s+you\s+(?:create|make|design|build)\s+(?:me\s+)?(?:a\s+)?(.+?)(?:\.|$)/i,
    // "Looking for X"
    /(?:looking for|interested in)\s+(?:a\s+)?(.+?)(?:\.|$)/i,
    // Direct description - "A clear guided tour..."
    /^(?:a\s+)?(.{15,})$/i,
  ];

  for (const pattern of requestPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      let extracted = match[1].trim();
      // Remove trailing incomplete clauses
      extracted = extracted
        .replace(/\s+(that|which|who|where|when)\s*$/i, "")
        .replace(/\s+(of|for|to|in|on|at|by|with)\s*$/i, "")
        .replace(/\s+(my|our|the|a|an)\s*$/i, "")
        .trim();

      if (extracted.length >= 5 && extracted.length <= 80) {
        // Truncate at word boundary if too long
        if (extracted.length > 60) {
          const truncated = extracted.substring(0, 60);
          const lastSpace = truncated.lastIndexOf(" ");
          extracted = lastSpace > 20 ? truncated.substring(0, lastSpace) : truncated;
        }
        return extracted.charAt(0).toUpperCase() + extracted.slice(1);
      }
    }
  }

  // Fallback: clean up the message itself
  let cleaned = message
    .replace(/\s+/g, " ")
    .trim();

  // Truncate at word boundary
  if (cleaned.length > 60) {
    const truncated = cleaned.substring(0, 60);
    const lastSpace = truncated.lastIndexOf(" ");
    cleaned = lastSpace > 15 ? truncated.substring(0, lastSpace) : truncated;
  }

  // Remove trailing dangling words
  cleaned = cleaned
    .replace(/\s+(of|for|to|in|on|at|by|with|my|our|the|a|an|and|or)\s*$/i, "")
    .trim();

  if (cleaned.length >= 5) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return "New project request";
}

// =============================================================================
// REQUEST COMPLETENESS ANALYSIS
// =============================================================================

/**
 * Analyze how complete/detailed a user's request is
 * Used to determine if AI should ask questions or proceed directly
 */
export function analyzeRequestCompleteness(
  inference: InferenceResult
): "detailed" | "moderate" | "vague" {
  const highConfidenceFields = [
    inference.platform.confidence >= 0.75,
    inference.intent.confidence >= 0.6,
    inference.topic.confidence >= 0.5,
    inference.contentType.confidence >= 0.6,
  ].filter(Boolean).length;

  if (highConfidenceFields >= 3) return "detailed";
  if (highConfidenceFields <= 1) return "vague";
  return "moderate";
}

// =============================================================================
// BRAND DETECTION
// =============================================================================

/**
 * Detect if user mentions a brand name in their message
 * Returns info about whether the mentioned brand matches their saved profile
 */
export function detectBrandMention(
  message: string,
  companyName: string | null,
  companyKeywords: string[] = []
): {
  detected: boolean;
  mentionedBrand: string | null;
  matchesProfile: boolean;
} {
  if (!companyName)
    return { detected: false, mentionedBrand: null, matchesProfile: false };

  const messageLower = message.toLowerCase();
  const companyLower = companyName.toLowerCase();

  // Check if mentions a brand name
  const brandPatterns = [
    // "for [Brand Name]" pattern
    /\bfor\s+["']?([A-Z][A-Za-z0-9\s&]+?)["']?\s*(?:brand|company|business|shop|store)?(?:\s|,|\.|\?|$)/i,
    // "my/our brand [Name]" pattern
    /\b(?:my|our)\s+(?:brand|company|business)\s+["']?([A-Z][A-Za-z0-9\s&]+?)["']?(?:\s|,|\.|\?|$)/i,
    // "[Name]'s new product/launch/campaign" pattern
    /\b([A-Z][A-Za-z0-9\s&]{2,30})(?:'s|'s)\s+(?:new|product|launch|campaign)/i,
    // Quoted brand name pattern
    /["']([A-Z][A-Za-z0-9\s&]{2,30})["']/,
    // "brand called [Name]" pattern
    /\bbrand\s+(?:called|named)\s+["']?([A-Z][A-Za-z0-9\s&]+?)["']?(?:\s|,|\.|\?|$)/i,
  ];

  for (const pattern of brandPatterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      const mentioned = match[1].trim();

      // Skip common words that might be false positives
      const commonWords = [
        "instagram",
        "linkedin",
        "facebook",
        "twitter",
        "youtube",
        "tiktok",
        "carousel",
        "post",
        "story",
        "reel",
        "ad",
        "banner",
        "content",
      ];
      if (commonWords.includes(mentioned.toLowerCase())) continue;

      const matchesProfile =
        mentioned.toLowerCase() === companyLower ||
        companyKeywords.some(
          (k) => k.toLowerCase() === mentioned.toLowerCase()
        ) ||
        companyLower.includes(mentioned.toLowerCase()) ||
        mentioned.toLowerCase().includes(companyLower);

      return { detected: true, mentionedBrand: mentioned, matchesProfile };
    }
  }

  // Also check if the company name itself is mentioned (positive match)
  if (messageLower.includes(companyLower)) {
    return {
      detected: true,
      mentionedBrand: companyName,
      matchesProfile: true,
    };
  }

  return { detected: false, mentionedBrand: null, matchesProfile: false };
}

// =============================================================================
// SHOULD ASK QUESTION
// =============================================================================

export function shouldAskClarifyingQuestion(
  inference: InferenceResult
): boolean {
  // Ask if platform is not confident
  if (
    !inference.platform.value ||
    inference.platform.confidence < CONFIDENCE_THRESHOLD
  ) {
    return true;
  }

  // Ask if intent is not confident and task seems complex
  if (
    inference.taskType.value === "multi_asset_plan" &&
    (!inference.intent.value ||
      inference.intent.confidence < CONFIDENCE_THRESHOLD)
  ) {
    return true;
  }

  return false;
}
