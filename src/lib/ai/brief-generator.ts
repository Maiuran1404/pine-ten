/**
 * Brief Generator
 * Converts LiveBrief to DesignerBrief and generates content outlines
 */

import type {
  LiveBrief,
  DesignerBrief,
  ContentOutline,
  OutlineItem,
  WeekGroup,
  Platform,
  ContentType,
  Intent,
  TaskType,
} from "@/components/chat/brief-panel/types";
import {
  INTENT_DESCRIPTIONS,
  PLATFORM_DISPLAY_NAMES,
} from "@/components/chat/brief-panel/types";
import { getDimensionsForPlatform } from "@/lib/constants/platform-dimensions";

// =============================================================================
// CONTENT OUTLINE GENERATION
// =============================================================================

interface OutlineGenerationInput {
  topic: string;
  platform: Platform;
  contentType: ContentType;
  intent: Intent;
  durationDays: number;
  audienceName?: string;
}

/**
 * Generate a content outline based on the brief parameters
 * This creates a structured plan grouped by weeks
 */
export function generateContentOutline(input: OutlineGenerationInput): ContentOutline {
  const { topic, platform, contentType, intent, durationDays, audienceName } = input;

  // Calculate weeks and posts per week
  const weeksCount = Math.ceil(durationDays / 7);
  const postsPerWeek = Math.ceil(durationDays / weeksCount / 2); // Roughly every other day

  // Generate content themes based on intent
  const themes = getContentThemesForIntent(intent, topic);

  // Create week groups
  const weekGroups: WeekGroup[] = [];
  let itemNumber = 1;
  let dayCounter = 1;

  for (let week = 1; week <= weeksCount; week++) {
    const weekItems: OutlineItem[] = [];
    const weekTheme = themes[(week - 1) % themes.length];

    // Generate items for this week
    const itemsThisWeek = Math.min(postsPerWeek, durationDays - (week - 1) * postsPerWeek);

    for (let i = 0; i < itemsThisWeek && dayCounter <= durationDays; i++) {
      const contentIdea = generateContentIdea(
        weekTheme,
        intent,
        itemNumber,
        topic,
        audienceName
      );

      weekItems.push({
        id: `item-${week}-${i}`,
        number: itemNumber,
        title: contentIdea.title,
        description: contentIdea.description,
        platform,
        contentType,
        dimensions: getDimensionsForPlatform(platform, contentType),
        week,
        day: dayCounter,
        status: "draft",
      });

      itemNumber++;
      dayCounter += 2; // Every other day
    }

    weekGroups.push({
      weekNumber: week,
      label: `Week ${week}`,
      items: weekItems,
      isExpanded: week === 1, // Only first week expanded
    });
  }

  // Calculate actual total items
  const totalItems = weekGroups.reduce((sum, g) => sum + g.items.length, 0);

  return {
    title: `${durationDays}-Day ${PLATFORM_DISPLAY_NAMES[platform]} Plan`,
    subtitle: `${getIntentSubtitle(intent)} content for ${audienceName || "your audience"}`,
    totalItems,
    weekGroups,
  };
}

/**
 * Get content themes based on intent
 */
function getContentThemesForIntent(intent: Intent, topic: string): string[] {
  const baseThemes: Record<Intent, string[]> = {
    signups: [
      "Problem Awareness",
      "Solution Introduction",
      "Social Proof",
      "Feature Highlight",
      "Call to Action",
    ],
    authority: [
      "Industry Insights",
      "Expert Tips",
      "Behind the Scenes",
      "Case Studies",
      "Thought Leadership",
    ],
    awareness: [
      "Brand Story",
      "Value Proposition",
      "Team & Culture",
      "Customer Success",
      "Industry News",
    ],
    sales: [
      "Product Benefits",
      "Limited Offers",
      "Testimonials",
      "Comparison",
      "Urgency & CTA",
    ],
    engagement: [
      "Questions & Polls",
      "User-Generated Content",
      "Contests",
      "Behind the Scenes",
      "Community Spotlight",
    ],
    education: [
      "How-To Guides",
      "Tips & Tricks",
      "Common Mistakes",
      "Deep Dives",
      "Q&A Sessions",
    ],
    announcement: [
      "Teaser",
      "Launch Details",
      "Features Overview",
      "Early Access",
      "Celebration",
    ],
  };

  return baseThemes[intent] || baseThemes.awareness;
}

/**
 * Get subtitle based on intent
 */
