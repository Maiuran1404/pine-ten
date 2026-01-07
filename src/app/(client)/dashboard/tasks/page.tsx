"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquarePlus, Calendar, Coins, Clock, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  creditsUsed: number;
  estimatedHours: string | null;
}

const statusConfig: Record<string, { color: string; bgColor: string; label: string; icon: React.ReactNode }> = {
  PENDING: { color: "text-yellow-400", bgColor: "bg-yellow-500/10 border-yellow-500/20", label: "Pending", icon: <Clock className="h-3 w-3" /> },
  ASSIGNED: { color: "text-blue-400", bgColor: "bg-blue-500/10 border-blue-500/20", label: "Assigned", icon: <Clock className="h-3 w-3" /> },
  IN_PROGRESS: { color: "text-purple-400", bgColor: "bg-purple-500/10 border-purple-500/20", label: "In Progress", icon: <RefreshCw className="h-3 w-3" /> },
  IN_REVIEW: { color: "text-orange-400", bgColor: "bg-orange-500/10 border-orange-500/20", label: "In Review", icon: <Clock className="h-3 w-3" /> },
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
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch("/api/tasks?limit=50");
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

  const filteredTasks = tasks.filter((task) => {
    if (filter === "all") return true;
    if (filter === "active")
      return !["COMPLETED", "CANCELLED"].includes(task.status);
    if (filter === "completed") return task.status === "COMPLETED";
    return true;
  });

  const TaskCard = ({ task }: { task: Task }) => {
    const status = statusConfig[task.status] || statusConfig.PENDING;

    return (
      <Link href={`/dashboard/tasks/${task.id}`}>
        <div
          className="group relative rounded-xl overflow-hidden border border-border hover:border-border/80 transition-all cursor-pointer h-full bg-card"
        >
          <div className="p-5 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-foreground font-medium line-clamp-1 group-hover:text-foreground/90 transition-colors">
                {task.title}
              </h3>
              <span className={cn(
                "shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border",
                status.bgColor,
                status.color
              )}>
                {status.icon}
                {status.label}
              </span>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
              {task.description}
            </p>

            {/* Footer */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(task.createdAt).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Coins className="h-3.5 w-3.5" />
                {task.creditsUsed} credits
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-full bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">My Tasks</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all your design projects
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/chat">
            <MessageSquarePlus className="h-4 w-4 mr-2" />
            New Request
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { value: "all", label: "All Tasks" },
          { value: "active", label: "Active" },
          { value: "completed", label: "Completed" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border p-5 bg-card"
            >
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full mt-3" />
              <Skeleton className="h-4 w-2/3 mt-2" />
              <div className="flex gap-4 mt-4 pt-4 border-t border-border">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div
          className="rounded-xl border border-border p-12 text-center bg-card"
        >
          <p className="text-muted-foreground mb-4">
            {filter === "all"
              ? "No tasks yet. Create your first design request!"
              : `No ${filter} tasks found.`}
          </p>
          {filter === "all" && (
            <Button asChild>
              <Link href="/dashboard/chat">
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                New Request
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
