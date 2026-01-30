"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSpinner } from "@/components/shared/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Clock,
  Coins,
  Calendar,
  CheckCircle,
  Filter,
  ArrowUpDown,
  Sparkles,
  X,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AvailableTask {
  id: string;
  title: string;
  description: string;
  category: { name: string } | null;
  creditsUsed: number;
  estimatedHours: string | null;
  deadline: string | null;
  createdAt: string;
  requirements: object | null;
}

type SortOption = "newest" | "highest_pay" | "due_soonest" | "quickest";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "highest_pay", label: "Highest Paying" },
  { value: "due_soonest", label: "Due Soonest" },
  { value: "quickest", label: "Quickest Tasks" },
];

export default function AvailableTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<AvailableTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<AvailableTask | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  useEffect(() => {
    fetchAvailableTasks();
  }, []);

  const fetchAvailableTasks = async () => {
    try {
      const response = await fetch("/api/freelancer/available-tasks");
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    tasks.forEach((task) => {
      if (task.category?.name) {
        cats.add(task.category.name);
      }
    });
    return Array.from(cats);
  }, [tasks]);

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    // Apply category filter
    if (categoryFilter !== "all") {
      result = result.filter((task) => task.category?.name === categoryFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "highest_pay":
          return b.creditsUsed - a.creditsUsed;
        case "due_soonest":
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case "quickest":
          const hoursA = parseFloat(a.estimatedHours || "999");
          const hoursB = parseFloat(b.estimatedHours || "999");
          return hoursA - hoursB;
        case "newest":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return result;
  }, [tasks, categoryFilter, sortBy]);

  const handleClaimTask = async (taskId: string) => {
    setClaimingTaskId(taskId);

    try {
      const response = await fetch(`/api/freelancer/claim-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to claim task");
      }

      toast.success("Task claimed! Redirecting to task...");
      // Remove from available list
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setSelectedTask(null);
      // Redirect to task detail
      router.push(`/portal/tasks/${taskId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to claim task");
    } finally {
      setClaimingTaskId(null);
    }
  };

  const getDeadlineUrgency = (deadline: string | null) => {
    if (!deadline) return null;
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const daysUntil = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) return "overdue";
    if (daysUntil <= 2) return "urgent";
    if (daysUntil <= 5) return "warning";
    return "safe";
  };

  const activeFiltersCount = (categoryFilter !== "all" ? 1 : 0);

  const clearFilters = () => {
    setCategoryFilter("all");
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Available Tasks</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-0.5 sm:mt-1">
          Browse and claim tasks that match your skills
        </p>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Category Filter */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[160px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10">
            <X className="h-4 w-4 mr-1" />
            Clear filters
          </Button>
        )}

        {/* Results count */}
        <div className="ml-auto text-sm text-muted-foreground">
          {filteredAndSortedTasks.length} task{filteredAndSortedTasks.length !== 1 ? "s" : ""} available
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : filteredAndSortedTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">
              {tasks.length === 0 ? "No available tasks right now" : "No tasks match your filters"}
            </p>
            <p className="text-muted-foreground mt-1">
              {tasks.length === 0
                ? "Check back later for new tasks matching your skills"
                : "Try adjusting your filters to see more tasks"}
            </p>
            {activeFiltersCount > 0 && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedTasks.map((task) => {
            const urgency = getDeadlineUrgency(task.deadline);
            return (
              <Card
                key={task.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
                  urgency === "urgent" && "border-orange-500/50",
                  urgency === "overdue" && "border-destructive/50"
                )}
                onClick={() => setSelectedTask(task)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base line-clamp-1">{task.title}</CardTitle>
                      {task.category && (
                        <Badge variant="secondary" className="mt-1.5 text-xs">
                          {task.category.name}
                        </Badge>
                      )}
                    </div>
                    <Badge className="flex items-center gap-1 shrink-0 bg-primary">
                      <Coins className="h-3 w-3" />
                      {task.creditsUsed}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {task.description}
                  </p>

                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                    {task.estimatedHours && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        ~{task.estimatedHours}h
                      </div>
                    )}
                    {task.deadline && (
                      <div
                        className={cn(
                          "flex items-center gap-1",
                          urgency === "urgent" && "text-orange-500",
                          urgency === "overdue" && "text-destructive"
                        )}
                      >
                        {(urgency === "urgent" || urgency === "overdue") && (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        )}
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(task.deadline).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClaimTask(task.id);
                    }}
                    disabled={claimingTaskId !== null}
                  >
                    {claimingTaskId === task.id ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Claiming...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Claim Task
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Task Preview Sheet */}
      <Sheet open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <SheetContent className="sm:max-w-lg">
          {selectedTask && (
            <>
              <SheetHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="text-xl">{selectedTask.title}</SheetTitle>
                    {selectedTask.category && (
                      <Badge variant="secondary" className="mt-2">
                        {selectedTask.category.name}
                      </Badge>
                    )}
                  </div>
                </div>
                <SheetDescription className="sr-only">
                  Task details and actions
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Task Value Highlight */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-primary" />
                    <span className="font-medium">Task Value</span>
                  </div>
                  <span className="text-2xl font-bold">{selectedTask.creditsUsed} credits</span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedTask.estimatedHours && (
                    <div className="p-3 rounded-lg bg-muted">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Estimated Time
                      </div>
                      <p className="font-medium mt-1">{selectedTask.estimatedHours} hours</p>
                    </div>
                  )}
                  {selectedTask.deadline && (
                    <div className="p-3 rounded-lg bg-muted">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Deadline
                      </div>
                      <p className="font-medium mt-1">
                        {new Date(selectedTask.deadline).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
                  <p className="text-sm leading-relaxed">{selectedTask.description}</p>
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-4">
                  <Button
                    className="w-full h-12"
                    onClick={() => handleClaimTask(selectedTask.id)}
                    disabled={claimingTaskId !== null}
                  >
                    {claimingTaskId === selectedTask.id ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Claiming Task...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-2" />
                        Claim This Task
                        <ChevronRight className="h-5 w-5 ml-2" />
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Claiming will assign this task to you immediately
                  </p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
