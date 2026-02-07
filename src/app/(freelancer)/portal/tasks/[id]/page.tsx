"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Coins,
  FileText,
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Download,
  Image as ImageIcon,
  FileIcon,
  ExternalLink,
  Upload,
  Send,
  Paperclip,
  XCircle,
  AlertTriangle,
  Palette,
  History,
  Check,
  Play,
} from "lucide-react";
import { LoadingSpinner } from "@/components/shared/loading";
import { BrandDNA } from "@/components/freelancer/brand-dna";
import { PreviousDeliverables } from "@/components/freelancer/previous-deliverables";
import {
  calculateWorkingDeadline,
  getDeadlineUrgency,
  formatTimeRemaining,
  cn,
} from "@/lib/utils";

interface UploadedFile {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

interface BrandDNAType {
  name: string;
  website?: string | null;
  industry?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  colors: {
    primary?: string | null;
    secondary?: string | null;
    accent?: string | null;
    background?: string | null;
    text?: string | null;
    additional?: string[];
  };
  typography: {
    primaryFont?: string | null;
    secondaryFont?: string | null;
  };
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
  } | null;
  brandAssets?: {
    images?: string[];
    documents?: string[];
  } | null;
  tagline?: string | null;
  keywords?: string[] | null;
}

interface PreviousWorkTask {
  taskId: string;
  taskTitle: string;
  taskStatus: string;
  completedAt: string | null;
  categoryName: string | null;
  deliverables: {
    id: string;
    taskId: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    createdAt: string;
  }[];
}

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
  brandDNA?: BrandDNAType | null;
  previousWork?: PreviousWorkTask[];
}

const statusConfig: Record<
  string,
  { variant: "default" | "secondary" | "destructive" | "outline"; label: string; icon: React.ReactNode }
