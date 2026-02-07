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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Search, ExternalLink, MessageSquare, Eye, AlertTriangle, FolderOpen, Clock, CheckCircle2, Play, Trash2, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  calculateWorkingDeadline,
  getTaskProgressPercent,
  getTimeProgressPercent,
  getDeadlineUrgency,
  formatTimeRemaining,
} from "@/lib/utils";
import { StatCard } from "@/components/admin/stat-card";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  creditsUsed: number;
  createdAt: string;
  deadline: string | null;
  assignedAt: string | null;
  clientName: string;
  freelancerName: string | null;
}

interface Draft {
  id: string;
  title: string;
  messages: {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    attachments?: {
      fileName: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
    }[];
  }[];
  selectedStyles: string[];
  pendingTask: {
    title: string;
    description: string;
    category: string;
    estimatedHours: number;
    deliveryDays?: number;
    creditsRequired: number;
  } | null;
  createdAt: string;
  updatedAt: string;
  clientId: string;
  clientName: string | null;
  clientEmail: string | null;
  companyName: string | null;
}

export default function AllTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDraftsLoading, setIsDraftsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tasks" | "drafts">("tasks");
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const limit = 20;

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTaskIds.size === filteredTasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(filteredTasks.map((t) => t.id)));
    }
  };

  const handleDeleteTasks = async () => {
    if (selectedTaskIds.size === 0) return;
    setIsDeleting(true);
    try {
      const response = await fetch("/api/admin/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds: Array.from(selectedTaskIds) }),
      });
      if (response.ok) {
        const data = await response.json();
        toast.success(`Deleted ${data.data?.deleted || selectedTaskIds.size} task(s)`);
        setSelectedTaskIds(new Set());
        setShowDeleteDialog(false);
        fetchTasks();
      } else {
        const error = await response.json();
        toast.error(error.error?.message || "Failed to delete tasks");
      }
    } catch {
      toast.error("Failed to delete tasks");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (activeTab === "tasks") {
      fetchTasks();
    } else {
      fetchDrafts();
    }
  }, [page, activeTab]);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/tasks?limit=${limit}&offset=${page * limit}`);
      if (response.ok) {
        const result = await response.json();
        // successResponse wraps data in { success: true, data: { tasks: [...] } }
        const taskList = result.data?.tasks || result.tasks || [];
        setTasks(taskList);
        setHasMore(taskList.length === limit);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDrafts = async () => {
    setIsDraftsLoading(true);
    try {
      const response = await fetch("/api/admin/drafts");
      if (response.ok) {
        const result = await response.json();
        // successResponse wraps data in { success: true, data: { drafts: [...] } }
        const draftList = result.data?.drafts || result.drafts || [];
        setDrafts(draftList);
      }
    } catch (error) {
      console.error("Failed to fetch drafts:", error);
    } finally {
      setIsDraftsLoading(false);
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

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  const filteredDrafts = drafts.filter((draft) => {
    if (searchTerm === "") return true;
    return (
      draft.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      draft.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      draft.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const pendingTasks = tasks.filter((t) => t.status === "PENDING").length;
  const inProgressTasks = tasks.filter((t) => ["ASSIGNED", "IN_PROGRESS", "IN_REVIEW", "REVISION_REQUESTED"].includes(t.status)).length;
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;

  return (
    <div className="min-h-full bg-background">
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <h1 className="text-xl font-semibold text-foreground">All Tasks</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-4 space-y-4 sm:space-y-6">

      {/* Stats */}
      {isLoading ? (
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Tasks"
            value={tasks.length}
            subtext="Submitted tasks"
            icon={FolderOpen}
          />
          <StatCard
            label="Pending"
            value={pendingTasks}
            subtext="Awaiting assignment"
            icon={Clock}
            trend={pendingTasks > 5 ? "warning" : pendingTasks > 0 ? "neutral" : "up"}
          />
          <StatCard
            label="In Progress"
            value={inProgressTasks}
            subtext="Being worked on"
            icon={Play}
          />
          <StatCard
            label="Completed"
            value={completedTasks}
            subtext="Delivered to clients"
            icon={CheckCircle2}
            trend="up"
          />
        </div>
      )}

      {/* In-Progress Chats */}
      {drafts.length > 0 && (
        <Card className="border-dashed border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{drafts.length} In-Progress Chat{drafts.length !== 1 ? "s" : ""}</p>
                  <p className="text-sm text-muted-foreground">Conversations not yet submitted as tasks</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveTab("drafts")}>
                View Chats
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top-level tabs for Tasks vs Drafts */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as "tasks" | "drafts"); setPage(0); }}>
        <TabsList className="mb-4">
          <TabsTrigger value="tasks" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Submitted Tasks
          </TabsTrigger>
          <TabsTrigger value="drafts" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            In-Progress Chats
            {drafts.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {drafts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            {selectedTaskIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete {selectedTaskIds.size} task{selectedTaskIds.size !== 1 ? "s" : ""}
              </Button>
            )}
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
                    <TooltipProvider>
                      <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <Table className="min-w-[800px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">
                              <Checkbox
                                checked={filteredTasks.length > 0 && selectedTaskIds.size === filteredTasks.length}
                                onCheckedChange={toggleSelectAll}
                                aria-label="Select all tasks"
                              />
                            </TableHead>
                            <TableHead>Task</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Freelancer</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Progress</TableHead>
                            <TableHead>Deadline</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTasks.map((task) => {
                            const workingDeadline = calculateWorkingDeadline(task.assignedAt, task.deadline);
                            const taskProgress = getTaskProgressPercent(task.status);
                            const timeProgress = getTimeProgressPercent(task.assignedAt, task.deadline);
                            const urgency = getDeadlineUrgency(task.deadline, workingDeadline);
                            const isActiveTask = ["ASSIGNED", "IN_PROGRESS", "REVISION_REQUESTED", "IN_REVIEW"].includes(task.status);

                            const urgencyColors = {
                              overdue: "bg-destructive",
                              urgent: "bg-orange-500",
                              warning: "bg-yellow-500",
                              safe: "bg-green-500",
                            };

                            return (
                              <TableRow key={task.id} className={selectedTaskIds.has(task.id) ? "bg-muted/50" : ""}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedTaskIds.has(task.id)}
                                    onCheckedChange={() => toggleTaskSelection(task.id)}
                                    aria-label={`Select ${task.title}`}
                                  />
                                </TableCell>
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
                                <TableCell>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="w-24 space-y-1">
                                        <Progress value={taskProgress} className="h-1.5" />
                                        {task.deadline && isActiveTask && (
                                          <div className="relative">
                                            <Progress
                                              value={Math.min(timeProgress, 100)}
                                              className={`h-1.5 ${timeProgress > 100 ? "[&>div]:bg-destructive" : "[&>div]:bg-muted-foreground/50"}`}
                                            />
                                            <div
                                              className="absolute top-0 h-1.5 w-px bg-orange-500"
                                              style={{ left: "70%" }}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Task: {taskProgress}% complete</p>
                                      {task.deadline && isActiveTask && (
                                        <p>Time: {Math.round(timeProgress)}% elapsed</p>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TableCell>
                                <TableCell>
                                  {task.deadline && isActiveTask ? (
                                    <div className="flex items-center gap-1.5">
                                      {(urgency === "overdue" || urgency === "urgent") && (
                                        <AlertTriangle className={`h-3.5 w-3.5 ${urgency === "overdue" ? "text-destructive" : "text-orange-500"}`} />
                                      )}
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div>
                                            <span className={`text-sm ${urgency === "overdue" ? "text-destructive" : urgency === "urgent" ? "text-orange-500" : ""}`}>
                                              {formatTimeRemaining(workingDeadline || task.deadline)}
                                            </span>
                                            {urgency && (
                                              <div className={`mt-0.5 h-1 w-full rounded-full ${urgencyColors[urgency]}`} />
                                            )}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <div className="space-y-1 text-xs">
                                            {workingDeadline && (
                                              <p>Artist: {workingDeadline.toLocaleDateString()}</p>
                                            )}
                                            <p>Client: {new Date(task.deadline).toLocaleDateString()}</p>
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                  ) : task.status === "COMPLETED" ? (
                                    <span className="text-sm text-green-600">Done</span>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm" asChild>
                                    <Link href={`/admin/tasks/${task.id}`}>
                                      <ExternalLink className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      </div>
                    </TooltipProvider>
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
        </TabsContent>

        <TabsContent value="drafts">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search drafts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>In-Progress Conversations</CardTitle>
              <CardDescription>
                Chat conversations that haven&apos;t been submitted as tasks yet
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isDraftsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredDrafts.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No in-progress conversations found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conversation</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Messages</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDrafts.map((draft) => (
                      <TableRow key={draft.id}>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="font-medium truncate">{draft.title}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="text-sm">{draft.clientName || "-"}</span>
                            {draft.clientEmail && (
                              <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {draft.clientEmail}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{draft.companyName || "-"}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {draft.messages.length}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {draft.pendingTask ? (
                            <Badge variant="default">Ready to Submit</Badge>
                          ) : (
                            <Badge variant="secondary">In Progress</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatRelativeTime(draft.updatedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDraft(draft)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedTaskIds.size} task{selectedTaskIds.size !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected task{selectedTaskIds.size !== 1 ? "s" : ""} and all associated files, messages, and data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTasks}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Draft Preview Dialog */}
      <Dialog open={!!selectedDraft} onOpenChange={() => setSelectedDraft(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedDraft?.title}</DialogTitle>
            <DialogDescription>
              {selectedDraft?.clientName && (
                <span>
                  {selectedDraft.clientName}
                  {selectedDraft.companyName && ` • ${selectedDraft.companyName}`}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[50vh] pr-4">
            <div className="space-y-4">
              {selectedDraft?.messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground ml-8"
                      : "bg-muted mr-8"
                  }`}
                >
                  <p className="text-xs font-medium mb-1 opacity-70">
                    {message.role === "user" ? "Client" : "AI Assistant"}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {message.attachments.map((att, attIdx) => (
                        <Badge key={attIdx} variant="outline" className="text-xs">
                          {att.fileName}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {selectedDraft?.pendingTask && (
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-2">Pending Task Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Title:</span>{" "}
                  {selectedDraft.pendingTask.title}
                </div>
                <div>
                  <span className="text-muted-foreground">Category:</span>{" "}
                  {selectedDraft.pendingTask.category}
                </div>
                <div>
                  <span className="text-muted-foreground">Credits:</span>{" "}
                  {selectedDraft.pendingTask.creditsRequired}
                </div>
                <div>
                  <span className="text-muted-foreground">Est. Hours:</span>{" "}
                  {selectedDraft.pendingTask.estimatedHours}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
