"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquarePlus,
  Calendar,
  Coins,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  User,
  Palette,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

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
  PENDING: { color: "text-yellow-600", bgColor: "bg-yellow-50 border-yellow-200", label: "Queued", icon: <Clock className="h-3 w-3" /> },
  OFFERED: { color: "text-cyan-600", bgColor: "bg-cyan-50 border-cyan-200", label: "Queued", icon: <Clock className="h-3 w-3" /> },
  ASSIGNED: { color: "text-blue-600", bgColor: "bg-blue-50 border-blue-200", label: "Assigned", icon: <User className="h-3 w-3" /> },
  IN_PROGRESS: { color: "text-purple-600", bgColor: "bg-purple-50 border-purple-200", label: "In Progress", icon: <RefreshCw className="h-3 w-3" /> },
  IN_REVIEW: { color: "text-orange-600", bgColor: "bg-orange-50 border-orange-200", label: "In Review", icon: <Eye className="h-3 w-3" /> },
  PENDING_ADMIN_REVIEW: { color: "text-amber-600", bgColor: "bg-amber-50 border-amber-200", label: "Admin Review", icon: <Clock className="h-3 w-3" /> },
  REVISION_REQUESTED: { color: "text-red-600", bgColor: "bg-red-50 border-red-200", label: "Revision", icon: <AlertCircle className="h-3 w-3" /> },
  COMPLETED: { color: "text-green-600", bgColor: "bg-green-50 border-green-200", label: "Completed", icon: <CheckCircle2 className="h-3 w-3" /> },
  CANCELLED: { color: "text-red-600", bgColor: "bg-red-50 border-red-200", label: "Cancelled", icon: <AlertCircle className="h-3 w-3" /> },
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

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
    // Filter by status
    if (filter === "active" && ["COMPLETED", "CANCELLED"].includes(task.status)) return false;
    if (filter === "completed" && task.status !== "COMPLETED") return false;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const TaskRow = ({ task }: { task: Task }) => {
    const status = statusConfig[task.status] || statusConfig.PENDING;
    const thumbnailItem = task.moodboardItems?.find(item => item.type === "style" || item.type === "image" || item.type === "upload");

    return (
      <Link href={`/dashboard/tasks/${task.id}`}>
        <div className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 cursor-pointer group">
          {/* Thumbnail */}
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border">
            {thumbnailItem ? (
              <Image
                src={thumbnailItem.imageUrl}
                alt={thumbnailItem.name}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Palette className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Title and Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-foreground truncate group-hover:text-foreground/80">
                {task.title}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {task.description}
            </p>
          </div>

          {/* Designer */}
          <div className="hidden md:flex items-center gap-2 w-32 flex-shrink-0">
            {task.freelancer ? (
              <>
                {task.freelancer.image ? (
                  <Image
                    src={task.freelancer.image}
                    alt={task.freelancer.name || "Designer"}
                    width={20}
                    height={20}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-3 w-3 text-primary" />
                  </div>
                )}
                <span className="text-xs text-muted-foreground truncate">
                  {task.freelancer.name?.split(" ")[0]}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">Finding artist...</span>
            )}
          </div>

          {/* Date */}
          <div className="hidden sm:block text-xs text-muted-foreground w-24 text-right flex-shrink-0">
            {formatDate(task.createdAt)}
          </div>

          {/* Status */}
          <div className="flex-shrink-0">
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
              status.bgColor,
              status.color
            )}>
              {status.icon}
              <span className="hidden sm:inline">{status.label}</span>
            </span>
          </div>

          {/* Credits */}
          <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground w-16 justify-end flex-shrink-0">
            <Coins className="h-3 w-3" />
            {task.creditsUsed}
          </div>

          {/* More Actions */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Could open a dropdown menu here
            }}
          >
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">My Tasks</h1>
              <p className="text-muted-foreground mt-1">
                View and manage all your design projects
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard">
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                New Request
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Tabs */}
            <div className="flex items-center gap-1">
              {[
                { value: "all", label: "All Tasks" },
                { value: "active", label: "Active" },
                { value: "completed", label: "Completed" },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    filter === tab.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Right: Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 h-9 pl-9 pr-4 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {isLoading ? (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-b-0">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Palette className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              {searchQuery
                ? "No tasks found"
                : filter === "all"
                ? "No tasks yet"
                : `No ${filter} tasks`}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? "Try a different search term"
                : "Create your first design request to get started"}
            </p>
            {!searchQuery && filter === "all" && (
              <Button asChild>
                <Link href="/dashboard">
                  <MessageSquarePlus className="h-4 w-4 mr-2" />
                  New Request
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Task List */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              {filteredTasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>
                Viewing {filteredTasks.length} of {tasks.length} task{tasks.length !== 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled className="h-8">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled className="h-8">
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
