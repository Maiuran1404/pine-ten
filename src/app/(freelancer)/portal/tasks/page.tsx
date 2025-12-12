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
import { Calendar, Coins, Clock } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  deadline: string | null;
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

  const TaskCard = ({ task }: { task: Task }) => (
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
            {task.deadline && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(task.deadline).toLocaleDateString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-muted-foreground">
          Manage and track your assigned tasks
        </p>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="submitted">Submitted</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
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
            <div className="grid gap-4 md:grid-cols-2">
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
