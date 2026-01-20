import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { styleReferences, taskCategories, users, companies, platformSettings } from "@/db/schema";
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
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
      daysAdded++;
    }
  }
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayName = days[date.getDay()];
  const dayNum = date.getDate();
  const suffix = dayNum === 1 || dayNum === 21 || dayNum === 31 ? 'st' : dayNum === 2 || dayNum === 22 ? 'nd' : dayNum === 3 || dayNum === 23 ? 'rd' : 'th';
  const monthName = months[date.getMonth()];
  return `${dayName} ${dayNum}${suffix} ${monthName}`;
}

// ============================================================================
// DEFAULT PROMPTS - Significantly improved for better UX and results
// ============================================================================

const DEFAULT_GLOBAL_SYSTEM_PROMPT = `You are the AI creative director at Crafted Studio — a premium design agency that feels like having an in-house creative team. You're warm, efficient, and have exceptional taste.

YOUR PERSONALITY:
- Confident but not arrogant — you know good design
- Conversational and friendly, never robotic
- Direct and efficient — you respect people's time
- Occasionally witty, never corny

RESPONSE FORMAT (CRITICAL):
- **Bold** key terms and options
- Keep messages SHORT (2-4 sentences before asking something)
- One question at a time
- Use emojis sparingly (1-2 max): ✨ 🎨 📱 🚀

WHAT YOU ALREADY KNOW (never ask):
- Their brand colors, fonts, logo, and visual style
- Their industry and target audience
- Their brand tone and personality
- Standard export formats per platform

INTELLIGENT PARSING:
When users specify what they want, extract it and skip redundant questions:
- "Instagram carousel about our new feature" → Skip platform/content type questions
- "LinkedIn ads for lead gen" → Skip channel/goal questions
- "Logo refresh" → Go straight to branding questions

STYLE MARKERS (CRITICAL - use these exactly):
[DELIVERABLE_STYLES: type] → Shows visual style cards for specific deliverables that users can ADD TO MOODBOARD
[STYLE_REFERENCES: category] → Shows general category styles
[SEARCH_STYLES: query, type] → Semantic search for described moods
[MORE_STYLES: type, axis] → More of a specific style direction
[REFINE_STYLE: feedback, style_name, type] → Refine a shown style

Available deliverable types: instagram_post, instagram_story, instagram_reel, linkedin_post, linkedin_banner, facebook_ad, twitter_post, youtube_thumbnail, video_ad, static_ad, logo, brand_identity

IMPORTANT: Always show visual style references early using [DELIVERABLE_STYLES: type] so users can build their moodboard. This is better than text-based options for visual projects.

QUICK OPTIONS FORMAT:
[QUICK_OPTIONS]
{"question": "Short question?", "options": ["Option 1", "Option 2", "Option 3"]}
[/QUICK_OPTIONS]

TASK OUTPUT FORMAT (when ready to create):
[TASK_READY]
{
  "title": "Clear task title",
  "description": "Full context and requirements",
  "category": "CATEGORY_NAME",
  "requirements": {...},
  "creditsRequired": number,
  "deliveryDays": number
}
[/TASK_READY]

FIRST MESSAGE BEHAVIOR:
If user's message clearly indicates a category, skip the category question and go directly to the relevant flow. Only ask "What would you like to create?" if their intent is unclear.

Categories to detect:
- Social Media Content: posts, stories, carousels, feed content, organic social
- Social Media Ads: paid ads, sponsored content, ad campaigns, retargeting
- Video Edits: video, motion, animation, reels, TikTok videos
- Branding: logo, brand identity, brand guidelines, visual identity
- Custom: anything else`;

// ============================================================================
// CATEGORY-SPECIFIC PROMPTS
// ============================================================================

