"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
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
  LayoutGrid,
  List,
  ArrowUpDown,
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
  styleReferences?: string[];
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

type OrderingKey = "date_created" | "status" | "credits";
type ViewMode = "rows" | "cards";

interface DisplayProperties {
  thumbnail: boolean;
  description: boolean;
  designer: boolean;
  status: boolean;
  credits: boolean;
  createdDate: boolean;
}

const orderingOptions: { value: OrderingKey; label: string }[] = [
  { value: "date_created", label: "Date created" },
  { value: "status", label: "Status" },
  { value: "credits", label: "Credits" },
];

const displayPropertyOptions: { key: keyof DisplayProperties; label: string }[] = [
  { key: "thumbnail", label: "Thumbnail" },
  { key: "description", label: "Description" },
  { key: "designer", label: "Designer" },
  { key: "status", label: "Status" },
  { key: "credits", label: "Credits" },
  { key: "createdDate", label: "Created Date" },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Display settings
  const [viewMode, setViewMode] = useState<ViewMode>("rows");
  const [ordering, setOrdering] = useState<OrderingKey>("date_created");
  const [showCancelled, setShowCancelled] = useState(false);
  const [displayProperties, setDisplayProperties] = useState<DisplayProperties>({
    thumbnail: true,
    description: true,
    designer: true,
    status: true,
    credits: true,
    createdDate: true,
  });

  const toggleDisplayProperty = useCallback((key: keyof DisplayProperties) => {
    setDisplayProperties((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

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

  const statusOrder: Record<string, number> = {
    IN_PROGRESS: 0,
    ASSIGNED: 1,
    IN_REVIEW: 2,
    PENDING_ADMIN_REVIEW: 3,
    REVISION_REQUESTED: 4,
    PENDING: 5,
    OFFERED: 6,
    COMPLETED: 7,
    CANCELLED: 8,
  };

  const filteredTasks = tasks
    .filter((task) => {
      // Hide cancelled unless toggled on
      if (!showCancelled && task.status === "CANCELLED") return false;

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
    })
    .sort((a, b) => {
      switch (ordering) {
        case "status":
          return (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
        case "credits":
          return b.creditsUsed - a.creditsUsed;
        case "date_created":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
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
    const thumbnailItem = task.moodboardItems?.find(item => item.type === "style" || item.type === "image" || item.type === "upload")
      || (task.styleReferences?.[0] ? { imageUrl: task.styleReferences[0], name: "Reference" } : null);

    return (
      <Link href={`/dashboard/tasks/${task.id}`}>
        <div className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 cursor-pointer group">
          {/* Thumbnail */}
          {displayProperties.thumbnail && (
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0 border border-border">
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
          )}

          {/* Title and Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-foreground truncate group-hover:text-foreground/80">
                {task.title}
              </h3>
            </div>
            {displayProperties.description && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {task.description}
              </p>
            )}
          </div>

          {/* Designer */}
          {displayProperties.designer && (
            <div className="hidden md:flex items-center gap-2 w-28 shrink-0">
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
          )}

          {/* Date */}
          {displayProperties.createdDate && (
            <div className="hidden sm:block text-xs text-muted-foreground w-20 text-right shrink-0">
              {formatDate(task.createdAt)}
            </div>
          )}

          {/* Status */}
          {displayProperties.status && (
            <div className="shrink-0">
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                status.bgColor,
                status.color
              )}>
                {status.icon}
                <span className="hidden sm:inline">{status.label}</span>
              </span>
            </div>
          )}

          {/* Credits */}
          {displayProperties.credits && (
            <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground w-14 justify-end shrink-0">
              <Coins className="h-3 w-3" />
              {task.creditsUsed}
            </div>
          )}

          {/* More Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
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

  const TaskCard = ({ task }: { task: Task }) => {
    const status = statusConfig[task.status] || statusConfig.PENDING;

    // Get inspiration images from moodboard items, falling back to styleReferences
    const moodboardImages = task.moodboardItems?.filter(
      (item) => item.type === "style" || item.type === "image" || item.type === "upload"
    ) || [];
    const styleRefImages: { id: string; imageUrl: string; name: string }[] =
      moodboardImages.length === 0 && task.styleReferences?.length
        ? task.styleReferences.map((url, i) => ({ id: `ref-${i}`, imageUrl: url, name: `Reference ${i + 1}` }))
        : [];
    const allImages = moodboardImages.length > 0 ? moodboardImages : styleRefImages;
    const imageCount = allImages.length;
    const extraCount = imageCount > 4 ? imageCount - 4 : 0;
    const visibleImages = allImages.slice(0, 4);

    return (
      <Link href={`/dashboard/tasks/${task.id}`}>
        <div className="rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer group overflow-hidden flex flex-col h-full">
          {/* Card Thumbnail — collage of inspiration images */}
          {displayProperties.thumbnail && (
            <div className="w-full aspect-[16/10] bg-muted border-b border-border relative overflow-hidden shrink-0">
              {imageCount === 0 ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Palette className="h-8 w-8 text-muted-foreground/50" />
                </div>
              ) : imageCount === 1 ? (
                /* Single image — full bleed */
                <Image
                  src={visibleImages[0].imageUrl}
                  alt={visibleImages[0].name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : imageCount === 2 ? (
                /* Two images — side by side */
                <div className="w-full h-full grid grid-cols-2 gap-px">
                  {visibleImages.map((item) => (
                    <div key={item.id} className="relative overflow-hidden">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              ) : imageCount === 3 ? (
                /* Three images — one large left, two stacked right */
                <div className="w-full h-full grid grid-cols-2 gap-px">
                  <div className="relative overflow-hidden">
                    <Image
                      src={visibleImages[0].imageUrl}
                      alt={visibleImages[0].name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="grid grid-rows-2 gap-px">
                    {visibleImages.slice(1).map((item) => (
                      <div key={item.id} className="relative overflow-hidden">
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Four+ images — 2×2 grid */
                <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-px">
                  {visibleImages.map((item, i) => (
                    <div key={item.id} className="relative overflow-hidden">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {/* "+X more" overlay on last cell */}
                      {i === 3 && extraCount > 0 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white text-sm font-semibold">+{extraCount}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Status badge overlay */}
              {displayProperties.status && (
                <div className="absolute top-2 right-2 z-10">
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border backdrop-blur-sm",
                    status.bgColor,
                    status.color
                  )}>
                    {status.icon}
                    {status.label}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Card Body */}
          <div className="p-3.5 flex flex-col gap-2 flex-1 min-h-0">
            {/* Title */}
            <h3 className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-foreground/80">
              {task.title}
            </h3>

            {/* Description */}
            {displayProperties.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-10">
                {task.description}
              </p>
            )}

            {/* Status (shown here if thumbnail is hidden) */}
            {displayProperties.status && !displayProperties.thumbnail && (
              <div>
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                  status.bgColor,
                  status.color
                )}>
                  {status.icon}
                  {status.label}
                </span>
              </div>
            )}

            {/* Bottom metadata row */}
            <div className="flex items-center justify-between mt-auto pt-1">
              {/* Designer */}
              {displayProperties.designer && (
                <div className="flex items-center gap-1.5">
                  {task.freelancer ? (
                    <>
                      {task.freelancer.image ? (
                        <Image
                          src={task.freelancer.image}
                          alt={task.freelancer.name || "Designer"}
                          width={18}
                          height={18}
                          className="w-[18px] h-[18px] rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-[18px] h-[18px] rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-2.5 w-2.5 text-primary" />
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                        {task.freelancer.name?.split(" ")[0]}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">Unassigned</span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 ml-auto">
                {/* Credits */}
                {displayProperties.credits && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Coins className="h-3 w-3" />
                    {task.creditsUsed}
                  </div>
                )}

                {/* Date */}
                {displayProperties.createdDate && (
                  <span className="text-xs text-muted-foreground">
                    {formatDate(task.createdAt)}
                  </span>
                )}
              </div>
            </div>
          </div>
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
      <div className="bg-background">
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

              {/* Display Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    <span>Display</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-80 p-0" sideOffset={8}>
                  {/* View Toggle */}
                  <div className="p-3 border-b border-border">
                    <div className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
                      <button
                        onClick={() => setViewMode("cards")}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                          viewMode === "cards"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        Cards
                      </button>
                      <button
                        onClick={() => setViewMode("rows")}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                          viewMode === "rows"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <List className="h-3.5 w-3.5" />
                        Rows
                      </button>
                    </div>
                  </div>

                  {/* Ordering */}
                  <div className="p-3 border-b border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ArrowUpDown className="h-3.5 w-3.5" />
                        <span>Ordering</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors">
                            {orderingOptions.find((o) => o.value === ordering)?.label}
                            <ChevronDown className="h-3 w-3 opacity-50" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          {orderingOptions.map((option) => (
                            <DropdownMenuCheckboxItem
                              key={option.value}
                              checked={ordering === option.value}
                              onCheckedChange={() => setOrdering(option.value)}
                            >
                              {option.label}
                            </DropdownMenuCheckboxItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Show Cancelled Toggle */}
                  <div className="p-3 border-b border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>Show cancelled tasks</span>
                      </div>
                      <Switch
                        checked={showCancelled}
                        onCheckedChange={setShowCancelled}
                      />
                    </div>
                  </div>

                  {/* Display Properties */}
                  <div className="p-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2.5">
                      Display Properties
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {displayPropertyOptions.map((prop) => (
                        <button
                          key={prop.key}
                          onClick={() => toggleDisplayProperty(prop.key)}
                          className={cn(
                            "px-2.5 py-1 rounded-md text-xs font-medium border transition-all",
                            displayProperties[prop.key]
                              ? "bg-foreground text-background border-foreground"
                              : "bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
                          )}
                        >
                          {prop.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
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
          viewMode === "cards" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-lg border border-border bg-card overflow-hidden">
                  <Skeleton className="w-full aspect-[16/10]" />
                  <div className="p-3.5 space-y-2.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <div className="flex items-center justify-between pt-1">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
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
          )
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
            {viewMode === "cards" ? (
              /* Cards Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            ) : (
              /* Rows List */
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                {filteredTasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            )}

            {/* Pagination Footer */}
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
