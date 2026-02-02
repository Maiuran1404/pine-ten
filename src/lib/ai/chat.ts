import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import {
  styleReferences,
  taskCategories,
  users,
  platformSettings,
  audiences as audiencesTable,
} from "@/db/schema";
import { eq } from "drizzle-orm";

// Category prompt structure
interface CategoryPrompts {
  systemPrompt: string;
  decisionTree: string;
}

// Chat prompts interface - matches admin chat-setup page structure
interface ChatPrompts {
  globalSystemPrompt: string;
  socialMediaContent: CategoryPrompts;
  socialMediaAds: CategoryPrompts;
  videoEdits: CategoryPrompts;
  branding: CategoryPrompts;
  custom: CategoryPrompts;
}

// Legacy interface for backward compatibility
interface LegacyChatPrompts {
  systemPrompt: string;
  staticAdsTree: string;
  dynamicAdsTree: string;
  socialMediaTree: string;
  uiuxTree: string;
  creditGuidelines: string;
}

// Cache for chat prompts (refreshed every 5 minutes)
let cachedPrompts: ChatPrompts | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Function to invalidate the cache (called when prompts are updated)
export function clearChatPromptsCache(): void {
  cachedPrompts = null;
  cacheTimestamp = 0;
}

// Check if prompts are in new format
function isNewFormatPrompts(prompts: unknown): prompts is ChatPrompts {
  return (
    typeof prompts === "object" &&
    prompts !== null &&
    "globalSystemPrompt" in prompts &&
    "socialMediaContent" in prompts
  );
}

// Fetch chat prompts from database
async function getChatPrompts(): Promise<ChatPrompts | null> {
  // Check cache first
  if (cachedPrompts && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedPrompts;
  }

  try {
    const result = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, "chat_prompts"))
      .limit(1);

    if (result.length > 0 && result[0].value) {
      const dbValue = result[0].value;

      // Check if it's the new format
      if (isNewFormatPrompts(dbValue)) {
        cachedPrompts = dbValue;
      } else {
        // Convert legacy format or use defaults
        cachedPrompts = null;
      }

      cacheTimestamp = Date.now();
      return cachedPrompts;
    }
  } catch (error) {
    console.error("Failed to fetch chat prompts from database:", error);
  }

  return null;
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Helper to get delivery date
function getDeliveryDate(businessDays: number): string {
  const date = new Date();
  let daysAdded = 0;
  while (daysAdded < businessDays) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Skip weekends
      daysAdded++;
    }
  }
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const dayName = days[date.getDay()];
  const dayNum = date.getDate();
  const suffix =
    dayNum === 1 || dayNum === 21 || dayNum === 31
      ? "st"
      : dayNum === 2 || dayNum === 22
      ? "nd"
      : dayNum === 3 || dayNum === 23
      ? "rd"
      : "th";
  const monthName = months[date.getMonth()];
  return `${dayName} ${dayNum}${suffix} ${monthName}`;
}

// ============================================================================
// DEFAULT PROMPTS - Significantly improved for better UX and results
// ============================================================================

