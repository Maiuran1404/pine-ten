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
import {
  Users,
  UserCheck,
  FolderOpen,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
} from "lucide-react";

interface AdminStats {
  totalClients: number;
  totalFreelancers: number;
  pendingApprovals: number;
  activeTasks: number;
  completedTasks: number;
  totalRevenue: number;
}

interface RecentTask {
  id: string;
  title: string;
  status: string;
  clientName: string;
  freelancerName: string | null;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [statsRes, tasksRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/tasks?limit=10"),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setRecentTasks(data.tasks || []);
      }
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
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
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of platform activity and management
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalClients || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Freelancers</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalFreelancers || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className={stats?.pendingApprovals ? "border-yellow-500/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.pendingApprovals || 0}</div>
            )}
          </CardContent>
        </Card>

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
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                ${(stats?.totalRevenue || 0).toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <Link href="/admin/tasks">
            <CardHeader>
              <FolderOpen className="h-8 w-8 mb-2" />
              <CardTitle className="text-lg">All Tasks</CardTitle>
              <CardDescription>View and manage all tasks</CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <Link href="/admin/freelancers">
            <CardHeader>
              <UserCheck className="h-8 w-8 mb-2" />
              <CardTitle className="text-lg">Freelancers</CardTitle>
              <CardDescription>Manage freelancer approvals</CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <Link href="/admin/categories">
            <CardHeader>
              <FolderOpen className="h-8 w-8 mb-2" />
              <CardTitle className="text-lg">Categories</CardTitle>
              <CardDescription>Edit task categories</CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <Link href="/admin/styles">
            <CardHeader>
              <FolderOpen className="h-8 w-8 mb-2" />
              <CardTitle className="text-lg">Style Library</CardTitle>
              <CardDescription>Manage style references</CardDescription>
            </CardHeader>
          </Link>
        </Card>
      </div>

      {/* Recent Tasks Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Tasks</CardTitle>
              <CardDescription>Latest task activity</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/tasks">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : recentTasks.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No tasks yet
            </p>
          ) : (
            <div className="space-y-4">
              {recentTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/admin/tasks/${task.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Client: {task.clientName}
                      {task.freelancerName && ` | Freelancer: ${task.freelancerName}`}
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
