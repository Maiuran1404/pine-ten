import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Anthropic from "@anthropic-ai/sdk";
import type {
  ServiceType,
  IntakeMessage,
  GenericIntakeData,
} from "@/lib/creative-intake/types";
import { getSystemPrompt, parseIntakeResponse } from "@/lib/creative-intake/prompts";
import { getFlowStep, getNextStep, applySmartDefaults } from "@/lib/creative-intake/flow-config";
import { logger } from "@/lib/logger";

const anthropic = new Anthropic();

interface IntakeRequest {
  serviceType: ServiceType;
  currentStep: string;
  messages: IntakeMessage[];
  userMessage: string;
  currentData: GenericIntakeData;
}

/**
 * POST /api/creative-intake
 *
 * Process a user message in the creative intake flow.
 * Uses Claude to understand the message and extract relevant data.
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body: IntakeRequest = await req.json();
    const { serviceType, currentStep, messages, userMessage, currentData } = body;

    if (!serviceType || !currentStep || !userMessage) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get system prompt for this service
    const systemPrompt = getSystemPrompt(serviceType);

    // Build conversation history for Claude
    const conversationHistory = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // Add the new user message
    conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    // Get current step config
    const stepConfig = getFlowStep(serviceType, currentStep);

    // Build context about current state
    const contextInfo = `
Current intake state:
- Service: ${serviceType}
- Current step: ${currentStep}
- Data collected so far: ${JSON.stringify(currentData, null, 2)}
${stepConfig?.requiredFields ? `- Required fields for this step: ${stepConfig.requiredFields.join(", ")}` : ""}

Based on the user's message, extract any relevant information and guide them to the next step.
If this is the final step, generate a summary of all collected information.
`;

    // Call Claude
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: `${systemPrompt}\n\n${contextInfo}`,
      messages: conversationHistory,
    });

    // Extract text response
    const textContent = response.content.find((c) => c.type === "text");
    const responseText = textContent?.text || "";

    // Parse the response to extract structured data
    const parsed = parseIntakeResponse(responseText);

    // Extract data from user message
    const extractedData = extractDataFromMessage(
      serviceType,
      currentStep,
      userMessage,
      currentData
    );

    // Determine next step
    const updatedData = { ...currentData, ...extractedData };
    const nextStepId = getNextStep(serviceType, currentStep, updatedData);

    // Apply smart defaults
    const dataWithDefaults = applySmartDefaults(serviceType, updatedData);

    return NextResponse.json({
      response: responseText,
      extractedData: extractedData,
      nextStep: nextStepId,
      parsed,
      dataWithDefaults,
    });
  } catch (error) {
    logger.error({ error }, "Creative intake error");
    return NextResponse.json(
      { error: "Failed to process intake message" },
      { status: 500 }
    );
  }
}

/**
 * Extract structured data from user message based on service type and step
 */
