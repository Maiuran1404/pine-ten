import { db } from "@/db";
import { deliverableStyleReferences } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import type { DeliverableType, StyleAxis } from "@/lib/constants/reference-libraries";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Common style-related keywords and their synonyms/related terms
 * Used for expanding search queries
 */
const KEYWORD_SYNONYMS: Record<string, string[]> = {
  // Temperature
  warm: ["warm", "cozy", "inviting", "friendly", "approachable", "earthy"],
  cool: ["cool", "cold", "professional", "corporate", "sleek", "modern"],
  neutral: ["neutral", "balanced", "versatile", "clean"],

  // Energy
  calm: ["calm", "peaceful", "serene", "zen", "minimal", "quiet", "subtle"],
  energetic: ["energetic", "dynamic", "bold", "vibrant", "active", "exciting"],

  // Style descriptors
  minimal: ["minimal", "minimalist", "clean", "simple", "whitespace", "sparse"],
  bold: ["bold", "strong", "impactful", "striking", "attention-grabbing"],
  playful: ["playful", "fun", "colorful", "creative", "whimsical", "cheerful"],
  premium: ["premium", "luxury", "elegant", "sophisticated", "high-end", "refined"],
  corporate: ["corporate", "professional", "business", "formal", "trustworthy", "b2b"],
  editorial: ["editorial", "magazine", "content-rich", "layout", "typographic"],
  organic: ["organic", "natural", "earthy", "sustainable", "eco", "wellness"],
  tech: ["tech", "digital", "modern", "futuristic", "startup", "innovative"],

  // Industry
  fintech: ["fintech", "finance", "banking", "payment", "financial"],
  healthcare: ["healthcare", "medical", "health", "wellness", "clinical"],
  ecommerce: ["ecommerce", "retail", "shopping", "consumer", "product"],
  saas: ["saas", "software", "cloud", "platform", "enterprise"],
  fashion: ["fashion", "style", "clothing", "beauty", "lifestyle"],
  food: ["food", "restaurant", "culinary", "dining", "beverage"],
};

/**
 * Extract keywords from a text query
 */
function extractKeywords(text: string): string[] {
  const normalizedText = text.toLowerCase();
  const words = normalizedText.split(/\s+/);
  const keywords: Set<string> = new Set();

  // Direct word matches
  words.forEach((word) => {
    // Clean punctuation
    const cleanWord = word.replace(/[^\w]/g, "");
    if (cleanWord.length > 2) {
      keywords.add(cleanWord);
    }
  });

  // Check for synonym matches and expand
  Object.entries(KEYWORD_SYNONYMS).forEach(([key, synonyms]) => {
    if (synonyms.some((syn) => normalizedText.includes(syn))) {
      keywords.add(key);
      // Add a few related synonyms for broader matching
      synonyms.slice(0, 3).forEach((syn) => keywords.add(syn));
    }
  });

  return Array.from(keywords);
}

/**
 * Calculate semantic similarity score between query keywords and style tags
 */
function calculateSemanticScore(
  queryKeywords: string[],
  styleTags: string[],
  styleDescription: string | null
): number {
  if (queryKeywords.length === 0) return 0;

  const normalizedTags = styleTags.map((t) => t.toLowerCase());
  const normalizedDesc = (styleDescription || "").toLowerCase();

  let matchCount = 0;
  let partialMatchCount = 0;

  queryKeywords.forEach((keyword) => {
    // Exact tag match
    if (normalizedTags.includes(keyword)) {
      matchCount += 2;
    }
    // Partial tag match (keyword is part of a tag or vice versa)
    else if (normalizedTags.some((tag) => tag.includes(keyword) || keyword.includes(tag))) {
      partialMatchCount += 1;
    }
    // Description match
    else if (normalizedDesc.includes(keyword)) {
      partialMatchCount += 0.5;
    }
    // Synonym expansion match
    else {
      const relatedTerms = Object.entries(KEYWORD_SYNONYMS).find(([_, synonyms]) =>
        synonyms.includes(keyword)
      );
      if (relatedTerms) {
        const [rootKey, synonyms] = relatedTerms;
        if (
          normalizedTags.includes(rootKey) ||
          normalizedTags.some((tag) => synonyms.includes(tag))
        ) {
          partialMatchCount += 0.75;
        }
      }
    }
  });

  // Calculate score (0-100)
  const maxPossibleScore = queryKeywords.length * 2;
  const rawScore = matchCount + partialMatchCount;
  const normalizedScore = Math.min(100, (rawScore / maxPossibleScore) * 100);

  return Math.round(normalizedScore);
}

export interface SemanticStyleResult {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  deliverableType: string;
  styleAxis: string;
  subStyle: string | null;
  semanticTags: string[];
  semanticScore: number;
  matchedKeywords: string[];
}

/**
 * Search for styles that semantically match a query
 */
