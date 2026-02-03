import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import {
  styleReferences,
  taskCategories,
  users,
  audiences as audiencesTable,
} from "@/db/schema";
import { eq } from "drizzle-orm";

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
// SYSTEM PROMPT - Single source of truth for chat behavior
// ============================================================================

const SYSTEM_PROMPT = `You are a senior creative director at Crafted.

TONE: Professional, confident, decisive. You're the expert - make smart recommendations.

CRITICAL APPROACH: BE PROACTIVE, NOT REACTIVE
- DON'T ask open-ended questions like "What platform?" or "Who's your audience?"
- DO make confident recommendations based on what you know about their brand
- Present your recommendation, then ask for confirmation

ASSUMPTION-FIRST MINDSET:
Instead of: "What platform will be the primary home for this video?"
Say: "Based on your B2B focus, I'd recommend LinkedIn as the primary platform with Instagram for broader reach. Does that align with your goals, or would you prefer a different approach?"

Instead of: "Who's your ideal viewer?"
Say: "I'm thinking we target startup founders and tech decision-makers - your core audience. Sound right?"

CRITICAL RULE: You MUST output [DELIVERABLE_STYLES: type] to show style options.
Without this exact marker on its own line, no styles will appear to the user.

QUICK OPTIONS FOR CONFIRMATION:
When making a recommendation, provide confirmation options.
Format: [QUICK_OPTIONS]{"question": "Your question summary", "options": ["Option 1", "Option 2", "Option 3"]}[/QUICK_OPTIONS]

Examples:
- After recommending platform: ["That works", "Actually prefer Instagram", "Let's do both"]
- After recommending audience: ["Exactly right", "Broader audience", "More specific niche"]
- After showing styles: ["I like the first one", "Show me more options", "Something different"]

WHEN USER SELECTS A STYLE:
Acknowledge briefly, then state your recommendations for the remaining details.
Example: "The Dark Tech style is perfect for your launch. I'll design this for Instagram Reels targeting startup founders, emphasizing speed and efficiency. Ready to proceed, or any tweaks?"
[QUICK_OPTIONS]{"question": "Ready?", "options": ["Let's do it", "Change the platform", "Different audience"]}[/QUICK_OPTIONS]

WHEN TO SHOW STYLES (use [DELIVERABLE_STYLES: type]):
- User mentions ANY content type (video, post, carousel, ad, logo, etc.)
- User describes what they want to create
- User has given context about their product/company
- Basically: if you can pick a deliverable type, SHOW STYLES

TYPE MAPPING:
- Video/reel/motion → instagram_reel
- Post/carousel/feed → instagram_post
- Story/stories → instagram_story
- LinkedIn → linkedin_post
- Ad/banner → static_ad
- Logo → logo
- Branding → brand_identity

RESPONSE FORMAT (when showing styles):
State your creative direction confidently, show styles.
Example:
"For a cinematic product introduction, I'd go with bold, dark visuals that match your tech brand. Here are some directions:"
[DELIVERABLE_STYLES: instagram_reel]
[QUICK_OPTIONS]{"question": "Style preference?", "options": ["I like the first one", "Show me more", "Something brighter"]}[/QUICK_OPTIONS]

RULES:
- 20-40 words max before the marker
- No exclamation marks
- Be decisive - make recommendations, don't ask for basic info you can infer
- Use brand data (industry, audience, platform) to make smart assumptions
- Ask for confirmation, not information
- ALWAYS include [QUICK_OPTIONS] with confirmation-style options`;

function getSystemPrompt(): string {
  const today = new Date();
  const todayStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `${SYSTEM_PROMPT}

TODAY: ${todayStr}

IF THE REQUEST IS COMPLETELY UNCLEAR:
"What are we making today?"
[QUICK_OPTIONS]
{"question": "Content type?", "options": ["Social content", "Video ad", "Branding", "Something else"]}
[/QUICK_OPTIONS]

REMEMBER - YOU HAVE BRAND CONTEXT:
- You know their industry, audience, and recommended platforms
- Use this to make smart assumptions instead of asking
- Example: If they're B2B SaaS and want a video, recommend LinkedIn + Instagram, targeting business decision-makers
- State your recommendation confidently, then ask "Does this align with what you had in mind?"

ABSOLUTE REQUIREMENTS:
1. If user mentions ANY content type or describes what they want → ALWAYS include [DELIVERABLE_STYLES: type]
2. The marker MUST be on its own line at the end of your response
3. 20-40 words max, no exclamation marks
4. Make recommendations based on brand data - don't ask questions you can answer yourself
5. Use confirmation questions ("Sound good?" "Any changes?") instead of open questions ("What platform?")`;
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
  // Fetch data in parallel for faster response times
  const [user, styles, categories] = await Promise.all([
    // Fetch user's company/brand data
    db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        company: true,
      },
    }),
    // Fetch available style categories for context
    db.select().from(styleReferences).where(eq(styleReferences.isActive, true)),
    // Fetch task categories
    db.select().from(taskCategories).where(eq(taskCategories.isActive, true)),
  ]);

  const company = user?.company;

  // Fetch audiences for the company (depends on user query above)
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
CLIENT: ${company.name}${company.industry ? ` (${company.industry})` : ""}
PLATFORM: ${platformRecommendation}
${audienceContext ? "AUDIENCE: Known" : ""}