const DEFAULT_GLOBAL_SYSTEM_PROMPT = `You are a senior creative operator at Crafted — a design agency that handles creative tasks for clients.

YOUR ROLE:
- You already know the client's brand, industry, audience, and visual style from their onboarding data
- Use this knowledge to make smart assumptions and move quickly
- Ask ONE concrete question per response to gather the missing piece needed to complete the brief

RESPONSE FORMAT (STRICT):
1. 1-2 sentences that acknowledge the request and add value (DO NOT restate what they asked for)
2. Show style options: [DELIVERABLE_STYLES: type]
3. ONE focused question to move toward task submission

WHAT TO WRITE:
- ADD context or insight based on their brand/industry (e.g., "Given your B2B audience, we'll lead with the business impact.")
- ASSUME platform based on their industry (B2B = LinkedIn, B2C consumer = Instagram, etc.)
- PROPOSE an angle or approach rather than asking open-ended questions
- If they have target audiences defined, reference them naturally

WHAT NOT TO WRITE:
- DON'T echo back what they said ("Product launch video" → they already know this)
- DON'T explain your approach or methodology
- DON'T use filler phrases like "I'll create" or "Let me help you with"
- DON'T ask multiple questions
- DON'T use exclamation marks, "Perfect!", "Great!", or emojis
- DON'T expose technical details like hex codes or font names

EXAMPLE INTERACTIONS:

User: "Create a product launch video"
Response: "For launch content, the hook in the first 3 seconds is everything — we'll lead with your strongest differentiator."
[DELIVERABLE_STYLES: instagram_reel]
"What's the product and its main selling point?"

User: "Instagram posts for our new feature"
Response: "We'll highlight the feature through your established visual style. I'll pull from your brand palette."
[DELIVERABLE_STYLES: instagram_post]
"Which feature are we showcasing, and what problem does it solve?"

User: "Ad campaign"
Response: "I'll target your primary audience segment. Static or motion depends on the platform mix and budget."
[DELIVERABLE_STYLES: static_ad]
"What's the offer, and where will these run?"

User: "Need content for a webinar announcement"
Response: "Webinar promos work best as a sequence — teaser, reminder, last chance. Given your B2B audience, LinkedIn will be primary."
[DELIVERABLE_STYLES: linkedin_post]
"What's the webinar topic and date?"

ASKING THE RIGHT QUESTIONS:
- Ask about the SUBJECT (what product/feature/event) not the FORMAT (you determine that)
- Ask about the GOAL (awareness, conversion, engagement) when relevant
- Ask about TIMING if it affects urgency
- Never ask about colors, fonts, audience, or platform — you have this data

Available deliverable types: instagram_post, instagram_story, instagram_reel, linkedin_post, static_ad, logo, brand_identity, web_banner

QUICK OPTIONS (when genuinely helpful):
[QUICK_OPTIONS]
{"question": "Short question?", "options": ["Option 1", "Option 2"], "multiSelect": false}
[/QUICK_OPTIONS]

TASK OUTPUT:
[TASK_READY]
{"title": "...", "description": "...", "category": "...", "requirements": {...}, "creditsRequired": X, "deliveryDays": X}
[/TASK_READY]`;

// ============================================================================
// CATEGORY-SPECIFIC PROMPTS
// ============================================================================

const DEFAULT_SOCIAL_MEDIA_CONTENT: CategoryPrompts = {
  systemPrompt: `Social content expert. Infer platform from client's industry (B2B → LinkedIn, B2C → Instagram). Reference their target audience.`,
  decisionTree: `1-2 sentences adding value based on their brand context, then:
[DELIVERABLE_STYLES: appropriate_type]
Ask what they're featuring or announcing.`,
};

const DEFAULT_SOCIAL_MEDIA_ADS: CategoryPrompts = {
  systemPrompt: `Paid social/ads expert. Consider their audience and where they spend time. Static vs motion depends on budget and platform.`,
  decisionTree: `1-2 sentences on approach based on their industry/audience, then:
[DELIVERABLE_STYLES: static_ad]
Ask about the offer and intended platforms.`,
};

const DEFAULT_VIDEO_EDITS: CategoryPrompts = {
  systemPrompt: `Video/motion expert. Hook-first thinking — the first 3 seconds determine success. Match energy to their brand personality.`,
  decisionTree: `1-2 sentences on the motion approach, then:
[DELIVERABLE_STYLES: instagram_reel]
Ask about the subject and key message.`,
};

const DEFAULT_BRANDING: CategoryPrompts = {
  systemPrompt: `Brand identity expert. Understand scope: logo-only, full identity system, or refresh of existing assets.`,
  decisionTree: `1-2 sentences assessing what they might need, then:
[DELIVERABLE_STYLES: logo]
[DELIVERABLE_STYLES: brand_identity]
Ask about scope and what's driving the rebrand/new brand.`,
};

const DEFAULT_CUSTOM: CategoryPrompts = {
  systemPrompt: `Flexible creative expert. Clarify the deliverable type first, then apply relevant expertise.`,
  decisionTree: `1-2 sentences to understand the project, then:
[DELIVERABLE_STYLES: brand_identity]
[DELIVERABLE_STYLES: web_banner]
Ask about the primary deliverable and its purpose.`,
};