export async function searchStylesByQuery(
  query: string,
  deliverableType?: DeliverableType,
  limit: number = 8
): Promise<SemanticStyleResult[]> {
  // Extract keywords from query
  const queryKeywords = extractKeywords(query);

  if (queryKeywords.length === 0) {
    return [];
  }

  // Build query conditions
  const conditions = [eq(deliverableStyleReferences.isActive, true)];
  if (deliverableType) {
    conditions.push(eq(deliverableStyleReferences.deliverableType, deliverableType));
  }

  // Fetch all active styles (for small datasets, this is efficient enough)
  const styles = await db
    .select({
      id: deliverableStyleReferences.id,
      name: deliverableStyleReferences.name,
      description: deliverableStyleReferences.description,
      imageUrl: deliverableStyleReferences.imageUrl,
      deliverableType: deliverableStyleReferences.deliverableType,
      styleAxis: deliverableStyleReferences.styleAxis,
      subStyle: deliverableStyleReferences.subStyle,
      semanticTags: deliverableStyleReferences.semanticTags,
    })
    .from(deliverableStyleReferences)
    .where(and(...conditions));

  // Score each style
  const scoredStyles: SemanticStyleResult[] = styles.map((style) => {
    const tags = style.semanticTags || [];
    const score = calculateSemanticScore(queryKeywords, tags, style.description);

    // Find which keywords matched
    const matchedKeywords = queryKeywords.filter((keyword) => {
      const normalizedTags = tags.map((t) => t.toLowerCase());
      const normalizedDesc = (style.description || "").toLowerCase();
      return (
        normalizedTags.some((tag) => tag.includes(keyword) || keyword.includes(tag)) ||
        normalizedDesc.includes(keyword)
      );
    });

    return {
      ...style,
      semanticTags: tags,
      semanticScore: score,
      matchedKeywords,
    };
  });

  // Sort by semantic score and return top results
  scoredStyles.sort((a, b) => b.semanticScore - a.semanticScore);

  return scoredStyles.filter((s) => s.semanticScore > 0).slice(0, limit);
}

/**
 * AI-enhanced semantic search for complex queries
 * Uses Claude to understand nuanced requests and rank styles
 */
export async function aiEnhancedStyleSearch(
  conversationContext: string,
  deliverableType: DeliverableType,
  limit: number = 6
): Promise<SemanticStyleResult[]> {
  // First, get all styles for this deliverable type
  const styles = await db
    .select({
      id: deliverableStyleReferences.id,
      name: deliverableStyleReferences.name,
      description: deliverableStyleReferences.description,
      imageUrl: deliverableStyleReferences.imageUrl,
      deliverableType: deliverableStyleReferences.deliverableType,
      styleAxis: deliverableStyleReferences.styleAxis,
      subStyle: deliverableStyleReferences.subStyle,
      semanticTags: deliverableStyleReferences.semanticTags,
    })
    .from(deliverableStyleReferences)
    .where(
      and(
        eq(deliverableStyleReferences.deliverableType, deliverableType),
        eq(deliverableStyleReferences.isActive, true)
      )
    );

  if (styles.length === 0) {
    return [];
  }

  // Prepare style summaries for Claude
  const styleSummaries = styles.map((s, i) => ({
    index: i,
    name: s.name,
    axis: s.styleAxis,
    tags: (s.semanticTags || []).join(", "),
    description: s.description,
  }));

  // Ask Claude to rank the styles based on context
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    system: `You are a design style matcher. Given a conversation context and a list of available styles, rank the most relevant styles for the user's needs. Return only a JSON array of style indices in order of relevance.`,
    messages: [
      {
        role: "user",
        content: `Context from conversation:
"${conversationContext}"

Available styles:
${styleSummaries.map((s) => `${s.index}: ${s.name} (${s.axis}) - ${s.tags}`).join("\n")}

Return the indices of the ${Math.min(limit, styles.length)} most relevant styles as a JSON array, e.g. [2, 0, 5, 1].
Only return the JSON array, nothing else.`,
      },
    ],
  });

  // Parse the response
  const content = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    // Extract JSON array from response
    const jsonMatch = content.match(/\[[\d,\s]+\]/);
    if (!jsonMatch) {
      // Fallback to keyword-based search
      return searchStylesByQuery(conversationContext, deliverableType, limit);
    }

    const rankedIndices: number[] = JSON.parse(jsonMatch[0]);

    // Build results in ranked order
    const results: SemanticStyleResult[] = [];
    rankedIndices.forEach((index, rank) => {
      if (index >= 0 && index < styles.length) {
        const style = styles[index];
        results.push({
          ...style,
          semanticTags: style.semanticTags || [],
          semanticScore: 100 - rank * 10, // Higher rank = higher score
          matchedKeywords: [], // AI-based matching doesn't track specific keywords
        });
      }
    });

    return results.slice(0, limit);
  } catch (error) {
    console.error("Error parsing AI style ranking:", error);
    // Fallback to keyword-based search
    return searchStylesByQuery(conversationContext, deliverableType, limit);
  }
}

/**
 * Detect if a message contains style preference expressions
 * Returns extracted preferences if found
 */
export function detectStylePreferences(message: string): {
  hasPreferences: boolean;
  preferences: string[];
} {
  const styleIndicators = [
    /something\s+(more\s+)?(\w+)/i,
    /less\s+(\w+)/i,
    /like\s+(\w+)/i,
    /prefer\s+(\w+)/i,
    /want\s+(it\s+)?(more\s+)?(\w+)/i,
    /should\s+be\s+(\w+)/i,
    /looking\s+for\s+(\w+)/i,
    /needs?\s+to\s+be\s+(\w+)/i,
  ];

  const preferences: string[] = [];

  styleIndicators.forEach((pattern) => {
    const match = message.match(pattern);
    if (match) {
      // Get the captured style word (last capture group)
      const styleWord = match[match.length - 1];
      if (styleWord && styleWord.length > 2) {
        preferences.push(styleWord.toLowerCase());
      }
    }
  });

  // Also check for explicit style axis mentions
  const styleAxes = ["minimal", "bold", "editorial", "corporate", "playful", "premium", "organic", "tech"];
  const messageLower = message.toLowerCase();
  styleAxes.forEach((axis) => {
    if (messageLower.includes(axis) && !preferences.includes(axis)) {
      preferences.push(axis);
    }
  });

  return {
    hasPreferences: preferences.length > 0,
    preferences: [...new Set(preferences)],
  };
}