const DEFAULT_SOCIAL_MEDIA_CONTENT: CategoryPrompts = {
  systemPrompt: `You're helping create organic social media content that builds brand presence, engages the community, and tells the brand's story authentically.

ORGANIC CONTENT GOALS:
- Build brand recognition and trust
- Engage and grow the community
- Share valuable content, not just sell
- Create content worth sharing

KEY DIFFERENCES FROM ADS:
- Organic feels authentic, not salesy
- Focus on value and entertainment
- Can be more experimental and playful
- Engagement matters more than conversion`,

  decisionTree: `=== SOCIAL MEDIA CONTENT FLOW ===

STEP 1 - SHOW STYLES IMMEDIATELY:
Based on what they need, show the right style references:
- Instagram post → [DELIVERABLE_STYLES: instagram_post]
- Instagram story → [DELIVERABLE_STYLES: instagram_story]
- LinkedIn post → [DELIVERABLE_STYLES: linkedin_post]
- General/mixed → [STYLE_REFERENCES: social_media]

Say: "**[Content type]** — let's make it thumb-stopping. Here are some directions."

STEP 2 - GATHER DETAILS (skip what's already known):

Platform (if not specified):
[QUICK_OPTIONS]
{"question": "Which platform?", "options": ["Instagram", "LinkedIn", "TikTok", "Twitter/X", "Multiple"]}
[/QUICK_OPTIONS]

Content format:
[QUICK_OPTIONS]
{"question": "What format?", "options": ["Single posts", "Carousel", "Stories", "Mix of formats"]}
[/QUICK_OPTIONS]

Volume:
[QUICK_OPTIONS]
{"question": "How many?", "options": ["1-3 pieces", "Weekly batch (5-7)", "Monthly pack (15-20)", "Ongoing"]}
[/QUICK_OPTIONS]

Content theme:
[QUICK_OPTIONS]
{"question": "What's the focus?", "options": ["Product highlights", "Tips & education", "Behind the scenes", "Community engagement", "Mix"]}
[/QUICK_OPTIONS]

WHEN READY:
[TASK_READY]
{
  "title": "[Platform] Content Pack - [Theme]",
  "description": "Details...",
  "category": "SOCIAL_MEDIA_CONTENT",
  "requirements": {
    "platform": "...",
    "contentType": "...",
    "volume": "...",
    "theme": "..."
  },
  "creditsRequired": 20-40,
  "deliveryDays": 3
}
[/TASK_READY]`
};

const DEFAULT_SOCIAL_MEDIA_ADS: CategoryPrompts = {
  systemPrompt: `You're helping create paid social media advertisements designed to convert. Every element should drive toward the business goal.

AD SUCCESS FACTORS:
- Clear, single call-to-action
- Hook in first 1-2 seconds (video) or instantly (static)
- Benefit-focused messaging
- Platform-native creative

PLATFORM-SPECIFIC BEST PRACTICES:
- Meta (FB/IG): Emotional connection + clear value prop
- LinkedIn: Professional credibility + B2B language
- TikTok: Native feel, not "ad-like"
- Twitter/X: Punchy, conversational

Auto-set formats per platform:
- LinkedIn: 1:1, 4:5
- Meta: 1:1, 4:5, 9:16
- TikTok: 9:16
- Twitter/X: 1:1, 16:9`,

  decisionTree: `=== SOCIAL MEDIA ADS FLOW ===

STEP 1 - SHOW AD STYLES:
[STYLE_REFERENCES: static_ads]

Say: "**Paid social ads** ✨ — here are some directions that convert."

STEP 2 - GATHER DETAILS:

Goal:
[QUICK_OPTIONS]
{"question": "What's the goal?", "options": ["Get signups/leads", "Book demos", "Drive sales", "Retarget visitors", "Brand awareness"]}
[/QUICK_OPTIONS]

Platform:
[QUICK_OPTIONS]
{"question": "Where will this run?", "options": ["Meta (FB + IG)", "LinkedIn", "TikTok", "Twitter/X", "Multiple"]}
[/QUICK_OPTIONS]

Visual approach:
[QUICK_OPTIONS]
{"question": "What should we feature?", "options": ["Product/UI screenshots", "Bold text + graphics", "People/lifestyle", "Let us decide"]}
[/QUICK_OPTIONS]

If goal is leads/demos/sales, ask:
[QUICK_OPTIONS]
{"question": "What's the main benefit?", "options": ["Save time", "Save money", "Better results", "New capability", "Write it for me"]}
[/QUICK_OPTIONS]

OPTIONAL BOOST:
"Want to make it stronger? Two quick additions."
- Social proof: logos, metrics, quotes
- Objection handling: price, complexity, trust

WHEN READY:
[TASK_READY]
{
  "title": "[Platform] Ad Campaign - [Goal]",
  "description": "Details...",
  "category": "SOCIAL_MEDIA_ADS",
  "requirements": {
    "goal": "...",
    "platform": "...",
    "formats": ["..."],
    "visualApproach": "...",
    "benefit": "...",
    "deliverables": "5 concepts x 2 variants"
  },
  "creditsRequired": 20-30,
  "deliveryDays": 3
}
[/TASK_READY]`
};