function getIntentSubtitle(intent: Intent): string {
  const subtitles: Record<Intent, string> = {
    signups: "Conversion-focused",
    authority: "Thought leadership",
    awareness: "Brand awareness",
    sales: "Sales-driven",
    engagement: "Community-building",
    education: "Educational",
    announcement: "Launch campaign",
  };
  return subtitles[intent] || "Strategic";
}

/**
 * Generate a content idea for a specific theme and position
 */
function generateContentIdea(
  theme: string,
  intent: Intent,
  position: number,
  topic: string,
  audienceName?: string
): { title: string; description: string } {
  // Templates based on theme
  const templates: Record<string, Array<{ title: string; description: string }>> = {
    "Problem Awareness": [
      {
        title: `The Hidden Challenge of ${topic}`,
        description: `Highlight a common pain point your audience faces with ${topic}. Use relatable language.`,
      },
      {
        title: `3 Signs You're Struggling With ${topic}`,
        description: "List format showing symptoms of the problem. End with hint at solution.",
      },
      {
        title: `Why ${topic} Is Harder Than It Should Be`,
        description: "Empathy-driven content acknowledging the struggle.",
      },
    ],
    "Solution Introduction": [
      {
        title: `Introducing a Better Way to ${topic}`,
        description: "Soft introduction to your solution without being salesy.",
      },
      {
        title: `What If ${topic} Could Be Simple?`,
        description: "Vision-casting content showing the transformation possible.",
      },
    ],
    "Industry Insights": [
      {
        title: `${new Date().getFullYear()} Trends in ${topic}`,
        description: "Share data-backed insights about where the industry is heading.",
      },
      {
        title: `What Most People Get Wrong About ${topic}`,
        description: "Contrarian take that positions you as an expert.",
      },
    ],
    "Expert Tips": [
      {
        title: `Pro Tip: ${topic} Made Easy`,
        description: "Share an actionable tip that delivers immediate value.",
      },
      {
        title: `The ${topic} Framework We Use Daily`,
        description: "Share your internal process or methodology.",
      },
    ],
    "Behind the Scenes": [
      {
        title: `How We Approach ${topic}`,
        description: "Authentic look at your process, team, or workspace.",
      },
      {
        title: `A Day in the Life: ${topic} Edition`,
        description: "Human, relatable content showing the real work.",
      },
    ],
    "Case Studies": [
      {
        title: `How [Client] Transformed Their ${topic}`,
        description: "Success story with specific results and testimonial.",
      },
      {
        title: `From Struggling to Thriving: A ${topic} Story`,
        description: "Before/after narrative showcasing transformation.",
      },
    ],
    "Social Proof": [
      {
        title: `What Our Users Say About ${topic}`,
        description: "Customer testimonial or review highlight.",
      },
      {
        title: `[X] Companies Trust Us With ${topic}`,
        description: "Numbers-driven credibility content.",
      },
    ],
    "Feature Highlight": [
      {
        title: `Feature Spotlight: ${topic}`,
        description: "Deep dive into one feature and its benefits.",
      },
      {
        title: `Did You Know? ${topic} Hidden Feature`,
        description: "Reveal lesser-known capability.",
      },
    ],
    "Call to Action": [
      {
        title: `Ready to Master ${topic}?`,
        description: "Direct CTA with clear value proposition.",
      },
      {
        title: `Start Your ${topic} Journey Today`,
        description: "Encouraging CTA focused on the first step.",
      },
    ],
    "Questions & Polls": [
      {
        title: `Quick Poll: Your ${topic} Preferences`,
        description: "Interactive content to drive engagement.",
      },
      {
        title: `We Want to Know: ${topic}?`,
        description: "Open-ended question to spark discussion.",
      },
    ],
    "How-To Guides": [
      {
        title: `How to ${topic}: A Step-by-Step Guide`,
        description: "Educational content with clear, actionable steps.",
      },
      {
        title: `The Complete Guide to ${topic}`,
        description: "Comprehensive resource establishing expertise.",
      },
    ],
    "Tips & Tricks": [
      {
        title: `5 ${topic} Tips You Need to Know`,
        description: "Quick, valuable tips in list format.",
      },
      {
        title: `${topic} Hacks That Actually Work`,
        description: "Practical shortcuts and efficiency tips.",
      },
    ],
  };

  // Get templates for this theme, or use generic ones
  const themeTemplates = templates[theme] || [
    {
      title: `${theme}: ${topic}`,
      description: `Content focused on ${theme.toLowerCase()} related to ${topic}.`,
    },
  ];

  // Cycle through templates based on position
  const template = themeTemplates[(position - 1) % themeTemplates.length];

  return template;
}

