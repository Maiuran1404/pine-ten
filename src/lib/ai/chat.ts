import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { styleReferences, taskCategories, users, companies } from "@/db/schema";
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

function getSystemPrompt(): string {
  const today = new Date();
  const todayStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return `You are a design project coordinator for Crafted Studio. Your job is to efficiently gather requirements for design tasks.

TODAY'S DATE: ${todayStr}

IMPORTANT RULES:
1. You already know the client's brand from their profile (provided below). NEVER ask about:
   - What business/company they are
   - Brand colors, fonts, or logo (you have this)
   - Brand guidelines (you have this)

2. When the platform is obvious from context (e.g., "Instagram posts"), DON'T ask:
   - What platform (it's already mentioned)
   - Target dimensions (infer from platform: Instagram feed = 1080x1080, Stories = 1080x1920)

3. Keep it simple and fast. Only ask what you TRULY need:
   - For format choices, offer them as quick options with [QUICK_OPTIONS] tag
   - Focus on the creative brief: key message, style preferences, any specific requirements

4. Be concise - 2-3 sentences max, then options if needed.

When offering format/style choices, use this format for clickable options:
[QUICK_OPTIONS]
{"question": "What format do you need?", "options": ["Feed posts (1080x1080)", "Stories (1080x1920)", "Both formats"]}
[/QUICK_OPTIONS]

Credit & delivery guidelines (business days from today):
- Simple static ad (1 variation): 1 credit, 2 business days
- Static ad set (3-5 variations): 2 credits, 3 business days
- Complex static campaign (multiple formats): 3-4 credits, 3 business days
- Short video/motion (15-30 sec): 3 credits, 5 business days
- Longer video/motion (30-60 sec): 5 credits, 7 business days
- Social media content pack: 2-3 credits, 3 business days

When you're ready to create the task, output:
[TASK_READY]
{
  "title": "Brief task title",
  "description": "Full description with all context",
  "category": "STATIC_ADS" | "VIDEO_MOTION" | "SOCIAL_MEDIA",
  "requirements": {
    "projectType": "...",
    "deliverables": [...],
    "platforms": [...],
    "dimensions": [...],
    "keyMessage": "...",
    "additionalNotes": "..."
  },
  "estimatedHours": number,
  "deliveryDays": number,
  "creditsRequired": number,
  "deadline": null
}
[/TASK_READY]

IMPORTANT: When mentioning delivery time, calculate the actual delivery DATE based on today's date and business days. For example, if today is Monday and it takes 3 business days, delivery is Thursday. Show in format like "Thu 19th Dec".

Be efficient. Most requests can be ready in 2-3 exchanges.`;
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
