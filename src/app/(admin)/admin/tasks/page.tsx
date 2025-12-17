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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Search, ExternalLink } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  creditsUsed: number;
  createdAt: string;
  clientName: string;
  freelancerName: string | null;
}

export default function AllTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  useEffect(() => {
    fetchTasks();
  }, [page]);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/tasks?limit=${limit}&offset=${page * limit}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
        setHasMore((data.tasks || []).length === limit);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "pending" && task.status === "PENDING") ||
      (filter === "in_progress" && (task.status === "ASSIGNED" || task.status === "IN_PROGRESS")) ||
      (filter === "in_review" && task.status === "IN_REVIEW") ||
      (filter === "completed" && task.status === "COMPLETED");

    const matchesSearch =
      searchTerm === "" ||
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.freelancerName?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      PENDING: { variant: "secondary", label: "Pending" },
      ASSIGNED: { variant: "outline", label: "Assigned" },
      IN_PROGRESS: { variant: "default", label: "In Progress" },
      IN_REVIEW: { variant: "outline", label: "In Review" },
      REVISION_REQUESTED: { variant: "destructive", label: "Revision" },
      COMPLETED: { variant: "secondary", label: "Completed" },
      CANCELLED: { variant: "destructive", label: "Cancelled" },
    };
    const config = variants[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">All Tasks</h1>
        <p className="text-muted-foreground">
          View and manage all tasks on the platform
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="in_review">In Review</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
              <CardDescription>
                {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredTasks.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No tasks found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Freelancer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="font-medium truncate">{task.title}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{task.clientName || "-"}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{task.freelancerName || "Unassigned"}</span>
                        </TableCell>
                        <TableCell>{getStatusBadge(task.status)}</TableCell>
                        <TableCell>{task.creditsUsed}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(task.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/tasks/${task.id}`}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {page + 1}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasMore}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
