import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { chatDrafts, tasks, users, deliverableStyleReferences } from "@/db/schema";
import { requireAdmin } from "@/lib/require-auth";
import { desc, eq, or, ilike, sql, inArray } from "drizzle-orm";
import { logger } from "@/lib/logger";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  attachments?: {
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }[];
}

interface ChatLog {
  id: string;
  type: "draft" | "task";
  userId: string;
  userName: string;
  userEmail: string;
  userImage: string | null;
  title: string;
  messages: ChatMessage[];
  selectedStyles: string[];
  styleDetails?: {
    id: string;
    name: string;
    imageUrl: string;
    deliverableType: string;
    styleAxis: string;
  }[];
  taskStatus?: string;
  pendingTask?: {
    title: string;
    description: string;
    category: string;
    creditsRequired: number;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") || "all"; // all, draft, task
    const search = searchParams.get("search") || "";
    const offset = (page - 1) * limit;

    const logs: ChatLog[] = [];

    // Fetch drafts if needed
    if (status === "all" || status === "draft") {
      let draftsQuery = db
        .select({
          id: chatDrafts.id,
          clientId: chatDrafts.clientId,
          title: chatDrafts.title,
          messages: chatDrafts.messages,
          selectedStyles: chatDrafts.selectedStyles,
          pendingTask: chatDrafts.pendingTask,
          createdAt: chatDrafts.createdAt,
          updatedAt: chatDrafts.updatedAt,
          userName: users.name,
          userEmail: users.email,
          userImage: users.image,
        })
        .from(chatDrafts)
        .leftJoin(users, eq(chatDrafts.clientId, users.id))
        .orderBy(desc(chatDrafts.updatedAt));

      if (search) {
        draftsQuery = draftsQuery.where(
          or(
            ilike(users.name, `%${search}%`),
            ilike(users.email, `%${search}%`),
            ilike(chatDrafts.title, `%${search}%`)
          )
        ) as typeof draftsQuery;
      }

      const draftsResult = await draftsQuery;

      for (const draft of draftsResult) {
        logs.push({
          id: draft.id,
          type: "draft",
          userId: draft.clientId,
          userName: draft.userName || "Unknown",
          userEmail: draft.userEmail || "",
          userImage: draft.userImage,
          title: draft.title,
          messages: (draft.messages as ChatMessage[]) || [],
          selectedStyles: (draft.selectedStyles as string[]) || [],
          pendingTask: draft.pendingTask as ChatLog["pendingTask"],
          createdAt: draft.createdAt,
          updatedAt: draft.updatedAt,
        });
      }
    }

    // Fetch tasks with chat history if needed
    if (status === "all" || status === "task") {
      let tasksQuery = db
        .select({
          id: tasks.id,
          clientId: tasks.clientId,
          title: tasks.title,
          chatHistory: tasks.chatHistory,
          styleReferences: tasks.styleReferences,
          status: tasks.status,
          createdAt: tasks.createdAt,
          updatedAt: tasks.updatedAt,
          userName: users.name,
          userEmail: users.email,
          userImage: users.image,
        })
        .from(tasks)
        .leftJoin(users, eq(tasks.clientId, users.id))
        .orderBy(desc(tasks.updatedAt));

      if (search) {
        tasksQuery = tasksQuery.where(
          or(
            ilike(users.name, `%${search}%`),
            ilike(users.email, `%${search}%`),
            ilike(tasks.title, `%${search}%`)
          )
        ) as typeof tasksQuery;
      }

      const tasksResult = await tasksQuery;

      for (const task of tasksResult) {
        // Only include tasks that have chat history
        const chatHistory = task.chatHistory as ChatMessage[] | null;
        if (chatHistory && chatHistory.length > 0) {
          logs.push({
            id: task.id,
            type: "task",
            userId: task.clientId,
            userName: task.userName || "Unknown",
            userEmail: task.userEmail || "",
            userImage: task.userImage,
            title: task.title,
            messages: chatHistory,
            selectedStyles: (task.styleReferences as string[]) || [],
            taskStatus: task.status,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
          });
        }
      }
    }

    // Sort combined logs by updatedAt
    logs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    // Collect all style IDs to fetch details
    const allStyleIds = [...new Set(logs.flatMap((log) => log.selectedStyles))];

    // Fetch style details if there are any
    let styleDetailsMap: Record<string, {
      id: string;
      name: string;
      imageUrl: string;
      deliverableType: string;
      styleAxis: string;
    }> = {};

    if (allStyleIds.length > 0) {
      const styleDetails = await db
        .select({
          id: deliverableStyleReferences.id,
          name: deliverableStyleReferences.name,
          imageUrl: deliverableStyleReferences.imageUrl,
          deliverableType: deliverableStyleReferences.deliverableType,
          styleAxis: deliverableStyleReferences.styleAxis,
        })
        .from(deliverableStyleReferences)
        .where(inArray(deliverableStyleReferences.id, allStyleIds));

      styleDetailsMap = Object.fromEntries(
        styleDetails.map((s) => [s.id, s])
      );
    }

    // Add style details to each log
    const logsWithStyleDetails = logs.map((log) => ({
      ...log,
      styleDetails: log.selectedStyles
        .map((id) => styleDetailsMap[id])
        .filter(Boolean),
    }));

    // Apply pagination to combined results
    const total = logsWithStyleDetails.length;
    const paginatedLogs = logsWithStyleDetails.slice(offset, offset + limit);

    // Calculate stats
    const totalDrafts = logs.filter((l) => l.type === "draft").length;
    const totalTasks = logs.filter((l) => l.type === "task").length;
    const totalMessages = logs.reduce((sum, l) => sum + l.messages.length, 0);
    const avgMessages = total > 0 ? Math.round(totalMessages / total) : 0;

    return NextResponse.json({
      logs: paginatedLogs,
      total,
      page,
      limit,
      stats: {
        total,
        drafts: totalDrafts,
        tasks: totalTasks,
        avgMessages,
      },
    });
  } catch (error) {
    logger.error({ error }, "Error fetching chat logs");
    return NextResponse.json(
      { error: "Failed to fetch chat logs" },
      { status: 500 }
    );
  }
}
