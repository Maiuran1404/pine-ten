import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type {
  ContentOutline,
  OutlineItem,
  WeekGroup,
  Platform,
  ContentType,
  Intent,
} from "@/components/chat/brief-panel/types";
import { PLATFORM_DISPLAY_NAMES, INTENT_DESCRIPTIONS } from "@/components/chat/brief-panel/types";
import { getDimensionsForPlatform } from "@/lib/constants/platform-dimensions";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// =============================================================================
// TYPES
// =============================================================================

interface OutlineRequest {
  topic: string;
  platform: Platform;
  contentType?: ContentType;
  intent: Intent;
  durationDays: number;
  audienceName?: string;
  audienceDescription?: string;
  brandName?: string;
  brandIndustry?: string;
  brandTone?: string;
}

interface AIOutlineItem {
  title: string;
  description: string;
  contentType?: string;
  theme?: string;
}

// =============================================================================
// API HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request
    const body: OutlineRequest = await request.json();
    const {
      topic,
      platform,
      contentType = "post",
      intent,
      durationDays,
      audienceName,
      audienceDescription,
      brandName,
      brandIndustry,
      brandTone,
    } = body;

    // Validate required fields
    if (!topic || !platform || !intent || !durationDays) {
      return NextResponse.json(
        { error: "Missing required fields: topic, platform, intent, durationDays" },
        { status: 400 }
      );
    }

    // Fetch user's company for additional context
    let companyContext = "";
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
        with: { company: true },
      });
      if (user?.company) {
        companyContext = `
Brand Context:
- Company: ${user.company.name || brandName || "Unknown"}
- Industry: ${user.company.industry || brandIndustry || "General"}
- Description: ${user.company.description || ""}
`;
      }
    } catch {
      // Continue without company context
    }

    // Calculate content distribution
    const weeksCount = Math.ceil(durationDays / 7);
    const postsPerWeek = Math.ceil(durationDays / weeksCount / 2); // Roughly every other day
    const totalPosts = Math.min(durationDays, weeksCount * postsPerWeek);

    // Build AI prompt
    const systemPrompt = `You are an expert content strategist specializing in ${PLATFORM_DISPLAY_NAMES[platform]} content.
Your task is to create a detailed content plan that achieves the specified business goal.

${companyContext}

Guidelines:
- Create engaging, platform-optimized content ideas
- Ensure variety while maintaining brand consistency
- Each piece should contribute to the overall goal
- Consider the target audience's preferences and pain points
- Include a mix of content types appropriate for the platform
- Make titles catchy and descriptions actionable for designers

Respond ONLY with valid JSON in this exact format:
{
  "items": [
    {
      "title": "Catchy, specific title for the content piece",
      "description": "2-3 sentence brief for designers explaining what to create and key elements to include",
      "theme": "The content theme category (e.g., 'educational', 'social proof', 'promotional')"
    }
  ]
}`;

    const userPrompt = `Create a ${durationDays}-day ${PLATFORM_DISPLAY_NAMES[platform]} content plan.

Topic/Subject: ${topic}
Primary Goal: ${intent} - ${INTENT_DESCRIPTIONS[intent]}
Target Audience: ${audienceName || "General audience"}${audienceDescription ? ` - ${audienceDescription}` : ""}
Brand Tone: ${brandTone || "Professional"}
Content Type: ${contentType}
Number of Posts Needed: ${totalPosts}

Requirements:
1. Generate exactly ${totalPosts} content pieces
2. Distribute content themes to build momentum toward the goal
3. Start with awareness/introduction content, build to engagement, end with conversion
4. Include specific visual direction hints in descriptions
5. Make each title unique and compelling

Generate the content outline now:`;

    // Call Claude API
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    // Extract response text
    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    // Parse AI response
    let aiItems: AIOutlineItem[] = [];
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = responseText;
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      const parsed = JSON.parse(jsonStr);
      aiItems = parsed.items || [];
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Response was:", responseText);

      // Fallback: generate basic outline
      aiItems = generateFallbackItems(topic, intent, totalPosts);
    }

    // Convert AI items to outline structure with week grouping
    const outline = buildOutlineFromAIItems(
      aiItems,
      platform,
      contentType,
      durationDays,
      audienceName
    );

    return NextResponse.json({ outline });
  } catch (error) {
    console.error("Outline generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate outline" },
      { status: 500 }
    );
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function buildOutlineFromAIItems(
  items: AIOutlineItem[],
  platform: Platform,
  contentType: ContentType,
  durationDays: number,
  audienceName?: string
): ContentOutline {
  const weeksCount = Math.ceil(durationDays / 7);
  const itemsPerWeek = Math.ceil(items.length / weeksCount);

  const weekGroups: WeekGroup[] = [];
  let itemNumber = 1;
  let dayCounter = 1;

  for (let week = 1; week <= weeksCount; week++) {
    const startIdx = (week - 1) * itemsPerWeek;
    const weekItems = items.slice(startIdx, startIdx + itemsPerWeek);

    const outlineItems: OutlineItem[] = weekItems.map((item, idx) => {
      const day = dayCounter;
      dayCounter += Math.ceil(7 / itemsPerWeek); // Distribute across week

      return {
        id: `ai-item-${week}-${idx}`,
        number: itemNumber++,
        title: item.title,
        description: item.description,
        platform,
        contentType: (item.contentType as ContentType) || contentType,
        dimensions: getDimensionsForPlatform(platform, contentType),
        week,
        day: Math.min(day, durationDays),
        status: "draft" as const,
      };
    });

    weekGroups.push({
      weekNumber: week,
      label: `Week ${week}`,
      items: outlineItems,
      isExpanded: week === 1,
    });
  }

  return {
    title: `${durationDays}-Day ${PLATFORM_DISPLAY_NAMES[platform]} Plan`,
    subtitle: `AI-generated content strategy for ${audienceName || "your audience"}`,
    totalItems: items.length,
    weekGroups,
  };
}

function generateFallbackItems(
  topic: string,
  intent: Intent,
  count: number
): AIOutlineItem[] {
  const themes = getThemesForIntent(intent);
  const items: AIOutlineItem[] = [];

  for (let i = 0; i < count; i++) {
    const theme = themes[i % themes.length];
    items.push({
      title: `${theme}: ${topic} - Part ${i + 1}`,
      description: `Create ${theme.toLowerCase()} content about ${topic}. Focus on engaging visuals and clear messaging.`,
      theme,
    });
  }

  return items;
}

function getThemesForIntent(intent: Intent): string[] {
  const themes: Record<Intent, string[]> = {
    signups: ["Problem Awareness", "Solution Introduction", "Social Proof", "Feature Highlight", "Call to Action"],
    authority: ["Industry Insights", "Expert Tips", "Behind the Scenes", "Case Studies", "Thought Leadership"],
    awareness: ["Brand Story", "Value Proposition", "Team & Culture", "Customer Success", "Industry News"],
    sales: ["Product Benefits", "Limited Offers", "Testimonials", "Comparison", "Urgency & CTA"],
    engagement: ["Questions & Polls", "User-Generated Content", "Contests", "Behind the Scenes", "Community Spotlight"],
    education: ["How-To Guides", "Tips & Tricks", "Common Mistakes", "Deep Dives", "Q&A Sessions"],
    announcement: ["Teaser", "Launch Details", "Features Overview", "Early Access", "Celebration"],
  };

  return themes[intent] || themes.awareness;
}