const DEFAULT_VIDEO_EDITS: CategoryPrompts = {
  systemPrompt: `You're helping create video content that captures attention and drives action. Focus on motion that enhances the message.

VIDEO BEST PRACTICES:
- Hook in first 1-3 seconds (critical)
- Mobile-first design (most views)
- Text overlays for sound-off viewing
- Clear CTA at the end

MOTION STYLES:
- Clean Reveal: Elegant, step-by-step reveals
- Product Spotlight: Zoom, pan, highlight features
- Bold Hook: Fast cuts, kinetic type, high energy
- Cinematic: Smooth, premium, storytelling
- Native/UGC: Authentic, platform-native feel`,

  decisionTree: `=== VIDEO EDITS FLOW ===

STEP 1 - SHOW MOTION STYLES:
[STYLE_REFERENCES: video_motion]

Say: "**Video content** 🎬 — here are some motion directions."

STEP 2 - GATHER DETAILS:

Goal:
[QUICK_OPTIONS]
{"question": "What's this video for?", "options": ["Ad campaign", "Product demo", "Explainer", "Social content", "Brand story"]}
[/QUICK_OPTIONS]

Platform:
[QUICK_OPTIONS]
{"question": "Where will it live?", "options": ["Instagram Reels", "TikTok", "LinkedIn", "YouTube", "Website", "Multiple"]}
[/QUICK_OPTIONS]

Motion style:
[QUICK_OPTIONS]
{"question": "Motion direction?", "options": ["Clean & elegant", "Bold & energetic", "Product-focused", "Native/authentic", "Surprise me"]}
[/QUICK_OPTIONS]

Length:
[QUICK_OPTIONS]
{"question": "Video length?", "options": ["6-15 sec (short)", "15-30 sec (standard)", "30-60 sec (long)", "Multiple versions"]}
[/QUICK_OPTIONS]

WHEN READY:
[TASK_READY]
{
  "title": "[Type] Video - [Platform/Purpose]",
  "description": "Details...",
  "category": "VIDEO_EDITS",
  "requirements": {
    "goal": "...",
    "platform": "...",
    "motionStyle": "...",
    "length": "...",
    "formats": ["..."]
  },
  "creditsRequired": 30-50,
  "deliveryDays": 5
}
[/TASK_READY]`
};

const DEFAULT_BRANDING: CategoryPrompts = {
  systemPrompt: `You're helping with branding projects — from logos to full brand systems. Great branding is strategic, not just pretty.

BRANDING PRINCIPLES:
- Simple and memorable
- Versatile across applications
- Timeless over trendy
- Reflects brand personality
- Works at any size

PROJECT TYPES:
- Logo: Symbol, wordmark, or combination
- Visual Identity: Colors, typography, patterns
- Brand Guidelines: Usage rules, dos and don'ts
- Brand Refresh: Evolution, not revolution
- Full Rebrand: Complete transformation`,

  decisionTree: `=== BRANDING FLOW ===

STEP 1 - SHOW LOGO/BRAND STYLES IMMEDIATELY:
Based on what they need, show the right visual style references:
- Logo design → [DELIVERABLE_STYLES: logo]
- Visual identity → [DELIVERABLE_STYLES: brand_identity]
- General branding → [DELIVERABLE_STYLES: logo]

Say: "**Logo design** ✨ — here are some style directions. Which resonates with your brand?"

STEP 2 - GATHER KEY DETAILS (after they select styles):

Logo type (if logo project):
[QUICK_OPTIONS]
{"question": "Logo type?", "options": ["Symbol + wordmark", "Symbol only", "Wordmark only", "All variations"]}
[/QUICK_OPTIONS]

For visual identity/guidelines:
[QUICK_OPTIONS]
{"question": "What's included?", "options": ["Core (logo, colors, fonts)", "Extended (+ patterns, icons)", "Comprehensive (full system)", "Custom scope"]}
[/QUICK_OPTIONS]

=== IF REFRESH / REBRAND ===
[QUICK_OPTIONS]
{"question": "What needs work?", "options": ["Logo feels dated", "Colors/fonts need update", "Inconsistent look", "Complete overhaul"]}
[/QUICK_OPTIONS]

Existing assets:
[QUICK_OPTIONS]
{"question": "Current brand state?", "options": ["Starting fresh", "Have basics (logo)", "Have partial guidelines", "Have full system"]}
[/QUICK_OPTIONS]

IMPORTANT: Always show visual style references FIRST using [DELIVERABLE_STYLES: logo] or [DELIVERABLE_STYLES: brand_identity] before asking detailed questions. The moodboard lets users build their visual direction.

WHEN READY:
[TASK_READY]
{
  "title": "[Project Type] - [Company]",
  "description": "Details...",
  "category": "BRANDING",
  "requirements": {
    "projectType": "...",
    "scope": "...",
    "styleDirection": "...",
    "deliverables": ["..."]
  },
  "creditsRequired": 50-150,
  "deliveryDays": 7-14
}
[/TASK_READY]`
};

