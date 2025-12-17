"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Coins,
  FileText,
  User,
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  requirements: Record<string, unknown> | null;
  styleReferences: string[];
  chatHistory: object[];
  estimatedHours: string | null;
  creditsUsed: number;
  maxRevisions: number;
  revisionsUsed: number;
  priority: number;
  deadline: string | null;
  assignedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  freelancer: {
    id: string;
    name: string;
    image: string | null;
  } | null;
  files: {
    id: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    isDeliverable: boolean;
    createdAt: string;
  }[];
  messages: {
    id: string;
    content: string;
    attachments: string[];
    createdAt: string;
    senderId: string;
    senderName: string;
    senderImage: string | null;
  }[];
}

const statusConfig: Record<
  string,
  { variant: "default" | "secondary" | "destructive" | "outline"; label: string; icon: React.ReactNode }
> = {
  PENDING: {
    variant: "secondary",
    label: "Pending",
    icon: <Clock className="h-4 w-4" />,
  },
  ASSIGNED: {
    variant: "outline",
    label: "Assigned",
    icon: <User className="h-4 w-4" />,
  },
  IN_PROGRESS: {
    variant: "default",
    label: "In Progress",
    icon: <RefreshCw className="h-4 w-4" />,
  },
  IN_REVIEW: {
    variant: "outline",
    label: "In Review",
    icon: <FileText className="h-4 w-4" />,
  },
  REVISION_REQUESTED: {
    variant: "destructive",
    label: "Revision Requested",
    icon: <AlertCircle className="h-4 w-4" />,
  },
  COMPLETED: {
    variant: "secondary",
    label: "Completed",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  CANCELLED: {
    variant: "destructive",
    label: "Cancelled",
    icon: <AlertCircle className="h-4 w-4" />,
  },
};

export default function TaskDetailPage() {
  const params = useParams();
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchTask(params.id as string);
    }
  }, [params.id]);

  const fetchTask = async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}`);
      if (response.ok) {
        const data = await response.json();
        setTask(data.task);
      } else if (response.status === 404) {
        setError("Task not found");
      } else {
        setError("Failed to load task");
      }
    } catch (err) {
      console.error("Failed to fetch task:", err);
      setError("Failed to load task");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/tasks">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {error || "Task not found"}
            </h2>
            <p className="text-muted-foreground mb-4">
              The task you&apos;re looking for doesn&apos;t exist or you
              don&apos;t have permission to view it.
            </p>
            <Button asChild>
              <Link href="/dashboard/tasks">View All Tasks</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = statusConfig[task.status] || statusConfig.PENDING;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/tasks">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={status.variant} className="flex items-center gap-1">
                {status.icon}
                {status.label}
              </Badge>
              {task.category && (
                <Badge variant="outline">{task.category.name}</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{task.description}</p>
            </CardContent>
          </Card>

          {/* Requirements */}
          {task.requirements && Object.keys(task.requirements).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto">
                  {JSON.stringify(task.requirements, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Files */}
          {task.files.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Files
                </CardTitle>
                <CardDescription>
                  Attached files and deliverables
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {task.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{file.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.fileSize / 1024).toFixed(1)} KB
                            {file.isDeliverable && (
                              <Badge variant="secondary" className="ml-2">
                                Deliverable
                              </Badge>
                            )}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Download
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Messages */}
          {task.messages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {task.messages.map((message) => (
                    <div key={message.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={message.senderImage || undefined} />
                        <AvatarFallback>
                          {message.senderName?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {message.senderName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{message.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Task Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Coins className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Credits Used</p>
                  <p className="font-medium">{task.creditsUsed} credits</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Revisions</p>
                  <p className="font-medium">
                    {task.revisionsUsed} / {task.maxRevisions} used
                  </p>
                </div>
              </div>

              {task.estimatedHours && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Estimated Time
                      </p>
                      <p className="font-medium">{task.estimatedHours} hours</p>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {task.deadline && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Deadline</p>
                      <p className="font-medium">
                        {new Date(task.deadline).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {task.completedAt && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="font-medium">
                        {new Date(task.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Assigned Freelancer */}
          {task.freelancer && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Designer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={task.freelancer.image || undefined} />
                    <AvatarFallback>
                      {task.freelancer.name?.[0]?.toUpperCase() || "F"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{task.freelancer.name}</p>
                    {task.assignedAt && (
                      <p className="text-xs text-muted-foreground">
                        Assigned{" "}
                        {new Date(task.assignedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Waiting for Assignment */}
          {!task.freelancer && task.status === "PENDING" && (
            <Card>
              <CardContent className="py-6 text-center">
                <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">Awaiting Assignment</p>
                <p className="text-sm text-muted-foreground mt-1">
                  A designer will be assigned to your task soon
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
