"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Coins, Clock, AlertTriangle } from "lucide-react";
import {
  calculateWorkingDeadline,
  getDeadlineUrgency,
  formatTimeRemaining,
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

export default function FreelancerTasksPage() {
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

  const TaskCard = ({ task }: { task: Task }) => {
    const workingDeadline = calculateWorkingDeadline(task.assignedAt, task.deadline);
    const urgency = getDeadlineUrgency(task.deadline, workingDeadline);
    const isActiveTask = ["ASSIGNED", "IN_PROGRESS", "REVISION_REQUESTED"].includes(task.status);

    const urgencyStyles = {
      overdue: "text-destructive",
      urgent: "text-orange-500",
      warning: "text-yellow-600",
      safe: "text-muted-foreground",
    };

    return (
      <Link href={`/portal/tasks/${task.id}`}>
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg line-clamp-1">{task.title}</CardTitle>
              <Badge variant={statusConfig[task.status]?.variant || "secondary"}>
                {statusConfig[task.status]?.label || task.status}
              </Badge>
            </div>
            <CardDescription className="line-clamp-2">
              {task.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Coins className="h-4 w-4" />
                {task.creditsUsed} credits
              </div>
              {task.estimatedHours && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  ~{task.estimatedHours}h
                </div>
              )}
              {workingDeadline && isActiveTask && (
                <div className={`flex items-center gap-1 ${urgency ? urgencyStyles[urgency] : ""}`}>
                  {(urgency === "overdue" || urgency === "urgent") && (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <Calendar className="h-4 w-4" />
                  <span>Due {workingDeadline.toLocaleDateString()}</span>
                  <span className="text-xs">({formatTimeRemaining(workingDeadline)})</span>
                </div>
              )}
              {!workingDeadline && task.deadline && isActiveTask && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Due {new Date(task.deadline).toLocaleDateString()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
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
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="active" className="flex-1 sm:flex-initial text-xs sm:text-sm">Active</TabsTrigger>
          <TabsTrigger value="submitted" className="flex-1 sm:flex-initial text-xs sm:text-sm">Submitted</TabsTrigger>
          <TabsTrigger value="completed" className="flex-1 sm:flex-initial text-xs sm:text-sm">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4 sm:mt-6">
          {isLoading ? (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No {filter} tasks found.
              </p>
            </div>
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