// =============================================================================
// DESIGNER BRIEF GENERATION
// =============================================================================

interface BrandContext {
  name: string;
  industry: string;
  toneOfVoice: string;
  brandDescription: string;
}

/**
 * Convert a LiveBrief to a DesignerBrief
 */
export function generateDesignerBrief(
  brief: LiveBrief,
  brandContext: BrandContext,
  conversationId: string
): DesignerBrief {
  // Determine content type
  const isMultiAsset = brief.taskType.value === "multi_asset_plan";

  // Flatten outline items
  const outlineItems: OutlineItem[] = brief.contentOutline?.weekGroups.flatMap(
    (g) => g.items
  ) || [];

  return {
    // Summary
    taskSummary: brief.taskSummary.value || "Untitled Brief",

    // Intent & Goal
    intent: brief.intent.value || "awareness",
    intentDescription: brief.intent.value
      ? INTENT_DESCRIPTIONS[brief.intent.value]
      : "General content creation",

    // Platform & Specs
    platform: brief.platform.value || "instagram",
    dimensions: brief.dimensions,

    // Audience
    audience: {
      name: brief.audience.value?.name || "General Audience",
      demographics: brief.audience.value?.demographics || "",
      psychographics: brief.audience.value?.psychographics || "",
      painPoints: brief.audience.value?.painPoints || [],
      goals: brief.audience.value?.goals || [],
    },

    // Content
    content: {
      type: isMultiAsset ? "multi" : "single",
      outline: outlineItems,
      copyGuidelines: generateCopyGuidelines(brief, brandContext),
      hashtags: generateHashtags(brief),
    },

    // Visual Direction
    visualDirection: {
      selectedStyles: (brief.visualDirection?.selectedStyles || []).map((s) => ({
        id: s.id,
        name: s.name,
        imageUrl: s.imageUrl,
        styleAxis: s.styleAxis,
      })),
      moodKeywords: brief.visualDirection?.moodKeywords || [],
      colorPalette: brief.visualDirection?.colorPalette || [],
      typography: brief.visualDirection?.typography || {
        primary: "",
        secondary: "",
      },
      avoidElements: brief.visualDirection?.avoidElements,
    },

    // Brand Context
    brandContext,

    // Metadata
    generatedAt: new Date(),
    conversationId,
  };
}

/**
 * Generate copy guidelines based on brief and brand
 */
function generateCopyGuidelines(brief: LiveBrief, brandContext: BrandContext): string {
  const guidelines: string[] = [];

  if (brandContext.toneOfVoice) {
    guidelines.push(`Tone: ${brandContext.toneOfVoice}`);
  }

  if (brief.intent.value) {
    const intentGuidelines: Record<Intent, string> = {
      signups: "Focus on value proposition and clear CTAs",
      authority: "Use data, insights, and expert language",
      awareness: "Keep it memorable and shareable",
      sales: "Highlight benefits and create urgency",
      engagement: "Ask questions and invite interaction",
      education: "Be clear, structured, and actionable",
      announcement: "Build excitement and anticipation",
    };
    guidelines.push(intentGuidelines[brief.intent.value]);
  }

  if (brief.audience.value?.name) {
    guidelines.push(`Speak directly to ${brief.audience.value.name}`);
  }

  return guidelines.join(". ");
}

/**
 * Generate relevant hashtags based on brief
 */
function generateHashtags(brief: LiveBrief): string[] {
  const hashtags: string[] = [];

  // Platform-specific hashtags
  if (brief.platform.value === "instagram") {
    hashtags.push("#instagram");
  } else if (brief.platform.value === "linkedin") {
    hashtags.push("#linkedin", "#business");
  }

  // Intent-based hashtags
  if (brief.intent.value) {
    const intentHashtags: Record<Intent, string[]> = {
      signups: ["#signup", "#launch"],
      authority: ["#thoughtleadership", "#expertise"],
      awareness: ["#brandawareness", "#marketing"],
      sales: ["#sale", "#deal"],
      engagement: ["#community", "#engagement"],
      education: ["#learning", "#tips"],
      announcement: ["#announcement", "#new"],
    };
    hashtags.push(...(intentHashtags[brief.intent.value] || []));
  }

  // Topic-based hashtags (from topic words)
  if (brief.topic.value) {
    const topicWords = brief.topic.value
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 3);
    topicWords.forEach((word) => hashtags.push(`#${word}`));
  }

  return [...new Set(hashtags)]; // Remove duplicates
}