You already know their brand. DO NOT ask about: company, industry, audience, colors, fonts.`
    : "";

  const basePrompt = await getSystemPrompt();

  // Build brand detection context
  // NOTE: We don't add brand questions here anymore - we assume the user's saved brand is correct
  // This prevents double-questions (brand question + style question in same response)
  let brandDetectionContext = "";
  if (company?.name) {
    brandDetectionContext = `Using brand: ${company.name}. Don't ask about brand - just use it.`;
  }

  // Build request completeness context - keep minimal
  let completenessContext = "";
  if (context?.requestCompleteness === "detailed") {
    completenessContext = "User gave detailed info. Proceed quickly.";
  } else if (context?.requestCompleteness === "vague") {
    completenessContext =
      "User gave minimal info. Make smart assumptions based on their brand and ask for confirmation.";
  }

  // Build confirmed fields context to prevent re-asking
  let confirmedFieldsContext = "";
  if (
    context?.confirmedFields &&
    Object.values(context.confirmedFields).some(Boolean)
  ) {
    const confirmed = context.confirmedFields;
    const fields = [
      confirmed.platform && `platform: ${confirmed.platform}`,
      confirmed.topic && `topic: ${confirmed.topic}`,
      confirmed.contentType && `type: ${confirmed.contentType}`,
    ].filter(Boolean);
    if (fields.length > 0) {
      confirmedFieldsContext = `Already know: ${fields.join(
        ", "
      )}. Don't re-ask.`;
    }
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
    max_tokens: 300, // Limit output to encourage brevity
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
    // Standalone "Choice" at the start (common AI mistake)
    /^Choice[\s\-!,.]+/i,
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
    // Verbose intro patterns
    /^(I |I'll |I need to |I want to |Let me |To create |Before |First, I )/i,
    /^(need to understand|to help you|in order to)/i,
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

  // Remove bullet points and list markers - these indicate verbose responses
  cleanContent = cleanContent
    .replace(/^[-•]\s*/gm, "") // Remove bullet points at start of lines
    .replace(/\n[-•]\s*/g, " ") // Remove bullet points with newlines
    .replace(/\*\*[^*]+\*\*:?\s*/g, "") // Remove bold headers like **Tell me about:**
    .replace(/\n\s*\n/g, " ") // Collapse multiple newlines
    .replace(/\n/g, " ") // Replace remaining newlines with spaces
    .replace(/([?.])\s*!/g, "$1") // Remove ! after ? or . (e.g., "?!" → "?")
    .replace(/!+/g, ".") // Replace remaining exclamation marks with single period
    .replace(/\.{2,}/g, ".") // Collapse multiple periods into one
    .replace(/\?\s*\./g, "?") // Fix "?." → "?"
    .replace(/\.\s*\?/g, "?") // Fix ".?" → "?"
    .replace(/,\s*\./g, ".") // Fix ",." → "."
    .replace(/\.\s*,/g, ","); // Fix ".," → ","

  // If there are multiple question marks, keep only the last question
  const questionCount = (cleanContent.match(/\?/g) || []).length;
  if (questionCount > 1) {
    // Find the last sentence ending with ? and keep only that as the question
    const lastQuestionMatch = cleanContent.match(/[^.!?]*\?[^?]*$/);
    const beforeLastQuestion = cleanContent
      .replace(/[^.!?]*\?[^?]*$/, "")
      .trim();
    // Get the first 1-2 sentences before the questions
    const firstSentences = beforeLastQuestion
      .split(/[.!]/)
      .slice(0, 2)
      .join(". ")
      .trim();
    if (firstSentences && lastQuestionMatch) {
      cleanContent =
        firstSentences +
        (firstSentences.endsWith(".") ? "" : ".") +
        " " +
        lastQuestionMatch[0].trim();
    }
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
    // Final punctuation cleanup to catch any remaining grammar issues
    .replace(/\?\s*\./g, "?") // "?." → "?"
    .replace(/\.\s*\?/g, "?") // ".?" → "?"
    .replace(/\.{2,}/g, ".") // ".." or "..." → "."
    .replace(/,\s*\./g, ".") // ",." → "."
    .replace(/\.\s*,/g, ",") // ".," → ","
    .replace(/\s+([.,?])/g, "$1") // Remove space before punctuation
    // Clean up any double spaces or leading/trailing whitespace
    .replace(/\s+/g, " ")
    .trim();

  // Final check: Ensure first letter is capitalized (for professional tone)
  // Only capitalize if the very first letter (after any whitespace/punctuation) is lowercase
  if (cleanContent.length > 0) {
    // Find the index of the first letter (uppercase or lowercase)
    const firstLetterIndex = cleanContent.search(/[a-zA-Z]/);
    if (firstLetterIndex !== -1) {
      const firstLetter = cleanContent.charAt(firstLetterIndex);
      // Only capitalize if it's lowercase
      if (firstLetter >= "a" && firstLetter <= "z") {
        cleanContent =
          cleanContent.slice(0, firstLetterIndex) +
          firstLetter.toUpperCase() +
          cleanContent.slice(firstLetterIndex + 1);
      }
    }
  }

  // If content is empty but we have a style marker, provide a default message
  if (!cleanContent && deliverableStyleMarker) {
    cleanContent = "Here are some style directions for your project.";
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