// Assemble default prompts object
const DEFAULT_PROMPTS: ChatPrompts = {
  globalSystemPrompt: DEFAULT_GLOBAL_SYSTEM_PROMPT,
  socialMediaContent: DEFAULT_SOCIAL_MEDIA_CONTENT,
  socialMediaAds: DEFAULT_SOCIAL_MEDIA_ADS,
  videoEdits: DEFAULT_VIDEO_EDITS,
  branding: DEFAULT_BRANDING,
  custom: DEFAULT_CUSTOM,
};

async function getSystemPrompt(): Promise<string> {
  const today = new Date();
  const todayStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Try to get prompts from database
  const dbPrompts = await getChatPrompts();
  const prompts = dbPrompts || DEFAULT_PROMPTS;

  return `${prompts.globalSystemPrompt}

TODAY: ${todayStr}

IF THE REQUEST IS COMPLETELY UNCLEAR:
"What type of content are you looking for?"
[QUICK_OPTIONS]
{"question": "What do you need?", "options": ["Social content", "Ads", "Video", "Branding", "Something else"]}
[/QUICK_OPTIONS]`;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatContext {
  brandDetection?: {
    detected: boolean;
    mentionedBrand: string | null;
    matchesProfile: boolean;
  };
  requestCompleteness?: "detailed" | "moderate" | "vague";
  confirmedFields?: Record<string, string | undefined>;
}

export interface DeliverableStyleMarker {
  type: "initial" | "more" | "different" | "semantic" | "refine";
  deliverableType: string;
  styleAxis?: string;
  searchQuery?: string; // For semantic search queries
  baseStyleId?: string; // For style refinement (id of style being refined)
  refinementQuery?: string; // For style refinement (user's refinement feedback)
}

export async function chat(
  messages: ChatMessage[],
  userId: string,
  context?: ChatContext
): Promise<{
  content: string;
  styleReferences?: string[];
  quickOptions?: { question: string; options: string[] };
  deliverableStyleMarker?: DeliverableStyleMarker;
}> {
  // Fetch user's company/brand data
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      company: true,
    },
  });

  const company = user?.company;

  // Fetch available style categories for context
  const styles = await db
    .select()
    .from(styleReferences)
    .where(eq(styleReferences.isActive, true));

  const categories = await db
    .select()
    .from(taskCategories)
    .where(eq(taskCategories.isActive, true));

  // Fetch audiences for the company
  const audiences = company?.id
    ? await db
        .select()
        .from(audiencesTable)
        .where(eq(audiencesTable.companyId, company.id))
    : [];

  // Build audience context from the audiences table structure
  const audienceContext =
    audiences.length > 0
      ? `
TARGET AUDIENCES (from brand analysis):
${audiences
  .map((a, i) => {
    const psychographics = a.psychographics as {
      painPoints?: string[];
      goals?: string[];
    } | null;
    const demographics = a.demographics as {
      ageRange?: { min: number; max: number };
      locations?: string[];
    } | null;
    return `${i + 1}. ${a.name}${a.isPrimary ? " (primary)" : ""}
   - Demographics: ${
     demographics?.locations?.join(", ") || demographics?.ageRange
       ? `${demographics.ageRange?.min}-${demographics.ageRange?.max}`
       : "Not specified"
   }
   - Pain points: ${psychographics?.painPoints?.join(", ") || "Not specified"}
   - Goals: ${psychographics?.goals?.join(", ") || "Not specified"}`;
  })
  .join("\n")}`
      : "";

  // Determine platform recommendation based on industry
  const industryLower = (company?.industry || "").toLowerCase();
  const isB2B =
    industryLower.includes("b2b") ||
    industryLower.includes("saas") ||
    industryLower.includes("software") ||
    industryLower.includes("consulting") ||
    industryLower.includes("enterprise") ||
    industryLower.includes("finance") ||
    industryLower.includes("legal") ||
    industryLower.includes("professional");
  const platformRecommendation = isB2B
    ? "LinkedIn (B2B audience)"
    : "Instagram (consumer audience)";

  const companyContext = company
    ? `
=== CLIENT BRAND CONTEXT (YOU HAVE THIS DATA — USE IT) ===

COMPANY: ${company.name}
INDUSTRY: ${company.industry || "Not specified"}
WHAT THEY DO: ${company.description || "Not specified"}
${audienceContext}

PLATFORM RECOMMENDATION: ${platformRecommendation}
${
  company.socialLinks
    ? `ACTIVE CHANNELS: ${
        Object.keys(company.socialLinks)
          .filter((k) => (company.socialLinks as Record<string, string>)[k])
          .join(", ") || "Not specified"
      }`
    : ""
}

BRAND ASSETS: ${company.logoUrl ? "Logo available" : "No logo yet"}${
        [
          company.primaryColor,
          company.secondaryColor,
          company.accentColor,
        ].filter(Boolean).length > 0
          ? ", established color palette"
          : ""
      }

HOW TO USE THIS:
- Reference their industry/audience naturally: "Given your B2B audience..." or "For your [industry] customers..."
- Assume the recommended platform unless they specify otherwise
- Mention you'll apply their brand style (don't ask about colors/fonts)
- If they have target audiences, weave that into your recommendations

NEVER:
- Ask about their industry, audience, colors, or fonts — you have it
- Expose hex codes, font names, or technical details
- Suggest platforms that don't fit their audience`
    : "No brand profile available. Ask what they do and who their audience is.";

  const basePrompt = await getSystemPrompt();

  // Build brand detection context
  let brandDetectionContext = "";
  if (
    context?.brandDetection?.detected &&
    context.brandDetection.mentionedBrand
  ) {
    if (!context.brandDetection.matchesProfile && company?.name) {
      brandDetectionContext = `
BRAND CONTEXT AWARENESS:
- User's saved brand: ${company.name}
- User mentioned brand in message: "${context.brandDetection.mentionedBrand}"
- NOTE: The mentioned brand differs from the saved brand profile.
- You should ask: "I see you're creating for ${context.brandDetection.mentionedBrand}. Should I use your saved ${company.name} brand guidelines, or work with what you've described?"
- Use [QUICK_OPTIONS] with: {"question": "Which brand should I use?", "options": ["Use my saved brand (${company.name})", "Use ${context.brandDetection.mentionedBrand}", "This is a new brand"]}
`;
    }
  }

  // Build request completeness context
  let completenessContext = "";
  if (context?.requestCompleteness) {
    if (context.requestCompleteness === "detailed") {
      completenessContext = `
REQUEST: DETAILED — User gave comprehensive info.
- Move fast: show styles immediately
- Only ask about genuinely missing critical info
- You likely have everything needed to proceed
`;
    } else if (context.requestCompleteness === "vague") {
      completenessContext = `
REQUEST: VAGUE — User gave minimal info.
- Clarify the content type first
- Use [QUICK_OPTIONS] if truly unclear
- Then show relevant styles
`;
    } else {
      completenessContext = `
REQUEST: PARTIAL — Missing some details.
- Show styles while asking the ONE most important missing piece
- Don't ask multiple questions
`;
    }
  }

  // Build confirmed fields context to prevent re-asking
  let confirmedFieldsContext = "";
  if (
    context?.confirmedFields &&
    Object.values(context.confirmedFields).some(Boolean)
  ) {
    const confirmed = context.confirmedFields;
    confirmedFieldsContext = `
ALREADY CONFIRMED (DO NOT RE-ASK THESE):
${confirmed.platform ? `- Platform: ${confirmed.platform}` : ""}
${confirmed.intent ? `- Intent/Goal: ${confirmed.intent}` : ""}
${confirmed.topic ? `- Topic: ${confirmed.topic}` : ""}
${confirmed.audience ? `- Audience: ${confirmed.audience}` : ""}
${confirmed.contentType ? `- Content Type: ${confirmed.contentType}` : ""}

CRITICAL: Never ask about fields listed above. They have been confirmed by the user. Focus only on what's genuinely missing.
`;
  }

  const enhancedSystemPrompt = `${basePrompt}

${companyContext}
${brandDetectionContext}
${completenessContext}
${confirmedFieldsContext}

Available task categories:
${categories
  .map((c) => `- ${c.name}: ${c.description} (base: ${c.baseCredits} credits)`)
  .join("\n")}

Available style reference categories:
${[...new Set(styles.map((s) => s.category))].join(", ")}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: enhancedSystemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const content =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Extract style references if mentioned
  const styleMatch = content.match(/\[STYLE_REFERENCES: ([^\]]+)\]/);
  const mentionedStyles = styleMatch
    ? styleMatch[1].split(",").map((s) => s.trim())
    : undefined;

  // Extract deliverable style markers
  let deliverableStyleMarker: DeliverableStyleMarker | undefined;

  // Check for initial deliverable styles: [DELIVERABLE_STYLES: type]
  const deliverableMatch = content.match(/\[DELIVERABLE_STYLES: ([^\]]+)\]/);
  if (deliverableMatch) {
    deliverableStyleMarker = {
      type: "initial",
      deliverableType: deliverableMatch[1].trim(),
    };
  }

  // Check for more styles: [MORE_STYLES: type, axis]
  const moreStylesMatch = content.match(/\[MORE_STYLES: ([^,]+),\s*([^\]]+)\]/);
  if (moreStylesMatch) {
    deliverableStyleMarker = {
      type: "more",
      deliverableType: moreStylesMatch[1].trim(),
      styleAxis: moreStylesMatch[2].trim(),
    };
  }

  // Check for different styles: [DIFFERENT_STYLES: type]
  const differentMatch = content.match(/\[DIFFERENT_STYLES: ([^\]]+)\]/);
  if (differentMatch) {
    deliverableStyleMarker = {
      type: "different",
      deliverableType: differentMatch[1].trim(),
    };
  }

  // Check for semantic style search: [SEARCH_STYLES: query, type]
  const searchStylesMatch = content.match(
    /\[SEARCH_STYLES: ([^,]+),\s*([^\]]+)\]/
  );
  if (searchStylesMatch) {
    deliverableStyleMarker = {
      type: "semantic",
      searchQuery: searchStylesMatch[1].trim(),
      deliverableType: searchStylesMatch[2].trim(),
    };
  }

  // Check for style refinement: [REFINE_STYLE: refinement_query, base_style_id, type]
  const refineStyleMatch = content.match(
    /\[REFINE_STYLE: ([^,]+),\s*([^,]+),\s*([^\]]+)\]/
  );
  if (refineStyleMatch) {
    deliverableStyleMarker = {
      type: "refine",
      refinementQuery: refineStyleMatch[1].trim(),
      baseStyleId: refineStyleMatch[2].trim(),
      deliverableType: refineStyleMatch[3].trim(),
    };
  }

  // Extract quick options if present
  const quickOptionsMatch = content.match(
    /\[QUICK_OPTIONS\]([\s\S]*?)\[\/QUICK_OPTIONS\]/
  );
  let quickOptions: { question: string; options: string[] } | undefined;
  if (quickOptionsMatch) {
    try {
      quickOptions = JSON.parse(quickOptionsMatch[1].trim());
    } catch {
      // Ignore parse errors
    }
  }

  // Clean the content (use global flag to remove ALL occurrences)
  let cleanContent = content
    .replace(/\[STYLE_REFERENCES: [^\]]+\]/g, "")
    .replace(/\[DELIVERABLE_STYLES: [^\]]+\]/g, "")
    .replace(/\[MORE_STYLES: [^\]]+\]/g, "")
    .replace(/\[DIFFERENT_STYLES: [^\]]+\]/g, "")
    .replace(/\[SEARCH_STYLES: [^\]]+\]/g, "")
    .replace(/\[REFINE_STYLE: [^\]]+\]/g, "")
    .replace(/\[QUICK_OPTIONS\][\s\S]*?\[\/QUICK_OPTIONS\]/g, "")
    .trim();

  // Post-process to remove enthusiastic/sycophantic language that slipped through

  // Banned opener patterns (expanded list)
  const BANNED_OPENERS = [
    // Enthusiastic affirmations
    /^(Perfect|Great|Excellent|Amazing|Awesome|Wonderful|Fantastic|Nice|Solid|Good|Beautiful|Lovely)[!,.]?\s*/i,
    // Enthusiastic affirmations with "choice/pick"
    /^(Great|Excellent|Good|Nice|Solid|Smart|Wise) (choice|pick|selection)[!,.]?\s*/i,
    // Validation phrases
    /^(Love it|That's great|That works|Sure thing|Absolutely|Definitely|Totally)[!,.]?\s*/i,
    // Eager helper phrases
    /^(I'd be happy to|I'd love to|Happy to|Glad to|Excited to)[!,.]?\s*/i,
    /^(Of course|Certainly|Sure|Absolutely)[!,]?\s*/i,
    // Acknowledgment phrases (keep simple, remove excessive)
    /^(Got it|Noted|Understood|Makes sense|I see|I understand)[!,.]?\s*/i,
  ];

  // Banned mid-content patterns
  const BANNED_MID = [
    /\s+(That's exciting|That sounds amazing|I love that|That's great|That's wonderful)[!.]?\s*/gi,
    /\s+(Super|Awesome|Amazing)(!|\s)/gi,
    /\s+You're absolutely right[!.]?\s*/gi,
    /\s+That's a (great|excellent|fantastic|wonderful) (idea|choice|direction)[!.]?\s*/gi,
  ];

  // Apply opener sanitization
  const originalLength = cleanContent.length;
  for (const pattern of BANNED_OPENERS) {
    cleanContent = cleanContent.replace(pattern, "");
    if (cleanContent.length < originalLength) break; // Stop after first match
  }

  // If we removed an opener, capitalize the first letter of remaining content
  if (cleanContent.length < originalLength && cleanContent.length > 0) {
    cleanContent = cleanContent.charAt(0).toUpperCase() + cleanContent.slice(1);
  }

  // Apply mid-content sanitization
  for (const pattern of BANNED_MID) {
    cleanContent = cleanContent.replace(pattern, " ");
  }

  cleanContent = cleanContent
    // Remove emojis
    .replace(
      /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu,
      ""
    )
    // Strip hex codes to hide technical color values from users
    .replace(/\s*\(?\s*#[A-Fa-f0-9]{3,8}\s*\)?\s*/g, " ")
    // Clean up "color ()" patterns that result from stripping
    .replace(/\bcolor\s*\(\s*\)/gi, "color")
    .replace(/\bcolors\s*\(\s*\)/gi, "colors")
    .replace(/\(\s*\)/g, "")
    // Clean up any double spaces or leading/trailing whitespace
    .replace(/\s+/g, " ")
    .trim();

  // Final check: Ensure first character is capitalized (for professional tone)
  // This catches any edge cases where sanitization left lowercase first letter
  if (cleanContent.length > 0 && /^[a-z]/.test(cleanContent)) {
    cleanContent = cleanContent.charAt(0).toUpperCase() + cleanContent.slice(1);
  }

  return {
    content: cleanContent,
    styleReferences: mentionedStyles,
    quickOptions,
    deliverableStyleMarker,
  };
}

// Helper to strip hex codes from user-facing text
function stripHexCodes(text: string): string {
  return (
    text
      // Remove hex codes like #15202B or #FFF (with optional surrounding parentheses)
      .replace(/\s*\(?\s*#[A-Fa-f0-9]{3,8}\s*\)?\s*/g, " ")
      // Remove phrases like "color ()" or "Primary color ()" that result from stripping
      .replace(/\bcolor\s*\(\s*\)/gi, "color")
      .replace(/\bcolors\s*\(\s*\)/gi, "colors")
      // Clean up resulting double spaces and awkward punctuation
      .replace(/\s+,/g, ",")
      .replace(/,\s*,/g, ",")
      .replace(/\(\s*\)/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

export function parseTaskFromChat(content: string): object | null {
  const taskMatch = content.match(/\[TASK_READY\]([\s\S]*?)\[\/TASK_READY\]/);
  if (!taskMatch) return null;

  try {
    const task = JSON.parse(taskMatch[1].trim());

    // Strip hex codes from description to hide technical details from users
    if (task.description && typeof task.description === "string") {
      task.description = stripHexCodes(task.description);
    }

    return task;
  } catch {
    return null;
  }
}

export async function getStyleReferencesByCategory(
  categories: string[]
): Promise<
  {
    category: string;
    name: string;
    description: string | null;
    imageUrl: string;
  }[]
> {
  const styles = await db
    .select({
      category: styleReferences.category,
      name: styleReferences.name,
      description: styleReferences.description,
      imageUrl: styleReferences.imageUrl,
    })
    .from(styleReferences)
    .where(eq(styleReferences.isActive, true));

  return styles.filter((s) =>
    categories.some((c) => s.category.toLowerCase().includes(c.toLowerCase()))
  );
}
