"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { TypingText } from "./typing-text";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSpinner } from "@/components/shared/loading";
import { CreditPurchaseDialog } from "@/components/shared/credit-purchase-dialog";
import { useSession } from "@/lib/auth-client";
import {
  Send,
  Check,
  X,
  Image as ImageIcon,
  Paperclip,
  FileIcon,
  XCircle,
  Trash2,
  Copy,
  Sparkles,
  Smile,
  MoreHorizontal,
  Quote,
  Calendar,
  Tag,
  FileText,
  Activity,
  ChevronRight,
  PanelRightClose,
  PanelRight,
  User,
  Clock,
  Info,
  Coins,
  RotateCcw,
  Package,
  Palette,
  CheckCircle2,
  AlertCircle,
  Timer,
  Download,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getDraft, saveDraft, deleteDraft, generateDraftTitle, type ChatDraft, type MoodboardItemData } from "@/lib/chat-drafts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  type UploadedFile,
  type QuickOptions as QuickOptionsType,
  type StyleReference,
  type DeliverableStyle,
  type DeliverableStyleMarker,
  type TaskProposal,
  type ChatMessage as Message,
  type MoodboardItem,
  type ChatStage,
  getDeliveryDateString,
} from "./types";
import { TaskProposalCard } from "./task-proposal-card";
import { FileAttachmentList } from "./file-attachment";
import { QuickOptions } from "./quick-options";
import { DeliverableStyleGrid } from "./deliverable-style-grid";
import { ChatLayout } from "./chat-layout";
import { StyleSelectionGrid } from "./style-selection-grid";
import { SimpleOptionChips } from "./option-chips";
import { TaskSubmissionModal } from "./task-submission-modal";
import { useMoodboard } from "@/lib/hooks/use-moodboard";
import { calculateChatStage } from "@/lib/chat-progress";

// Task data types for when viewing an active task
export interface TaskFile {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  isDeliverable: boolean;
  createdAt: string;
  uploadedBy: string;
}

export interface AssignedArtist {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

export interface TaskData {
  id: string;
  title: string;
  description: string;
  status: string;
  creditsUsed: number;
  maxRevisions: number;
  revisionsUsed: number;
  estimatedHours?: number | null;
  deadline?: string | null;
  assignedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  freelancer?: AssignedArtist | null;
  files?: TaskFile[];
  chatHistory?: Array<{
    role: string;
    content: string;
    timestamp: string;
    attachments?: UploadedFile[];
  }>;
}

interface ChatInterfaceProps {
  draftId: string;
  onDraftUpdate?: () => void;
  initialMessage?: string | null;
  seamlessTransition?: boolean;
  // Task mode props - when viewing an active task
  taskData?: TaskData | null;
  onTaskUpdate?: () => void;
  // Callback when a task is created (to update sidebar)
  onTaskCreated?: (taskId: string) => void;
}

const DEFAULT_WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi there! 👋 **What design project** can I help you get started with today?",
  timestamp: new Date(),
};

