"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Coins,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  FileCheck,
  Sparkles,
  Check,
  FolderOpen,
} from "lucide-react";
import {
  calculateWorkingDeadline,
  getDeadlineUrgency,
  formatTimeRemaining,
  cn,
} from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  deadline: string | null;
  assignedAt: string | null;
  creditsUsed: number;
  estimatedHours: string | null;
}

const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  ASSIGNED: { variant: "outline", label: "Assigned" },
  IN_PROGRESS: { variant: "default", label: "In Progress" },
  IN_REVIEW: { variant: "secondary", label: "Submitted" },
  REVISION_REQUESTED: { variant: "destructive", label: "Revision Needed" },
  COMPLETED: { variant: "secondary", label: "Completed" },
};

// Mini workflow stepper for task cards
function MiniWorkflowStepper({ status }: { status: string }) {
  const steps = [
    { key: "ASSIGNED", icon: Clock, label: "Assigned" },
    { key: "IN_PROGRESS", icon: RefreshCw, label: "Working" },
    { key: "IN_REVIEW", icon: FileCheck, label: "Review" },
    { key: "COMPLETED", icon: CheckCircle2, label: "Done" },
  ];

  const statusOrder = ["ASSIGNED", "IN_PROGRESS", "IN_REVIEW", "COMPLETED"];
  const currentIndex = statusOrder.indexOf(status);
  const isRevision = status === "REVISION_REQUESTED";

  return (
    <div className="flex items-center gap-1 w-full">
      {steps.map((step, index) => {
        const isCompleted = currentIndex > index || status === "COMPLETED";
        const isCurrent = status === step.key || (isRevision && step.key === "IN_PROGRESS");
        const isRevisionStep = isRevision && step.key === "IN_PROGRESS";
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex items-center flex-1">
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                isCompleted && "bg-green-500 text-white",
                isCurrent && !isRevisionStep && "bg-primary text-primary-foreground",
                isRevisionStep && "bg-orange-500 text-white",
                !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
              )}
            >
              {isCompleted ? (
                <Check className="h-3 w-3" />
              ) : isRevisionStep ? (
                <AlertTriangle className="h-3 w-3" />
              ) : (
                <Icon className="h-3 w-3" />
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-1",
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

export default function FreelancerTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("active");

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
    if (filter === "active") {
      return ["ASSIGNED", "IN_PROGRESS", "REVISION_REQUESTED"].includes(task.status);
    }
    if (filter === "submitted") {
      return task.status === "IN_REVIEW";
    }
    if (filter === "completed") {
      return task.status === "COMPLETED";
    }
    return true;
  });

  // Count tasks for badges
  const activeTasks = tasks.filter((t) =>
    ["ASSIGNED", "IN_PROGRESS", "REVISION_REQUESTED"].includes(t.status)
  );
  const submittedTasks = tasks.filter((t) => t.status === "IN_REVIEW");
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED");
  const revisionTasks = tasks.filter((t) => t.status === "REVISION_REQUESTED");

  const TaskCard = ({ task }: { task: Task }) => {
    const workingDeadline = calculateWorkingDeadline(task.assignedAt, task.deadline);
    const urgency = getDeadlineUrgency(task.deadline, workingDeadline);
    const isActiveTask = ["ASSIGNED", "IN_PROGRESS", "REVISION_REQUESTED"].includes(task.status);
    const isRevision = task.status === "REVISION_REQUESTED";

    const urgencyStyles: Record<string, string> = {
      overdue: "text-destructive",
      urgent: "text-orange-500",
      warning: "text-yellow-600",
      safe: "text-muted-foreground",
    };

    return (
      <Link href={`/portal/tasks/${task.id}`}>
        <Card
          className={cn(
            "hover:border-primary/50 transition-colors cursor-pointer h-full",
            isRevision && "border-orange-500/50 bg-orange-500/5"
          )}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base sm:text-lg line-clamp-1">{task.title}</CardTitle>
              <Badge
                variant={statusConfig[task.status]?.variant || "secondary"}
                className={cn(
                  "shrink-0",
                  isRevision && "bg-orange-500 hover:bg-orange-600"
                )}
              >
                {isRevision && <AlertTriangle className="h-3 w-3 mr-1" />}
                {statusConfig[task.status]?.label || task.status}
              </Badge>
            </div>
            <CardDescription className="line-clamp-2 text-xs sm:text-sm">
              {task.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Mini Workflow Stepper */}
            <div className="pt-1">
              <MiniWorkflowStepper status={task.status} />
            </div>

            {/* Revision Alert */}
            {isRevision && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-orange-500/10 border border-orange-500/20">
                <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
                <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                  Revision requested - click to view feedback
                </span>
              </div>
            )}

            {/* Task metadata */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {task.creditsUsed} credits
              </div>
              {task.estimatedHours && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  ~{task.estimatedHours}h
                </div>
              )}
              {workingDeadline && isActiveTask && (
                <div className={cn("flex items-center gap-1", urgency ? urgencyStyles[urgency] : "")}>
                  {(urgency === "overdue" || urgency === "urgent") && (
                    <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Due {workingDeadline.toLocaleDateString()}</span>
                </div>
              )}
              {!workingDeadline && task.deadline && isActiveTask && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Due {new Date(task.deadline).toLocaleDateString()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  // Empty state component
  const EmptyState = ({ type }: { type: string }) => {
    const states: Record<string, { icon: React.ReactNode; title: string; description: string }> = {
      active: {
        icon: <Sparkles className="h-12 w-12 text-muted-foreground" />,
        title: "No active tasks",
        description: "New tasks will be assigned to you automatically. Check back soon!",
      },
      submitted: {
        icon: <FileCheck className="h-12 w-12 text-muted-foreground" />,
        title: "No submitted tasks",
        description: "Your submitted tasks awaiting client review will appear here",
      },
      completed: {
        icon: <FolderOpen className="h-12 w-12 text-muted-foreground" />,
        title: "No completed tasks yet",
        description: "Tasks you've successfully completed will be shown here",
      },
    };

    const state = states[type] || states.active;

    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="flex justify-center mb-4">{state.icon}</div>
          <h3 className="text-lg font-semibold mb-2">{state.title}</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {state.description}
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-0.5 sm:mt-1">
          Manage and track your assigned tasks
        </p>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        {/* Sticky tabs on mobile */}
        <div className="sticky top-0 z-10 bg-background pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:static sm:bg-transparent">
          <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:flex">
            <TabsTrigger value="active" className="text-xs sm:text-sm relative">
              Active
              {activeTasks.length > 0 && (
                <Badge
                  variant={revisionTasks.length > 0 ? "destructive" : "secondary"}
                  className="ml-1.5 h-5 px-1.5 text-xs"
                >
                  {activeTasks.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="submitted" className="text-xs sm:text-sm">
              Submitted
              {submittedTasks.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                  {submittedTasks.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs sm:text-sm">
              Completed
              {completedTasks.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                  {completedTasks.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={filter} className="mt-4 sm:mt-6">
          {isLoading ? (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full mt-2" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <EmptyState type={filter} />
          ) : (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              {filteredTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
