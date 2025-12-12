import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { chat, parseTaskFromChat, getStyleReferencesByCategory } from "@/lib/ai/chat";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { messages, selectedStyles } = body;

    // Get AI response
    const response = await chat(messages, session.user.id);

    // Check if a task proposal was generated
    const taskProposal = parseTaskFromChat(response.content);

    // Get style reference images if categories were mentioned
    let styleReferences = undefined;
    if (response.styleReferences && response.styleReferences.length > 0) {
      styleReferences = await getStyleReferencesByCategory(response.styleReferences);
    }

    return NextResponse.json({
      content: response.content.replace(/\[TASK_READY\][\s\S]*?\[\/TASK_READY\]/, "").trim(),
      taskProposal,
      styleReferences,
      selectedStyles,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
