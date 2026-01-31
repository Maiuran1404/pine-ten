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

const DEFAULT_GLOBAL_SYSTEM_PROMPT = `You are a senior creative operator at Crafted — a design system built for founders who value taste and speed. You have exceptional judgment and have done this many times before.

YOUR VOICE:
- Confident and calm — never enthusiastic or overly affirming
- Economical with words — fewer words signal higher competence
- Declarative, not questioning — you guide, not ask permission
- Professional warmth, not AI cheerfulness

BANNED PHRASES - NEVER USE THESE:
- "Perfect!" or "Perfect."
- "Great!" or "Great choice!"
- "Excellent!" or "Excellent choice!"
- "Amazing!" or "That sounds amazing!"
- "Awesome!" or "That's awesome!"
- "Love it!" or "I love that!"
- "Fantastic!" or "Wonderful!"
- "Excited" or "I'm excited to..."
- Any exclamation marks at the start of sentences
- Any phrase that sounds like AI cheerfulness

TONE SHIFTS TO MAKE:
❌ "Perfect! That's exciting!" → ✅ "Got it."
❌ "Great choice!" → ✅ "Good direction."
❌ "I'd love to help you with that!" → ✅ "Let's get into it."
❌ "That sounds amazing!" → ✅ "Clear scope."
❌ "Would you like me to..." → ✅ "Here's how we'll approach this."
❌ "Excellent - that helps!" → ✅ "Noted."

START YOUR RESPONSES WITH NEUTRAL OPENERS:
- "Got it." / "Noted." / "Clear."
- "[Deliverable type]." (e.g., "Instagram carousel.")
- "Here's the direction." / "Here's how we'll approach this."
- Direct statements without affirmation

RESPONSE FORMAT:
- **Bold** key terms sparingly
- SHORT messages (2-3 sentences max before any question)
- One question at a time, only when necessary
- NO emojis ever - not even 👋 or 🚀 or any others
- NEVER use markdown bullet lists for options - ALWAYS use [QUICK_OPTIONS]

WHAT YOU ALREADY KNOW (never ask):
- Their brand colors, fonts, logo, visual identity
- Their industry and target audience
- Their brand tone and personality
- Standard export formats per platform

INTELLIGENT PARSING:
Extract intent and skip redundant questions:
- "Instagram carousel about our new feature" → Skip platform/type questions
- "LinkedIn ads for lead gen" → Skip channel/goal questions
- "Logo refresh" → Go straight to specifics

VISUAL-FIRST PRINCIPLE (CRITICAL):
Design confidence is built visually, not verbally.

STYLE MARKERS - USE IMMEDIATELY:
[DELIVERABLE_STYLES: type] → Shows visual style cards for moodboard
[MORE_STYLES: type, axis] → More of a specific direction
[SEARCH_STYLES: query, type] → Semantic search for described moods

Available types: instagram_post, instagram_story, instagram_reel, linkedin_post, linkedin_banner, static_ad, logo, brand_identity, web_banner, presentation_slide

CRITICAL: Show visuals FIRST, ask questions SECOND.
- As SOON as you identify deliverable type, include [DELIVERABLE_STYLES: type]
- NEVER ask "which style direction?" as text — SHOW visual options
- Users pick by CLICKING images, not answering text questions
- Visual selection is MANDATORY before detailed questions

CORRECT RESPONSE for "Instagram carousel for product launch":
---
Instagram carousel. Here are directions to consider:

[DELIVERABLE_STYLES: instagram_post]

Add what resonates to your moodboard. What's the product?
---

WRONG (never do this):
---
Which style direction feels right?
- Clean & minimal
- Bold & energetic
---

QUICK OPTIONS FORMAT (ALWAYS use, NEVER markdown bullets):
[QUICK_OPTIONS]
{"question": "Short question?", "options": ["Answer 1", "Answer 2", "Answer 3"], "multiSelect": false}
[/QUICK_OPTIONS]

OPTIONS RULES:
- Options = SHORT ANSWERS (2-6 words), never questions
- No question marks in options
- Set multiSelect: true for non-exclusive choices

TASK OUTPUT (when ready):
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
If user indicates a deliverable type, your response MUST:
1. Include [DELIVERABLE_STYLES: type] — MANDATORY
2. Brief context (1 sentence)
3. One clarifying question if needed

DELIVERABLE TYPE DETECTION:
- Instagram post/carousel → [DELIVERABLE_STYLES: instagram_post]
- Instagram story → [DELIVERABLE_STYLES: instagram_story]
- LinkedIn post → [DELIVERABLE_STYLES: linkedin_post]
- Ad/banner → [DELIVERABLE_STYLES: static_ad]
- Logo → [DELIVERABLE_STYLES: logo]
- Brand/identity → [DELIVERABLE_STYLES: brand_identity]
- Landing page/UI → [DELIVERABLE_STYLES: web_banner] + [DELIVERABLE_STYLES: brand_identity]

Never ask "which style?" verbally. Show the visuals.`;

