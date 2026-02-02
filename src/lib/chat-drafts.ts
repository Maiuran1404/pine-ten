// Chat drafts storage - uses server API with localStorage fallback for offline

export interface MoodboardItemData {
  id: string;
  type: 'style' | 'color' | 'image' | 'upload';
  imageUrl: string;
  name: string;
  metadata?: {
    styleAxis?: string;
    deliverableType?: string;
    colorSamples?: string[];
    styleId?: string;
  };
  order: number;
  addedAt: string;
}

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
    quickOptions?: {
      question: string;
      options: string[];
      multiSelect?: boolean;
    };
  }[];
  selectedStyles: string[];
  moodboardItems?: MoodboardItemData[];
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

// Deduplicate drafts with similar titles created around the same time
function deduplicateDrafts(drafts: ChatDraft[]): ChatDraft[] {
  const seen = new Map<string, ChatDraft>();

  for (const draft of drafts) {
    // Create a key based on title (without the time suffix) and approximate creation time
    // Strip the time/date suffix (e.g., " · 12:46 pm" or " · Jan 20")
    const titleBase = draft.title.replace(/\s*·\s*[\d:apm]+\s*$/i, "").replace(/\s*·\s*\w+\s+\d+\s*$/i, "").trim();

    // Get creation time rounded to nearest 5 minutes
    const createdTime = draft.createdAt ? new Date(draft.createdAt).getTime() : 0;
    const roundedTime = Math.floor(createdTime / (5 * 60 * 1000));

    const key = `${titleBase}_${roundedTime}`;

    // Keep the first one (most recent since drafts are sorted)
    if (!seen.has(key)) {
      seen.set(key, draft);
    }
  }

  return Array.from(seen.values());
}

// Sync functions
export function getDrafts(): ChatDraft[] {
  const drafts = getLocalDrafts();
  const dedupedDrafts = deduplicateDrafts(drafts);

  // If we removed duplicates, save the cleaned list
  if (dedupedDrafts.length < drafts.length) {
    setLocalDrafts(dedupedDrafts);
  }

  return dedupedDrafts;
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

  // NOTE: Server sync disabled temporarily - was causing duplicate entries
  // because server assigns new UUIDs to local draft IDs, creating multiple entries.
  // To re-enable: uncomment the line below and fix the ID reconciliation logic.
  // syncDraftToServer(draft).catch(console.error);
}

export function deleteDraft(id: string): void {
  // Update local storage immediately
  const drafts = getLocalDrafts();
  const filtered = drafts.filter((d) => d.id !== id);
  setLocalDrafts(filtered);

  // NOTE: Server sync disabled - see saveDraft comment
  // deleteDraftFromServer(id).catch(console.error);
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
  // Generate proper UUID for database compatibility
  // crypto.randomUUID() is available in modern browsers and Node.js 19+
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments - generates UUID v4 format
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateDraftTitle(
  messages: { role: string; content: string }[],
  moodboardItems?: MoodboardItemData[],
  createdAt?: string
): string {
  // Try to extract key info from conversation
  const userMessages = messages.filter((m) => m.role === "user");

  if (userMessages.length === 0) {
    return "New Request";
  }

  // Get first meaningful user message
  const firstMessage = userMessages[0].content;

  // Extract key terms for a more meaningful title
  const deliverableTypes = [
    "instagram", "linkedin", "facebook", "twitter", "tiktok",
    "post", "story", "reel", "carousel", "ad", "banner",
    "logo", "brand", "video"
  ];

  const purposeWords = [
    "launch", "announcement", "promotion", "sale", "event",
    "campaign", "marketing", "showcase", "reveal", "update"
  ];

  const lowerContent = firstMessage.toLowerCase();

  // Find deliverable type mentioned
  const foundType = deliverableTypes.find((t) => lowerContent.includes(t));

  // Find purpose mentioned
  const foundPurpose = purposeWords.find((p) => lowerContent.includes(p));

  // Build a smart title
  let title = "";

  if (foundType && foundPurpose) {
    // Capitalize first letters
    const typeCapitalized = foundType.charAt(0).toUpperCase() + foundType.slice(1);
    const purposeCapitalized = foundPurpose.charAt(0).toUpperCase() + foundPurpose.slice(1);
    title = `${typeCapitalized} - ${purposeCapitalized}`;
  } else if (foundType) {
    const typeCapitalized = foundType.charAt(0).toUpperCase() + foundType.slice(1);
    title = `${typeCapitalized} Design`;
  } else {
    // Fall back to truncated first message
    title = firstMessage.length > 40 ? firstMessage.substring(0, 37) + "..." : firstMessage;
  }

  // Try to extract product/brand name or key subject for more specificity
  // Look for quoted text, capitalized words, or specific nouns
  const quotedMatch = firstMessage.match(/"([^"]+)"|'([^']+)'/);
  const keySubject = quotedMatch ? (quotedMatch[1] || quotedMatch[2]) : null;

  // Add key subject if found and short enough
  if (keySubject && keySubject.length < 20 && !title.toLowerCase().includes(keySubject.toLowerCase())) {
    title = `${title} - ${keySubject}`;
  }

  // Add moodboard style info if available for uniqueness (only if no key subject)
  if (!keySubject && moodboardItems && moodboardItems.length > 0) {
    const firstStyle = moodboardItems[0];
    if (firstStyle.metadata?.styleAxis) {
      const axis = firstStyle.metadata.styleAxis.charAt(0).toUpperCase() +
        firstStyle.metadata.styleAxis.slice(1).replace(/_/g, " ");
      // Only add if it doesn't make title too long
      if (title.length + axis.length < 50) {
        title = `${title} (${axis})`;
      }
    }
  }

  // Add short date for uniqueness (e.g., "Jan 20" or "10:30am" if today)
  const date = createdAt ? new Date(createdAt) : new Date();
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    // Show time if created today (e.g., "2:30pm")
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).toLowerCase();
    title = `${title} · ${timeStr}`;
  } else {
    // Show date (e.g., "Jan 20")
    const dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    title = `${title} · ${dateStr}`;
  }

  return title;
}
