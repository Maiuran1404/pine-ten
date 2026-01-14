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
      deliverableStyleMarker: clientStyleMarker
    } = body;

    // If client is requesting more/different styles directly, skip AI call
    if (clientStyleMarker && (clientStyleMarker.type === "more" || clientStyleMarker.type === "different")) {
      let deliverableStyles = undefined;
      const { type, deliverableType, styleAxis } = clientStyleMarker;

      try {
        if (type === "more" && styleAxis) {
          // Use brand-aware scoring for more styles
          deliverableStyles = await getBrandAwareStylesOfAxis(
            deliverableType as DeliverableType,
            styleAxis as StyleAxis,
            session.user.id,
            styleOffset || 0
          );
        } else if (type === "different") {
          // For different styles, get brand-aware styles excluding already shown axes
          deliverableStyles = await getBrandAwareStyles(
            deliverableType as DeliverableType,
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
    if (response.deliverableStyleMarker) {
      const { type, deliverableType, styleAxis } = response.deliverableStyleMarker;

      try {
        switch (type) {
          case "initial":
            // Use brand-aware styles with one per axis, sorted by brand match
            deliverableStyles = await getBrandAwareStyles(
              deliverableType as DeliverableType,
              session.user.id,
              { includeAllAxes: true }
            );
            break;
          case "more":
            deliverableStyles = await getBrandAwareStylesOfAxis(
              deliverableType as DeliverableType,
              styleAxis as StyleAxis,
              session.user.id,
              styleOffset || 0
            );
            break;
          case "different":
            deliverableStyles = await getBrandAwareStyles(
              deliverableType as DeliverableType,
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
            const { searchQuery } = response.deliverableStyleMarker;
            if (searchQuery) {
              // First try keyword-based semantic search
              const semanticResults = await searchStylesByQuery(
                searchQuery,
                deliverableType as DeliverableType,
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
                  deliverableType as DeliverableType,
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
            const { baseStyleId, refinementQuery } = response.deliverableStyleMarker;
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
                  deliverableType as DeliverableType,
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
                  deliverableType as DeliverableType,
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
      deliverableStyleMarker: response.deliverableStyleMarker,
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
