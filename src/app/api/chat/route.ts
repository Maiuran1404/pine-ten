import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { chat, parseTaskFromChat, getStyleReferencesByCategory } from "@/lib/ai/chat";
import { withRateLimit } from "@/lib/rate-limit";
import { config } from "@/lib/config";
import {
  getInitialDeliverableStyles,
  getMoreOfStyle,
  getDifferentStyles,
} from "@/lib/ai/deliverable-styles";
import {
  getBrandAwareStyles,
  getBrandAwareStylesOfAxis,
} from "@/lib/ai/brand-style-scoring";
import {
  searchStylesByQuery,
  aiEnhancedStyleSearch,
  refineStyleSearch,
} from "@/lib/ai/semantic-style-search";
import type { DeliverableType, StyleAxis } from "@/lib/constants/reference-libraries";
import { normalizeDeliverableType } from "@/lib/constants/reference-libraries";

async function handler(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      messages,
      selectedStyles,
      excludeStyleAxes,
      styleOffset,
      deliverableStyleMarker: clientStyleMarker,
      moodboardHasStyles, // Client indicates if moodboard already has style items
    } = body;

    // If client is requesting more/different styles directly, skip AI call
    if (clientStyleMarker && (clientStyleMarker.type === "more" || clientStyleMarker.type === "different")) {
      let deliverableStyles = undefined;
      const { type, deliverableType, styleAxis } = clientStyleMarker;
      // Normalize deliverable type in case AI generated an alias
      const normalizedType = normalizeDeliverableType(deliverableType);

      try {
        if (type === "more" && styleAxis) {
          // Use brand-aware scoring for more styles
          deliverableStyles = await getBrandAwareStylesOfAxis(
            normalizedType,
            styleAxis as StyleAxis,
            session.user.id,
            styleOffset || 0
          );
        } else if (type === "different") {
          // For different styles, get brand-aware styles excluding already shown axes
          deliverableStyles = await getBrandAwareStyles(
            normalizedType,
            session.user.id,
            { includeAllAxes: true, limit: 4 }
          );
          // Filter out excluded axes
          if (excludeStyleAxes?.length) {
            deliverableStyles = deliverableStyles.filter(
              s => !excludeStyleAxes.includes(s.styleAxis)
            );
          }
        }
      } catch (err) {
        console.error("Error fetching deliverable styles:", err);
      }

      return NextResponse.json({
        content: "",
        deliverableStyles,
        deliverableStyleMarker: clientStyleMarker,
        selectedStyles,
      });
    }

    // Get AI response
    const response = await chat(messages, session.user.id);

    // Check if a task proposal was generated
    const taskProposal = parseTaskFromChat(response.content);

    // Get style reference images if categories were mentioned
    let styleReferences = undefined;
    if (response.styleReferences && response.styleReferences.length > 0) {
      styleReferences = await getStyleReferencesByCategory(response.styleReferences);
    }

    // Get deliverable styles if marker was present from AI response
    // Now using brand-aware scoring for personalized recommendations
    let deliverableStyles = undefined;
    let deliverableStyleMarker = response.deliverableStyleMarker;

    // FALLBACK: If AI didn't include marker but mentions a deliverable type,
    // automatically detect and show styles to ensure user sees visual options
    if (!deliverableStyleMarker) {
      const contentLower = response.content.toLowerCase();
      const lastUserMessage = messages[messages.length - 1]?.content?.toLowerCase() || "";
      const combinedContext = `${lastUserMessage} ${contentLower}`;

      // Detect deliverable type from context
      let detectedType: string | null = null;
      if (combinedContext.includes("instagram") && (combinedContext.includes("post") || combinedContext.includes("carousel") || combinedContext.includes("feed"))) {
        detectedType = "instagram_post";
      } else if (combinedContext.includes("instagram") && combinedContext.includes("story")) {
        detectedType = "instagram_story";
      } else if (combinedContext.includes("instagram") && combinedContext.includes("reel")) {
        detectedType = "instagram_reel";
      } else if (combinedContext.includes("linkedin") && combinedContext.includes("post")) {
        detectedType = "linkedin_post";
      } else if (combinedContext.includes("ad") || combinedContext.includes("banner") || combinedContext.includes("promotion")) {
        detectedType = "static_ad";
      }

      if (detectedType) {
        deliverableStyleMarker = {
          type: "initial",
          deliverableType: detectedType,
        };
        console.log(`[Chat API] Auto-detected deliverable type: ${detectedType}`);
      }
    }

    if (deliverableStyleMarker) {
      const { type, deliverableType, styleAxis } = deliverableStyleMarker;
      // Normalize deliverable type in case AI generated an alias
      const normalizedType = normalizeDeliverableType(deliverableType);

      try {
        switch (type) {
          case "initial":
            // SKIP showing styles if moodboard already has style items
            // This prevents the style grid from appearing 5+ times in a conversation
            if (moodboardHasStyles) {
              console.log("[Chat API] Skipping style grid - moodboard already has styles");
              deliverableStyleMarker = undefined; // Clear the marker so no grid is shown
              break;
            }
            // Use brand-aware styles with one per axis, sorted by brand match
            deliverableStyles = await getBrandAwareStyles(
              normalizedType,
              session.user.id,
              { includeAllAxes: true }
            );
            break;
          case "more":
            deliverableStyles = await getBrandAwareStylesOfAxis(
              normalizedType,
              styleAxis as StyleAxis,
              session.user.id,
              styleOffset || 0
            );
            break;
          case "different":
            deliverableStyles = await getBrandAwareStyles(
              normalizedType,
              session.user.id,
              { includeAllAxes: true, limit: 4 }
            );
            // Filter out excluded axes
            if (excludeStyleAxes?.length) {
              deliverableStyles = deliverableStyles.filter(
                s => !excludeStyleAxes.includes(s.styleAxis)
              );
            }
            break;
          case "semantic":
            // Use semantic search based on the query
            const { searchQuery } = deliverableStyleMarker;
            if (searchQuery) {
              // First try keyword-based semantic search
              const semanticResults = await searchStylesByQuery(
                searchQuery,
                normalizedType,
                8
              );

              // If we get good results, use them; otherwise fall back to AI-enhanced search
              if (semanticResults.length >= 3 && semanticResults[0].semanticScore >= 40) {
                deliverableStyles = semanticResults.map(s => ({
                  ...s,
                  brandMatchScore: s.semanticScore,
                  matchReason: s.matchedKeywords.length > 0
                    ? `Matches: ${s.matchedKeywords.slice(0, 3).join(", ")}`
                    : "Semantic match",
                }));
              } else {
                // Use AI-enhanced search for complex queries
                const aiResults = await aiEnhancedStyleSearch(
                  searchQuery,
                  normalizedType,
                  6
                );
                deliverableStyles = aiResults.map(s => ({
                  ...s,
                  brandMatchScore: s.semanticScore,
                  matchReason: "AI-matched to your description",
                }));
              }
            }
            break;
          case "refine":
            // Use style refinement based on base style and user feedback
            const { baseStyleId, refinementQuery } = deliverableStyleMarker;
            if (baseStyleId && refinementQuery) {
              // First, get the base style's details (can be ID or name)
              const { db } = await import("@/db");
              const { deliverableStyleReferences } = await import("@/db/schema");
              const { eq, ilike } = await import("drizzle-orm");

              // Try to find by ID first, then by name
              let baseStyles = await db
                .select()
                .from(deliverableStyleReferences)
                .where(eq(deliverableStyleReferences.id, baseStyleId))
                .limit(1);

              // If not found by ID, try by name (case-insensitive)
              if (baseStyles.length === 0) {
                baseStyles = await db
                  .select()
                  .from(deliverableStyleReferences)
                  .where(ilike(deliverableStyleReferences.name, `%${baseStyleId}%`))
                  .limit(1);
              }

              if (baseStyles.length > 0) {
                const baseStyle = baseStyles[0];
                const refinedResults = await refineStyleSearch(
                  {
                    id: baseStyle.id,
                    name: baseStyle.name,
                    styleAxis: baseStyle.styleAxis,
                    semanticTags: baseStyle.semanticTags || [],
                    description: baseStyle.description,
                  },
                  refinementQuery,
                  normalizedType,
                  6
                );

                deliverableStyles = refinedResults.map(s => ({
                  ...s,
                  brandMatchScore: s.semanticScore,
                  matchReason: `Refined: ${s.matchedKeywords.slice(0, 2).join(", ") || "based on your feedback"}`,
                }));
              } else {
                // Base style not found, fall back to semantic search
                const fallbackResults = await searchStylesByQuery(
                  refinementQuery,
                  normalizedType,
                  6
                );
                deliverableStyles = fallbackResults.map(s => ({
                  ...s,
                  brandMatchScore: s.semanticScore,
                  matchReason: "Matched to your refinement",
                }));
              }
            }
            break;
        }
      } catch (err) {
        console.error("Error fetching deliverable styles:", err);
      }
    }

    return NextResponse.json({
      content: response.content.replace(/\[TASK_READY\][\s\S]*?\[\/TASK_READY\]/, "").trim(),
      taskProposal,
      styleReferences,
      deliverableStyles,
      deliverableStyleMarker,
      selectedStyles,
      quickOptions: response.quickOptions,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}

// Apply chat rate limiting (30 req/min)
export const POST = withRateLimit(handler, "chat", config.rateLimits.chat);
