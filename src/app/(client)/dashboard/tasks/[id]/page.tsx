"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ChevronRight,
  Copy,
  Calendar,
  Clock,
  Coins,
  FileText,
  User,
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  FileIcon,
  ExternalLink,
  Download,
  Monitor,
  Maximize2,
  Target,
  FolderOpen,
  ListChecks,
  StickyNote,
  Send,
  ThumbsUp,
  Loader2,
  Expand,
  X,
  History,
  Play,
  Eye,
  RotateCcw,
  Circle,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface MoodboardItem {
  id: string;
  type: "style" | "color" | "image" | "upload";
  imageUrl: string;
  name: string;
  metadata?: {
    styleAxis?: string;
    deliverableType?: string;
    colorSamples?: string[];
    styleId?: string;
  };
}

interface ActivityLogEntry {
  id: string;
  action: string;
  actorType: string;
  actorId: string | null;
  previousStatus: string | null;
  newStatus: string | null;
  metadata: {
    freelancerName?: string;
    deliverableCount?: number;
    revisionFeedback?: string;
    creditsUsed?: number;
    category?: string;
    [key: string]: unknown;
  } | null;
  createdAt: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  requirements: Record<string, unknown> | null;
  styleReferences: string[];
  moodboardItems?: MoodboardItem[];
  chatHistory: { role: string; content: string; timestamp: string; attachments?: { fileName: string; fileUrl: string; fileType: string }[] }[];
  estimatedHours: string | null;
  creditsUsed: number;
  maxRevisions: number;
  revisionsUsed: number;
  priority: number;
  deadline: string | null;
  assignedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  freelancer: {
    id: string;
    name: string;
    image: string | null;
  } | null;
  files: {
    id: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    isDeliverable: boolean;
    createdAt: string;
  }[];
  messages: {
    id: string;
    content: string;
    attachments: string[];
    createdAt: string;
    senderId: string;
    senderName: string;
    senderImage: string | null;
  }[];
  activityLog?: ActivityLogEntry[];
}

