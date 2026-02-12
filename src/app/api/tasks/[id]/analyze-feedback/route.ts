import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "@/lib/logger";
import { analyzeFeedbackSchema } from "@/lib/validations";
import { handleZodError } from "@/lib/errors";
import { ZodError } from "zod";

const anthropic = new Anthropic();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { feedback, originalRequirements, description } = analyzeFeedbackSchema.parse(body);

    // Get the task
    const taskResult = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);

    if (!taskResult.length) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const task = taskResult[0];

    // Only the client who owns the task can analyze feedback
    if (task.clientId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If no revisions left, everything is extra
    if (task.revisionsUsed >= task.maxRevisions) {
      return NextResponse.json({
        isRevision: false,
        reason: "You have used all your included revisions. Any additional changes will require extra credits.",
        estimatedCredits: 1,
      });
    }

    // Use AI to analyze the feedback
    const analysisPrompt = `You are an expert at analyzing client feedback for design tasks. Determine if the feedback is a revision (minor changes to the existing work) or new scope (significant new work beyond the original request).

ORIGINAL TASK DESCRIPTION:
${description}

ORIGINAL REQUIREMENTS:
${JSON.stringify(originalRequirements, null, 2)}

CLIENT FEEDBACK:
${feedback}

Analyze whether this feedback is:
1. A REVISION: Minor adjustments, fixes, or tweaks to the delivered work (e.g., color changes, text edits, repositioning elements, fixing errors, style adjustments)
2. NEW SCOPE: Significant new work or features not in the original request (e.g., additional deliverables, new designs, completely different direction, adding new platforms/formats)

Respond with JSON only:
{
  "isRevision": true/false,
  "reason": "Brief explanation (1-2 sentences)",
  "estimatedCredits": number (only if not a revision, estimate 1-3 based on scope)
}`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: analysisPrompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === "text") {
        // Parse the JSON response
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          return NextResponse.json({
            isRevision: analysis.isRevision,
            reason: analysis.reason,
            estimatedCredits: analysis.estimatedCredits || undefined,
          });
        }
      }

      // Fallback if parsing fails
      return NextResponse.json({
        isRevision: true,
        reason: "This appears to be a revision request based on the original scope.",
      });
    } catch (aiError) {
      logger.error({ error: aiError }, "AI analysis error");
      // Default to treating as revision if AI fails
      return NextResponse.json({
        isRevision: true,
        reason: "Unable to analyze - treating as standard revision request.",
      });
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    logger.error({ error }, "Feedback analysis error");
    return NextResponse.json(
      { error: "Failed to analyze feedback" },
      { status: 500 }
    );
  }
}
