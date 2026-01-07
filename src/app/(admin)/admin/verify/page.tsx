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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowRight,
  RefreshCw,
  Inbox,
} from "lucide-react";

interface PendingTask {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  client: {
    name: string | null;
    email: string;
    image: string | null;
  } | null;
  freelancer: {
    name: string | null;
    email: string;
    image: string | null;
  } | null;
  deliverableCount: number;
}

export default function AdminVerifyListPage() {
  const [tasks, setTasks] = useState<PendingTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingTasks();
  }, []);

  const fetchPendingTasks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/verify");
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      } else {
        setError("Failed to load pending verifications");
      }
    } catch (err) {
      console.error("Failed to fetch pending tasks:", err);
      setError("Failed to load pending verifications");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Verify Deliverables</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve deliverables before they&apos;re sent to clients
          </p>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="py-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-10 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Verify Deliverables</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error Loading Tasks</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchPendingTasks}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Verify Deliverables</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve deliverables before they&apos;re sent to clients
          </p>
        </div>
        <Button variant="outline" onClick={fetchPendingTasks}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <Clock className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tasks.length}</p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Tasks List */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Pending Verifications</h2>
            <p className="text-muted-foreground">
              All deliverables have been reviewed. Check back later for new submissions.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={task.freelancer?.image || undefined} />
                        <AvatarFallback>
                          {task.freelancer?.name?.[0]?.toUpperCase() || "F"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1">
                        <Clock className="h-3 w-3 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold">{task.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>by {task.freelancer?.name || "Unknown"}</span>
                        <span>•</span>
                        <span>for {task.client?.name || "Unknown"}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          {task.deliverableCount} file{task.deliverableCount !== 1 ? "s" : ""}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Submitted {new Date(task.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button asChild>
                    <Link href={`/admin/verify/${task.id}`}>
                      Review
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
