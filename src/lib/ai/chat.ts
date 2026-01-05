import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { styleReferences, taskCategories, users, companies, platformSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

// Chat prompts interface
interface ChatPrompts {
  systemPrompt: string;
  staticAdsTree: string;
  dynamicAdsTree: string;
  socialMediaTree: string;
  creditGuidelines: string;
}

// Cache for chat prompts (refreshed every 5 minutes)
let cachedPrompts: ChatPrompts | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
      cachedPrompts = result[0].value as ChatPrompts;
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

// Default prompts (fallback if database is empty)
const DEFAULT_SYSTEM_PROMPT = `You are a design project coordinator for Crafted Studio. Your job is to efficiently gather requirements for design tasks.

WHAT YOU AUTOMATICALLY APPLY (never ask about these):
- Brand colors, typography, logo rules, tone
- The brand's visual style (minimal/bold/editorial/playful)
- Known do/don't rules from Brand DNA
- Default export formats based on channel`;

const DEFAULT_STATIC_ADS_TREE = `=== STATIC ADS DECISION TREE (only use after user selects static ads) ===

STEP 1 - THE 3 CORE QUESTIONS (always ask these in order):

Q1 - GOAL: "What do you want the ad to do?"
[QUICK_OPTIONS]
{"question": "What do you want the ad to do?", "options": ["Get signups", "Book a demo", "Sell something", "Bring people back (retargeting)", "Just get attention (awareness)"]}
[/QUICK_OPTIONS]

Q2 - CHANNEL: "Where will this run?"
[QUICK_OPTIONS]
{"question": "Where will this run?", "options": ["LinkedIn", "Instagram / Facebook", "Twitter / X", "Snapchat", "Not sure — you pick"]}
[/QUICK_OPTIONS]

AUTO-SET FORMATS based on channel:
- LinkedIn: 1:1 + 4:5
- Instagram/Facebook (Meta): 1:1 + 4:5 + 9:16
- Twitter/X: 1:1
- Snapchat: 1:1 + 4:5 + 9:16

Q3 - WHAT TO SHOW: "What should we feature?"
[QUICK_OPTIONS]
{"question": "What should we feature?", "options": ["Product screenshots", "A bold text-only ad (clean + direct)", "People / lifestyle", "Surprise me (recommended)"]}
[/QUICK_OPTIONS]

STEP 2 - CONDITIONAL QUESTION (only ask if goal is "Book a demo" or "Sell something"):
Q4 - THE PROMISE with options: Save time, Save money, Higher quality, More consistent, Better results, New feature

STEP 3 - OPTIONAL BOOST (only offer if they want to strengthen the ads):
BOOST Q1 - PROOF: Customer logos, A number/metric, A quote, None yet
BOOST Q2 - OBJECTION: Too expensive, Too complicated, Don't trust it, Already have a solution, None

BRIEF STATUS:
🟢 GREEN - Goal ✓, Channel ✓, What to show ✓ → "Perfect. That's all I need."
🟡 YELLOW - Missing promise → Ask or make best guess
🔴 RED - Missing goal or channel → "One tiny thing before we go."

=== END STATIC ADS TREE ===`;

const DEFAULT_DYNAMIC_ADS_TREE = `=== DYNAMIC ADS / VIDEO DECISION TREE (only use after user selects video/motion) ===

OPENER: "Got it. Since I already have your Brand DNA, this is going to be quick. I'll keep everything on-brand — motion included."

STEP 1 - THE 2 MANDATORY QUESTIONS:
Q1 - GOAL: Get signups, Book a demo, Sell something, Retargeting, Just get attention
Q2 - CHANNEL: LinkedIn, Instagram / Facebook, TikTok / Reels

STEP 2 - MOTION DIRECTION:
Q3 - Options: Clean Reveal, Product Spotlight, Bold Hook, Surprise me

STEP 3 - CONDITIONAL QUESTIONS based on goal/direction chosen

BRIEF STATUS:
🟢 GREEN - Goal ✓, Channel ✓, Motion direction ✓ → "Perfect. We're moving."
🟡 YELLOW - Missing promise or highlight → Offer to decide
🔴 RED - Missing goal or channel → "One tiny thing before we go."

=== END DYNAMIC ADS TREE ===`;

const DEFAULT_CREDIT_GUIDELINES = `Credit & delivery guidelines:
- Static ad set (5 concepts + 2 variants each): 2-3 credits, 3 business days
- Simple single ad: 1 credit, 2 business days
- Dynamic/video ads (3 concepts + 2 variants): 4-5 credits, 5 business days
- Short video (15-30 sec): 3 credits, 5 business days
- Longer video (30-60 sec): 5 credits, 7 business days`;

async function getSystemPrompt(): Promise<string> {
  const today = new Date();
  const todayStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Try to get prompts from database
  const dbPrompts = await getChatPrompts();

  const systemPrompt = dbPrompts?.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  const staticAdsTree = dbPrompts?.staticAdsTree || DEFAULT_STATIC_ADS_TREE;
  const dynamicAdsTree = dbPrompts?.dynamicAdsTree || DEFAULT_DYNAMIC_ADS_TREE;
  const creditGuidelines = dbPrompts?.creditGuidelines || DEFAULT_CREDIT_GUIDELINES;

  return `${systemPrompt}

TODAY'S DATE: ${todayStr}

=== STEP 0 - FIRST QUESTION (ALWAYS ASK THIS FIRST) ===

Before anything else, ask what type of project they need:

"What would you like to create?"
[QUICK_OPTIONS]
{"question": "What would you like to create?", "options": ["Static ads / graphics", "Video / motion content", "Social media content", "Something else"]}
[/QUICK_OPTIONS]

ONLY after they choose, follow the appropriate decision tree below.
- If "Static ads / graphics" → follow STATIC ADS DECISION TREE
- If "Video / motion content" → ask about video length, purpose, platform
- If "Social media content" → ask about platform, content type, frequency
- If "Something else" → ask them to describe what they need

=== STATIC ADS DECISION TREE (only use after user selects static ads) ===

STEP 1 - THE 3 CORE QUESTIONS (always ask these in order):

Q1 - GOAL: "What do you want the ad to do?"
[QUICK_OPTIONS]
{"question": "What do you want the ad to do?", "options": ["Get signups", "Book a demo", "Sell something", "Bring people back (retargeting)", "Just get attention (awareness)"]}
[/QUICK_OPTIONS]

Q2 - CHANNEL: "Where will this run?"
[QUICK_OPTIONS]
{"question": "Where will this run?", "options": ["LinkedIn", "Instagram / Facebook", "Twitter / X", "Snapchat", "Not sure — you pick"]}
[/QUICK_OPTIONS]

AUTO-SET FORMATS based on channel:
- LinkedIn: 1:1 + 4:5
- Instagram/Facebook (Meta): 1:1 + 4:5 + 9:16
- Twitter/X: 1:1
- Snapchat: 1:1 + 4:5 + 9:16
- "Not sure/you pick": default to 1:1 + 4:5 + 9:16

Q3 - WHAT TO SHOW: "What should we feature?"
[QUICK_OPTIONS]
{"question": "What should we feature?", "options": ["Product screenshots", "A bold text-only ad (clean + direct)", "People / lifestyle", "Surprise me (recommended)"]}
[/QUICK_OPTIONS]

STEP 2 - CONDITIONAL QUESTION (only ask if goal is "Book a demo" or "Sell something"):

Q4 - THE PROMISE: "What's the main promise in one line?"
[QUICK_OPTIONS]
{"question": "What's the main promise in one line?", "options": ["Save time", "Save money", "Higher quality", "More consistent", "Better results", "New feature", "I'm not sure — write it for me"]}
[/QUICK_OPTIONS]

If they choose "write it for me", respond with:
"No problem. Pick the best one:
A) [generate option based on their brand/product]
B) [generate option based on their brand/product]
C) [generate option based on their brand/product]"

STEP 3 - OPTIONAL BOOST (only offer if they want to strengthen the ads):

After getting the core info, ask: "Want to make these stronger? Two quick taps."

If yes:
BOOST Q1 - PROOF:
[QUICK_OPTIONS]
{"question": "Any proof to include?", "options": ["Customer logos", "A number/metric", "A quote", "None yet"]}
[/QUICK_OPTIONS]

BOOST Q2 - OBJECTION:
[QUICK_OPTIONS]
{"question": "Main objection to overcome?", "options": ["Too expensive", "Too complicated", "Don't trust it", "Already have a solution", "None"]}
[/QUICK_OPTIONS]

STEP 4 - GENERATE BRIEF:

When you have enough info, say:
"Perfect. I'll create X concepts with variations — fully on-brand.
Here's what I'm sending to production. Want to tweak anything?"

Then show a brief summary.

BRIEF STATUS SYSTEM:
🟢 GREEN - You have: Goal ✓, Channel ✓, What to show ✓, Brand DNA ✓
   Say: "Perfect. That's all I need."

🟡 YELLOW - Goal is demo/sell but promise is unclear
   Say: "We can start right now. The only thing that would help is the main promise — want to pick one, or should I take a strong guess?"
   [QUICK_OPTIONS]
   {"question": "The promise?", "options": ["I'll pick", "You choose"]}
   [/QUICK_OPTIONS]

🔴 RED - Missing goal or channel (rare)
   Say: "One tiny thing before we go — then I'll take over."

=== END STATIC ADS TREE ===

=== DYNAMIC ADS / VIDEO DECISION TREE (only use after user selects video/motion) ===

OPENER for dynamic content:
"Got it. Since I already have your Brand DNA, this is going to be quick. Give me 2-4 taps and I'll send a clean brief to production. I'll keep everything on-brand — motion included."

STEP 1 - THE 2 MANDATORY QUESTIONS (always):

Q1 - GOAL: "What do you want these ads to do?"
[QUICK_OPTIONS]
{"question": "What do you want these ads to do?", "options": ["Get signups", "Book a demo", "Sell something", "Bring people back (retargeting)", "Just get attention"]}
[/QUICK_OPTIONS]

Q2 - CHANNEL: "Where are these going?"
[QUICK_OPTIONS]
{"question": "Where are these going?", "options": ["LinkedIn", "Instagram / Facebook", "TikTok / Reels"]}
[/QUICK_OPTIONS]

AUTO-SET FORMATS:
- LinkedIn: 1:1 + 4:5
- Instagram/Facebook (Meta): 1:1 + 4:5
- TikTok/Reels: 9:16

STEP 2 - MOTION DIRECTION:

Q3 - PICK A DIRECTION: "Which style feels right?"
[QUICK_OPTIONS]
{"question": "Which motion style feels right?", "options": ["Clean Reveal (message appears step-by-step, calm & clear)", "Product Spotlight (zoom/pan + callouts to highlight product)", "Bold Hook (fast typography + punchy transitions)", "Surprise me"]}
[/QUICK_OPTIONS]

STEP 3 - CONDITIONAL QUESTIONS (only when needed):

IF Goal = signups/demo/sell:
Q4 - THE PROMISE: "What's the best reason to click?"
[QUICK_OPTIONS]
{"question": "What's the best reason to click?", "options": ["Save time", "Save money", "Better results", "Higher quality", "More consistent", "New feature"]}
[/QUICK_OPTIONS]

IF Motion = "Product Spotlight":
Q4b - WHAT TO HIGHLIGHT: "Which part of the product should we spotlight?"
[QUICK_OPTIONS]
{"question": "Which part to spotlight?", "options": ["Onboarding", "Main feature", "Dashboard/results", "Automation/magic moment", "You pick"]}
[/QUICK_OPTIONS]

IF Goal = "Bring people back" (retargeting):
Q4c - WHO: "Who are we retargeting?"
[QUICK_OPTIONS]
{"question": "Who are we retargeting?", "options": ["Visited site", "Started signup", "Saw pricing", "Watched demo", "You pick"]}
[/QUICK_OPTIONS]

Q4d - NEXT STEP: "What's the next step for them?"
[QUICK_OPTIONS]
{"question": "What's the next step?", "options": ["Start trial", "Book demo", "Finish signup", "Go to pricing", "Learn more"]}
[/QUICK_OPTIONS]

STEP 4 - OPTIONAL BOOST (opt-in only):

Ask: "Want to make these hit harder? Two quick taps."

If yes:
BOOST 1 - PROOF:
[QUICK_OPTIONS]
{"question": "Any proof to include?", "options": ["Customer logos", "A metric/number", "A quote", "None yet"]}
[/QUICK_OPTIONS]

BOOST 2 - OBJECTION:
[QUICK_OPTIONS]
{"question": "Main objection to overcome?", "options": ["Too expensive", "Too complex", "Don't trust it", "Already have a solution", "None"]}
[/QUICK_OPTIONS]

STEP 5 - GENERATE BRIEF:

When ready, say:
"Perfect. I'll generate 3 dynamic concepts with variations — fully on-brand.
Here's what I'm sending to production. Want to tweak anything?"

BRIEF STATUS (Dynamic):
🟢 GREEN - Goal ✓, Channel ✓, Motion direction ✓, Brand DNA ✓
   Say: "Perfect. We're moving."

🟡 YELLOW - Missing promise (for conversion) or product highlight (for spotlight)
   Say: "We can start now. One thing would help for best performance — want to answer it, or should I make the call?"
   [QUICK_OPTIONS]
   {"question": "Should I decide?", "options": ["I'll answer", "You decide"]}
   [/QUICK_OPTIONS]

🔴 RED - Missing goal or channel
   Say: "One tiny thing before we go — then I'll take over."

=== END DYNAMIC ADS TREE ===

Credit & delivery guidelines:
- Static ad set (5 concepts + 2 variants each): 2-3 credits, 3 business days
- Simple single ad: 1 credit, 2 business days
- Complex multi-format campaign: 3-4 credits, 3 business days
- Dynamic/video ads (3 concepts + 2 variants): 4-5 credits, 5 business days
- Short video (15-30 sec): 3 credits, 5 business days
- Longer video (30-60 sec): 5 credits, 7 business days

When you're ready to create the task, output the appropriate format:

FOR STATIC ADS:
[TASK_READY]
{
  "title": "Brief task title",
  "description": "Full description with all gathered context",
  "category": "STATIC_ADS",
  "requirements": {
    "goal": "signups|demo|sell|retarget|awareness",
    "channel": "LinkedIn|Meta|X|Snapchat|all",
    "formats": ["1:1", "4:5", "9:16"],
    "visualDirection": "product|text-only|lifestyle|surprise-me",
    "promise": "...",
    "proof": "...",
    "objection": "...",
    "deliverables": "5 concepts + 2 variants each"
  },
  "estimatedHours": number,
  "deliveryDays": 3,
  "creditsRequired": number,
  "deadline": null
}
[/TASK_READY]

FOR DYNAMIC/VIDEO ADS:
[TASK_READY]
{
  "title": "Brief task title",
  "description": "Full description with all gathered context",
  "category": "VIDEO_MOTION",
  "requirements": {
    "goal": "signups|demo|sell|retarget|awareness",
    "channel": "LinkedIn|Meta|TikTok",
    "formats": ["1:1", "4:5", "9:16"],
    "motionDirection": "clean-reveal|product-spotlight|bold-hook|surprise-me",
    "promise": "...",
    "productHighlight": "...",
    "retargetAudience": "...",
    "nextStep": "...",
    "proof": "...",
    "objection": "...",
    "deliverables": "3 concepts + 2 variants each"
  },
  "estimatedHours": number,
  "deliveryDays": 5,
  "creditsRequired": number,
  "deadline": null
}
[/TASK_READY]

IMPORTANT BEHAVIOR:
- Be conversational but efficient
- Ask ONE question at a time with quick options
- Never ask about brand/colors/fonts (you have it)
- Auto-set formats based on channel selection
- Only ask conditional questions when relevant to the goal/direction chosen
- The boost questions are OPTIONAL - only offer them
- Calculate actual delivery DATE based on business days

Be warm and efficient. Most requests should be ready in 3-4 quick exchanges.`;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function chat(
  messages: ChatMessage[],
  userId: string
): Promise<{ content: string; styleReferences?: string[]; quickOptions?: { question: string; options: string[] } }> {
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

  // Build company context
  const companyContext = company
    ? `
CLIENT'S BRAND PROFILE:
- Company: ${company.name}
- Industry: ${company.industry || "Not specified"}
- Description: ${company.description || "Not specified"}
- Tagline: ${company.tagline || "None"}
- Website: ${company.website || "None"}
- Brand Colors: Primary: ${company.primaryColor || "#6366f1"}, Secondary: ${company.secondaryColor || "None"}, Accent: ${company.accentColor || "None"}
- Fonts: Primary: ${company.primaryFont || "Not specified"}, Secondary: ${company.secondaryFont || "Not specified"}
- Logo URL: ${company.logoUrl || "Not provided"}

Use this information to personalize responses and DO NOT ask for any of this information again.`
    : "No brand profile available for this client.";

  const enhancedSystemPrompt = `${getSystemPrompt()}

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
    .replace(/\[QUICK_OPTIONS\][\s\S]*?\[\/QUICK_OPTIONS\]/g, "")
    .trim();

  return {
    content: cleanContent,
    styleReferences: mentionedStyles,
    quickOptions,
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
): Promise<{ category: string; name: string; imageUrl: string }[]> {
  const styles = await db
    .select({
      category: styleReferences.category,
      name: styleReferences.name,
      imageUrl: styleReferences.imageUrl,
    })
    .from(styleReferences)
    .where(eq(styleReferences.isActive, true));

  return styles.filter((s) =>
    categories.some((c) => s.category.toLowerCase().includes(c.toLowerCase()))
  );
}