// Format relative time
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function ChatInterface({
  draftId,
  onDraftUpdate,
  initialMessage,
  seamlessTransition = false,
  taskData: initialTaskData,
  onTaskUpdate,
  onTaskCreated,
}: ChatInterfaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [taskData, setTaskData] = useState<TaskData | null>(initialTaskData || null);
  const [paymentProcessed, setPaymentProcessed] = useState(false);
  const [refreshedCredits, setRefreshedCredits] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([DEFAULT_WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingTask, setPendingTask] = useState<TaskProposal | null>(null);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedDeliverableStyles, setSelectedDeliverableStyles] = useState<string[]>([]);
  const [currentDeliverableType, setCurrentDeliverableType] = useState<string | null>(null);
  const [styleOffset, setStyleOffset] = useState<Record<string, number>>({});
  const [excludedStyleAxes, setExcludedStyleAxes] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [animatingMessageId, setAnimatingMessageId] = useState<string | null>(null);
  const [taskSubmitted, setTaskSubmitted] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dragCounterRef = useRef(0);

  // Moodboard state management
  const {
    items: moodboardItems,
    addItem: addMoodboardItem,
    removeItem: removeMoodboardItem,
    clearAll: clearMoodboard,
    hasItem: hasMoodboardItem,
    addFromStyle,
    addFromUpload,
  } = useMoodboard();

  // Calculate chat progress
  const progressState = useMemo(
    () =>
      calculateChatStage({
        messages,
        selectedStyles: [...selectedStyles, ...selectedDeliverableStyles],
        moodboardItems,
        pendingTask,
        taskSubmitted,
      }),
    [messages, selectedStyles, selectedDeliverableStyles, moodboardItems, pendingTask, taskSubmitted]
  );

  // Get moodboard style IDs for tracking what's already added
  const moodboardStyleIds = useMemo(
    () => moodboardItems.filter((i) => i.type === "style").map((i) => i.metadata?.styleId || ""),
    [moodboardItems]
  );

  // Track if we need to auto-continue
  const [needsAutoContinue, setNeedsAutoContinue] = useState(false);
  const [initialMessageProcessed, setInitialMessageProcessed] = useState(false);
  // Track if AI indicated readiness without formal [TASK_READY] block
  const [showManualSubmit, setShowManualSubmit] = useState(false);

  // Sync taskData state with initialTaskData prop when it changes
  useEffect(() => {
    if (initialTaskData) {
      setTaskData(initialTaskData);
    }
  }, [initialTaskData]);

  // Check if we're in task mode (viewing an active task)
  const isTaskMode = !!taskData;
  const assignedArtist = taskData?.freelancer;
  const deliverables = taskData?.files?.filter(f => f.isDeliverable) || [];
  const taskFiles = taskData?.files?.filter(f => !f.isDeliverable) || [];

  // Get user info
  const userName = session?.user?.name || "You";
  const userInitial = userName.charAt(0).toUpperCase();

  // Get all attachments from messages for the side panel
  const allAttachments = messages
    .filter((m) => m.attachments && m.attachments.length > 0)
    .flatMap((m) => m.attachments || [])
    .filter((file): file is NonNullable<typeof file> => file != null && file.fileUrl != null);

  // Load draft when draftId changes OR load task chat history when in task mode
  useEffect(() => {
    // If we're in task mode, load chat history from task data
    if (isTaskMode && taskData?.chatHistory) {
      const loadedMessages = taskData.chatHistory.map((m, idx) => ({
        id: `task-msg-${idx}`,
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: new Date(m.timestamp),
        attachments: m.attachments,
      }));
      // Ensure we have at least the welcome message
      if (loadedMessages.length === 0) {
        setMessages([DEFAULT_WELCOME_MESSAGE]);
      } else {
        setMessages(loadedMessages);
      }
      setIsInitialized(true);
      return;
    }

    // Regular draft loading
    const draft = getDraft(draftId);
    if (draft) {
      const loadedMessages = draft.messages.map((m) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
      setMessages(loadedMessages);
      setSelectedStyles(draft.selectedStyles);
      setPendingTask(draft.pendingTask);

      const lastMessage = loadedMessages[loadedMessages.length - 1];
      if (lastMessage && lastMessage.role === "user") {
        setNeedsAutoContinue(true);
      }
    } else {
      setMessages([DEFAULT_WELCOME_MESSAGE]);
      setSelectedStyles([]);
      setPendingTask(null);
    }
    setIsInitialized(true);
  }, [draftId, isTaskMode, taskData]);

  // Handle initial message from URL param
  useEffect(() => {
    if (!initialMessage || initialMessageProcessed || !isInitialized) return;

    setInitialMessageProcessed(true);

    let pendingFiles: UploadedFile[] = [];
    try {
      const storedFiles = sessionStorage.getItem("pending_chat_files");
      if (storedFiles) {
        pendingFiles = JSON.parse(storedFiles);
        sessionStorage.removeItem("pending_chat_files");
      }
    } catch {
      // Ignore parsing errors
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: initialMessage,
      timestamp: new Date(),
      attachments: pendingFiles.length > 0 ? pendingFiles : undefined,
    };

    // Always include user message - for seamless transition, prepend welcome message
    if (seamlessTransition) {
      setMessages([DEFAULT_WELCOME_MESSAGE, userMessage]);
    } else {
      setMessages((prev) => [...prev, userMessage]);
    }

    setNeedsAutoContinue(true);
  }, [initialMessage, initialMessageProcessed, isInitialized, seamlessTransition]);

  // Auto-continue conversation if last message was from user
  useEffect(() => {
    if (!needsAutoContinue || isLoading || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "user") return;

    setNeedsAutoContinue(false);

    const continueConversation = async () => {
      setIsLoading(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            selectedStyles,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get response");
        }

        const data = await response.json();

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.content,
          timestamp: new Date(),
          styleReferences: data.styleReferences,
          deliverableStyles: data.deliverableStyles,
          deliverableStyleMarker: data.deliverableStyleMarker,
          taskProposal: data.taskProposal,
          quickOptions: data.quickOptions,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setAnimatingMessageId(assistantMessage.id);

        if (data.taskProposal) {
          setPendingTask(data.taskProposal);
        }

        // Track deliverable type for pagination
        if (data.deliverableStyleMarker) {
          setCurrentDeliverableType(data.deliverableStyleMarker.deliverableType);
        }
      } catch {
        toast.error("Failed to continue conversation. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    continueConversation();
  }, [needsAutoContinue, isLoading, messages, selectedStyles]);

  // Store callback in ref to avoid infinite loops
  const onDraftUpdateRef = useRef(onDraftUpdate);
  useEffect(() => {
    onDraftUpdateRef.current = onDraftUpdate;
  }, [onDraftUpdate]);

  // Auto-save draft when messages change
  useEffect(() => {
    if (!isInitialized) return;
    if (messages.length <= 1 && messages[0]?.id === "welcome") return;

    const draft: ChatDraft = {
      id: draftId,
      title: generateDraftTitle(messages),
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
        attachments: m.attachments,
      })),
      selectedStyles,
      moodboardItems: moodboardItems.map((item) => ({
        id: item.id,
        type: item.type,
        imageUrl: item.imageUrl,
        name: item.name,
        metadata: item.metadata,
        order: item.order,
        addedAt: item.addedAt.toISOString(),
      })),
      pendingTask,
      createdAt: getDraft(draftId)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveDraft(draft);
    onDraftUpdateRef.current?.();
  }, [messages, selectedStyles, moodboardItems, pendingTask, draftId, isInitialized]);

  // Handle payment success - auto-confirm task after successful payment
  useEffect(() => {
    const payment = searchParams.get("payment");
    const creditsParam = searchParams.get("credits");

    if (payment === "success" && creditsParam && !paymentProcessed) {
      setPaymentProcessed(true);
      toast.success(`Successfully purchased ${creditsParam} credits!`);

      // Clean up URL params without navigation
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      url.searchParams.delete("credits");
      window.history.replaceState({}, "", url.toString());

      // Fetch fresh credits from database
      const fetchFreshCredits = async () => {
        try {
          const response = await fetch("/api/user/credits");
          if (response.ok) {
            const data = await response.json();
            setRefreshedCredits(data.credits);
          }
        } catch {
          // Ignore fetch errors
        }
      };

      // Check for pending task state that was saved before payment
      try {
        const savedState = sessionStorage.getItem("pending_task_state");
        if (savedState) {
          const { taskProposal } = JSON.parse(savedState);
          sessionStorage.removeItem("pending_task_state");

          // Restore pending task
          if (taskProposal) {
            setPendingTask(taskProposal);

            // Fetch fresh credits and notify user
            fetchFreshCredits().then(() => {
              toast.info("Your task is ready to submit. Click 'Confirm & Submit' to proceed.");
            });
          }
        } else {
          // Just fetch fresh credits even if no pending task
          fetchFreshCredits();
        }
      } catch {
        // Ignore parsing errors, still try to fetch credits
        fetchFreshCredits();
      }
    } else if (payment === "cancelled") {
      toast.info("Payment was cancelled");
      // Clean up URL params
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, paymentProcessed]);

  // Detect "ready to execute" patterns when AI doesn't generate [TASK_READY] block
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "assistant" && !pendingTask) {
      const readyPatterns = [
        /ready to execute/i,
        /ready to submit/i,
        /ready to move forward/i,
        /sound good to move forward/i,
        /shall i submit/i,
        /ready to proceed/i,
        /ready when you are/i,
        /good to go/i,
      ];

      const hasReadyIndicator = readyPatterns.some((p) =>
        p.test(lastMessage.content)
      );
      setShowManualSubmit(hasReadyIndicator);
    } else {
      setShowManualSubmit(false);
    }
  }, [messages, pendingTask]);

  // Helper function to scroll to bottom
  const scrollToBottom = useRef((smooth = false) => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      const target = viewport || scrollAreaRef.current;
      if (smooth) {
        target.scrollTo({ top: target.scrollHeight, behavior: 'smooth' });
      } else {
        target.scrollTop = target.scrollHeight;
      }
    }
  }).current;

  // Scroll to bottom when messages change or loading state changes
  useLayoutEffect(() => {
    // Use multiple frames to ensure content is fully rendered
    scrollToBottom();
    const frame1 = requestAnimationFrame(() => {
      scrollToBottom();
      const frame2 = requestAnimationFrame(() => {
        scrollToBottom();
      });
      return () => cancelAnimationFrame(frame2);
    });
    return () => cancelAnimationFrame(frame1);
  }, [messages, isLoading, scrollToBottom]);

  // File upload logic
  const uploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsUploading(true);

    try {
      const uploadPromises = fileArray.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "attachments");

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || errorData.message || "Upload failed");
        }

        const data = await response.json();
        // API returns { success: true, data: { file: {...} } }
        return (data.data?.file || data.file) as UploadedFile;
      });

      const newFiles = await Promise.all(uploadPromises);
      // Filter out any undefined/null files
      const validFiles = newFiles.filter((f): f is UploadedFile => !!f && !!f.fileUrl);
      setUploadedFiles((prev) => [...prev, ...validFiles]);

      // Auto-add image uploads to moodboard
      validFiles.forEach((file) => {
        if (file.fileType?.startsWith("image/")) {
          addFromUpload(file);
        }
      });

      toast.success(`${validFiles.length} file(s) uploaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload files");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadFiles(files);
    }
  };

  const removeFile = (fileUrl: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.fileUrl !== fileUrl));
  };

  const handleSend = async () => {
    if ((!input.trim() && uploadedFiles.length === 0) || isLoading) return;

    const currentFiles = [...uploadedFiles];
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input || (currentFiles.length > 0 ? `Attached ${currentFiles.length} file(s)` : ""),
      timestamp: new Date(),
      attachments: currentFiles.length > 0 ? currentFiles : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setUploadedFiles([]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          selectedStyles,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
        styleReferences: data.styleReferences,
        deliverableStyles: data.deliverableStyles,
        deliverableStyleMarker: data.deliverableStyleMarker,
        taskProposal: data.taskProposal,
        quickOptions: data.quickOptions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setAnimatingMessageId(assistantMessage.id);

      if (data.taskProposal) {
        setPendingTask(data.taskProposal);
      }
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Send a specific message (used for clickable options)
  const handleSendOption = async (optionText: string) => {
    if (isLoading || !optionText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: optionText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          selectedStyles,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
        styleReferences: data.styleReferences,
        deliverableStyles: data.deliverableStyles,
        deliverableStyleMarker: data.deliverableStyleMarker,
        taskProposal: data.taskProposal,
        quickOptions: data.quickOptions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setAnimatingMessageId(assistantMessage.id);

      if (data.taskProposal) {
        setPendingTask(data.taskProposal);
      }
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscard = () => {
    setInput("");
    setUploadedFiles([]);
  };

  const handleCopyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {
      toast.error("Failed to copy message");
    }
  };

  const handleStyleSelect = (styleName: string) => {
    setSelectedStyles((prev) =>
      prev.includes(styleName)
        ? prev.filter((s) => s !== styleName)
        : [...prev, styleName]
    );
  };

  const handleDeliverableStyleSelect = (style: DeliverableStyle) => {
    const isSelecting = !selectedDeliverableStyles.includes(style.id);

    setSelectedDeliverableStyles((prev) =>
      prev.includes(style.id)
        ? prev.filter((s) => s !== style.id)
        : [...prev, style.id]
    );

    // Auto-add to moodboard when selecting
    if (isSelecting && !hasMoodboardItem(style.id)) {
      addFromStyle(style);
    }

    // Record selection to history (fire-and-forget, don't block UI)
    if (isSelecting) {
      fetch("/api/style-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styleId: style.id,
          deliverableType: style.deliverableType,
          styleAxis: style.styleAxis,
          selectionContext: "chat",
          wasConfirmed: false,
          // Note: draftId not sent since local drafts aren't in database
        }),
      }).catch(err => console.error("Failed to record style selection:", err));
    }
  };

  // Handle adding style to moodboard without selecting
  const handleAddToMoodboard = (style: DeliverableStyle) => {
    if (!hasMoodboardItem(style.id)) {
      addFromStyle(style);
      toast.success(`Added "${style.name}" to moodboard`);
    }
  };

  const handleShowMoreStyles = async (styleAxis: string) => {
    if (!currentDeliverableType || isLoading) return;

    const currentOffset = styleOffset[styleAxis] || 0;
    const newOffset = currentOffset + 4;

    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          selectedStyles,
          styleOffset: newOffset,
          deliverableStyleMarker: {
            type: "more",
            deliverableType: currentDeliverableType,
            styleAxis,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get more styles");
      }

      const data = await response.json();

      if (data.deliverableStyles && data.deliverableStyles.length > 0) {
        // Update offset for this style axis
        setStyleOffset((prev) => ({
          ...prev,
          [styleAxis]: newOffset,
        }));

        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: `Here are more ${styleAxis} style options:`,
          timestamp: new Date(),
          deliverableStyles: data.deliverableStyles,
          deliverableStyleMarker: data.deliverableStyleMarker,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setAnimatingMessageId(assistantMessage.id);
      } else {
        toast.info("No more styles available in this direction");
      }
    } catch {
      toast.error("Failed to load more styles");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowDifferentStyles = async () => {
    if (!currentDeliverableType || isLoading) return;

    // Track which style axes we've already shown
    const lastMessage = messages.filter(m => m.deliverableStyles && m.deliverableStyles.length > 0).pop();
    const currentAxes = lastMessage?.deliverableStyles?.map(s => s.styleAxis) || [];
    const newExcludedAxes = [...new Set([...excludedStyleAxes, ...currentAxes])];

    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          selectedStyles,
          excludeStyleAxes: newExcludedAxes,
          deliverableStyleMarker: {
            type: "different",
            deliverableType: currentDeliverableType,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get different styles");
      }

      const data = await response.json();

      if (data.deliverableStyles && data.deliverableStyles.length > 0) {
        setExcludedStyleAxes(newExcludedAxes);

        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: "Here are some different style directions:",
          timestamp: new Date(),
          deliverableStyles: data.deliverableStyles,
          deliverableStyleMarker: data.deliverableStyleMarker,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setAnimatingMessageId(assistantMessage.id);
      } else {
        toast.info("No more style directions available");
        // Reset excluded axes to allow cycling through again
        setExcludedStyleAxes([]);
      }
    } catch {
      toast.error("Failed to load different styles");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitStyles = async () => {
    if (selectedStyles.length === 0 || isLoading) return;

    const styleMessage = selectedStyles.length === 1
      ? `I like the ${selectedStyles[0]} style`
      : `I like these styles: ${selectedStyles.join(", ")}`;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: styleMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          selectedStyles,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
        styleReferences: data.styleReferences,
        deliverableStyles: data.deliverableStyles,
        deliverableStyleMarker: data.deliverableStyleMarker,
        taskProposal: data.taskProposal,
        quickOptions: data.quickOptions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setAnimatingMessageId(assistantMessage.id);

      if (data.taskProposal) {
        setPendingTask(data.taskProposal);
      }

      if (data.deliverableStyleMarker) {
        setCurrentDeliverableType(data.deliverableStyleMarker.deliverableType);
      }
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitDeliverableStyles = async (deliverableStyles: Array<{ id: string; name: string }>) => {
    if (selectedDeliverableStyles.length === 0 || isLoading) return;

    const selectedStyleNames = deliverableStyles
      .filter(s => selectedDeliverableStyles.includes(s.id))
      .map(s => s.name);

    const styleMessage = selectedStyleNames.length === 1
      ? `I like the ${selectedStyleNames[0]} style`
      : `I like these styles: ${selectedStyleNames.join(", ")}`;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: styleMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          selectedDeliverableStyles,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
        styleReferences: data.styleReferences,
        deliverableStyles: data.deliverableStyles,
        deliverableStyleMarker: data.deliverableStyleMarker,
        taskProposal: data.taskProposal,
        quickOptions: data.quickOptions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setAnimatingMessageId(assistantMessage.id);

      if (data.taskProposal) {
        setPendingTask(data.taskProposal);
      }

      if (data.deliverableStyleMarker) {
        setCurrentDeliverableType(data.deliverableStyleMarker.deliverableType);
      }
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickOptionClick = async (option: string) => {
    if (isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: option,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          selectedStyles,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
        styleReferences: data.styleReferences,
        deliverableStyles: data.deliverableStyles,
        deliverableStyleMarker: data.deliverableStyleMarker,
        taskProposal: data.taskProposal,
        quickOptions: data.quickOptions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setAnimatingMessageId(assistantMessage.id);

      if (data.taskProposal) {
        setPendingTask(data.taskProposal);
      }

      if (data.deliverableStyleMarker) {
        setCurrentDeliverableType(data.deliverableStyleMarker.deliverableType);
      }
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Use refreshed credits if available (after payment), otherwise fall back to session credits
  const sessionCredits = (session?.user as { credits?: number } | undefined)?.credits || 0;
  const userCredits = refreshedCredits !== null ? refreshedCredits : sessionCredits;

  const handleConfirmTask = async () => {
    if (!pendingTask) return;

    if (userCredits < pendingTask.creditsRequired) {
      setShowCreditDialog(true);
      return;
    }

    setIsLoading(true);

    const allAttachments = messages
      .filter((m) => m.attachments && m.attachments.length > 0)
      .flatMap((m) => m.attachments || [])
      .filter((file) => file != null && file.fileUrl != null);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...pendingTask,
          chatHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
            attachments: m.attachments?.filter((a) => a != null),
          })),
          styleReferences: selectedStyles,
          attachments: allAttachments,
          moodboardItems: moodboardItems.map((item) => ({
            id: item.id,
            type: item.type,
            imageUrl: item.imageUrl,
            name: item.name,
            metadata: item.metadata,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || error.message || "Failed to create task");
      }

      const result = await response.json();
      const taskId = result.data.taskId;

      // Mark task as submitted for progress tracking
      setTaskSubmitted(true);

      // Delete draft
      deleteDraft(draftId);
      onDraftUpdate?.();

      // Add success message to chat
      const successMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `**Your task has been submitted!**\n\n${result.data.assignedTo ? `**${result.data.assignedTo}** has been assigned to work on your project.` : "We're finding the perfect artist for your project."} You'll receive updates as your design progresses.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMessage]);
      setAnimatingMessageId(successMessage.id);

      // Clear pending task UI
      setPendingTask(null);

      // Fetch the full task data to switch to task mode
      try {
        const taskResponse = await fetch(`/api/tasks/${taskId}`);
        if (taskResponse.ok) {
          const taskResult = await taskResponse.json();
          // Transform to TaskData format
          const fetchedTaskData: TaskData = {
            id: taskResult.task.id,
            title: taskResult.task.title,
            description: taskResult.task.description,
            status: taskResult.task.status,
            creditsUsed: taskResult.task.creditsUsed,
            maxRevisions: taskResult.task.maxRevisions,
            revisionsUsed: taskResult.task.revisionsUsed,
            estimatedHours: taskResult.task.estimatedHours,
            deadline: taskResult.task.deadline,
            assignedAt: taskResult.task.assignedAt,
            completedAt: taskResult.task.completedAt,
            createdAt: taskResult.task.createdAt,
            freelancer: taskResult.task.freelancer ? {
              id: taskResult.task.freelancer.id,
              name: taskResult.task.freelancer.name,
              email: "",
              image: taskResult.task.freelancer.image,
            } : null,
            files: taskResult.task.files,
            chatHistory: taskResult.task.chatHistory,
          };
          setTaskData(fetchedTaskData);
        }
      } catch {
        // Task was created but we couldn't fetch details - that's okay
      }

      // Dispatch event to notify sidebar to refresh tasks
      window.dispatchEvent(new CustomEvent("tasks-updated"));

      // Call the callback if provided
      onTaskCreated?.(taskId);

      // Update URL without navigation to reflect task ID
      window.history.replaceState({}, "", `/dashboard/tasks/${taskId}`);

      toast.success("Task created successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create task");
      throw error; // Re-throw for modal handling
    } finally {
      setIsLoading(false);
    }
  };

  // Open submission modal
  const handleOpenSubmissionModal = () => {
    if (!pendingTask) return;
    if (userCredits < pendingTask.creditsRequired) {
      setShowCreditDialog(true);
      return;
    }
    setShowSubmissionModal(true);
  };

  const handleRejectTask = () => {
    setPendingTask(null);
    const clarifyMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content:
        "No problem! What would you like to change? I can adjust the scope, timeline, or any other details.",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, clarifyMessage]);
    setAnimatingMessageId(clarifyMessage.id);
  };

  // Request formal task summary when AI says "ready" but didn't generate [TASK_READY]
  const handleRequestTaskSummary = async () => {
    if (isLoading) return;

    const requestMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: "Please generate the task summary so I can submit it.",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, requestMessage]);
    setShowManualSubmit(false);
    setNeedsAutoContinue(true);
  };

  // Generate smart chat title
  const getChatTitle = () => {
    if (messages.length <= 1) return null;

    const userMessages = messages.filter(m => m.role === "user");
    if (userMessages.length === 0) return null;

    const allUserContent = userMessages.map(m => m.content.toLowerCase()).join(" ");

    let contentType = "";
    if (allUserContent.includes("instagram stories") || allUserContent.includes("story")) {
      contentType = "Instagram Stories";
    } else if (allUserContent.includes("instagram") || allUserContent.includes("feed post")) {
      contentType = "Instagram Posts";
    } else if (allUserContent.includes("linkedin")) {
      contentType = "LinkedIn Content";
    } else if (allUserContent.includes("social media")) {
      contentType = "Social Media Content";
    } else if (allUserContent.includes("logo")) {
      contentType = "Logo Design";
    } else if (allUserContent.includes("video")) {
      contentType = "Video Content";
    } else if (allUserContent.includes("website") || allUserContent.includes("web")) {
      contentType = "Web Design";
    }

    let quantity = "";
    if (allUserContent.includes("series") || allUserContent.includes("multiple") || allUserContent.includes("pack")) {
      quantity = "Series";
    }

    if (contentType && quantity) {
      return `${contentType} ${quantity}`;
    } else if (contentType) {
      return contentType;
    }

    const content = userMessages[0].content;
    const contentStr = typeof content === 'string' ? content : String(content || 'New Request');
    return contentStr.length > 40 ? contentStr.substring(0, 40) + "..." : contentStr;
  };

  const chatTitle = seamlessTransition ? getChatTitle() : null;
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDeleteChat = () => {
    deleteDraft(draftId);
    onDraftUpdate?.();
    router.push("/dashboard");
  };

  // Format date for side panel
  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Format task status for display
  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      PENDING: { label: "Pending", color: "bg-yellow-500/10 text-yellow-500", icon: <Clock className="h-3 w-3" /> },
      ASSIGNED: { label: "Assigned", color: "bg-blue-500/10 text-blue-500", icon: <User className="h-3 w-3" /> },
      IN_PROGRESS: { label: "In Progress", color: "bg-primary/10 text-primary", icon: <Activity className="h-3 w-3" /> },
      PENDING_ADMIN_REVIEW: { label: "Under Review", color: "bg-orange-500/10 text-orange-500", icon: <AlertCircle className="h-3 w-3" /> },
      PENDING_REVIEW: { label: "Pending Review", color: "bg-purple-500/10 text-purple-500", icon: <Timer className="h-3 w-3" /> },
      REVISION_REQUESTED: { label: "Revision Requested", color: "bg-red-500/10 text-red-500", icon: <RotateCcw className="h-3 w-3" /> },
      COMPLETED: { label: "Completed", color: "bg-green-500/10 text-green-500", icon: <CheckCircle2 className="h-3 w-3" /> },
      CANCELLED: { label: "Cancelled", color: "bg-muted text-muted-foreground", icon: <X className="h-3 w-3" /> },
    };
    return statusMap[status] || { label: status, color: "bg-muted text-muted-foreground", icon: <Info className="h-3 w-3" /> };
  };

  // Get chat creation date (from first message or task creation date)
  const chatCreatedAt = isTaskMode && taskData?.createdAt
    ? new Date(taskData.createdAt)
    : messages.length > 0
      ? messages[0].timestamp
      : new Date();

  return (
    <ChatLayout
      currentStage={progressState.currentStage}
      completedStages={progressState.completedStages}
      progressPercentage={progressState.progressPercentage}
      moodboardItems={moodboardItems}
      onRemoveMoodboardItem={removeMoodboardItem}
      onClearMoodboard={clearMoodboard}
      showProgress={seamlessTransition && !isTaskMode}
      showMoodboard={seamlessTransition && !isTaskMode}
      className={cn(seamlessTransition ? "h-full" : "h-[calc(100vh-12rem)]")}
    >
      <div
        className="flex flex-col h-full relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-xl flex items-center justify-center"
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-primary" />
                </div>
                <p className="text-lg font-medium text-foreground">Drop files here</p>
                <p className="text-sm text-muted-foreground mt-1">Images, videos, PDFs, and more</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat header */}
        {seamlessTransition && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="shrink-0 mb-4 pb-4 border-b border-border flex items-center justify-between px-2"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-base font-medium text-foreground">{chatTitle || "New Design Request"}</h1>
                <p className="text-xs text-muted-foreground">Design Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                aria-label="Delete chat"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Delete confirmation dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="bg-card border-border max-w-md">
            <AlertDialogHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
                <Trash2 className="h-6 w-6 text-red-400" />
              </div>
              <AlertDialogTitle className="text-center text-foreground">Delete this chat?</AlertDialogTitle>
              <AlertDialogDescription className="text-center text-muted-foreground">
                This will permanently delete this conversation and all its messages. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-center gap-3 mt-4">
              <AlertDialogCancel className="bg-transparent border-border text-foreground hover:bg-muted hover:text-foreground">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteChat}
                className="bg-red-500 text-white hover:bg-red-600 border-0"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Messages - scrollable area */}
        <ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
          <div className="space-y-4 pb-4 px-2">
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={seamlessTransition && index > 0 ? { opacity: 0, y: 10 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" ? (
                    /* Assistant message - left aligned card */
                    <div className="group max-w-[85%]">
                      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                        {/* Quote icon */}
                        <div className="flex items-start gap-3 mb-3">
                          <Quote className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            {/* Message content with typing animation */}
                            <TypingText
                              content={message.content}
                              animate={animatingMessageId === message.id}
                              speed={25}
                              onComplete={() => {
                                if (animatingMessageId === message.id) {
                                  setAnimatingMessageId(null);
                                }
                              }}
                              onOptionClick={(option) => {
                                // When user clicks an option, send it as their response
                                if (!isLoading && !isUploading) {
                                  handleSendOption(option);
                                }
                              }}
                              className="prose prose-sm max-w-none dark:prose-invert [&>p]:mb-3 [&>ul]:mb-3 [&>ol]:mb-3 [&>p:last-child]:mb-0 text-foreground"
                            />
                          </div>
                        </div>

                        {/* Attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-3 ml-8">
                            <FileAttachmentList files={message.attachments} />
                          </div>
                        )}

                        {/* Style References */}
                        {message.styleReferences && message.styleReferences.length > 0 && (
                          <div className="mt-5 ml-8">
                            <p className="text-sm font-medium mb-4 text-foreground">
                              Which style direction resonates with you?
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
                              {message.styleReferences.slice(0, 3).map((style, idx) => (
                                <div
                                  key={`${style.name}-${idx}`}
                                  role="button"
                                  tabIndex={0}
                                  aria-pressed={selectedStyles.includes(style.name)}
                                  aria-label={`Select ${style.name} style`}
                                  className={cn(
                                    "group relative rounded-xl border overflow-hidden cursor-pointer transition-all duration-200",
                                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                                    selectedStyles.includes(style.name)
                                      ? "border-primary/50 bg-primary/5 shadow-md"
                                      : "border-border hover:border-primary/30 hover:shadow-md bg-card"
                                  )}
                                  onClick={() => handleStyleSelect(style.name)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      handleStyleSelect(style.name);
                                    }
                                  }}
                                >
                                  {/* Selection indicator */}
                                  {selectedStyles.includes(style.name) && (
                                    <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                      <Check className="h-4 w-4 text-primary-foreground" />
                                    </div>
                                  )}

                                  {/* Image */}
                                  <div className="aspect-[4/3] bg-muted overflow-hidden">
                                    {style.imageUrl ? (
                                      <img
                                        src={style.imageUrl}
                                        alt={style.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>

                                  {/* Content */}
                                  <div className="p-3">
                                    <p className="text-sm font-semibold text-foreground mb-1">
                                      {style.name}
                                    </p>
                                    {style.description && (
                                      <p className="text-xs text-muted-foreground line-clamp-2">
                                        {style.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center justify-between mt-3">
                              <p className="text-xs text-muted-foreground ml-1">
                                Click to select · You can pick multiple or describe something else
                              </p>
                              {selectedStyles.length > 0 && (
                                <Button
                                  onClick={handleSubmitStyles}
                                  disabled={isLoading}
                                  size="sm"
                                  className="gap-2"
                                >
                                  Continue with {selectedStyles.length === 1 ? "style" : `${selectedStyles.length} styles`}
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Deliverable Style References */}
                        {message.deliverableStyles && message.deliverableStyles.length > 0 && (
                          <div className="mt-5 ml-8">
                            <p className="text-sm font-medium mb-4 text-foreground">
                              What style direction speaks to you?
                            </p>
                            <StyleSelectionGrid
                              styles={message.deliverableStyles}
                              selectedStyles={selectedDeliverableStyles}
                              moodboardStyleIds={moodboardStyleIds}
                              onSelectStyle={handleDeliverableStyleSelect}
                              onAddToMoodboard={handleAddToMoodboard}
                              onShowMore={handleShowMoreStyles}
                              onShowDifferent={handleShowDifferentStyles}
                              isLoading={isLoading}
                            />
                            {selectedDeliverableStyles.length > 0 && (
                              <div className="flex justify-end mt-3">
                                <Button
                                  onClick={() => handleSubmitDeliverableStyles(message.deliverableStyles || [])}
                                  disabled={isLoading}
                                  size="sm"
                                  className="gap-2"
                                >
                                  Continue with {selectedDeliverableStyles.length === 1 ? "style" : `${selectedDeliverableStyles.length} styles`}
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Task Proposal */}
                        {message.taskProposal && (
                          <div className="mt-4 ml-8">
                            <TaskProposalCard proposal={message.taskProposal} />
                          </div>
                        )}

                        {/* Quick Options */}
                        {message.quickOptions && (
                          <div className="mt-4 ml-8">
                            <QuickOptions
                              options={message.quickOptions}
                              onSelect={handleQuickOptionClick}
                              disabled={isLoading}
                            />
                          </div>
                        )}
                      </div>

                      {/* Copy button - below the card */}
                      <div className="flex items-center gap-1 mt-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopyMessage(message.content, message.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-xs flex items-center gap-1"
                        >
                          {copiedMessageId === message.id ? (
                            <>
                              <Check className="h-3 w-3 text-green-500" />
                              <span className="text-green-500">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* User message - right aligned flat bubble */
                    <div className="max-w-[75%]">
                      <div className="bg-muted/60 rounded-2xl px-4 py-2.5">
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                      {/* User attachments */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2">
                          <FileAttachmentList files={message.attachments} />
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1.5 text-right pr-2">
                        {formatTimeAgo(message.timestamp)}
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex justify-start ml-2"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Timer className="h-4 w-4" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Manual submit fallback when AI says "ready" but no [TASK_READY] */}
        {showManualSubmit && !pendingTask && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-amber-500/50 bg-amber-500/5 rounded-xl p-4 mb-4"
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Ready to submit?</p>
                  <p className="text-sm text-muted-foreground">
                    Click to generate your task summary
                  </p>
                </div>
              </div>
              <Button
                onClick={handleRequestTaskSummary}
                disabled={isLoading}
                className="h-9"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Generate Summary
              </Button>
            </div>
          </motion.div>
        )}

        {/* Task Confirmation Bar */}
        {pendingTask && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-border bg-card rounded-xl p-4 mb-4"
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Ready to submit this task?</p>
                  <p className="text-sm text-muted-foreground">
                    {pendingTask.creditsRequired} credits required
                    {userCredits < pendingTask.creditsRequired ? (
                      <span className="text-destructive ml-1">
                        (You have {userCredits} credits)
                      </span>
                    ) : (
                      <span className="text-green-500 ml-1">(You have {userCredits} credits)</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleRejectTask}
                  disabled={isLoading}
                  className="h-9"
                >
                  Make Changes
                </Button>
                <Button
                  onClick={handleOpenSubmissionModal}
                  disabled={isLoading}
                  className="h-9"
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  {userCredits < pendingTask.creditsRequired ? "Buy Credits" : "Review & Submit"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Input area */}
        <div className="shrink-0 mt-auto pt-4">
          {/* Pending uploads preview */}
          {uploadedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {uploadedFiles.filter(Boolean).map((file) => {
                if (!file || !file.fileUrl) return null;
                return (
                  <div
                    key={file.fileUrl}
                    className="relative group flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border"
                  >
                    {file.fileType?.startsWith("image/") ? (
                      <img
                        src={file.fileUrl}
                        alt={file.fileName || "Uploaded file"}
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <FileIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="text-sm max-w-[100px] truncate text-foreground">
                      {file.fileName || "File"}
                    </span>
                    <button
                      onClick={() => removeFile(file.fileUrl)}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modern input box */}
          <div className="border border-border rounded-2xl bg-card overflow-hidden shadow-sm">
            {/* Input field */}
            <div className="relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask me anything..."
                disabled={isLoading}
                rows={1}
                className="w-full bg-transparent px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none text-sm resize-none min-h-[44px] max-h-[200px]"
                style={{ height: 'auto' }}
              />
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/30">
              {/* Left toolbar */}
              <div className="flex items-center gap-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  multiple
                  accept="image/*,video/*,.pdf,.zip,.rar,.pptx,.ppt,.doc,.docx,.ai,.eps,.psd"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isUploading}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                  title="Attach files"
                >
                  {isUploading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </button>
                <button
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Add emoji"
                >
                  <Smile className="h-4 w-4" />
                </button>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-2">
                {(input.trim() || uploadedFiles.length > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDiscard}
                    className="h-8 px-3 text-muted-foreground hover:text-foreground"
                  >
                    Discard
                  </Button>
                )}
                <Button
                  onClick={handleSend}
                  disabled={(!input.trim() && uploadedFiles.length === 0) || isLoading}
                  size="icon"
                  className="h-8 w-8 rounded-full"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Submission Modal */}
      <TaskSubmissionModal
        isOpen={showSubmissionModal}
        onClose={() => setShowSubmissionModal(false)}
        onConfirm={handleConfirmTask}
        onMakeChanges={handleRejectTask}
        taskProposal={pendingTask}
        moodboardItems={moodboardItems}
        userCredits={userCredits}
        isSubmitting={isLoading}
      />

      {/* Credit Purchase Dialog */}
      <CreditPurchaseDialog
        open={showCreditDialog}
        onOpenChange={setShowCreditDialog}
        requiredCredits={pendingTask?.creditsRequired || 0}
        currentCredits={userCredits}
        pendingTaskState={pendingTask ? { taskProposal: pendingTask, draftId } : undefined}
      />
    </ChatLayout>
  );
}