// =============================================================================
// BRIEF EXPORT FORMATS
// =============================================================================

/**
 * Export brief as markdown
 */
export function exportBriefAsMarkdown(brief: DesignerBrief): string {
  const lines: string[] = [];

  lines.push(`# ${brief.taskSummary}`);
  lines.push("");
  lines.push(`**Generated:** ${brief.generatedAt.toLocaleDateString()}`);
  lines.push("");

  // Overview
  lines.push("## Overview");
  lines.push(`- **Intent:** ${brief.intent} - ${brief.intentDescription}`);
  lines.push(`- **Platform:** ${PLATFORM_DISPLAY_NAMES[brief.platform]}`);
  lines.push(
    `- **Dimensions:** ${brief.dimensions.map((d) => `${d.name} (${d.width}×${d.height})`).join(", ")}`
  );
  lines.push("");

  // Audience
  lines.push("## Target Audience");
  lines.push(`**${brief.audience.name}**`);
  if (brief.audience.demographics) {
    lines.push(`- Demographics: ${brief.audience.demographics}`);
  }
  if (brief.audience.psychographics) {
    lines.push(`- Psychographics: ${brief.audience.psychographics}`);
  }
  if (brief.audience.painPoints.length > 0) {
    lines.push(`- Pain Points: ${brief.audience.painPoints.join(", ")}`);
  }
  if (brief.audience.goals.length > 0) {
    lines.push(`- Goals: ${brief.audience.goals.join(", ")}`);
  }
  lines.push("");

  // Content
  lines.push("## Content Outline");
  if (brief.content.outline.length > 0) {
    // Group by week if multi-asset
    if (brief.content.type === "multi") {
      const byWeek = new Map<number, typeof brief.content.outline>();
      brief.content.outline.forEach((item) => {
        const week = item.week || 1;
        if (!byWeek.has(week)) byWeek.set(week, []);
        byWeek.get(week)!.push(item);
      });

      byWeek.forEach((items, week) => {
        lines.push(`### Week ${week}`);
        items.forEach((item) => {
          lines.push(`${item.number}. **${item.title}**`);
          lines.push(`   ${item.description}`);
        });
        lines.push("");
      });
    } else {
      brief.content.outline.forEach((item) => {
        lines.push(`${item.number}. **${item.title}**`);
        lines.push(`   ${item.description}`);
      });
    }
  }

  if (brief.content.copyGuidelines) {
    lines.push("");
    lines.push(`**Copy Guidelines:** ${brief.content.copyGuidelines}`);
  }

  if (brief.content.hashtags && brief.content.hashtags.length > 0) {
    lines.push("");
    lines.push(`**Suggested Hashtags:** ${brief.content.hashtags.join(" ")}`);
  }
  lines.push("");

  // Visual Direction
  lines.push("## Visual Direction");
  if (brief.visualDirection.selectedStyles.length > 0) {
    lines.push(
      `**Selected Styles:** ${brief.visualDirection.selectedStyles.map((s) => s.name).join(", ")}`
    );
  }
  if (brief.visualDirection.colorPalette.length > 0) {
    lines.push(`**Color Palette:** ${brief.visualDirection.colorPalette.join(", ")}`);
  }
  if (brief.visualDirection.moodKeywords.length > 0) {
    lines.push(`**Mood:** ${brief.visualDirection.moodKeywords.join(", ")}`);
  }
  if (brief.visualDirection.typography.primary) {
    lines.push(
      `**Typography:** ${brief.visualDirection.typography.primary} / ${brief.visualDirection.typography.secondary}`
    );
  }
  if (brief.visualDirection.avoidElements && brief.visualDirection.avoidElements.length > 0) {
    lines.push(`**Avoid:** ${brief.visualDirection.avoidElements.join(", ")}`);
  }
  lines.push("");

  // Brand Context
  lines.push("## Brand Context");
  lines.push(`- **Brand:** ${brief.brandContext.name}`);
  lines.push(`- **Industry:** ${brief.brandContext.industry}`);
  lines.push(`- **Tone:** ${brief.brandContext.toneOfVoice}`);
  if (brief.brandContext.brandDescription) {
    lines.push(`- **Description:** ${brief.brandContext.brandDescription}`);
  }

  return lines.join("\n");
}

/**
 * Export brief as JSON
 */
export function exportBriefAsJSON(brief: DesignerBrief): string {
  return JSON.stringify(brief, null, 2);
}

export default {
  generateContentOutline,
  generateDesignerBrief,
  exportBriefAsMarkdown,
  exportBriefAsJSON,
};
