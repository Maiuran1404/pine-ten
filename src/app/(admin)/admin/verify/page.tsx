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
  ClipboardCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/admin/stat-card";

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
        setTasks(data.data?.tasks || data.tasks || []);
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

  // Get unique clients and artists
  const uniqueClients = new Set(tasks.map(t => t.client?.email).filter(Boolean)).size;
  const uniqueArtists = new Set(tasks.map(t => t.freelancer?.email).filter(Boolean)).size;
  const totalFiles = tasks.reduce((sum, t) => sum + t.deliverableCount, 0);

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Verify Deliverables</h1>
          <p className="text-muted-foreground">
            Review and approve deliverables before they&apos;re sent to clients
          </p>
        </div>
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Error Loading Tasks</h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">{error}</p>
            <Button onClick={fetchPendingTasks}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-foreground">Verify Deliverables</h1>
            <Button variant="outline" size="sm" onClick={fetchPendingTasks} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-4 space-y-6">

      {/* Stats */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Pending Review"
            value={tasks.length}
            subtext={tasks.length === 0 ? "All caught up!" : "Awaiting your review"}
            icon={Clock}
            trend={tasks.length > 5 ? "warning" : tasks.length > 0 ? "neutral" : "up"}
          />
          <StatCard
            label="Total Files"
            value={totalFiles}
            subtext="Across all submissions"
            icon={FileText}
          />
          <StatCard
            label="From Artists"
            value={uniqueArtists}
            subtext="Unique submitters"
            icon={Users}
          />
          <StatCard
            label="For Clients"
            value={uniqueClients}
            subtext="Awaiting delivery"
            icon={TrendingUp}
          />
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Submissions Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-10 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : tasks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">All Caught Up!</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              There are no deliverables waiting for review. Check back later for new submissions from artists.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Submissions Queue
            </CardTitle>
            <CardDescription>
              {tasks.length} submission{tasks.length !== 1 ? "s" : ""} ready for review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tasks.map((task, index) => (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border bg-card transition-all hover:shadow-md hover:border-primary/30",
                    index === 0 && "ring-2 ring-primary/20"
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Priority indicator for first item */}
                    {index === 0 && (
                      <div className="w-1 h-12 bg-primary rounded-full" />
                    )}

                    {/* Avatar with status */}
                    <div className="relative">
                      <Avatar className="h-12 w-12 border-2 border-background">
                        <AvatarImage src={task.freelancer?.image || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {task.freelancer?.name?.[0]?.toUpperCase() || "A"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full p-1 ring-2 ring-background">
                        <Clock className="h-3 w-3 text-white" />
                      </div>
                    </div>

                    {/* Task info */}
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate max-w-[300px]">{task.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                        <span className="truncate">by {task.freelancer?.name || "Unknown Artist"}</span>
                        <span className="text-muted-foreground/50">→</span>
                        <span className="truncate">for {task.client?.name || "Unknown Client"}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <Badge variant="secondary" className="text-xs font-normal">
                          <FileText className="h-3 w-3 mr-1" />
                          {task.deliverableCount} file{task.deliverableCount !== 1 ? "s" : ""}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(task.updatedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  <Button asChild size="sm">
                    <Link href={`/admin/verify/${task.id}`}>
                      Review
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
