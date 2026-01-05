// Chat drafts storage - uses server API with localStorage fallback for offline

export interface ChatDraft {
  id: string;
  title: string;
  messages: {
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
  }[];
  selectedStyles: string[];
  pendingTask: {
    title: string;
    description: string;
    category: string;
    estimatedHours: number;
    deliveryDays?: number;
    creditsRequired: number;
    deadline?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

const DRAFTS_KEY = "crafted_chat_drafts";

// Local storage functions (for immediate UI updates)
function getLocalDrafts(): ChatDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const drafts = localStorage.getItem(DRAFTS_KEY);
    if (!drafts) return [];
    return JSON.parse(drafts);
  } catch {
    return [];
  }
}

function setLocalDrafts(drafts: ChatDraft[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
    // Dispatch custom event to notify sidebar of changes
    window.dispatchEvent(new CustomEvent("drafts-updated"));
  } catch {
    console.error("Failed to save drafts to localStorage");
  }
}

// Sync functions
export function getDrafts(): ChatDraft[] {
  return getLocalDrafts();
}

export function getDraft(id: string): ChatDraft | null {
  const drafts = getLocalDrafts();
  return drafts.find((d) => d.id === id) || null;
}

export function saveDraft(draft: ChatDraft): void {
  // Update local storage immediately for responsive UI
  const drafts = getLocalDrafts();
  const existingIndex = drafts.findIndex((d) => d.id === draft.id);

  if (existingIndex >= 0) {
    drafts[existingIndex] = draft;
  } else {
    drafts.unshift(draft);
  }

  setLocalDrafts(drafts.slice(0, 10));

  // Sync to server in background
  syncDraftToServer(draft).catch(console.error);
}

export function deleteDraft(id: string): void {
  // Update local storage immediately
  const drafts = getLocalDrafts();
  const filtered = drafts.filter((d) => d.id !== id);
  setLocalDrafts(filtered);

  // Delete from server in background
  deleteDraftFromServer(id).catch(console.error);
}

// Server sync functions
async function syncDraftToServer(draft: ChatDraft): Promise<void> {
  try {
    const response = await fetch("/api/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: draft.id,
        title: draft.title,
        messages: draft.messages,
        selectedStyles: draft.selectedStyles,
        pendingTask: draft.pendingTask,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      // If server created a new draft with a different ID (UUID), update local storage
      if (data.localId && data.draft?.id && data.localId !== data.draft.id) {
        const drafts = getLocalDrafts();
        const index = drafts.findIndex((d) => d.id === data.localId);
        if (index >= 0) {
          drafts[index].id = data.draft.id;
          setLocalDrafts(drafts);
        }
      }
    }
  } catch (error) {
    console.error("Failed to sync draft to server:", error);
  }
}

async function deleteDraftFromServer(id: string): Promise<void> {
  try {
    await fetch(`/api/drafts?id=${id}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error("Failed to delete draft from server:", error);
  }
}

// Fetch drafts from server and sync to local
export async function fetchAndSyncDrafts(): Promise<ChatDraft[]> {
  try {
    const response = await fetch("/api/drafts");
    if (!response.ok) throw new Error("Failed to fetch");

    const data = await response.json();
    const serverDrafts: ChatDraft[] = data.drafts.map((d: Record<string, unknown>) => ({
      id: d.id,
      title: d.title,
      messages: d.messages,
      selectedStyles: d.selectedStyles,
      pendingTask: d.pendingTask,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));

    // Update local storage with server data
    setLocalDrafts(serverDrafts);
    return serverDrafts;
  } catch (error) {
    console.error("Failed to fetch drafts from server:", error);
    return getLocalDrafts();
  }
}

export function generateDraftId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export function generateDraftTitle(messages: { role: string; content: string }[]): string {
  const firstUserMessage = messages.find((m) => m.role === "user");
  if (firstUserMessage) {
    const content = firstUserMessage.content;
    return content.length > 50 ? content.substring(0, 47) + "..." : content;
  }
  return "New Request";
}