> = {
  PENDING: {
    variant: "secondary",
    label: "Pending",
    icon: <Clock className="h-4 w-4" />,
  },
  ASSIGNED: {
    variant: "outline",
    label: "Assigned",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  IN_PROGRESS: {
    variant: "default",
    label: "In Progress",
    icon: <RefreshCw className="h-4 w-4" />,
  },
  IN_REVIEW: {
    variant: "outline",
    label: "In Review",
    icon: <FileText className="h-4 w-4" />,
  },
  PENDING_ADMIN_REVIEW: {
    variant: "outline",
    label: "Under Review",
    icon: <Clock className="h-4 w-4" />,
  },
  REVISION_REQUESTED: {
    variant: "destructive",
    label: "Revision Requested",
    icon: <AlertCircle className="h-4 w-4" />,
  },
  COMPLETED: {
    variant: "secondary",
    label: "Completed",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  CANCELLED: {
    variant: "destructive",
    label: "Cancelled",
    icon: <AlertCircle className="h-4 w-4" />,
  },
};

// Workflow steps for the stepper
const workflowSteps = [
  { status: "ASSIGNED", label: "Assigned" },
  { status: "IN_PROGRESS", label: "In Progress" },
  { status: "IN_REVIEW", label: "In Review" },
  { status: "COMPLETED", label: "Completed" },
];

function WorkflowStepper({ currentStatus }: { currentStatus: string }) {
  const statusOrder = ["ASSIGNED", "IN_PROGRESS", "IN_REVIEW", "COMPLETED"];
  const currentIndex = statusOrder.indexOf(currentStatus);
  const isRevision = currentStatus === "REVISION_REQUESTED";

  return (
    <div className="flex items-center justify-between w-full">
      {workflowSteps.map((step, index) => {
        const isCompleted = currentIndex > index || currentStatus === "COMPLETED";
        const isCurrent = currentStatus === step.status || (isRevision && step.status === "IN_PROGRESS");
        const isRevisionStep = isRevision && step.status === "IN_PROGRESS";

        return (
          <div key={step.status} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  isCompleted && "bg-green-500 text-white",
                  isCurrent && !isRevisionStep && "bg-primary text-primary-foreground",
                  isRevisionStep && "bg-orange-500 text-white",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : isRevisionStep ? (
                  <RefreshCw className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  "text-xs mt-1.5 text-center whitespace-nowrap",
                  (isCompleted || isCurrent) ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {isRevisionStep ? "Revision" : step.label}
              </span>
            </div>
            {index < workflowSteps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 mt-[-16px]",
                  currentIndex > index ? "bg-green-500" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function FreelancerTaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("brief");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (params.id) {
      fetchTask(params.id as string);
    }
  }, [params.id]);

  // Auto-switch to submit tab when revision is requested
  useEffect(() => {
    if (task?.status === "REVISION_REQUESTED") {
      setActiveTab("submit");
    }
  }, [task?.status]);

  const fetchTask = async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}`);
      if (response.ok) {
        const data = await response.json();
        setTask(data.task);
      } else if (response.status === 404) {
        setError("Task not found. It may have been deleted or the link is incorrect.");
      } else if (response.status === 403) {
        setError("You don't have access to this task. It may not be assigned to you.");
      } else if (response.status === 401) {
        setError("Please log in to view this task.");
      } else {
        const data = await response.json().catch(() => null);
        setError(data?.error || "Something went wrong. Please try again later.");
      }
    } catch (err) {
      console.error("Failed to fetch task:", err);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "deliverables");

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Upload failed");
        }

        const data = await response.json();
        return (data.data?.file || data.file) as UploadedFile;
      });

      const newFiles = await Promise.all(uploadPromises);
      setUploadedFiles((prev) => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} file(s) uploaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload files");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeFile = (fileUrl: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.fileUrl !== fileUrl));
  };

  const handleSubmitDeliverable = async () => {
    if (uploadedFiles.length === 0) {
      toast.error("Please upload at least one file");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/freelancer/submit-deliverable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task?.id,
          files: uploadedFiles,
          message,
        }),
      });

      if (response.ok) {
        toast.success("Deliverable submitted! It's now under review.");
        setUploadedFiles([]);
        setMessage("");
        setActiveTab("history");
        fetchTask(params.id as string);
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit deliverable");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartTask = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/freelancer/start-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task?.id }),
      });

      if (response.ok) {
        toast.success("Task started!");
        fetchTask(params.id as string);
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to start task");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isImage = (fileType: string) => fileType.startsWith("image/");

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-0">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="space-y-6 p-4 sm:p-0">
        <Button variant="ghost" asChild>
          <Link href="/portal/tasks">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {error || "Task not found"}
            </h2>
            <Button asChild>
              <Link href="/portal/tasks">View My Tasks</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = statusConfig[task.status] || statusConfig.PENDING;
  const clientAttachments = task.files.filter((f) => !f.isDeliverable);
  const deliverables = task.files.filter((f) => f.isDeliverable);
  const canSubmit = ["ASSIGNED", "IN_PROGRESS", "REVISION_REQUESTED"].includes(task.status);
  const canStart = task.status === "ASSIGNED";

  // Calculate deadline info for sidebar
  const workingDeadline = calculateWorkingDeadline(task.assignedAt, task.deadline);
  const urgency = getDeadlineUrgency(task.deadline, workingDeadline);
  const isActiveTask = ["ASSIGNED", "IN_PROGRESS", "REVISION_REQUESTED"].includes(task.status);

  const urgencyStyles: Record<string, string> = {
    overdue: "text-destructive",
    urgent: "text-orange-500",
    warning: "text-yellow-600",
    safe: "text-foreground",
  };

  const urgencyBgStyles: Record<string, string> = {
    overdue: "bg-destructive/10 border-destructive/20",
    urgent: "bg-orange-500/10 border-orange-500/20",
    warning: "bg-yellow-500/10 border-yellow-500/20",
    safe: "",
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="flex items-start gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/portal/tasks">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{task.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge variant={status.variant} className="flex items-center gap-1">
              {status.icon}
              {status.label}
            </Badge>
            {task.category && (
              <Badge variant="outline">{task.category.name}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Primary CTA Banner — full width, top of page */}
      {task.status === "ASSIGNED" && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-800/40 flex items-center justify-center shrink-0">
              <Play className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-emerald-800 dark:text-emerald-300">Ready to start</p>
              <p className="text-sm text-emerald-700/70 dark:text-emerald-400/70">Review the brief below, then begin working on this task</p>
            </div>
          </div>
          <Button onClick={handleStartTask} disabled={isSubmitting} size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
            {isSubmitting ? <LoadingSpinner size="sm" className="mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            Start Working
          </Button>
        </div>
      )}
      {task.status === "IN_PROGRESS" && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border-2 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Work in progress</p>
              <p className="text-sm text-muted-foreground">Upload your completed deliverables when ready</p>
            </div>
          </div>
          <Button size="lg" className="shrink-0" onClick={() => setActiveTab("submit")}>
            <Upload className="h-4 w-4 mr-2" />
            Submit Deliverable
          </Button>
        </div>
      )}
      {task.status === "REVISION_REQUESTED" && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border-2 border-orange-500 bg-orange-50 dark:bg-orange-900/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
            <div>
              <p className="font-semibold text-orange-800 dark:text-orange-300">Revision requested</p>
              <p className="text-sm text-orange-700/70 dark:text-orange-400/70">The client has requested changes. Review feedback and resubmit.</p>
            </div>
          </div>
          <Button size="lg" variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-500/10 shrink-0" onClick={() => setActiveTab("submit")}>
            <Upload className="h-4 w-4 mr-2" />
            Submit Revision
          </Button>
        </div>
      )}
      {(task.status === "IN_REVIEW" || task.status === "PENDING_ADMIN_REVIEW") && (
        <div className="flex items-center gap-4 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-800/40 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-emerald-800 dark:text-emerald-300">Submitted successfully</p>
            <p className="text-sm text-emerald-700/70 dark:text-emerald-400/70">Your work is being reviewed. You&apos;ll be notified of any updates.</p>
          </div>
        </div>
      )}

      {/* Workflow Stepper */}
      {!["PENDING", "CANCELLED"].includes(task.status) && (
        <Card className="p-4">
          <WorkflowStepper currentStatus={task.status} />
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content with Tabs */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="brief" className="flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Brief</span>
              </TabsTrigger>
              {task.brandDNA && (
                <TabsTrigger value="brand" className="flex items-center gap-1.5">
                  <Palette className="h-4 w-4" />
                  <span className="hidden sm:inline">Brand</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="files" className="flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Files</span>
                {clientAttachments.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {clientAttachments.length}
                  </Badge>
                )}
              </TabsTrigger>
              {canSubmit && (
                <TabsTrigger value="submit" className="flex items-center gap-1.5">
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Submit</span>
                  {task.status === "REVISION_REQUESTED" && (
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  )}
                </TabsTrigger>
              )}
              <TabsTrigger value="history" className="flex items-center gap-1.5">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
                {deliverables.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {deliverables.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Brief Tab */}
            <TabsContent value="brief" className="mt-4 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Task Brief</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{task.description}</p>
                </CardContent>
              </Card>

              {/* Chat History */}
              {task.chatHistory && task.chatHistory.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Client Requirements
                    </CardTitle>
                    <CardDescription>
                      Original conversation with the client
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto">
                      {task.chatHistory.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-4 py-2 ${
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {msg.attachments.map((att, attIdx) => (
                                  <a
                                    key={attIdx}
                                    href={att.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs underline"
                                  >
                                    <FileIcon className="h-3 w-3" />
                                    {att.fileName}
                                  </a>
                                ))}
                              </div>
                            )}
                            <p className="text-xs opacity-70 mt-1">
                              {msg.role === "user" ? "Client" : "AI Assistant"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Brand Tab */}
            {task.brandDNA && (
              <TabsContent value="brand" className="mt-4 space-y-6">
                <BrandDNA brandDNA={task.brandDNA} defaultExpanded />

                {/* Previous Work for this Company */}
                {task.previousWork && task.previousWork.length > 0 && (
                  <PreviousDeliverables
                    previousWork={task.previousWork}
                    companyName={task.brandDNA.name}
                  />
                )}
              </TabsContent>
            )}

            {/* Files Tab */}
            <TabsContent value="files" className="mt-4">
              {clientAttachments.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Reference Files
                    </CardTitle>
                    <CardDescription>
                      Files provided by the client for reference
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {clientAttachments.map((file) => (
                        <div
                          key={file.id}
                          className="group relative border rounded-lg overflow-hidden"
                        >
                          {isImage(file.fileType) ? (
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
                                <ExternalLink className="h-6 w-6 text-white" />
                              </div>
                            </a>
                          ) : (
                            <a
                              href={file.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex flex-col items-center justify-center p-4 aspect-video bg-muted hover:bg-muted/80 transition-colors"
                            >
                              <FileIcon className="h-10 w-10 text-muted-foreground mb-2" />
                              <p className="text-xs text-center truncate w-full">
                                {file.fileName}
                              </p>
                            </a>
                          )}
                          <div className="p-2 bg-background">
                            <p className="text-xs truncate">{file.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.fileSize / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No reference files</p>
                    <p className="text-muted-foreground mt-1">
                      The client hasn&apos;t provided any reference files for this task
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Submit Tab */}
            {canSubmit && (
              <TabsContent value="submit" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Submit Deliverable
                    </CardTitle>
                    <CardDescription>
                      Upload your completed work for review
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Uploaded files preview */}
                    {uploadedFiles.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {uploadedFiles.map((file) => (
                          <div
                            key={file.fileUrl}
                            className="relative group border rounded-lg p-2"
                          >
                            {isImage(file.fileType) ? (
                              <Image
                                src={file.fileUrl}
                                alt={file.fileName}
                                width={100}
                                height={100}
                                className="w-full aspect-square object-cover rounded"
                              />
                            ) : (
                              <div className="aspect-square flex items-center justify-center bg-muted rounded">
                                <FileIcon className="h-10 w-10 text-muted-foreground" />
                              </div>
                            )}
                            <p className="text-xs truncate mt-1">{file.fileName}</p>
                            <button
                              onClick={() => removeFile(file.fileUrl)}
                              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload button */}
                    <div>
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
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-full"
                      >
                        {isUploading ? (
                          <LoadingSpinner size="sm" className="mr-2" />
                        ) : (
                          <Paperclip className="h-4 w-4 mr-2" />
                        )}
                        {isUploading ? "Uploading..." : "Add Files"}
                      </Button>
                    </div>

                    {/* Message */}
                    <Textarea
                      placeholder="Add a note about your submission (optional)..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                    />

                    {/* Submit button */}
                    <Button
                      className="w-full"
                      onClick={handleSubmitDeliverable}
                      disabled={isSubmitting || uploadedFiles.length === 0}
                    >
                      {isSubmitting ? (
                        <LoadingSpinner size="sm" className="mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Submit for Review
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* History Tab */}
            <TabsContent value="history" className="mt-4">
              {deliverables.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Submission History
                    </CardTitle>
                    <CardDescription>
                      Your previous submissions for this task
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {deliverables.map((file, index) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {isImage(file.fileType) ? (
                              <Image
                                src={file.fileUrl}
                                alt={file.fileName}
                                width={48}
                                height={48}
                                className="rounded object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                                <FileText className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-sm">{file.fileName}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Submission #{deliverables.length - index}</span>
                                <span>•</span>
                                <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <a href={file.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No submissions yet</p>
                    <p className="text-muted-foreground mt-1">
                      Your deliverable submissions will appear here
                    </p>
                    {canSubmit && (
                      <Button className="mt-4" onClick={() => setActiveTab("submit")}>
                        <Upload className="h-4 w-4 mr-2" />
                        Submit Your First Deliverable
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sm:space-y-6">
          {/* Task Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Task Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Coins className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Task Value</p>
                  <p className="font-semibold text-lg">{task.creditsUsed} credits</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Revisions</p>
                  <p className="font-medium">
                    {task.revisionsUsed} / {task.maxRevisions} used
                  </p>
                </div>
              </div>

              {(() => {
                // Calculate artist deadline at 50% of the total time window
                const assignedDate = task.assignedAt ? new Date(task.assignedAt) : null;
                const clientDeadline = task.deadline ? new Date(task.deadline) : null;

                // Compute the artist deadline: 50% of (assigned → client deadline)
                // Fallback: use estimatedHours from assignedAt if no client deadline
                let artistDeadline: Date | null = null;
                if (assignedDate && clientDeadline) {
                  const totalMs = clientDeadline.getTime() - assignedDate.getTime();
                  artistDeadline = new Date(assignedDate.getTime() + totalMs * 0.5);
                } else if (assignedDate && task.estimatedHours) {
                  // Fallback: use estimated hours as the artist deadline
                  const estMs = parseFloat(task.estimatedHours) * 60 * 60 * 1000;
                  artistDeadline = new Date(assignedDate.getTime() + estMs);
                }

                if (!artistDeadline) return null;

                const now = new Date();
                const remainingMs = artistDeadline.getTime() - now.getTime();
                const isOverdue = remainingMs < 0;
                const absMs = Math.abs(remainingMs);
                const days = Math.floor(absMs / (1000 * 60 * 60 * 24));
                const hours = Math.floor((absMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const mins = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60));

                let countdown = "";
                if (days > 0) countdown = `${days}d ${hours}h`;
                else if (hours > 0) countdown = `${hours}h ${mins}m`;
                else countdown = `${mins}m`;

                const isUrgent = !isOverdue && remainingMs < 24 * 60 * 60 * 1000;

                return (
                  <>
                    <Separator />
                    <div className={cn(
                      "flex items-start gap-3 p-3 -mx-3 rounded-lg border",
                      isOverdue ? "bg-destructive/10 border-destructive/20" :
                      isUrgent ? "bg-orange-500/10 border-orange-500/20" :
                      "border-transparent"
                    )}>
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                        isOverdue ? "bg-destructive/10" : isUrgent ? "bg-orange-500/10" : "bg-muted"
                      )}>
                        {isOverdue ? (
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                        ) : (
                          <Clock className={cn("h-5 w-5", isUrgent ? "text-orange-500" : "text-muted-foreground")} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Your Deadline</p>
                        <p className={cn(
                          "font-medium",
                          isOverdue ? "text-destructive" : isUrgent ? "text-orange-500" : ""
                        )}>
                          {artistDeadline.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })},{" "}
                          {artistDeadline.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <p className={cn(
                          "text-sm",
                          isOverdue ? "text-destructive" : isUrgent ? "text-orange-500" : "text-muted-foreground"
                        )}>
                          ({isOverdue ? `overdue by ${countdown}` : `${countdown} remaining`})
                        </p>
                      </div>
                    </div>
                  </>
                );
              })()}

              <Separator />

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Assigned</p>
                  <p className="font-medium">
                    {task.assignedAt
                      ? new Date(task.assignedAt).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
              </div>

              {task.completedAt && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="font-medium">
                        {new Date(task.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
