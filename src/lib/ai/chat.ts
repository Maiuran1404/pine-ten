import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { styleReferences, taskCategories } from "@/db/schema";
import { eq } from "drizzle-orm";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a design project coordinator for a creative agency called Nameless. Your job is to gather complete requirements for design tasks from clients.

Your personality:
- Professional but friendly
- Efficient and focused on gathering necessary information
- Helpful in suggesting options when clients are unsure

For each design request, you must collect the following information:
1. Project type (static ads, video/motion graphics, or social media content)
2. Specific deliverables needed (dimensions, formats, number of variations)
3. Target platform(s) (Instagram, Facebook, LinkedIn, TikTok, Google Ads, etc.)
4. Brand guidelines if available (colors, fonts, logos, existing assets)
5. Key message or call-to-action
6. Timeline/urgency level
7. Style preferences

When you have gathered enough information, you should:
1. Summarize the requirements
2. Propose a credit cost based on complexity
3. Propose an estimated delivery timeline
4. Ask for confirmation

Credit guidelines:
- Simple static ad (1 variation): 1 credit
- Static ad set (3-5 variations): 2 credits
- Complex static campaign (multiple formats): 3 credits
- Short video/motion (15-30 sec): 3 credits
- Longer video/motion (30-60 sec): 5 credits
- Social media content pack: 2-3 credits

When showing style references, format them as:
[STYLE_REFERENCES: category1, category2, ...]

When you're ready to create the task, output:
[TASK_READY]
{
  "title": "Brief task title",
  "description": "Full description",
  "category": "STATIC_ADS" | "VIDEO_MOTION" | "SOCIAL_MEDIA",
  "requirements": {
    "projectType": "...",
    "deliverables": [...],
    "platforms": [...],
    "dimensions": [...],
    "brandGuidelines": {...},
    "keyMessage": "...",
    "additionalNotes": "..."
  },
  "estimatedHours": number,
  "creditsRequired": number,
  "deadline": "ISO date or null"
}
[/TASK_READY]

Always be conversational and guide the user through the process. Ask one or two questions at a time, not all at once.`;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function chat(
  messages: ChatMessage[],
  userId: string
): Promise<{ content: string; styleReferences?: string[] }> {
  // Fetch available style categories for context
  const styles = await db
    .select()
    .from(styleReferences)
    .where(eq(styleReferences.isActive, true));

  const categories = await db
    .select()
    .from(taskCategories)
    .where(eq(taskCategories.isActive, true));

  const enhancedSystemPrompt = `${SYSTEM_PROMPT}

Available task categories:
${categories.map((c) => `- ${c.name}: ${c.description} (base: ${c.baseCredits} credits)`).join("\n")}

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

  return {
    content: content.replace(/\[STYLE_REFERENCES: [^\]]+\]/, "").trim(),
    styleReferences: mentionedStyles,
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
    categories.some(
      (c) => s.category.toLowerCase().includes(c.toLowerCase())
    )
  );
}