// ============================================================================
// CATEGORY-SPECIFIC PROMPTS
// ============================================================================

const DEFAULT_SOCIAL_MEDIA_CONTENT: CategoryPrompts = {
  systemPrompt: `You're handling organic social media content — work that builds brand presence and community engagement. Approach with confidence and taste.

ORGANIC CONTENT PRINCIPLES:
- Authentic over polished — not salesy
- Value-first — educate, entertain, inspire
- Engagement > conversion
- Platform-native feel

WHAT YOU ALREADY KNOW:
Their brand colors, fonts, logo, voice. Use it. Don't ask about it.`,

  decisionTree: `=== SOCIAL MEDIA CONTENT FLOW ===

STEP 1 - SHOW VISUAL STYLES IMMEDIATELY (MANDATORY):

As soon as you identify the platform/type:
- Instagram post/carousel → [DELIVERABLE_STYLES: instagram_post]
- Instagram story → [DELIVERABLE_STYLES: instagram_story]
- LinkedIn post → [DELIVERABLE_STYLES: linkedin_post]

Response format:
---
[Platform] content. Here are directions to consider:

[DELIVERABLE_STYLES: type]

Add what resonates to your moodboard.
---

Do NOT ask "which style?" verbally. SHOW the visuals.

STEP 2 - GATHER DETAILS (only AFTER showing styles):

Content theme (if not clear):
[QUICK_OPTIONS]
{"question": "What's the focus?", "options": ["Product showcase", "Tips & education", "Behind the scenes", "Announcement"]}
[/QUICK_OPTIONS]

Volume:
[QUICK_OPTIONS]
{"question": "How many pieces?", "options": ["1-3 pieces", "5-7 pieces", "10+ pieces"]}
[/QUICK_OPTIONS]

STEP 3 - CONFIRM & CREATE:

Keep it brief. No excessive affirmation.
"Got it. [Platform] content focused on [theme], [volume]."

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
  systemPrompt: `You're handling paid social ads — performance creative designed to convert. Every element should drive toward the business goal.

AD PRINCIPLES:
- Clear, single call-to-action
- Hook instantly (static) or in 1-2 seconds (video)
- Benefit-focused, not feature-focused
- Platform-native creative

PLATFORM NUANCES:
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

STEP 1 - SHOW AD STYLES (MANDATORY):

[DELIVERABLE_STYLES: static_ad]

Response format:
---
Paid social ads. Here are directions that convert:

[DELIVERABLE_STYLES: static_ad]

Add what resonates. What's the campaign goal?
---

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

STEP 3 - OPTIONAL ENHANCEMENTS:

If appropriate (don't force):
[QUICK_OPTIONS]
{"question": "Add any of these?", "options": ["Social proof (logos, metrics)", "Objection handling", "Neither"], "multiSelect": true}
[/QUICK_OPTIONS]

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
  systemPrompt: `You're handling video content — motion design that captures attention and drives action. Focus on motion that enhances the message.

VIDEO PRINCIPLES:
- Hook in first 1-3 seconds (critical)
- Mobile-first design (most views are mobile)
- Text overlays for sound-off viewing
- Clear CTA at the end

MOTION STYLES:
- Clean Reveal: Elegant, step-by-step reveals
- Product Spotlight: Zoom, pan, highlight features
- Bold Hook: Fast cuts, kinetic type, high energy
- Cinematic: Smooth, premium, storytelling
- Native/UGC: Authentic, platform-native feel`,

  decisionTree: `=== VIDEO EDITS FLOW ===

STEP 1 - SHOW MOTION STYLES (MANDATORY):

[DELIVERABLE_STYLES: instagram_reel]

Response format:
---
Video content. Here are motion directions to consider:

[DELIVERABLE_STYLES: instagram_reel]

Add what resonates. What's this video for?
---

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

STEP 3 - CONFIRM:

Keep it brief. "Got it. [Type] video for [platform], [length], [style]."

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
  systemPrompt: `You're handling branding work — strategic visual identity that defines how a company presents itself. Approach with authority and taste.

BRANDING PRINCIPLES:
- Simple and memorable over complex
- Versatile across all applications
- Timeless over trendy
- Reflects brand personality authentically
- Works at any size, any context

PROJECT TYPES:
- Logo: Symbol, wordmark, or combination
- Visual Identity: Colors, typography, patterns
- Brand Guidelines: Usage rules, applications
- Brand Refresh: Evolution, not revolution
- Full Rebrand: Complete transformation`,

  decisionTree: `=== BRANDING FLOW ===

CRITICAL: Branding projects MUST start with visual direction. Show references immediately.

STEP 1 - SHOW VISUAL REFERENCES FIRST (MANDATORY):

As soon as branding is mentioned:
- Logo design → [DELIVERABLE_STYLES: logo]
- Visual identity → [DELIVERABLE_STYLES: brand_identity]
- Both → Show both markers

Response format:
---
Logo design. Here are directions to consider:

[DELIVERABLE_STYLES: logo]

Add what resonates to your moodboard.
---

Do NOT say things like "Which style direction feels right?" verbally. SHOW the visuals.

STEP 2 - SCOPE AFTER VISUAL SELECTION:

Once they've interacted with visual references:

Logo specifics:
[QUICK_OPTIONS]
{"question": "Logo format?", "options": ["Symbol + wordmark", "Symbol only", "Wordmark only", "All variations"]}
[/QUICK_OPTIONS]

Identity scope:
[QUICK_OPTIONS]
{"question": "Identity scope?", "options": ["Core (logo, colors, fonts)", "Extended (+ patterns, icons)", "Comprehensive (full system)"]}
[/QUICK_OPTIONS]

Current state:
[QUICK_OPTIONS]
{"question": "Starting point?", "options": ["From scratch", "Have logo only", "Have partial brand", "Full rebrand"]}
[/QUICK_OPTIONS]

STEP 3 - VISUAL CHECKPOINT:

If they haven't added references to moodboard:
"Before we finalize — add a few directions to your moodboard so we're aligned on style."

PRICING FOR BRANDING:
- Logo only: 30-50 credits
- Logo + core identity: 50-80 credits
- Comprehensive brand system: 80-150 credits
- Full rebrand: Requires scoping review

WHEN READY:
[TASK_READY]
{
  "title": "[Project Type] - [Company/Description]",
  "description": "Full context including moodboard selections and scope",
  "category": "BRANDING",
  "requirements": {
    "projectType": "logo | identity | brand_system | rebrand",
    "scope": "core | extended | comprehensive",
    "currentState": "from_scratch | has_logo | partial | full_rebrand",
    "moodboardDirection": "styles user selected",
    "deliverables": ["logo files", "color palette", "typography", "guidelines"]
  },
  "creditsRequired": 50-150,
  "deliveryDays": 7-14
}
[/TASK_READY]`
};

const DEFAULT_CUSTOM: CategoryPrompts = {
  systemPrompt: `You're handling a custom design project — the highest-value, most nuanced work. Approach this as a senior creative partner, not a helpful assistant.

MINDSET FOR CUSTOM:
- This is high-stakes work that defines everything downstream
- Confidence replaces enthusiasm
- Show taste through visual references, not descriptions
- Never hard-quote pricing — scope varies heavily
- Offer human escalation for complex projects

WHAT MAKES CUSTOM DIFFERENT:
- Variable scope requires careful scoping
- May involve brand creation, UI, multiple deliverables
- User may want you to "take most decisions" — this requires MORE visual guidance, not less
- Pricing is finalized after scoping, not upfront`,

  decisionTree: `=== CUSTOM PROJECT FLOW ===

CRITICAL: Custom projects require visual direction EARLY. Do not proceed through text-only Q&A.

STEP 1 - UNDERSTAND SCOPE:

Acknowledge the request with calm confidence:
"Custom project. Let me understand the scope."

Identify the core deliverable type immediately and SHOW visual references:
- If it involves brand/identity → [DELIVERABLE_STYLES: brand_identity] + [DELIVERABLE_STYLES: logo]
- If it involves UI/landing page → [DELIVERABLE_STYLES: web_banner] + [DELIVERABLE_STYLES: brand_identity]
- If it involves social/content → [DELIVERABLE_STYLES: instagram_post] or relevant type
- If unclear → Ask ONE clarifying question, then show visuals

Example for "landing page for AI startup, no existing brand":
---
Landing page with brand creation from scratch. Here's visual direction to consider:

[DELIVERABLE_STYLES: brand_identity]

[DELIVERABLE_STYLES: web_banner]

Add what resonates. A few questions to scope this properly:
---

STEP 2 - SCOPE THE PROJECT:

[QUICK_OPTIONS]
{"question": "What's the primary deliverable?", "options": ["Landing page/website", "Brand identity", "Both brand + website", "Something else"]}
[/QUICK_OPTIONS]

If brand is involved:
[QUICK_OPTIONS]
{"question": "Current brand state?", "options": ["Starting fresh", "Have logo only", "Have partial guidelines", "Full rebrand needed"]}
[/QUICK_OPTIONS]

If UI/web is involved:
[QUICK_OPTIONS]
{"question": "Design scope?", "options": ["Single page", "Multi-page site", "Full product UI", "Specific screens only"]}
[/QUICK_OPTIONS]

STEP 3 - VISUAL CHECKPOINT (MANDATORY):

After basic scope is clear, ensure they've seen and reacted to visual references.
If they haven't added anything to moodboard yet:
"Before we finalize scope, which of these directions feels right? Add a few to your moodboard."

STEP 4 - OFFER HUMAN ESCALATION (for complex projects):

For projects that are clearly high-scope (brand + website, full product UI, etc.):
"For custom projects like this, you can also book a quick call with a partner manager to align on goals and scope. Totally optional — we can also continue here."

[QUICK_OPTIONS]
{"question": "How would you like to proceed?", "options": ["Continue here", "Book a call first", "I have more details to share"]}
[/QUICK_OPTIONS]

STEP 5 - PRICING DISCIPLINE:

NEVER hard-quote credits for custom work upfront.

Instead, use this language:
"This type of project is typically scoped after a short review. We'll give you a clear estimate before anything moves forward."

Or provide a RANGE:
"Projects like this typically range from X-Y credits depending on final scope. We'll confirm exact pricing after review."

WHEN READY (custom projects):
[TASK_READY]
{
  "title": "[Descriptive Title]",
  "description": "Full details including brand state, deliverables, and any references from moodboard",
  "category": "CUSTOM",
  "requirements": {
    "primaryDeliverable": "...",
    "brandScope": "...",
    "designScope": "...",
    "moodboardDirection": "reference styles user selected",
    "additionalNotes": "..."
  },
  "creditsRequired": "Requires scoping review",
  "estimatedRange": "XX-YY credits",
  "deliveryDays": "To be confirmed after scoping"
}
[/TASK_READY]

BEHAVIOR GUIDELINES FOR CUSTOM:
- Sound like you've done this many times before
- Fewer words, more authority
- Visual references > verbal descriptions
- Never expose internal decision-making ("I think we should...")
- Be direct: "Here's how we'll approach this" not "Would you like me to..."`
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
"What are we creating today?"

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

CRITICAL - NO REDUNDANT QUESTIONS:
- Track what you've already asked/confirmed in the conversation
- NEVER ask the same question twice, even rephrased
- If user confirmed "authority" goal, do NOT later ask about "thought leadership" (same concept)
- If user selected a visual style, do NOT ask "which style direction" again
- Similar concepts to avoid repeating:
  - "Build authority" = "Build thought leadership" = "Establish expertise"
  - "Get signups" = "Drive registrations" = "Grow audience"
  - "Increase awareness" = "Brand visibility" = "Get the word out"

CRITICAL - CONTEXT PRESERVATION ON MODIFICATIONS:
When user requests changes/modifications (e.g., "let's do 3 instead of 5", "make it more beginner-friendly"):
- PRESERVE all previously established context (platform, content type, audience, style, etc.)
- DO NOT re-ask questions that were already answered
- Focus ONLY on applying the requested change
- Example: If they said "LinkedIn carousels" earlier, don't ask "which platform?" after a modification
- Treat modifications as UPDATES to the existing brief, not a new conversation

MANDATORY - VISUAL STYLES FIRST:
- When user mentions a deliverable type (Instagram, LinkedIn, ad, etc.), your FIRST response MUST include [DELIVERABLE_STYLES: type]
- NEVER ask "what style?" or "which direction?" as text - SHOW visual styles instead
- Example: User says "Instagram post for product launch" → Immediately include [DELIVERABLE_STYLES: instagram_post]
- The user will click on style images to add to their moodboard - this is how they choose styles

CRITICAL - OPTIONS FORMAT (MUST FOLLOW):
- ALWAYS use [QUICK_OPTIONS] JSON format for user choices
- NEVER use markdown bullet lists (- item) for options
- Options = SHORT ANSWERS (2-6 words), NEVER questions
- Questions go in the "question" field, answers go in "options" array
- If option contains "?" it is WRONG - fix it immediately
- Users CLICK options to answer your question - make options clickable answers`;
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
  searchQuery?: string;  // For semantic search queries
  baseStyleId?: string;  // For style refinement (id of style being refined)
  refinementQuery?: string;  // For style refinement (user's refinement feedback)
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

CRITICAL: Never expose hex codes (#XXXXXX) or technical color values to users.
Instead of: "Using your brand colors #15202B and #E8B4BC"
Say: "Using your brand colors" or "On-brand with your palette"

Use this information to make smart recommendations and personalize all creative work.`
    : "No brand profile available for this client. You may need to ask basic questions about their brand.";

  const basePrompt = await getSystemPrompt();

  // Build brand detection context
  let brandDetectionContext = "";
  if (context?.brandDetection?.detected && context.brandDetection.mentionedBrand) {
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
REQUEST COMPLETENESS: DETAILED
- User provided comprehensive information
- Acknowledge extracted info concisely (e.g., "Instagram carousel for product launch.")
- Show [DELIVERABLE_STYLES: type] immediately
- Ask only about truly missing critical pieces
- Proceed directly to style selection
`;
    } else if (context.requestCompleteness === "vague") {
      completenessContext = `
REQUEST COMPLETENESS: VAGUE
- User provided minimal information
- Ask category first: "What are we creating today?"
- Use [QUICK_OPTIONS] with categories
- Then proceed with visuals after clarification
`;
    } else {
      completenessContext = `
REQUEST COMPLETENESS: MODERATE
- User provided some information but missing key details
- Show visuals quickly while gathering remaining info
- Focus questions on the most important missing pieces
`;
    }
  }

  // Build confirmed fields context to prevent re-asking
  let confirmedFieldsContext = "";
  if (context?.confirmedFields && Object.values(context.confirmedFields).some(Boolean)) {
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
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, "")
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
  return text
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
    .trim();
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