function extractDataFromMessage(
  serviceType: ServiceType,
  currentStep: string,
  message: string,
  _existingData: GenericIntakeData
): GenericIntakeData {
  const extracted: GenericIntakeData = {};
  const lowerMessage = message.toLowerCase();

  // Service-specific extraction
  switch (serviceType) {
    case "launch_video": {
      // Context step: Extract product description and key message
      if (currentStep === "context") {
        // Try to extract the product description (first part of response)
        const parts = message.split(/(?:the (?:one|key) thing|main message|most important)/i);
        if (parts.length >= 2) {
          extracted.productDescription = parts[0].trim();
          extracted.keyMessage = parts[1].trim();
        } else {
          // Use the whole message as product description
          extracted.productDescription = message;
        }
      }
      break;
    }

    case "video_edit": {
      // Extract video type from message
      if (currentStep === "video_type") {
        const videoTypes: Record<string, string[]> = {
          ugc: ["ugc", "user generated", "user-generated"],
          talking_head: ["talking head", "talking-head", "face to camera", "speaker"],
          screen_recording: ["screen", "screencast", "recording", "tutorial"],
          event: ["event", "conference", "meetup", "live"],
          podcast_clip: ["podcast", "interview", "conversation"],
        };

        for (const [type, keywords] of Object.entries(videoTypes)) {
          if (keywords.some((k: string) => lowerMessage.includes(k))) {
            extracted.videoType = type;
            break;
          }
        }
      }
      break;
    }

    case "pitch_deck": {
      // Extract deck link
      const linkMatch = message.match(
        /https?:\/\/[^\s]+(?:docs\.google|figma|dropbox|drive\.google|canva|notion|pitch|slides)/i
      ) || message.match(/https?:\/\/[^\s]+/);
      if (linkMatch) {
        extracted.currentDeckLink = linkMatch[0];
      }
      break;
    }

    case "social_ads": {
      // Extract goal from message
      if (currentStep === "product_goal") {
        const goalMatches: Record<string, string[]> = {
          sales: ["sales", "sell", "purchase", "buy", "revenue"],
          signups: ["signup", "sign up", "sign-up", "register", "registration"],
          awareness: ["awareness", "reach", "visibility", "brand"],
          leads: ["leads", "lead gen", "contact", "inquiries"],
        };

        for (const [goal, keywords] of Object.entries(goalMatches)) {
          if (keywords.some((k) => lowerMessage.includes(k))) {
            extracted.goal = goal;
            break;
          }
        }

        // Extract product/offer description
        // Remove the goal-related parts and use the rest
        const cleanedMessage = message
          .replace(/(?:drive|get|generate|increase|build)\s+(?:sales|signups|awareness|leads)/gi, "")
          .replace(/(?:my|the|our)\s+(?:main|primary)?\s*goal\s+is\s+(?:to)?/gi, "")
          .trim();
        if (cleanedMessage) {
          extracted.productOrOffer = cleanedMessage;
        }
      }
      break;
    }

    case "social_content": {
      // Extract platforms and goals from initial message
      if (currentStep === "platform_goal") {
        const platforms: string[] = [];
        const platformMatches: Record<string, string[]> = {
          instagram: ["instagram", "ig", "insta"],
          linkedin: ["linkedin"],
          tiktok: ["tiktok", "tik tok"],
          facebook: ["facebook", "fb"],
          twitter: ["twitter", "x.com"],
        };

        for (const [platform, keywords] of Object.entries(platformMatches)) {
          if (keywords.some((k) => lowerMessage.includes(k))) {
            platforms.push(platform);
          }
        }

        if (platforms.length > 0) {
          extracted.platforms = platforms;
        }

        // Extract goal
        const goalMatches: Record<string, string[]> = {
          authority: ["authority", "thought leader", "expert", "expertise"],
          trust: ["trust", "relationship", "connect"],
          growth: ["grow", "growth", "followers", "audience"],
          storytelling: ["story", "storytelling", "journey"],
        };

        for (const [goal, keywords] of Object.entries(goalMatches)) {
          if (keywords.some((k) => lowerMessage.includes(k))) {
            extracted.goal = goal;
            break;
          }
        }
      }

      // Extract topics
      if (currentStep === "topics") {
        // Split by common delimiters
        const topics = message
          .split(/[,;]|\band\b|\balso\b/i)
          .map((t) => t.trim())
          .filter((t) => t.length > 2 && t.length < 100);

        if (topics.length > 0) {
          extracted.topics = topics;
        }
      }
      break;
    }

    case "brand_package": {
      // Extract logo status
      if (currentStep === "logo_check") {
        extracted.hasLogo = lowerMessage.includes("yes") || lowerMessage.includes("have");
      }

      // Extract logo link
      if (currentStep === "logo_upload") {
        const linkMatch = message.match(/https?:\/\/[^\s]+/);
        if (linkMatch) {
          extracted.logoLink = linkMatch[0];
        }
      }
      break;
    }
  }

  // Common extractions across all services

  // Extract any links
  const genericLink = message.match(/https?:\/\/[^\s]+/);
  if (genericLink && !Object.keys(extracted).some((k) => k.includes("Link"))) {
    // Don't overwrite specific link extractions
  }

  return extracted;
}