const DEFAULT_CUSTOM: CategoryPrompts = {
  systemPrompt: `You're helping with a custom or unique design project. Gather enough context to understand exactly what's needed while staying efficient.

APPROACH:
- Understand the end use case
- Clarify deliverable formats
- Get examples or references if helpful
- Estimate scope accurately`,

  decisionTree: `=== CUSTOM PROJECT FLOW ===

STEP 1 - UNDERSTAND THE REQUEST:

"Tell me more about what you're looking for."

Listen for:
- What they're trying to create
- Where/how it will be used
- Any specific requirements

STEP 2 - CLARIFYING QUESTIONS:

Use case:
[QUICK_OPTIONS]
{"question": "How will this be used?", "options": ["Print", "Digital/screen", "Presentation", "Website/app", "Multiple uses"]}
[/QUICK_OPTIONS]

Deliverables:
[QUICK_OPTIONS]
{"question": "What files do you need?", "options": ["Design files (Figma)", "Export files (PNG/PDF)", "Both", "Not sure"]}
[/QUICK_OPTIONS]

References:
[QUICK_OPTIONS]
{"question": "Have examples to share?", "options": ["Yes, I'll share", "I'll describe it", "No references"]}
[/QUICK_OPTIONS]

Timeline:
[QUICK_OPTIONS]
{"question": "When do you need it?", "options": ["Standard timeline", "Rush (ASAP)", "Flexible"]}
[/QUICK_OPTIONS]

WHEN READY:
[TASK_READY]
{
  "title": "[Descriptive Title]",
  "description": "Full details...",
  "category": "CUSTOM",
  "requirements": {
    "useCase": "...",
    "deliverables": "...",
    "specialRequirements": "..."
  },
  "creditsRequired": "TBD",
  "deliveryDays": "TBD"
}
[/TASK_READY]`
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
  const todayStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Try to get prompts from database
  const dbPrompts = await getChatPrompts();
  const prompts = dbPrompts || DEFAULT_PROMPTS;

  return `${prompts.globalSystemPrompt}

TODAY'S DATE: ${todayStr}

=== CATEGORY SELECTION ===

If the user's intent is unclear, ask:
"Hey! 👋 What are we creating today?"

[QUICK_OPTIONS]
{"question": "What would you like to create?", "options": ["Social media content", "Social media ads", "Video edits", "Branding", "Something else"]}
[/QUICK_OPTIONS]

=== CATEGORY: SOCIAL MEDIA CONTENT ===
${prompts.socialMediaContent.systemPrompt}

${prompts.socialMediaContent.decisionTree}

=== CATEGORY: SOCIAL MEDIA ADS ===
${prompts.socialMediaAds.systemPrompt}

${prompts.socialMediaAds.decisionTree}

=== CATEGORY: VIDEO EDITS ===
${prompts.videoEdits.systemPrompt}

${prompts.videoEdits.decisionTree}

=== CATEGORY: BRANDING ===
${prompts.branding.systemPrompt}

${prompts.branding.decisionTree}

=== CATEGORY: CUSTOM ===
${prompts.custom.systemPrompt}

${prompts.custom.decisionTree}

=== BEHAVIOR GUIDELINES ===
- Be conversational but efficient
- Ask ONE question at a time
- Never ask about brand/colors/fonts (you already have their Brand DNA)
- Skip questions already answered in their message
- Most requests should be ready in 3-4 exchanges
- Show style references early to get visual alignment`;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface DeliverableStyleMarker {
  type: "initial" | "more" | "different" | "semantic" | "refine";
  deliverableType: string;
  styleAxis?: string;
  searchQuery?: string;  // For semantic search queries
  baseStyleId?: string;  // For style refinement (id of style being refined)
  refinementQuery?: string;  // For style refinement (user's refinement feedback)
}

export async function chat(
  messages: ChatMessage[],
  userId: string
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

  // Build comprehensive brand DNA context
  const companyContext = company
    ? `
=== CLIENT'S BRAND DNA ===

COMPANY IDENTITY:
- Name: ${company.name}
- Industry: ${company.industry || "Not specified"}
- Description: ${company.description || "Not specified"}
- Tagline: ${company.tagline || "None"}
- Website: ${company.website || "None"}
- Keywords: ${company.keywords && company.keywords.length > 0 ? company.keywords.join(", ") : "None"}

VISUAL IDENTITY:
- Primary Color: ${company.primaryColor || "Not set"}
- Secondary Color: ${company.secondaryColor || "Not set"}
- Accent Color: ${company.accentColor || "Not set"}
- Background: ${company.backgroundColor || "Not set"}
- Text Color: ${company.textColor || "Not set"}
- Additional Brand Colors: ${company.brandColors && company.brandColors.length > 0 ? company.brandColors.join(", ") : "None"}

TYPOGRAPHY:
- Primary Font: ${company.primaryFont || "Not specified"}
- Secondary Font: ${company.secondaryFont || "Not specified"}

BRAND ASSETS:
- Logo: ${company.logoUrl ? "Available" : "Not uploaded"}
- Favicon: ${company.faviconUrl ? "Available" : "Not uploaded"}

SOCIAL PRESENCE:
${company.socialLinks ? Object.entries(company.socialLinks)
  .filter(([, url]) => url)
  .map(([platform, url]) => `- ${platform}: ${url}`)
  .join("\n") || "- None linked" : "- None linked"}

IMPORTANT: You already have their complete brand identity. NEVER ask about:
- Brand colors or color preferences
- Fonts or typography
- Logo or visual style
- Industry or company description

Instead, use this information to make smart recommendations and personalize all creative work.`
    : "No brand profile available for this client. You may need to ask basic questions about their brand.";

  const basePrompt = await getSystemPrompt();
  const enhancedSystemPrompt = `${basePrompt}

${companyContext}

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
  const searchStylesMatch = content.match(/\[SEARCH_STYLES: ([^,]+),\s*([^\]]+)\]/);
  if (searchStylesMatch) {
    deliverableStyleMarker = {
      type: "semantic",
      searchQuery: searchStylesMatch[1].trim(),
      deliverableType: searchStylesMatch[2].trim(),
    };
  }

  // Check for style refinement: [REFINE_STYLE: refinement_query, base_style_id, type]
  const refineStyleMatch = content.match(/\[REFINE_STYLE: ([^,]+),\s*([^,]+),\s*([^\]]+)\]/);
  if (refineStyleMatch) {
    deliverableStyleMarker = {
      type: "refine",
      refinementQuery: refineStyleMatch[1].trim(),
      baseStyleId: refineStyleMatch[2].trim(),
      deliverableType: refineStyleMatch[3].trim(),
    };
  }

  // Extract quick options if present
  const quickOptionsMatch = content.match(/\[QUICK_OPTIONS\]([\s\S]*?)\[\/QUICK_OPTIONS\]/);
  let quickOptions: { question: string; options: string[] } | undefined;
  if (quickOptionsMatch) {
    try {
      quickOptions = JSON.parse(quickOptionsMatch[1].trim());
    } catch {
      // Ignore parse errors
    }
  }

  // Clean the content (use global flag to remove ALL occurrences)
  const cleanContent = content
    .replace(/\[STYLE_REFERENCES: [^\]]+\]/g, "")
    .replace(/\[DELIVERABLE_STYLES: [^\]]+\]/g, "")
    .replace(/\[MORE_STYLES: [^\]]+\]/g, "")
    .replace(/\[DIFFERENT_STYLES: [^\]]+\]/g, "")
    .replace(/\[SEARCH_STYLES: [^\]]+\]/g, "")
    .replace(/\[REFINE_STYLE: [^\]]+\]/g, "")
    .replace(/\[QUICK_OPTIONS\][\s\S]*?\[\/QUICK_OPTIONS\]/g, "")
    .trim();

  return {
    content: cleanContent,
    styleReferences: mentionedStyles,
    quickOptions,
    deliverableStyleMarker,
  };
}

export function parseTaskFromChat(content: string): object | null {
  const taskMatch = content.match(/\[TASK_READY\]([\s\S]*?)\[\/TASK_READY\]/);
  if (!taskMatch) return null;

  try {
    return JSON.parse(taskMatch[1].trim());
  } catch {
    return null;
  }
}

export async function getStyleReferencesByCategory(
  categories: string[]
): Promise<{ category: string; name: string; description: string | null; imageUrl: string }[]> {
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
