"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquarePlus, Calendar, Coins, Clock, CheckCircle2, AlertCircle, RefreshCw, User, Palette } from "lucide-react";
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

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  creditsUsed: number;
  estimatedHours: string | null;
  deadline?: string | null;
  assignedAt?: string | null;
  moodboardItems?: MoodboardItem[];
  freelancer?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
}

const statusConfig: Record<string, { color: string; bgColor: string; label: string; icon: React.ReactNode }> = {
  PENDING: { color: "text-yellow-400", bgColor: "bg-yellow-500/10 border-yellow-500/20", label: "Queued", icon: <Clock className="h-3 w-3" /> },
  OFFERED: { color: "text-cyan-400", bgColor: "bg-cyan-500/10 border-cyan-500/20", label: "Queued", icon: <Clock className="h-3 w-3" /> },
  ASSIGNED: { color: "text-blue-400", bgColor: "bg-blue-500/10 border-blue-500/20", label: "Assigned", icon: <Clock className="h-3 w-3" /> },
  IN_PROGRESS: { color: "text-purple-400", bgColor: "bg-purple-500/10 border-purple-500/20", label: "In Progress", icon: <RefreshCw className="h-3 w-3" /> },
  IN_REVIEW: { color: "text-orange-400", bgColor: "bg-orange-500/10 border-orange-500/20", label: "In Review", icon: <Clock className="h-3 w-3" /> },
  PENDING_ADMIN_REVIEW: { color: "text-amber-400", bgColor: "bg-amber-500/10 border-amber-500/20", label: "Admin Review", icon: <Clock className="h-3 w-3" /> },
  REVISION_REQUESTED: { color: "text-red-400", bgColor: "bg-red-500/10 border-red-500/20", label: "Revision", icon: <AlertCircle className="h-3 w-3" /> },
  COMPLETED: { color: "text-green-400", bgColor: "bg-green-500/10 border-green-500/20", label: "Completed", icon: <CheckCircle2 className="h-3 w-3" /> },
  CANCELLED: { color: "text-red-400", bgColor: "bg-red-500/10 border-red-500/20", label: "Cancelled", icon: <AlertCircle className="h-3 w-3" /> },
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchTasks();

    // Poll for updates every 30 seconds
    const interval = setInterval(() => {
      fetchTasks();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchTasks = async () => {
    try {
      // Explicitly request client view to show tasks the user created
      const response = await fetch("/api/tasks?limit=50&view=client");
      if (response.ok) {
        const result = await response.json();
        // API uses successResponse which wraps data in { success: true, data: ... }
        setTasks(result.data?.tasks || result.tasks || []);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === "all") return true;
    if (filter === "active")
      return !["COMPLETED", "CANCELLED"].includes(task.status);
    if (filter === "completed") return task.status === "COMPLETED";
    return true;
  });

  const TaskCard = ({ task }: { task: Task }) => {
    const status = statusConfig[task.status] || statusConfig.PENDING;
    const thumbnailItem = task.moodboardItems?.find(item => item.type === "style" || item.type === "image" || item.type === "upload");
    const hasFreelancer = task.freelancer && task.freelancer.name;

    return (
      <Link href={`/dashboard/tasks/${task.id}`}>
        <div
          className="group relative rounded-xl overflow-hidden border border-border hover:border-border/80 transition-all cursor-pointer h-full bg-card"
        >
          {/* Thumbnail Preview */}
          {thumbnailItem ? (
            <div className="aspect-[16/9] relative bg-muted overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbnailItem.imageUrl}
                alt={thumbnailItem.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <span className={cn(
                "absolute top-2 right-2 inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs border backdrop-blur-sm",
                status.bgColor,
                status.color
              )}>
                {status.icon}
                <span className="hidden sm:inline">{status.label}</span>
              </span>
            </div>
          ) : (
            <div className="aspect-[16/9] relative bg-muted flex items-center justify-center">
              <Palette className="h-8 w-8 text-muted-foreground/50" />
              <span className={cn(
                "absolute top-2 right-2 inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs border",
                status.bgColor,
                status.color
              )}>
                {status.icon}
                <span className="hidden sm:inline">{status.label}</span>
              </span>
            </div>
          )}

          <div className="p-3 sm:p-4">
            {/* Title */}
            <h3 className="text-sm sm:text-base text-foreground font-medium line-clamp-1 group-hover:text-foreground/90 transition-colors">
              {task.title}
            </h3>

            {/* Description */}
            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
              {task.description}
            </p>

            {/* Footer with Artist & Meta */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              {/* Artist Info */}
              {hasFreelancer ? (
                <div className="flex items-center gap-2">
                  {task.freelancer?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={task.freelancer.image}
                      alt={task.freelancer.name || "Artist"}
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                    {task.freelancer?.name?.split(" ")[0]}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Finding artist...</span>
                </div>
              )}

              {/* Credits */}
              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                <Coins className="h-3 w-3" />
                {task.creditsUsed}
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-full bg-background p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">My Tasks</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-0.5 sm:mt-1">
            View and manage all your design projects
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/dashboard">
            <MessageSquarePlus className="h-4 w-4 mr-2" />
            New Request
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1">
        {[
          { value: "all", label: "All Tasks" },
          { value: "active", label: "Active" },
          { value: "completed", label: "Completed" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              "px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0",
              filter === tab.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border p-4 sm:p-5 bg-card"
            >
              <Skeleton className="h-4 sm:h-5 w-3/4" />
              <Skeleton className="h-3 sm:h-4 w-full mt-2 sm:mt-3" />
              <Skeleton className="h-3 sm:h-4 w-2/3 mt-2" />
              <div className="flex gap-3 sm:gap-4 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border">
                <Skeleton className="h-3 sm:h-4 w-16 sm:w-20" />
                <Skeleton className="h-3 sm:h-4 w-12 sm:w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div
          className="rounded-xl border border-border p-8 sm:p-12 text-center bg-card"
        >
          <p className="text-sm sm:text-base text-muted-foreground mb-4">
            {filter === "all"
              ? "No tasks yet. Create your first design request!"
              : `No ${filter} tasks found.`}
          </p>
          {filter === "all" && (
            <Button asChild className="w-full sm:w-auto">
              <Link href="/dashboard">
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                New Request
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