const statusConfig: Record<string, { color: string; bgColor: string; label: string; icon: React.ReactNode }> = {
  PENDING: { color: "text-yellow-600", bgColor: "bg-yellow-50 border-yellow-200", label: "Queued", icon: <Clock className="h-3.5 w-3.5" /> },
  OFFERED: { color: "text-cyan-600", bgColor: "bg-cyan-50 border-cyan-200", label: "Queued", icon: <Clock className="h-3.5 w-3.5" /> },
  ASSIGNED: { color: "text-blue-600", bgColor: "bg-blue-50 border-blue-200", label: "Assigned", icon: <User className="h-3.5 w-3.5" /> },
  IN_PROGRESS: { color: "text-purple-600", bgColor: "bg-purple-50 border-purple-200", label: "In Progress", icon: <RefreshCw className="h-3.5 w-3.5" /> },
  IN_REVIEW: { color: "text-orange-600", bgColor: "bg-orange-50 border-orange-200", label: "In Review", icon: <Eye className="h-3.5 w-3.5" /> },
  PENDING_ADMIN_REVIEW: { color: "text-amber-600", bgColor: "bg-amber-50 border-amber-200", label: "Admin Review", icon: <Clock className="h-3.5 w-3.5" /> },
  REVISION_REQUESTED: { color: "text-red-600", bgColor: "bg-red-50 border-red-200", label: "Revision", icon: <AlertCircle className="h-3.5 w-3.5" /> },
  COMPLETED: { color: "text-green-600", bgColor: "bg-green-50 border-green-200", label: "Completed", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  CANCELLED: { color: "text-red-600", bgColor: "bg-red-50 border-red-200", label: "Cancelled", icon: <AlertCircle className="h-3.5 w-3.5" /> },
};

export default function TaskDetailPage() {
  const params = useParams();
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chat and action states
  const [message, setMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedbackAnalysis, setFeedbackAnalysis] = useState<{
    isRevision: boolean;
    reason: string;
    estimatedCredits?: number;
  } | null>(null);
  const [showFullChat, setShowFullChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fullChatMessagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (params.id) {
      fetchTask(params.id as string);
    }
  }, [params.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    fullChatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [task?.messages, showFullChat]);

  const fetchTask = async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}`);
      if (response.ok) {
        const data = await response.json();
        setTask(data.task);
      } else if (response.status === 404) {
        setError("Task not found");
      } else {
        setError("Failed to load task");
      }
    } catch (err) {
      console.error("Failed to fetch task:", err);
      setError("Failed to load task");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (asFeedback = false) => {
    if (!message.trim() || !task) return;

    setIsSendingMessage(true);
    setFeedbackAnalysis(null);

    try {
      if (asFeedback && task.status === "IN_REVIEW") {
        const revisionResponse = await fetch(`/api/tasks/${task.id}/revision`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedback: message.trim() }),
        });

        if (revisionResponse.ok) {
          toast.success("Feedback sent to designer");
          setMessage("");
          fetchTask(task.id);
        } else {
          const error = await revisionResponse.json();
          toast.error(error.error || "Failed to send feedback");
        }
      } else {
        const response = await fetch(`/api/tasks/${task.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: message.trim() }),
        });

        if (response.ok) {
          const data = await response.json();
          setTask({
            ...task,
            messages: [...task.messages, data.message],
          });
          setMessage("");
        } else {
          const error = await response.json();
          toast.error(error.error || "Failed to send message");
        }
      }
    } catch (err) {
      toast.error("Failed to send message");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const analyzeFeedback = async () => {
    if (!message.trim() || !task) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/analyze-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback: message.trim(),
          originalRequirements: task.requirements,
          description: task.description,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFeedbackAnalysis(data);
      } else {
        setFeedbackAnalysis({
          isRevision: true,
          reason: "Unable to analyze - treating as revision request",
        });
      }
    } catch (err) {
      setFeedbackAnalysis({
        isRevision: true,
        reason: "Unable to analyze - treating as revision request",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApprove = async () => {
    if (!task) return;

    setIsApproving(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/approve`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Task approved! Great work has been delivered.");
        fetchTask(task.id);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to approve task");
      }
    } catch (err) {
      toast.error("Failed to approve task");
    } finally {
      setIsApproving(false);
    }
  };

  const copyTaskId = () => {
    navigator.clipboard.writeText(task?.id || "");
    toast.success("Task ID copied");
  };

  if (isLoading) {
    return (
      <div className="min-h-full bg-background">
        <div className="border-b border-border bg-card px-6 py-4">
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-full bg-background">
        <div className="border-b border-border bg-card px-6 py-4">
          <Link href="/dashboard/tasks" className="text-sm text-muted-foreground hover:text-foreground">
            Tasks
          </Link>
        </div>
        <div className="max-w-md mx-auto px-6 py-20 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {error || "Task not found"}
          </h2>
          <p className="text-muted-foreground mb-6">
            The task you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
          </p>
          <Button asChild>
            <Link href="/dashboard/tasks">View All Tasks</Link>
          </Button>
        </div>
      </div>
    );
  }

  const status = statusConfig[task.status] || statusConfig.PENDING;
  const deliverables = task.files.filter(f => f.isDeliverable);
  const attachments = task.files.filter(f => !f.isDeliverable);
  const isInReview = task.status === "IN_REVIEW";
  const canChat = ["ASSIGNED", "IN_PROGRESS", "IN_REVIEW", "REVISION_REQUESTED"].includes(task.status);
  const hasRevisionsLeft = task.revisionsUsed < task.maxRevisions;

  // Get inspiration images from moodboard or style references
  const inspirationImages = task.moodboardItems?.filter(item =>
    item.type === "style" || item.type === "image" || item.type === "upload"
  ) || [];
  const hasInspirations = inspirationImages.length > 0 || (task.styleReferences && task.styleReferences.length > 0);

  const req = task.requirements as {
    projectType?: string;
    platforms?: string[];
    dimensions?: string[];
    keyMessage?: string;
    deliverables?: string[];
    additionalNotes?: string;
    skills?: string[];
  } | null;

  return (
    <div className="min-h-full bg-background">
      {/* Header with Breadcrumb */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Link href="/dashboard/tasks" className="text-muted-foreground hover:text-foreground transition-colors">
                Tasks
              </Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground font-medium truncate max-w-[200px] sm:max-w-none">
                {task.title}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyTaskId}
                className="text-muted-foreground"
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Copy ID
              </Button>
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                status.bgColor,
                status.color
              )}>
                {status.icon}
                {status.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Approve Banner */}
        {isInReview && deliverables.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-4 rounded-xl border border-green-200 bg-green-50 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-900">Ready to approve?</p>
                <p className="text-xs text-green-700">Review the deliverables and approve when satisfied</p>
              </div>
            </div>
            <Button
              onClick={handleApprove}
              disabled={isApproving}
              className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
            >
              {isApproving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ThumbsUp className="h-4 w-4 mr-2" />
              )}
              Approve & Complete
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Description</label>
              <div className="bg-muted/30 border border-border rounded-lg p-4">
                <p className="text-foreground whitespace-pre-wrap">{task.description}</p>
              </div>
            </div>

            {/* Category */}
            {task.category && (
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Category</label>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/30 border border-border text-sm text-foreground">
                    <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    {task.category.name}
                  </span>
                </div>
              </div>
            )}

            {/* Requirements */}
            {req && Object.keys(req).length > 0 && (
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Requirements</label>
                <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
                  {req.projectType && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Project Type</p>
                      <p className="text-sm text-foreground">{req.projectType}</p>
                    </div>
                  )}

                  {Array.isArray(req.platforms) && req.platforms.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Platforms</p>
                      <div className="flex flex-wrap gap-2">
                        {req.platforms.map((platform, index) => (
                          <span key={index} className="inline-flex px-2.5 py-1 rounded-md text-xs bg-background border border-border text-muted-foreground">
                            {platform}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {Array.isArray(req.dimensions) && req.dimensions.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Dimensions</p>
                      <div className="flex flex-wrap gap-2">
                        {req.dimensions.map((dimension, index) => (
                          <span key={index} className="inline-flex px-2.5 py-1 rounded-md text-xs bg-background border border-border text-muted-foreground">
                            {dimension}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {req.keyMessage && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Key Message</p>
                      <p className="text-sm text-foreground">{req.keyMessage}</p>
                    </div>
                  )}

                  {Array.isArray(req.deliverables) && req.deliverables.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Deliverables</p>
                      <ul className="space-y-1">
                        {req.deliverables.map((deliverable, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                            <span className="text-muted-foreground mt-1">•</span>
                            {deliverable}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {req.additionalNotes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Additional Notes</p>
                      <p className="text-sm text-foreground">{req.additionalNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Conversation */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-muted-foreground">Conversation</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFullChat(true)}
                  className="text-xs text-muted-foreground hover:text-foreground h-7"
                >
                  <Expand className="h-3.5 w-3.5 mr-1" />
                  Expand
                </Button>
              </div>
              <div className="bg-muted/30 border border-border rounded-lg">
                {/* Messages */}
                <div className="p-4 max-h-[400px] overflow-y-auto space-y-4">
                  {task.chatHistory.length === 0 && task.messages.length === 0 && deliverables.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">No messages yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Your designer will communicate with you here</p>
                    </div>
                  ) : (
                    <>
                      {/* AI Chat History from task creation */}
                      {task.chatHistory.length > 0 && (
                        <div className="space-y-3 pb-3">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Creation Chat</p>
                          {task.chatHistory.map((msg, i) => (
                            <div key={`chat-${i}`} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "")}>
                              {msg.role === "assistant" && (
                                <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                                  <Sparkles className="h-3 w-3 text-white" />
                                </div>
                              )}
                              <div className={cn(
                                "rounded-xl px-3 py-2 text-sm max-w-[80%]",
                                msg.role === "user"
                                  ? "bg-emerald-50 dark:bg-emerald-900/20 text-foreground"
                                  : "bg-muted/50 text-muted-foreground"
                              )}>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                              </div>
                            </div>
                          ))}
                          {task.messages.length > 0 && (
                            <div className="border-t border-border pt-3 mt-3">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Designer Messages</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Designer/Client Messages */}
                      {task.messages.map((msg) => (
                        <div key={msg.id} className="flex gap-3">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={msg.senderImage || undefined} />
                            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                              {msg.senderName?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-foreground">{msg.senderName}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(msg.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                      ))}

                      {/* Deliverables inline */}
                      {deliverables.length > 0 && (isInReview || task.status === "COMPLETED") && (
                        <div className="p-4 rounded-lg border border-green-200 bg-green-50/50">
                          <div className="flex items-center gap-2 mb-3">
                            <FileText className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-900">Deliverables submitted</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {deliverables.map((file) => (
                              <div key={file.id} className="group relative rounded-lg overflow-hidden border border-border bg-background">
                                {file.fileType.startsWith("image/") ? (
                                  <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="block aspect-video relative bg-muted">
                                    <Image src={file.fileUrl} alt={file.fileName} fill className="object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <ExternalLink className="h-5 w-5 text-white" />
                                    </div>
                                  </a>
                                ) : (
                                  <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-3 aspect-video bg-muted hover:bg-muted/80 transition-colors">
                                    <FileIcon className="h-8 w-8 text-muted-foreground mb-1" />
                                    <p className="text-xs text-center text-muted-foreground truncate w-full">{file.fileName}</p>
                                  </a>
                                )}
                                <div className="p-2 flex items-center justify-between">
                                  <p className="text-xs text-muted-foreground truncate flex-1">{file.fileName}</p>
                                  <Button variant="ghost" size="sm" asChild className="h-6 w-6 p-0">
                                    <a href={file.fileUrl} download><Download className="h-3 w-3" /></a>
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                {canChat && !feedbackAnalysis && (
                  <div className="border-t border-border p-4">
                    <Textarea
                      placeholder={isInReview ? "Share your feedback..." : "Add a comment..."}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (isInReview && message.trim()) {
                            analyzeFeedback();
                          } else {
                            handleSendMessage();
                          }
                        }
                      }}
                      className="min-h-[80px] bg-background resize-none mb-3"
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {isInReview && hasRevisionsLeft && `${task.maxRevisions - task.revisionsUsed} revisions remaining`}
                      </p>
                      <Button
                        onClick={isInReview ? analyzeFeedback : () => handleSendMessage()}
                        disabled={!message.trim() || isSendingMessage || isAnalyzing}
                        size="sm"
                      >
                        {(isSendingMessage || isAnalyzing) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {task.status === "COMPLETED" && (
                  <div className="border-t border-border p-4 text-center">
                    <CheckCircle2 className="h-6 w-6 mx-auto text-green-600 mb-1" />
                    <p className="text-sm text-green-600 font-medium">Task Completed</p>
                  </div>
                )}
              </div>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground bg-background">
                <Coins className="h-3.5 w-3.5" />
                {task.creditsUsed} credits
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground bg-background">
                <RefreshCw className="h-3.5 w-3.5" />
                {task.revisionsUsed}/{task.maxRevisions} revisions
              </div>
              {task.deadline && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground bg-background">
                  <Calendar className="h-3.5 w-3.5" />
                  Due {new Date(task.deadline).toLocaleDateString()}
                </div>
              )}
              {task.estimatedHours && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground bg-background">
                  <Clock className="h-3.5 w-3.5" />
                  ~{task.estimatedHours}h
                </div>
              )}
            </div>

            {/* Separator */}
            <div className="border-t border-border" />

            {/* Footer - Created by */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-muted text-xs">
                  {task.freelancer?.name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <span>Created</span>
              <span className="text-foreground">{new Date(task.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Designer */}
            {task.freelancer && (
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Designer</label>
                <div className="bg-muted/30 border border-border rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={task.freelancer.image || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {task.freelancer.name?.[0]?.toUpperCase() || "D"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{task.freelancer.name}</p>
                      {task.assignedAt && (
                        <p className="text-xs text-muted-foreground">
                          Assigned {new Date(task.assignedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Waiting for Designer */}
            {!task.freelancer && (task.status === "PENDING" || task.status === "OFFERED") && (
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Designer</label>
                <div className="bg-muted/30 border border-border rounded-lg p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-foreground">Finding Designer</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Matching you with the best designer
                  </p>
                </div>
              </div>
            )}

            {/* Inspiration / Moodboard */}
            {hasInspirations && (
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Inspiration</label>
                <div className="bg-muted/30 border border-border rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-2">
                    {inspirationImages.length > 0 ? (
                      inspirationImages.slice(0, 4).map((item, index) => (
                        <a
                          key={item.id || index}
                          href={item.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative aspect-square rounded-lg overflow-hidden bg-muted border border-border"
                        >
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ExternalLink className="h-4 w-4 text-white" />
                          </div>
                        </a>
                      ))
                    ) : (
                      task.styleReferences?.slice(0, 4).map((ref, index) => (
                        <a
                          key={index}
                          href={ref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative aspect-square rounded-lg overflow-hidden bg-muted border border-border"
                        >
                          <Image
                            src={ref}
                            alt={`Style reference ${index + 1}`}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ExternalLink className="h-4 w-4 text-white" />
                          </div>
                        </a>
                      ))
                    )}
                  </div>
                  {((inspirationImages.length > 4) || (task.styleReferences && task.styleReferences.length > 4)) && (
                    <p className="text-xs text-muted-foreground text-center mt-3">
                      +{Math.max(inspirationImages.length, task.styleReferences?.length || 0) - 4} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Attachments */}
            {attachments.length > 0 && (
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Your Attachments</label>
                <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-2">
                  {attachments.map((file) => (
                    <a
                      key={file.id}
                      href={file.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      {file.fileType.startsWith("image/") ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted relative flex-shrink-0">
                          <Image src={file.fileUrl} alt={file.fileName} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <FileIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{file.fileName}</p>
                        <p className="text-xs text-muted-foreground">{(file.fileSize / 1024).toFixed(1)} KB</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            {task.activityLog && task.activityLog.length > 0 && (
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Timeline</label>
                <div className="bg-muted/30 border border-border rounded-lg p-4">
                  <div className="space-y-3">
                    {task.activityLog.slice(0, 5).map((entry, index) => {
                      const isLast = index === Math.min(task.activityLog!.length - 1, 4);
                      const getActionInfo = (action: string, metadata: ActivityLogEntry["metadata"]) => {
                        switch (action) {
                          case "created":
                            return { icon: <Circle className="h-2.5 w-2.5" />, color: "text-blue-500", label: "Created" };
                          case "assigned":
                            return { icon: <User className="h-2.5 w-2.5" />, color: "text-purple-500", label: metadata?.freelancerName ? `Assigned to ${metadata.freelancerName}` : "Assigned" };
                          case "started":
                            return { icon: <Play className="h-2.5 w-2.5" />, color: "text-indigo-500", label: "Started" };
                          case "submitted":
                            return { icon: <Eye className="h-2.5 w-2.5" />, color: "text-orange-500", label: "Submitted" };
                          case "revision_requested":
                            return { icon: <RotateCcw className="h-2.5 w-2.5" />, color: "text-yellow-500", label: "Revision" };
                          case "completed":
                            return { icon: <CheckCircle2 className="h-2.5 w-2.5" />, color: "text-green-500", label: "Completed" };
                          default:
                            return { icon: <Circle className="h-2.5 w-2.5" />, color: "text-muted-foreground", label: action };
                        }
                      };
                      const actionInfo = getActionInfo(entry.action, entry.metadata);

                      return (
                        <div key={entry.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={cn("w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center flex-shrink-0", actionInfo.color)}>
                              {actionInfo.icon}
                            </div>
                            {!isLast && <div className="w-px h-full min-h-[20px] bg-border mt-1" />}
                          </div>
                          <div className="flex-1 pb-1">
                            <p className="text-sm text-foreground">{actionInfo.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(entry.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Screen Chat Modal */}
      {showFullChat && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setShowFullChat(false)}>
                <X className="h-5 w-5" />
              </Button>
              <div>
                <h2 className="font-semibold text-foreground">{task.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border", status.bgColor, status.color)}>
                    {status.icon}
                    {status.label}
                  </span>
                  {task.freelancer && <span className="text-xs text-muted-foreground">with {task.freelancer.name}</span>}
                </div>
              </div>
            </div>
            {isInReview && deliverables.length > 0 && (
              <Button onClick={handleApprove} disabled={isApproving} className="bg-green-600 hover:bg-green-700 text-white">
                {isApproving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ThumbsUp className="h-4 w-4 mr-2" />}
                Approve
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto h-[calc(100vh-180px)] p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {task.messages.length === 0 && deliverables.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No messages yet</p>
                </div>
              ) : (
                <>
                  {task.messages.map((msg) => (
                    <div key={msg.id} className="flex gap-4">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={msg.senderImage || undefined} />
                        <AvatarFallback>{msg.senderName?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{msg.senderName}</span>
                          <span className="text-xs text-muted-foreground">{new Date(msg.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}

                  {deliverables.length > 0 && (isInReview || task.status === "COMPLETED") && (
                    <div className="p-6 rounded-xl border border-green-200 bg-green-50/50">
                      <div className="flex items-center gap-3 mb-4">
                        <FileText className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-green-900">Deliverables</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {deliverables.map((file) => (
                          <div key={file.id} className="group relative rounded-lg overflow-hidden border border-border bg-background">
                            {file.fileType.startsWith("image/") ? (
                              <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="block aspect-video relative bg-muted">
                                <Image src={file.fileUrl} alt={file.fileName} fill className="object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <ExternalLink className="h-5 w-5 text-white" />
                                </div>
                              </a>
                            ) : (
                              <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-4 aspect-video bg-muted">
                                <FileIcon className="h-10 w-10 text-muted-foreground mb-2" />
                                <p className="text-xs text-muted-foreground truncate w-full text-center">{file.fileName}</p>
                              </a>
                            )}
                            <div className="p-3 flex items-center justify-between">
                              <p className="text-sm text-muted-foreground truncate flex-1">{file.fileName}</p>
                              <Button variant="ghost" size="sm" asChild className="h-7 w-7 p-0">
                                <a href={file.fileUrl} download><Download className="h-4 w-4" /></a>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={fullChatMessagesEndRef} />
            </div>
          </div>

          {canChat && (
            <div className="px-6 py-4 border-t border-border">
              <div className="max-w-3xl mx-auto flex gap-3">
                <Textarea
                  placeholder={isInReview ? "Share your feedback..." : "Type your message..."}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (isInReview && message.trim()) analyzeFeedback();
                      else handleSendMessage();
                    }
                  }}
                  className="flex-1 min-h-[60px] max-h-[120px] resize-none"
                />
                <Button
                  onClick={isInReview ? analyzeFeedback : () => handleSendMessage()}
                  disabled={!message.trim() || isSendingMessage || isAnalyzing}
                  className="px-6"
                >
                  {(isSendingMessage || isAnalyzing) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
