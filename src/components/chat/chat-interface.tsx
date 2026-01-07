"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getDraft, saveDraft, deleteDraft, generateDraftTitle, type ChatDraft } from "@/lib/chat-drafts";
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
  type TaskProposal,
  type ChatMessage as Message,
  getDeliveryDateString,
} from "./types";
import { TaskProposalCard } from "./task-proposal-card";
import { FileAttachmentList } from "./file-attachment";
import { QuickOptions } from "./quick-options";

interface ChatInterfaceProps {
  draftId: string;
  onDraftUpdate?: () => void;
  initialMessage?: string | null;
  seamlessTransition?: boolean;
}

const DEFAULT_WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi there! What design project can I help you get started with today?",
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

export function ChatInterface({ draftId, onDraftUpdate, initialMessage, seamlessTransition = false }: ChatInterfaceProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [messages, setMessages] = useState<Message[]>([DEFAULT_WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingTask, setPendingTask] = useState<TaskProposal | null>(null);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [sidePanelTab, setSidePanelTab] = useState<"info" | "files">("info");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dragCounterRef = useRef(0);

  // Track if we need to auto-continue
  const [needsAutoContinue, setNeedsAutoContinue] = useState(false);
  const [initialMessageProcessed, setInitialMessageProcessed] = useState(false);

  // Get user info
  const userName = session?.user?.name || "You";
  const userInitial = userName.charAt(0).toUpperCase();

  // Get all attachments from messages for the side panel
  const allAttachments = messages
    .filter((m) => m.attachments && m.attachments.length > 0)
    .flatMap((m) => m.attachments || []);

  // Load draft when draftId changes
  useEffect(() => {
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
  }, [draftId]);

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
          taskProposal: data.taskProposal,
          quickOptions: data.quickOptions,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        if (data.taskProposal) {
          setPendingTask(data.taskProposal);
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
      pendingTask,
      createdAt: getDraft(draftId)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveDraft(draft);
    onDraftUpdateRef.current?.();
  }, [messages, selectedStyles, pendingTask, draftId, isInitialized]);

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
        return data.file as UploadedFile;
      });

      const newFiles = await Promise.all(uploadPromises);
      setUploadedFiles((prev) => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} file(s) uploaded`);
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
        taskProposal: data.taskProposal,
        quickOptions: data.quickOptions,
      };

      setMessages((prev) => [...prev, assistantMessage]);

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
        taskProposal: data.taskProposal,
        quickOptions: data.quickOptions,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.taskProposal) {
        setPendingTask(data.taskProposal);
      }
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const userCredits = (session?.user as { credits?: number } | undefined)?.credits || 0;

  const handleConfirmTask = async () => {
    if (!pendingTask) return;

    if (userCredits < pendingTask.creditsRequired) {
      setShowCreditDialog(true);
      return;
    }

    setIsLoading(true);

    const allAttachments = messages
      .filter((m) => m.attachments && m.attachments.length > 0)
      .flatMap((m) => m.attachments || []);

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
            attachments: m.attachments,
          })),
          styleReferences: selectedStyles,
          attachments: allAttachments,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || error.message || "Failed to create task");
      }

      const data = await response.json();
      deleteDraft(draftId);
      onDraftUpdate?.();
      toast.success("Task created successfully!");
      router.push(`/dashboard/tasks/${data.taskId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create task");
    } finally {
      setIsLoading(false);
    }
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
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Get chat creation date (from first message)
  const chatCreatedAt = messages.length > 0 ? messages[0].timestamp : new Date();

  return (
    <div
      className={cn(
        "flex relative",
        seamlessTransition ? "h-full" : "h-[calc(100vh-12rem)]"
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Main chat area */}
      <div className={cn(
        "flex flex-col flex-1 min-w-0 transition-all duration-300",
        showSidePanel ? "mr-80" : "mr-0"
      )}>
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
            className="shrink-0 mb-4 pb-4 border-b border-border flex items-center justify-between"
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
              <button
                onClick={() => setShowSidePanel(!showSidePanel)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label={showSidePanel ? "Hide panel" : "Show panel"}
              >
                {showSidePanel ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRight className="h-4 w-4" />
                )}
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
                            {/* Message content */}
                            <div className="prose prose-sm max-w-none dark:prose-invert [&>p]:mb-3 [&>ul]:mb-3 [&>ol]:mb-3 [&>p:last-child]:mb-0 text-foreground">
                              <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>
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
                          <div className="mt-4 ml-8">
                            <p className="text-sm font-medium mb-3 text-foreground">
                              Select styles you prefer:
                            </p>
                            <div className="flex gap-3 overflow-x-auto pb-2">
                              {message.styleReferences.slice(0, 3).map((style, idx) => (
                                <div
                                  key={`${style.name}-${idx}`}
                                  role="button"
                                  tabIndex={0}
                                  aria-pressed={selectedStyles.includes(style.name)}
                                  aria-label={`Select ${style.name} style`}
                                  className={cn(
                                    "flex-shrink-0 w-32 rounded-lg border-2 p-2 cursor-pointer transition-all",
                                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                                    selectedStyles.includes(style.name)
                                      ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                                      : "border-border hover:border-primary/50 bg-background"
                                  )}
                                  onClick={() => handleStyleSelect(style.name)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      handleStyleSelect(style.name);
                                    }
                                  }}
                                >
                                  <div className="aspect-video bg-muted rounded overflow-hidden mb-2">
                                    {style.imageUrl ? (
                                      <img
                                        src={style.imageUrl}
                                        alt={style.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-xs font-medium text-center truncate text-foreground">
                                    {style.name}
                                  </p>
                                </div>
                              ))}
                            </div>
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
                    /* User message - right aligned bubble */
                    <div className="max-w-[75%]">
                      <div className="bg-muted rounded-2xl rounded-br-md px-4 py-3">
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {message.content}
                        </p>
                        {/* User attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2">
                            <FileAttachmentList files={message.attachments} />
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 text-right">
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
                className="flex justify-start"
              >
                <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-sm">Thinking</span>
                    <div className="flex items-center gap-1">
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                      />
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

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
                  onClick={handleConfirmTask}
                  disabled={isLoading}
                  className="h-9"
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  {userCredits < pendingTask.creditsRequired ? "Buy Credits" : "Confirm & Submit"}
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
              {uploadedFiles.map((file) => (
                <div
                  key={file.fileUrl}
                  className="relative group flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border"
                >
                  {file.fileType.startsWith("image/") ? (
                    <img
                      src={file.fileUrl}
                      alt={file.fileName}
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <FileIcon className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="text-sm max-w-[100px] truncate text-foreground">
                    {file.fileName}
                  </span>
                  <button
                    onClick={() => removeFile(file.fileUrl)}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              ))}
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

      {/* Side Panel */}
      <AnimatePresence>
        {showSidePanel && seamlessTransition && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-0 bottom-0 w-80 border-l border-border bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col"
          >
            {/* Panel tabs */}
            <div className="flex items-center gap-1 px-4 py-3 border-b border-border">
              <button
                onClick={() => setSidePanelTab("info")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                  sidePanelTab === "info"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Info
              </button>
              <button
                onClick={() => setSidePanelTab("files")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                  sidePanelTab === "files"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Files
              </button>
            </div>

            {/* Panel content */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-6">
                {sidePanelTab === "info" ? (
                  <>
                    {/* Main info section */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-foreground">Main info</h3>

                      {/* Creator */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span className="text-sm">Creator</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {userInitial}
                          </div>
                          <span className="text-sm text-foreground">{userName.split(" ")[0]}</span>
                        </div>
                      </div>

                      {/* Date of creation */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">Created</span>
                        </div>
                        <span className="text-sm text-foreground">{formatDate(chatCreatedAt)}</span>
                      </div>

                      {/* Status */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Activity className="h-4 w-4" />
                          <span className="text-sm">Status</span>
                        </div>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          pendingTask
                            ? "bg-green-500/10 text-green-500"
                            : "bg-primary/10 text-primary"
                        )}>
                          {pendingTask ? "Ready" : "Active"}
                        </span>
                      </div>

                      {/* Messages count */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Quote className="h-4 w-4" />
                          <span className="text-sm">Messages</span>
                        </div>
                        <span className="text-sm text-foreground">{messages.length}</span>
                      </div>

                      {/* Files count */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm">Files</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-foreground">{allAttachments.length}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>

                    {/* Selected styles */}
                    {selectedStyles.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-foreground">Selected styles</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedStyles.map((style) => (
                            <span
                              key={style}
                              className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary border border-primary/20"
                            >
                              {style}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Task summary if pending */}
                    {pendingTask && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-foreground">Task Summary</h3>
                        <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
                          <p className="text-sm font-medium text-foreground">{pendingTask.title}</p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Credits required</span>
                            <span className="text-foreground font-medium">{pendingTask.creditsRequired}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Est. hours</span>
                            <span className="text-foreground font-medium">{pendingTask.estimatedHours}h</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Chat activity */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-foreground">Activity</h3>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 20 }).map((_, i) => {
                          const hasActivity = i < messages.length;
                          return (
                            <div
                              key={i}
                              className={cn(
                                "w-2 h-2 rounded-sm",
                                hasActivity ? "bg-primary" : "bg-muted"
                              )}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  /* Files tab */
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">Attached files</h3>
                    {allAttachments.length > 0 ? (
                      <div className="space-y-2">
                        {allAttachments.map((file, idx) => (
                          <a
                            key={`${file.fileUrl}-${idx}`}
                            href={file.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors group"
                          >
                            {file.fileType?.startsWith("image/") ? (
                              <img
                                src={file.fileUrl}
                                alt={file.fileName}
                                className="w-10 h-10 rounded object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                <FileIcon className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                {file.fileName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {((file.fileSize || 0) / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No files attached yet</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Credit Purchase Dialog */}
      <CreditPurchaseDialog
        open={showCreditDialog}
        onOpenChange={setShowCreditDialog}
        requiredCredits={pendingTask?.creditsRequired || 0}
        currentCredits={userCredits}
      />
    </div>
  );
}
