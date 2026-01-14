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
          deliverableStyles = await getMoreOfStyle(
            deliverableType as DeliverableType,
            styleAxis as StyleAxis,
            styleOffset || 0
          );
        } else if (type === "different") {
          deliverableStyles = await getDifferentStyles(
            deliverableType as DeliverableType,
            excludeStyleAxes || []
          );
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
    let deliverableStyles = undefined;
    if (response.deliverableStyleMarker) {
      const { type, deliverableType, styleAxis } = response.deliverableStyleMarker;

      try {
        switch (type) {
          case "initial":
            deliverableStyles = await getInitialDeliverableStyles(
              deliverableType as DeliverableType
            );
            break;
          case "more":
            deliverableStyles = await getMoreOfStyle(
              deliverableType as DeliverableType,
              styleAxis as StyleAxis,
              styleOffset || 0
            );
            break;
          case "different":
            deliverableStyles = await getDifferentStyles(
              deliverableType as DeliverableType,
              excludeStyleAxes || []
            );
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
