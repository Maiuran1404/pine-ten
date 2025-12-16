"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquarePlus,
  FolderOpen,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  creditsUsed: number;
}

interface DashboardStats {
  activeTasks: number;
  completedTasks: number;
  totalCreditsUsed: number;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Handle payment success/cancel
    const payment = searchParams.get("payment");
    const credits = searchParams.get("credits");

    if (payment === "success" && credits) {
      toast.success(`Successfully purchased ${credits} credits!`);
    } else if (payment === "cancelled") {
      toast.info("Payment was cancelled");
    }

    // Fetch dashboard data
    fetchDashboardData();
  }, [searchParams]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/tasks?limit=5");
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
        setStats(data.stats || { activeTasks: 0, completedTasks: 0, totalCreditsUsed: 0 });
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      PENDING: { variant: "secondary", label: "Pending" },
      ASSIGNED: { variant: "outline", label: "Assigned" },
      IN_PROGRESS: { variant: "default", label: "In Progress" },
      IN_REVIEW: { variant: "outline", label: "In Review" },
      REVISION_REQUESTED: { variant: "destructive", label: "Revision" },
      COMPLETED: { variant: "secondary", label: "Completed" },
    };
    const config = variants[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s an overview of your design projects.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-dashed hover:border-primary/50 transition-colors cursor-pointer">
          <Link href="/dashboard/chat">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                <MessageSquarePlus className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">New Design Request</CardTitle>
                <CardDescription>
                  Start a conversation to create a new task
                </CardDescription>
              </div>
            </CardHeader>
          </Link>
        </Card>

        <Card className="border-dashed hover:border-primary/50 transition-colors cursor-pointer">
          <Link href="/dashboard/tasks">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <FolderOpen className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">View All Tasks</CardTitle>
                <CardDescription>
                  See all your design projects and their status
                </CardDescription>
              </div>
            </CardHeader>
          </Link>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.activeTasks || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.completedTasks || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalCreditsUsed || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Tasks</CardTitle>
              <CardDescription>Your latest design projects</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/tasks">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No tasks yet. Create your first design request!
              </p>
              <Button asChild>
                <Link href="/dashboard/chat">
                  <MessageSquarePlus className="h-4 w-4 mr-2" />
                  New Request
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/dashboard/tasks/${task.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(task.createdAt).toLocaleDateString()} · {task.creditsUsed} credits
                    </p>
                  </div>
                  {getStatusBadge(task.status)}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-5 w-64 mt-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
