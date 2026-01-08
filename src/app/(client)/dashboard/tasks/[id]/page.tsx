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
  ArrowLeft,
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
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  requirements: Record<string, unknown> | null;
  styleReferences: string[];
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
}

const statusConfig: Record<string, { color: string; bgColor: string; label: string; icon: React.ReactNode }> = {
  PENDING: { color: "text-yellow-400", bgColor: "bg-yellow-500/10 border-yellow-500/20", label: "Pending", icon: <Clock className="h-3.5 w-3.5" /> },
  ASSIGNED: { color: "text-blue-400", bgColor: "bg-blue-500/10 border-blue-500/20", label: "Assigned", icon: <User className="h-3.5 w-3.5" /> },
  IN_PROGRESS: { color: "text-purple-400", bgColor: "bg-purple-500/10 border-purple-500/20", label: "In Progress", icon: <RefreshCw className="h-3.5 w-3.5" /> },
  IN_REVIEW: { color: "text-orange-400", bgColor: "bg-orange-500/10 border-orange-500/20", label: "In Review", icon: <FileText className="h-3.5 w-3.5" /> },
  REVISION_REQUESTED: { color: "text-red-400", bgColor: "bg-red-500/10 border-red-500/20", label: "Revision Requested", icon: <AlertCircle className="h-3.5 w-3.5" /> },
  COMPLETED: { color: "text-green-400", bgColor: "bg-green-500/10 border-green-500/20", label: "Completed", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  CANCELLED: { color: "text-red-400", bgColor: "bg-red-500/10 border-red-500/20", label: "Cancelled", icon: <AlertCircle className="h-3.5 w-3.5" /> },
};

const GlassCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div
    className={cn("rounded-xl overflow-hidden border border-border bg-card", className)}
  >
    {children}
  </div>
);

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
    // Scroll to bottom when messages change
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
      // If this is feedback on deliverables (task is IN_REVIEW), analyze it first
      if (asFeedback && task.status === "IN_REVIEW") {
        // Send as revision request
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
        // Regular message
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
        // If analysis fails, default to treating as revision
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

  if (isLoading) {
    return (
      <div className="min-h-full bg-background p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg bg-muted" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-64 bg-muted" />
            <Skeleton className="h-4 w-32 bg-muted" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <GlassCard className="p-6">
              <Skeleton className="h-6 w-32 bg-muted" />
              <Skeleton className="h-32 w-full mt-4 bg-muted" />
            </GlassCard>
          </div>
          <div>
            <GlassCard className="p-6">
              <Skeleton className="h-6 w-24 bg-muted" />
              <Skeleton className="h-24 w-full mt-4 bg-muted" />
            </GlassCard>
          </div>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-full bg-background p-6 space-y-6">
        <Button
          variant="ghost"
          asChild
          className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          <Link href="/dashboard/tasks">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Link>
        </Button>
        <GlassCard className="p-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {error || "Task not found"}
          </h2>
          <p className="text-muted-foreground mb-4">
            The task you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have permission to view it.
          </p>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/dashboard/tasks">View All Tasks</Link>
          </Button>
        </GlassCard>
      </div>
    );
  }

  const status = statusConfig[task.status] || statusConfig.PENDING;
  const deliverables = task.files.filter(f => f.isDeliverable);
  const attachments = task.files.filter(f => !f.isDeliverable);
  const isInReview = task.status === "IN_REVIEW";
  const canChat = ["ASSIGNED", "IN_PROGRESS", "IN_REVIEW", "REVISION_REQUESTED"].includes(task.status);
  const hasRevisionsLeft = task.revisionsUsed < task.maxRevisions;

  return (
    <div className="min-h-full bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg"
          >
            <Link href="/dashboard/tasks">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{task.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border",
                status.bgColor,
                status.color
              )}>
                {status.icon}
                {status.label}
              </span>
              {task.category && (
                <span className="inline-flex px-2.5 py-1 rounded-full text-xs border border-border text-muted-foreground">
                  {task.category.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Approve Banner - Show when IN_REVIEW */}
          {isInReview && deliverables.length > 0 && (
            <div className="flex items-center justify-between p-4 rounded-xl border border-green-500/30 bg-green-500/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Ready to approve?</p>
                  <p className="text-xs text-muted-foreground">Review the deliverables and approve when satisfied</p>
                </div>
              </div>
              <Button
                onClick={handleApprove}
                disabled={isApproving}
                className="bg-green-600 hover:bg-green-700 text-foreground"
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

          {/* Chat / Messages with Deliverables - MOVED TO TOP */}
          <GlassCard>
            <div className="p-5 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-medium text-foreground">Conversation</h2>
                </div>
                <div className="flex items-center gap-3">
                  {(isInReview || task.status === "REVISION_REQUESTED") && (
                    <span className="text-xs text-muted-foreground">
                      Revisions: {task.revisionsUsed}/{task.maxRevisions}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFullChat(true)}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted/50 h-8 px-2"
                  >
                    <Expand className="h-4 w-4 mr-1" />
                    <span className="text-xs">Open Chat</span>
                  </Button>
                </div>
              </div>
            </div>
            <div className="p-5">
              {/* Messages & Deliverables List */}
              <div className="space-y-4 max-h-[500px] overflow-y-auto mb-4">
                {task.messages.length === 0 && deliverables.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-10 w-10 mx-auto text-muted mb-3" />
                    <p className="text-sm text-muted-foreground">No messages yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Your designer will communicate with you here</p>
                  </div>
                ) : (
                  <>
                    {/* Show messages */}
                    {task.messages.map((msg) => (
                      <div key={msg.id} className="flex gap-3">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={msg.senderImage || undefined} />
                          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                            {msg.senderName?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-foreground">
                              {msg.senderName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">{msg.content}</p>
                        </div>
                      </div>
                    ))}

                    {/* Show deliverables inline if in review */}
                    {deliverables.length > 0 && (isInReview || task.status === "COMPLETED") && (
                      <div className="my-4 p-4 rounded-lg border border-border/60 bg-muted/50">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="h-4 w-4 text-green-400" />
                          <span className="text-sm font-medium text-foreground">Deliverables submitted</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {deliverables.map((file) => (
                            <div
                              key={file.id}
                              className="group relative rounded-lg overflow-hidden border border-border/40"
                            >
                              {file.fileType.startsWith("image/") ? (
                                <a
                                  href={file.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block aspect-video relative bg-muted"
                                >
                                  <Image
                                    src={file.fileUrl}
                                    alt={file.fileName}
                                    fill
                                    className="object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <ExternalLink className="h-5 w-5 text-foreground" />
                                  </div>
                                </a>
                              ) : (
                                <a
                                  href={file.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex flex-col items-center justify-center p-3 aspect-video bg-muted hover:bg-muted transition-colors"
                                >
                                  <FileIcon className="h-8 w-8 text-green-400/50 mb-1" />
                                  <p className="text-xs text-center text-muted-foreground truncate w-full">
                                    {file.fileName}
                                  </p>
                                </a>
                              )}
                              <div className="p-2 bg-background flex items-center justify-between">
                                <p className="text-xs text-muted-foreground truncate flex-1">{file.fileName}</p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                >
                                  <a href={file.fileUrl} download>
                                    <Download className="h-3 w-3" />
                                  </a>
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

              {/* Feedback Analysis Result */}
              {feedbackAnalysis && (
                <div className={cn(
                  "mb-4 p-4 rounded-lg border",
                  feedbackAnalysis.isRevision
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-orange-500/30 bg-orange-500/5"
                )}>
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      feedbackAnalysis.isRevision ? "bg-green-500/10" : "bg-orange-500/10"
                    )}>
                      {feedbackAnalysis.isRevision ? (
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-orange-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        "text-sm font-medium",
                        feedbackAnalysis.isRevision ? "text-green-400" : "text-orange-400"
                      )}>
                        {feedbackAnalysis.isRevision
                          ? `Included in your revisions (${task.revisionsUsed}/${task.maxRevisions} used)`
                          : "This may require additional credits"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{feedbackAnalysis.reason}</p>
                      {!feedbackAnalysis.isRevision && feedbackAnalysis.estimatedCredits && (
                        <p className="text-xs text-orange-400 mt-1">
                          Estimated: {feedbackAnalysis.estimatedCredits} credits
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={() => handleSendMessage(feedbackAnalysis.isRevision)}
                      disabled={isSendingMessage}
                      size="sm"
                      className={cn(
                        feedbackAnalysis.isRevision
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-orange-600 hover:bg-orange-700",
                        "text-foreground"
                      )}
                    >
                      {isSendingMessage ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : null}
                      {feedbackAnalysis.isRevision ? "Continue Chatting" : "Request Anyway"}
                    </Button>
                    <Button
                      onClick={() => setFeedbackAnalysis(null)}
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Message Input */}
              {canChat && !feedbackAnalysis && (
                <div className="pt-4 border-t border-border/40">
                  <Textarea
                    placeholder={isInReview ? "Share your feedback on the deliverables..." : "Type your message..."}
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
                    className="w-full min-h-[80px] bg-muted border-border text-foreground placeholder:text-muted-foreground resize-none mb-3"
                  />
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {isInReview && hasRevisionsLeft ? (
                        <span>Your feedback will be analyzed to determine if it&apos;s covered by your revisions</span>
                      ) : isInReview && !hasRevisionsLeft ? (
                        <span className="text-orange-400">No revisions left - additional feedback may cost credits</span>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      {isInReview ? (
                        <Button
                          onClick={analyzeFeedback}
                          disabled={!message.trim() || isAnalyzing}
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          {isAnalyzing ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Continue Chatting
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleSendMessage()}
                          disabled={!message.trim() || isSendingMessage}
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          {isSendingMessage ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!canChat && task.status === "COMPLETED" && (
                <div className="pt-4 border-t border-border/40 text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-green-400 mb-2" />
                  <p className="text-sm text-green-400 font-medium">Task Completed</p>
                  <p className="text-xs text-muted-foreground mt-1">Thank you for using our service!</p>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Description */}
          <GlassCard>
            <div className="p-5 border-b border-border/40">
              <h2 className="text-sm font-medium text-foreground">Description</h2>
            </div>
            <div className="p-5">
              <p className="text-muted-foreground whitespace-pre-wrap">{task.description}</p>
            </div>
          </GlassCard>

          {/* Requirements */}
          {task.requirements && Object.keys(task.requirements).length > 0 && (() => {
            const req = task.requirements as {
              projectType?: string;
              platforms?: string[];
              dimensions?: string[];
              keyMessage?: string;
              deliverables?: string[];
              additionalNotes?: string;
            };
            return (
              <GlassCard>
                <div className="p-5 border-b border-border/40">
                  <h2 className="text-sm font-medium text-foreground">Requirements</h2>
                </div>
                <div className="p-5 space-y-5">
                  {/* Project Type */}
                  {req.projectType && (
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Project Type</p>
                        <p className="text-sm text-foreground">{req.projectType}</p>
                      </div>
                    </div>
                  )}

                  {/* Platforms */}
                  {Array.isArray(req.platforms) && req.platforms.length > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Platforms</p>
                        <div className="flex flex-wrap gap-2">
                          {req.platforms.map((platform, index) => (
                            <span
                              key={index}
                              className="inline-flex px-2.5 py-1 rounded-full text-xs border border-border bg-muted/30 text-muted-foreground"
                            >
                              {platform}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dimensions */}
                  {Array.isArray(req.dimensions) && req.dimensions.length > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                        <Maximize2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Dimensions</p>
                        <div className="flex flex-wrap gap-2">
                          {req.dimensions.map((dimension, index) => (
                            <span
                              key={index}
                              className="inline-flex px-2.5 py-1 rounded-full text-xs border border-border bg-muted/30 text-muted-foreground"
                            >
                              {dimension}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Key Message */}
                  {req.keyMessage && (
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                        <Target className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Key Message</p>
                        <p className="text-sm text-muted-foreground">{req.keyMessage}</p>
                      </div>
                    </div>
                  )}

                  {/* Deliverables */}
                  {Array.isArray(req.deliverables) && req.deliverables.length > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                        <ListChecks className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Deliverables</p>
                        <ul className="space-y-1.5">
                          {req.deliverables.map((deliverable, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <span className="text-muted-foreground mt-1.5">•</span>
                              {deliverable}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Additional Notes */}
                  {req.additionalNotes && (
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                        <StickyNote className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Additional Notes</p>
                        <p className="text-sm text-muted-foreground">{req.additionalNotes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </GlassCard>
            );
          })()}

          {/* Reference Files */}
          {attachments.length > 0 && (
            <GlassCard>
              <div className="p-5 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-medium text-foreground">Your Attachments</h2>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Reference files you provided</p>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {attachments.map((file) => (
                    <div
                      key={file.id}
                      className="group relative rounded-lg overflow-hidden border border-border/40"
                    >
                      {file.fileType.startsWith("image/") ? (
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block aspect-video relative bg-muted"
                        >
                          <Image
                            src={file.fileUrl}
                            alt={file.fileName}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ExternalLink className="h-6 w-6 text-foreground" />
                          </div>
                        </a>
                      ) : (
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center p-4 aspect-video bg-muted hover:bg-muted transition-colors"
                        >
                          <FileIcon className="h-10 w-10 text-muted-foreground mb-2" />
                          <p className="text-xs text-center text-muted-foreground truncate w-full">
                            {file.fileName}
                          </p>
                        </a>
                      )}
                      <div className="p-2 bg-background">
                        <p className="text-xs text-muted-foreground truncate">{file.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.fileSize / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Task Details */}
          <GlassCard>
            <div className="p-5 border-b border-border/40">
              <h2 className="text-sm font-medium text-foreground">Details</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center">
                  <Coins className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Credits Used</p>
                  <p className="text-sm font-medium text-foreground">{task.creditsUsed} credits</p>
                </div>
              </div>

              <div className="h-px bg-muted/40" />

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Revisions</p>
                  <p className="text-sm font-medium text-foreground">
                    {task.revisionsUsed} / {task.maxRevisions} used
                  </p>
                </div>
              </div>

              {task.estimatedHours && (
                <>
                  <div className="h-px bg-muted/40" />
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Estimated Time</p>
                      <p className="text-sm font-medium text-foreground">{task.estimatedHours} hours</p>
                    </div>
                  </div>
                </>
              )}

              <div className="h-px bg-muted/40" />

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {task.deadline && (
                <>
                  <div className="h-px bg-muted/40" />
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Deadline</p>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(task.deadline).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {task.completedAt && (
                <>
                  <div className="h-px bg-muted/40" />
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Completed</p>
                      <p className="text-sm font-medium text-green-400">
                        {new Date(task.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </GlassCard>

          {/* Assigned Freelancer */}
          {task.freelancer && (
            <GlassCard>
              <div className="p-5 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-medium text-foreground">Designer</h2>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={task.freelancer.image || undefined} />
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      {task.freelancer.name?.[0]?.toUpperCase() || "F"}
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
            </GlassCard>
          )}

          {/* Waiting for Assignment */}
          {!task.freelancer && (task.status === "PENDING" || task.status === "ASSIGNED") && (
            <GlassCard className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">Finding Designer</p>
              <p className="text-sm text-muted-foreground mt-1">
                We&apos;re matching you with the best designer for this task
              </p>
            </GlassCard>
          )}
        </div>
      </div>

      {/* Full Screen Chat Modal */}
      {showFullChat && (
        <div className="fixed inset-0 z-50 bg-background">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFullChat(false)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg"
              >
                <X className="h-5 w-5" />
              </Button>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{task.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border",
                    status.bgColor,
                    status.color
                  )}>
                    {status.icon}
                    {status.label}
                  </span>
                  {task.freelancer && (
                    <span className="text-xs text-muted-foreground">
                      with {task.freelancer.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {(isInReview || task.status === "REVISION_REQUESTED") && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Revisions: {task.revisionsUsed}/{task.maxRevisions}
                </span>
                {isInReview && deliverables.length > 0 && (
                  <Button
                    onClick={handleApprove}
                    disabled={isApproving}
                    className="bg-green-600 hover:bg-green-700 text-foreground"
                  >
                    {isApproving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ThumbsUp className="h-4 w-4 mr-2" />
                    )}
                    Approve & Complete
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto h-[calc(100vh-180px)] p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {task.messages.length === 0 && deliverables.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                    <MessageSquare className="h-10 w-10 text-muted" />
                  </div>
                  <p className="text-lg text-muted-foreground">No messages yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Your designer will communicate with you here</p>
                </div>
              ) : (
                <>
                  {/* Show messages */}
                  {task.messages.map((msg) => (
                    <div key={msg.id} className="flex gap-4">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={msg.senderImage || undefined} />
                        <AvatarFallback className="bg-muted text-muted-foreground">
                          {msg.senderName?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-medium text-foreground">
                            {msg.senderName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-2 whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>
                    </div>
                  ))}

                  {/* Show deliverables inline if in review */}
                  {deliverables.length > 0 && (isInReview || task.status === "COMPLETED") && (
                    <div className="my-6 p-6 rounded-xl border border-border/60 bg-muted/50">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-green-400" />
                        </div>
                        <div>
                          <span className="font-medium text-foreground">Deliverables submitted</span>
                          <p className="text-xs text-muted-foreground">{deliverables.length} file{deliverables.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {deliverables.map((file) => (
                          <div
                            key={file.id}
                            className="group relative rounded-lg overflow-hidden border border-border/40"
                          >
                            {file.fileType.startsWith("image/") ? (
                              <a
                                href={file.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block aspect-video relative bg-muted"
                              >
                                <Image
                                  src={file.fileUrl}
                                  alt={file.fileName}
                                  fill
                                  className="object-cover"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <ExternalLink className="h-5 w-5 text-foreground" />
                                </div>
                              </a>
                            ) : (
                              <a
                                href={file.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center justify-center p-4 aspect-video bg-muted hover:bg-muted transition-colors"
                              >
                                <FileIcon className="h-10 w-10 text-green-400/50 mb-2" />
                                <p className="text-xs text-center text-muted-foreground truncate w-full">
                                  {file.fileName}
                                </p>
                              </a>
                            )}
                            <div className="p-3 bg-background flex items-center justify-between">
                              <p className="text-sm text-muted-foreground truncate flex-1">{file.fileName}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              >
                                <a href={file.fileUrl} download>
                                  <Download className="h-4 w-4" />
                                </a>
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

          {/* Feedback Analysis Result - Full Chat */}
          {feedbackAnalysis && (
            <div className="px-6 pb-2">
              <div className={cn(
                "max-w-3xl mx-auto p-4 rounded-lg border",
                feedbackAnalysis.isRevision
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-orange-500/30 bg-orange-500/5"
              )}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    feedbackAnalysis.isRevision ? "bg-green-500/10" : "bg-orange-500/10"
                  )}>
                    {feedbackAnalysis.isRevision ? (
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-orange-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={cn(
                      "text-sm font-medium",
                      feedbackAnalysis.isRevision ? "text-green-400" : "text-orange-400"
                    )}>
                      {feedbackAnalysis.isRevision
                        ? `Included in your revisions (${task.revisionsUsed}/${task.maxRevisions} used)`
                        : "This may require additional credits"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{feedbackAnalysis.reason}</p>
                    {!feedbackAnalysis.isRevision && feedbackAnalysis.estimatedCredits && (
                      <p className="text-xs text-orange-400 mt-1">
                        Estimated: {feedbackAnalysis.estimatedCredits} credits
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={() => handleSendMessage(feedbackAnalysis.isRevision)}
                    disabled={isSendingMessage}
                    size="sm"
                    className={cn(
                      feedbackAnalysis.isRevision
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-orange-600 hover:bg-orange-700",
                      "text-foreground"
                    )}
                  >
                    {isSendingMessage ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : null}
                    {feedbackAnalysis.isRevision ? "Continue Chatting" : "Request Anyway"}
                  </Button>
                  <Button
                    onClick={() => setFeedbackAnalysis(null)}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Message Input - Full Chat */}
          {canChat && !feedbackAnalysis && (
            <div className="px-6 py-4 border-t border-border/40">
              <div className="max-w-3xl mx-auto">
                <div className="flex gap-3">
                  <Textarea
                    placeholder={isInReview ? "Share your feedback on the deliverables..." : "Type your message..."}
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
                    className="flex-1 min-h-[60px] max-h-[120px] bg-muted border-border text-foreground placeholder:text-muted-foreground resize-none"
                  />
                  <div className="flex flex-col justify-end gap-2">
                    {isInReview ? (
                      <Button
                        onClick={analyzeFeedback}
                        disabled={!message.trim() || isAnalyzing}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 px-6"
                      >
                        {isAnalyzing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleSendMessage()}
                        disabled={!message.trim() || isSendingMessage}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 px-6"
                      >
                        {isSendingMessage ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                {isInReview && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {hasRevisionsLeft
                      ? "Your feedback will be analyzed to determine if it's covered by your revisions"
                      : "No revisions left - additional feedback may cost credits"}
                  </p>
                )}
              </div>
            </div>
          )}

          {!canChat && task.status === "COMPLETED" && (
            <div className="px-6 py-6 border-t border-border/40">
              <div className="max-w-3xl mx-auto text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto text-green-400 mb-2" />
                <p className="text-sm text-green-400 font-medium">Task Completed</p>
                <p className="text-xs text-muted-foreground mt-1">Thank you for using our service!</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
