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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";
import {
  FolderOpen,
  Clock,
  CheckCircle,
  AlertTriangle,
  Star,
} from "lucide-react";

interface FreelancerStats {
  activeTasks: number;
  completedTasks: number;
  pendingReview: number;
  rating: number;
}

interface Task {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  creditsUsed: number;
}

export default function FreelancerDashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<FreelancerStats | null>(null);
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profileStatus, setProfileStatus] = useState<string>("PENDING");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, tasksRes, profileRes] = await Promise.all([
        fetch("/api/freelancer/stats"),
        fetch("/api/tasks?status=IN_PROGRESS&limit=5"),
        fetch("/api/freelancer/profile"),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setActiveTasks(data.tasks || []);
      }

      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfileStatus(data.status);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const user = session?.user;

  if (profileStatus === "PENDING") {
    return (
      <div className="space-y-6">
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <CardTitle>Application Under Review</CardTitle>
            </div>
            <CardDescription>
              Your freelancer application is being reviewed by our team. You&apos;ll
              receive a notification once it&apos;s approved.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This usually takes 24-48 hours. In the meantime, make sure your
              profile is complete and your portfolio links are accessible.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your work
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.pendingReview || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.rating?.toFixed(1) || "N/A"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-dashed hover:border-primary/50 transition-colors cursor-pointer">
          <Link href="/portal/available">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                <FolderOpen className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Available Tasks</CardTitle>
                <CardDescription>
                  Browse and claim new tasks matching your skills
                </CardDescription>
              </div>
            </CardHeader>
          </Link>
        </Card>

        <Card className="border-dashed hover:border-primary/50 transition-colors cursor-pointer">
          <Link href="/portal/tasks">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <CheckCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">My Tasks</CardTitle>
                <CardDescription>
                  View and manage your assigned tasks
                </CardDescription>
              </div>
            </CardHeader>
          </Link>
        </Card>
      </div>

      {/* Active Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Tasks</CardTitle>
              <CardDescription>Tasks you&apos;re currently working on</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/portal/tasks">View All</Link>
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
          ) : activeTasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No active tasks. Browse available tasks to get started!
              </p>
              <Button asChild>
                <Link href="/portal/available">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Browse Tasks
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/portal/tasks/${task.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {task.deadline
                        ? `Due: ${new Date(task.deadline).toLocaleDateString()}`
                        : "No deadline"}
                    </p>
                  </div>
                  <Badge>{task.creditsUsed} credits</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
