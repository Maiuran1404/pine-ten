"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSpinner } from "@/components/shared/loading";
import { CreditPurchaseDialog } from "@/components/shared/credit-purchase-dialog";
import { useSession } from "@/lib/auth-client";
import { Send, Coins, Clock, Check, X, Image as ImageIcon, Paperclip, FileIcon, XCircle, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDraft, saveDraft, deleteDraft, generateDraftTitle, type ChatDraft } from "@/lib/chat-drafts";

interface ChatInterfaceProps {
  draftId: string;
  onDraftUpdate?: () => void;
  initialMessage?: string | null;
  seamlessTransition?: boolean;
}

interface UploadedFile {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

interface QuickOptions {
  question: string;
  options: string[];
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  styleReferences?: StyleReference[];
  taskProposal?: TaskProposal;
  attachments?: UploadedFile[];
  quickOptions?: QuickOptions;
}

interface StyleReference {
  category: string;
  name: string;
  imageUrl: string;
}

interface TaskProposal {
  title: string;
  description: string;
  category: string;
  estimatedHours: number;
  deliveryDays?: number;
  creditsRequired: number;
  deadline?: string;
}

// Helper to calculate delivery date from business days
function getDeliveryDateString(businessDays: number): string {
  const date = new Date();
  let daysAdded = 0;
  while (daysAdded < businessDays) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayName = days[date.getDay()];
  const dayNum = date.getDate();
  const suffix = dayNum === 1 || dayNum === 21 || dayNum === 31 ? 'st' : dayNum === 2 || dayNum === 22 ? 'nd' : dayNum === 3 || dayNum === 23 ? 'rd' : 'th';
  const monthName = months[date.getMonth()];
  return `${dayName} ${dayNum}${suffix} ${monthName}`;
}

const DEFAULT_WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hey! Ready to create something awesome. What do you need?\n\nJust tell me what you're looking for - like \"Instagram posts for this week\" or \"a video ad for our new service\".",
  timestamp: new Date(),
};

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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track if we need to auto-continue
  const [needsAutoContinue, setNeedsAutoContinue] = useState(false);
  const [initialMessageProcessed, setInitialMessageProcessed] = useState(false);

  // Load draft when draftId changes
  useEffect(() => {
    const draft = getDraft(draftId);
    if (draft) {
      // Load existing draft
      const loadedMessages = draft.messages.map((m) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
      setMessages(loadedMessages);
      setSelectedStyles(draft.selectedStyles);
      setPendingTask(draft.pendingTask);

      // Check if last message was from user - need to auto-continue
      const lastMessage = loadedMessages[loadedMessages.length - 1];
      if (lastMessage && lastMessage.role === "user") {
        setNeedsAutoContinue(true);
      }
    } else {
      // New draft - reset to default state
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

    // Create user message with the initial content
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: initialMessage,
      timestamp: new Date(),
    };

    // For seamless transition, skip the welcome message and only show user's message
    if (seamlessTransition) {
      setMessages([userMessage]);
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

    // Trigger AI response
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

  // Auto-save draft when messages change (after initial load)
  useEffect(() => {
    if (!isInitialized) return;

    // Don't save if only welcome message
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
    // Use ref to call callback without causing re-renders
    onDraftUpdateRef.current?.();
  }, [messages, selectedStyles, pendingTask, draftId, isInitialized]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "task-attachments");

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Upload failed");
        }

        const data = await response.json();
        return data.file as UploadedFile;
      });

      const newFiles = await Promise.all(uploadPromises);
      setUploadedFiles((prev) => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} file(s) uploaded successfully`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload files");
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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

    // Check if user has enough credits
    if (userCredits < pendingTask.creditsRequired) {
      setShowCreditDialog(true);
      return;
    }

    setIsLoading(true);

    // Collect all attachments from messages
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
        throw new Error(error.message || "Failed to create task");
      }

      const data = await response.json();
      // Delete the draft since task was created
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

  // Generate smart chat title from messages that updates as chat progresses
  const getChatTitle = () => {
    if (messages.length <= 1) return null;

    // Look through user messages to build context
    const userMessages = messages.filter(m => m.role === "user");
    if (userMessages.length === 0) return null;

    // Try to extract key information from the conversation
    const allUserContent = userMessages.map(m => m.content.toLowerCase()).join(" ");

    // Detect content type
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

    // Detect quantity
    let quantity = "";
    if (allUserContent.includes("series") || allUserContent.includes("multiple") || allUserContent.includes("pack")) {
      quantity = "Series";
    }

    // Build title
    if (contentType && quantity) {
      return `${contentType} ${quantity}`;
    } else if (contentType) {
      return contentType;
    }

    // Fallback to first user message
    const content = userMessages[0].content;
    return content.length > 40 ? content.substring(0, 40) + "..." : content;
  };

  const chatTitle = seamlessTransition ? getChatTitle() : null;

  return (
    <div className={cn(
      "flex flex-col relative",
      seamlessTransition ? "h-full" : "h-[calc(100vh-12rem)]"
    )}>
      {/* Chat title - shown when there's context */}
      {chatTitle && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="shrink-0 mb-4 pb-4 border-b border-[#2a2a30]/50"
        >
          <h1 className="text-lg font-medium text-white truncate">{chatTitle}</h1>
          <p className="text-sm text-[#6b6b6b] mt-1">Design Request</p>
        </motion.div>
      )}
      {/* Messages - scrollable area */}
      <ScrollArea className={cn(
        "pr-4",
        seamlessTransition ? "flex-1 min-h-0 overflow-y-auto" : "flex-1"
      )} ref={scrollAreaRef}>
        <div className={cn(
          "space-y-4",
          seamlessTransition ? "pb-8" : "pb-4"
        )}>
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={seamlessTransition && index > 0 ? { opacity: 0, y: 20 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index === 1 ? 0.1 : 0 }}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3",
                    message.role === "user"
                      ? seamlessTransition
                        ? "bg-white text-black"
                        : "bg-primary text-primary-foreground"
                      : seamlessTransition
                        ? "bg-[#1a1a1f] border border-[#2a2a30]/50"
                        : "bg-muted"
                  )}
                >
                  <div className={cn(
                    "prose prose-sm max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>p:last-child]:mb-0",
                    message.role === "user"
                      ? seamlessTransition
                        ? "[&>*]:text-black"
                        : "prose-invert [&>*]:text-white"
                      : seamlessTransition
                        ? "[&>*]:text-white"
                        : "dark:prose-invert"
                  )}>
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.attachments.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded bg-background/50"
                      >
                        {file.fileType.startsWith("image/") ? (
                          <a
                            href={file.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img
                              src={file.fileUrl}
                              alt={file.fileName}
                              className="max-w-[200px] max-h-[150px] rounded object-cover"
                            />
                          </a>
                        ) : (
                          <a
                            href={file.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm hover:underline"
                          >
                            <FileIcon className="h-4 w-4" />
                            <span>{file.fileName}</span>
                            <span className="text-xs text-muted-foreground">
                              ({(file.fileSize / 1024).toFixed(1)} KB)
                            </span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Style References */}
                {message.styleReferences && message.styleReferences.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">
                      Select styles you prefer:
                    </p>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {message.styleReferences.slice(0, 3).map((style, idx) => (
                        <div
                          key={`${style.name}-${idx}`}
                          className={cn(
                            "flex-shrink-0 w-32 rounded-lg border-2 p-2 cursor-pointer transition-all",
                            selectedStyles.includes(style.name)
                              ? "border-primary ring-2 ring-primary/20"
                              : "border-transparent bg-background/50 hover:border-muted-foreground/50"
                          )}
                          onClick={() => handleStyleSelect(style.name)}
                        >
                          <div className="aspect-video bg-muted rounded overflow-hidden mb-1">
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
                          <p className="text-xs font-medium text-center truncate">
                            {style.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Task Proposal */}
                {message.taskProposal && (
                  <Card className="mt-4 bg-background">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">Task Summary</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {message.taskProposal.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Coins className="h-3 w-3" />
                          {message.taskProposal.creditsRequired} credits
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getDeliveryDateString(message.taskProposal.deliveryDays || 3)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Options */}
                {message.quickOptions && message.quickOptions.options.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">{message.quickOptions.question}</p>
                    <div className="flex flex-wrap gap-2">
                      {message.quickOptions.options.map((option, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleQuickOptionClick(option)}
                          disabled={isLoading}
                          className="px-4 py-2 text-sm font-medium rounded-full border border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hide timestamp for user messages in seamlessTransition mode */}
                {!(seamlessTransition && message.role === "user") && (
                  <p className={cn(
                    "text-xs mt-2",
                    seamlessTransition
                      ? "text-white/50"
                      : "opacity-70"
                  )}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={seamlessTransition ? { opacity: 0, y: 10 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex justify-start"
            >
              {seamlessTransition ? (
                <div className="rounded-2xl px-4 py-3 bg-[#1a1a1f] border border-[#2a2a30]/50">
                  <div className="flex items-center gap-1.5">
                    <motion.div
                      className="w-2 h-2 rounded-full bg-[#6b6b6b]"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                    <motion.div
                      className="w-2 h-2 rounded-full bg-[#6b6b6b]"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.2,
                      }}
                    />
                    <motion.div
                      className="w-2 h-2 rounded-full bg-[#6b6b6b]"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.4,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-muted rounded-lg px-4 py-3">
                  <LoadingSpinner size="sm" />
                </div>
              )}
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Task Confirmation Bar */}
      {pendingTask && (
        <div className="border-t bg-muted/50 p-4 mb-4 rounded-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="font-medium">Ready to submit this task?</p>
              <p className="text-sm text-muted-foreground">
                {pendingTask.creditsRequired} credits required
                {userCredits < pendingTask.creditsRequired ? (
                  <span className="text-destructive ml-1">
                    (You have {userCredits} credits -
                    <button
                      onClick={() => setShowCreditDialog(true)}
                      className="underline ml-1 cursor-pointer hover:text-destructive/80"
                    >
                      buy more
                    </button>)
                  </span>
                ) : (
                  <span className="text-green-600 ml-1">(You have {userCredits} credits)</span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRejectTask}
                disabled={isLoading}
                className="cursor-pointer"
              >
                <X className="h-4 w-4 mr-2" />
                Make Changes
              </Button>
              <Button
                onClick={handleConfirmTask}
                disabled={isLoading}
                className="cursor-pointer"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {userCredits < pendingTask.creditsRequired ? "Buy Credits & Submit" : "Confirm & Submit"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Input - fixed at bottom */}
      <div className={cn(
        "shrink-0 mt-auto",
        seamlessTransition ? "pt-4" : "border-t pt-4"
      )}>
        {/* Pending uploads preview */}
        {uploadedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.fileUrl}
                className={cn(
                  "relative group flex items-center gap-2 px-3 py-2 rounded-lg",
                  seamlessTransition ? "bg-[#1a1a1f] border border-[#2a2a30]/50" : "bg-muted"
                )}
              >
                {file.fileType.startsWith("image/") ? (
                  <img
                    src={file.fileUrl}
                    alt={file.fileName}
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <FileIcon className={cn(
                    "h-5 w-5",
                    seamlessTransition ? "text-[#6b6b6b]" : "text-muted-foreground"
                  )} />
                )}
                <span className={cn(
                  "text-sm max-w-[100px] truncate",
                  seamlessTransition && "text-white"
                )}>
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

        {seamlessTransition ? (
          /* Glassy input matching dashboard */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="max-w-3xl mx-auto w-full"
          >
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              multiple
              accept="image/*,video/*,.pdf,.zip,.rar,.pptx,.ppt,.doc,.docx,.ai,.eps,.psd"
            />
            <div
              className="relative rounded-xl overflow-hidden border border-[#2a2a30]/50"
              style={{
                background:
                  "linear-gradient(180deg, rgba(20, 20, 24, 0.8) 0%, rgba(12, 12, 15, 0.9) 100%)",
                backdropFilter: "blur(20px)",
                boxShadow:
                  "0 0 30px rgba(255,255,255,0.02), inset 0 1px 0 0 rgba(255,255,255,0.04)",
              }}
            >
              <div className="relative flex items-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isUploading}
                  className="p-3 text-[#6b6b6b] hover:text-white transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Paperclip className="h-5 w-5" />
                  )}
                </button>
                <div className="h-5 w-px bg-[#2a2a30]/50"></div>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask anything ..."
                  disabled={isLoading}
                  className="flex-1 bg-transparent px-4 py-3.5 text-white placeholder:text-[#4a4a4a] focus:outline-none text-sm disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={(!input.trim() && uploadedFiles.length === 0) || isLoading}
                  className="p-3 text-[#6b6b6b] hover:text-white transition-colors disabled:opacity-50"
                >
                  <ArrowUp className="h-5 w-5" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Default input */
          <>
            <div className="flex gap-2">
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                multiple
                accept="image/*,video/*,.pdf,.zip,.rar,.pptx,.ppt,.doc,.docx,.ai,.eps,.psd"
              />

              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isUploading}
                className="h-[60px] w-[60px] shrink-0"
                title="Attach files"
              >
                {isUploading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Paperclip className="h-5 w-5" />
                )}
              </Button>

              <Textarea
                placeholder="Describe your design needs..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="min-h-[60px] resize-none"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={(!input.trim() && uploadedFiles.length === 0) || isLoading}
                size="icon"
                className="h-[60px] w-[60px] shrink-0"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Press Enter to send, Shift+Enter for new line. Click <Paperclip className="h-3 w-3 inline" /> to attach files.
            </p>
          </>
        )}
      </div>

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
