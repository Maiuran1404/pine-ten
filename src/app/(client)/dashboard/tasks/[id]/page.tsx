"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    className={cn("rounded-xl overflow-hidden border border-[#2a2a30]/50", className)}
    style={{
      background: 'linear-gradient(180deg, rgba(20, 20, 24, 0.6) 0%, rgba(12, 12, 15, 0.8) 100%)',
      backdropFilter: 'blur(12px)',
    }}
  >
    {children}
  </div>
);

export default function TaskDetailPage() {
  const params = useParams();
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchTask(params.id as string);
    }
  }, [params.id]);

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

  if (isLoading) {
    return (
      <div className="min-h-full bg-[#0a0a0a] p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg bg-[#2a2a30]" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-64 bg-[#2a2a30]" />
            <Skeleton className="h-4 w-32 bg-[#2a2a30]" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <GlassCard className="p-6">
              <Skeleton className="h-6 w-32 bg-[#2a2a30]" />
              <Skeleton className="h-32 w-full mt-4 bg-[#2a2a30]" />
            </GlassCard>
          </div>
          <div>
            <GlassCard className="p-6">
              <Skeleton className="h-6 w-24 bg-[#2a2a30]" />
              <Skeleton className="h-24 w-full mt-4 bg-[#2a2a30]" />
            </GlassCard>
          </div>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-full bg-[#0a0a0a] p-6 space-y-6">
        <Button
          variant="ghost"
          asChild
          className="text-[#6b6b6b] hover:text-white hover:bg-[#2a2a30]/50"
        >
          <Link href="/dashboard/tasks">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Link>
        </Button>
        <GlassCard className="p-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-[#6b6b6b] mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            {error || "Task not found"}
          </h2>
          <p className="text-[#6b6b6b] mb-4">
            The task you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have permission to view it.
          </p>
          <Button asChild className="bg-white text-black hover:bg-white/90">
            <Link href="/dashboard/tasks">View All Tasks</Link>
          </Button>
        </GlassCard>
      </div>
    );
  }

  const status = statusConfig[task.status] || statusConfig.PENDING;

  return (
    <div className="min-h-full bg-[#0a0a0a] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="text-[#6b6b6b] hover:text-white hover:bg-[#2a2a30]/50 rounded-lg"
          >
            <Link href="/dashboard/tasks">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-white">{task.title}</h1>
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
                <span className="inline-flex px-2.5 py-1 rounded-full text-xs border border-[#2a2a30] text-[#6b6b6b]">
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
          {/* Description */}
          <GlassCard>
            <div className="p-5 border-b border-[#2a2a30]/40">
              <h2 className="text-sm font-medium text-white">Description</h2>
            </div>
            <div className="p-5">
              <p className="text-[#9a9a9a] whitespace-pre-wrap">{task.description}</p>
            </div>
          </GlassCard>

          {/* Requirements */}
          {task.requirements && Object.keys(task.requirements).length > 0 && (
            <GlassCard>
              <div className="p-5 border-b border-[#2a2a30]/40">
                <h2 className="text-sm font-medium text-white">Requirements</h2>
              </div>
              <div className="p-5">
                <pre className="text-sm text-[#9a9a9a] bg-[#0a0a0a] p-4 rounded-lg overflow-auto border border-[#2a2a30]/40">
                  {JSON.stringify(task.requirements, null, 2)}
                </pre>
              </div>
            </GlassCard>
          )}

          {/* Reference Files */}
          {task.files.filter(f => !f.isDeliverable).length > 0 && (
            <GlassCard>
              <div className="p-5 border-b border-[#2a2a30]/40">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-[#6b6b6b]" />
                  <h2 className="text-sm font-medium text-white">Your Attachments</h2>
                </div>
                <p className="text-xs text-[#4a4a4a] mt-1">Reference files you provided</p>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {task.files.filter(f => !f.isDeliverable).map((file) => (
                    <div
                      key={file.id}
                      className="group relative rounded-lg overflow-hidden border border-[#2a2a30]/40"
                    >
                      {file.fileType.startsWith("image/") ? (
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block aspect-video relative bg-[#1a1a1f]"
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
                          className="flex flex-col items-center justify-center p-4 aspect-video bg-[#1a1a1f] hover:bg-[#2a2a30] transition-colors"
                        >
                          <FileIcon className="h-10 w-10 text-[#4a4a4a] mb-2" />
                          <p className="text-xs text-center text-[#6b6b6b] truncate w-full">
                            {file.fileName}
                          </p>
                        </a>
                      )}
                      <div className="p-2 bg-[#0a0a0a]">
                        <p className="text-xs text-[#9a9a9a] truncate">{file.fileName}</p>
                        <p className="text-xs text-[#4a4a4a]">
                          {(file.fileSize / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          )}

          {/* Deliverables */}
          {task.files.filter(f => f.isDeliverable).length > 0 && (
            <GlassCard>
              <div className="p-5 border-b border-[#2a2a30]/40">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-green-400" />
                  <h2 className="text-sm font-medium text-white">Deliverables</h2>
                </div>
                <p className="text-xs text-[#4a4a4a] mt-1">Files delivered by the designer</p>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {task.files.filter(f => f.isDeliverable).map((file) => (
                    <div
                      key={file.id}
                      className="group relative rounded-lg overflow-hidden border border-green-500/20"
                    >
                      {file.fileType.startsWith("image/") ? (
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block aspect-video relative bg-[#1a1a1f]"
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
                          className="flex flex-col items-center justify-center p-4 aspect-video bg-[#1a1a1f] hover:bg-[#2a2a30] transition-colors"
                        >
                          <FileIcon className="h-10 w-10 text-green-400/50 mb-2" />
                          <p className="text-xs text-center text-[#6b6b6b] truncate w-full">
                            {file.fileName}
                          </p>
                        </a>
                      )}
                      <div className="p-2 bg-[#0a0a0a] flex items-center justify-between">
                        <div>
                          <p className="text-xs text-[#9a9a9a] truncate">{file.fileName}</p>
                          <p className="text-xs text-[#4a4a4a]">
                            {(file.fileSize / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="h-8 w-8 p-0 text-[#6b6b6b] hover:text-white hover:bg-[#2a2a30]"
                        >
                          <a href={file.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          )}

          {/* Messages */}
          {task.messages.length > 0 && (
            <GlassCard>
              <div className="p-5 border-b border-[#2a2a30]/40">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-[#6b6b6b]" />
                  <h2 className="text-sm font-medium text-white">Messages</h2>
                </div>
              </div>
              <div className="p-5 space-y-4">
                {task.messages.map((message) => (
                  <div key={message.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={message.senderImage || undefined} />
                      <AvatarFallback className="bg-[#2a2a30] text-[#6b6b6b] text-xs">
                        {message.senderName?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-white">
                          {message.senderName}
                        </span>
                        <span className="text-xs text-[#4a4a4a]">
                          {new Date(message.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-[#9a9a9a] mt-1">{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Task Details */}
          <GlassCard>
            <div className="p-5 border-b border-[#2a2a30]/40">
              <h2 className="text-sm font-medium text-white">Details</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#2a2a30]/50 flex items-center justify-center">
                  <Coins className="h-4 w-4 text-[#6b6b6b]" />
                </div>
                <div>
                  <p className="text-xs text-[#4a4a4a]">Credits Used</p>
                  <p className="text-sm font-medium text-white">{task.creditsUsed} credits</p>
                </div>
              </div>

              <div className="h-px bg-[#2a2a30]/40" />

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#2a2a30]/50 flex items-center justify-center">
                  <RefreshCw className="h-4 w-4 text-[#6b6b6b]" />
                </div>
                <div>
                  <p className="text-xs text-[#4a4a4a]">Revisions</p>
                  <p className="text-sm font-medium text-white">
                    {task.revisionsUsed} / {task.maxRevisions} used
                  </p>
                </div>
              </div>

              {task.estimatedHours && (
                <>
                  <div className="h-px bg-[#2a2a30]/40" />
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#2a2a30]/50 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-[#6b6b6b]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#4a4a4a]">Estimated Time</p>
                      <p className="text-sm font-medium text-white">{task.estimatedHours} hours</p>
                    </div>
                  </div>
                </>
              )}

              <div className="h-px bg-[#2a2a30]/40" />

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#2a2a30]/50 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-[#6b6b6b]" />
                </div>
                <div>
                  <p className="text-xs text-[#4a4a4a]">Created</p>
                  <p className="text-sm font-medium text-white">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {task.deadline && (
                <>
                  <div className="h-px bg-[#2a2a30]/40" />
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#2a2a30]/50 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-[#6b6b6b]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#4a4a4a]">Deadline</p>
                      <p className="text-sm font-medium text-white">
                        {new Date(task.deadline).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {task.completedAt && (
                <>
                  <div className="h-px bg-[#2a2a30]/40" />
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-[#4a4a4a]">Completed</p>
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
              <div className="p-5 border-b border-[#2a2a30]/40">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-[#6b6b6b]" />
                  <h2 className="text-sm font-medium text-white">Designer</h2>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={task.freelancer.image || undefined} />
                    <AvatarFallback className="bg-[#2a2a30] text-[#6b6b6b]">
                      {task.freelancer.name?.[0]?.toUpperCase() || "F"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-white">{task.freelancer.name}</p>
                    {task.assignedAt && (
                      <p className="text-xs text-[#4a4a4a]">
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
              <div className="w-12 h-12 rounded-full bg-[#2a2a30]/50 flex items-center justify-center mx-auto mb-3">
                <Clock className="h-6 w-6 text-[#6b6b6b]" />
              </div>
              <p className="font-medium text-white">Finding Designer</p>
              <p className="text-sm text-[#4a4a4a] mt-1">
                We&apos;re matching you with the best designer for this task
              </p>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
