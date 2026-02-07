"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  MessageSquarePlus,
  Coins,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  User,
  Palette,
  MoreHorizontal,
  Eye,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ListFilter,
  X,
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

const filterOptions = [
  { value: "all", label: "All Tasks" },
  { value: "active", label: "Active" },
  { value: "in_review", label: "In Review" },
  { value: "completed", label: "Completed" },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTasks();

    const interval = setInterval(() => {
      fetchTasks();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  const fetchTasks = async () => {
    try {
      const response = await fetch("/api/tasks?limit=50&view=client");
      if (response.ok) {
        const result = await response.json();
        setTasks(result.data?.tasks || result.tasks || []);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === "active" && ["COMPLETED", "CANCELLED"].includes(task.status)) return false;
    if (filter === "in_review" && task.status !== "IN_REVIEW") return false;
    if (filter === "completed" && task.status !== "COMPLETED") return false;

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
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const currentFilter = filterOptions.find(f => f.value === filter) || filterOptions[0];

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
          <div className="hidden md:flex items-center gap-2 w-28 flex-shrink-0">
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
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>

          {/* Date */}
          <div className="hidden sm:block text-xs text-muted-foreground w-20 text-right flex-shrink-0">
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
          <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground w-14 justify-end flex-shrink-0">
            <Coins className="h-3 w-3" />
            {task.creditsUsed}
          </div>

          {/* More Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                onClick={(e) => e.preventDefault()}
              >
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/tasks/${task.id}`}>View Details</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-full bg-background">
      {/* Header - Minimal like Dub */}
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-foreground">Tasks</h1>
            <Button asChild size="sm">
              <Link href="/dashboard">
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                New Request
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Controls Bar - Filter, Display, Search like Dub */}
      <div className="border-b border-border bg-background">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Filter & Display Dropdowns */}
            <div className="flex items-center gap-2">
              {/* Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-2">
                    <ListFilter className="h-4 w-4" />
                    <span>{currentFilter.label}</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  {filterOptions.map((option) => (
                    <DropdownMenuCheckboxItem
                      key={option.value}
                      checked={filter === option.value}
                      onCheckedChange={() => setFilter(option.value)}
                    >
                      {option.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Display Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    <span>Display</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuCheckboxItem checked>
                    Show Designer
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked>
                    Show Credits
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked>
                    Show Date
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Right: Search & More */}
            <div className="flex items-center gap-2">
              {showSearch ? (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search by task or description"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => {
                      if (!searchQuery) setShowSearch(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setSearchQuery("");
                        setShowSearch(false);
                      }
                    }}
                    className="w-64 h-9 pl-9 pr-8 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        searchInputRef.current?.focus();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                    >
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  )}
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2"
                  onClick={() => setShowSearch(true)}
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Search</span>
                </Button>
              )}

              {/* More Options */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => fetchTasks()}>
                    Refresh
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-4">
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
                : `No ${currentFilter.label.toLowerCase()}`}
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

            {/* Pagination Footer - Centered like Dub */}
            <div className="flex items-center justify-center mt-4 py-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>
                  Viewing {filteredTasks.length} of {tasks.length} task{tasks.length !== 1 ? "s" : ""}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" disabled className="h-8 px-3">
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled className="h-8 px-3">
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
