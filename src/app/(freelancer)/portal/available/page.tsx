"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { Clock, Coins, Calendar, CheckCircle } from "lucide-react";

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

export default function AvailableTasksPage() {
  const [tasks, setTasks] = useState<AvailableTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null);

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

      toast.success("Task claimed successfully!");
      // Remove from available list
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to claim task");
    } finally {
      setClaimingTaskId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Available Tasks</h1>
        <p className="text-muted-foreground">
          Browse and claim tasks that match your skills
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No available tasks right now</p>
            <p className="text-muted-foreground mt-1">
              Check back later for new tasks matching your skills
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{task.title}</CardTitle>
                    {task.category && (
                      <Badge variant="secondary" className="mt-1">
                        {task.category.name}
                      </Badge>
                    )}
                  </div>
                  <Badge className="flex items-center gap-1">
                    <Coins className="h-3 w-3" />
                    {task.creditsUsed}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {task.description}
                </p>

                <div className="flex flex-wrap gap-3 mt-4 text-sm text-muted-foreground">
                  {task.estimatedHours && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      ~{task.estimatedHours}h
                    </div>
                  )}
                  {task.deadline && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Due: {new Date(task.deadline).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => handleClaimTask(task.id)}
                  disabled={claimingTaskId !== null}
                >
                  {claimingTaskId === task.id ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Claiming...
                    </>
                  ) : (
                    "Claim Task"
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
