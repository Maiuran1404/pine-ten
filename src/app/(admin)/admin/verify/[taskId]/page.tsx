"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  FileText,
  User,
  Mail,
  Eye,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface TaskFile {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  isDeliverable: boolean;
  createdAt: string;
}

interface TaskUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  client: TaskUser | null;
  freelancer: TaskUser | null;
  deliverables: TaskFile[];
  attachments: TaskFile[];
}

export default function AdminVerifyDeliverablePage() {
  const params = useParams();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (params.taskId) {
      fetchTask(params.taskId as string);
    }
  }, [params.taskId]);

  const fetchTask = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/verify/${id}`);
      if (response.ok) {
        const data = await response.json();
        setTask(data.data?.task || data.task);
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

  const handleVerification = async (action: "approve" | "reject") => {
    if (action === "reject" && !feedback.trim()) {
      toast.error("Please provide feedback for the rejection");
      return;
    }

    setIsSubmitting(true);
    try {
      const taskId = params.taskId as string;
      const response = await fetch(`/api/admin/verify/${taskId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, feedback: feedback.trim() }),
      });

      const contentType = response.headers.get("content-type");
      if (response.ok) {
        toast.success(
          action === "approve"
            ? "Deliverable approved! Client has been notified."
            : "Deliverable rejected. Freelancer has been notified."
        );
        router.push("/admin/verify");
      } else if (contentType?.includes("application/json")) {
        const data = await response.json();
        toast.error(data.error?.message || data.error || "Failed to process verification");
      } else {
        toast.error("Failed to process verification. Please try again.");
      }
    } catch (err) {
      console.error("Verification error:", err);
      toast.error("Failed to process verification");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isImage = (fileType: string) => fileType.startsWith("image/");

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
        <Card>
          <CardContent className="py-12">
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/admin/verify">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Verifications
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {error || "Task not found"}
            </h2>
            <p className="text-muted-foreground mb-4">
              The task you&apos;re looking for doesn&apos;t exist or has already been verified.
            </p>
            <Button asChild>
              <Link href="/admin/verify">View Pending Verifications</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPendingReview = task.status === "PENDING_ADMIN_REVIEW";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/verify">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Verify Deliverable</h1>
            <p className="text-muted-foreground mt-1">{task.title}</p>
          </div>
        </div>
        <Badge
          variant={isPendingReview ? "destructive" : "secondary"}
          className="text-sm"
        >
          {isPendingReview ? "Pending Review" : task.status.replace(/_/g, " ")}
        </Badge>
      </div>

      {!isPendingReview && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-5 w-5" />
              <p>This task has already been verified or is not pending review.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Task Description */}
          <Card>
            <CardHeader>
              <CardTitle>Task Brief</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{task.description}</p>
            </CardContent>
          </Card>

          {/* Deliverables to Review */}
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Deliverables to Review
              </CardTitle>
              <CardDescription>
                Review these files before approving for the client
              </CardDescription>
            </CardHeader>
            <CardContent>
              {task.deliverables.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No deliverables uploaded yet
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {task.deliverables.map((file) => (
                    <div
                      key={file.id}
                      className="border rounded-lg overflow-hidden"
                    >
                      {isImage(file.fileType) ? (
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block aspect-video relative bg-muted"
                        >
                          <Image
                            src={file.fileUrl}
                            alt={file.fileName}
                            fill
                            className="object-contain"
                          />
                        </a>
                      ) : (
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center p-6 aspect-video bg-muted hover:bg-muted/80 transition-colors"
                        >
                          <FileText className="h-12 w-12 text-muted-foreground mb-2" />
                          <p className="text-sm text-center truncate w-full px-4">
                            {file.fileName}
                          </p>
                        </a>
                      )}
                      <div className="p-3 bg-background flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium truncate max-w-[200px]">
                            {file.fileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(file.fileSize / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a href={file.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Verification Actions */}
          {isPendingReview && (
            <Card>
              <CardHeader>
                <CardTitle>Verification Decision</CardTitle>
                <CardDescription>
                  Approve to send to client, or reject to send back to freelancer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Feedback (required for rejection)
                  </label>
                  <Textarea
                    placeholder="Provide feedback for the freelancer if rejecting..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleVerification("approve")}
                    disabled={isSubmitting}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Approve & Notify Client
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleVerification("reject")}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Reject & Request Revision
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Info */}
          {task.client && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Client
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={task.client.image || undefined} />
                    <AvatarFallback>
                      {task.client.name?.[0]?.toUpperCase() || "C"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{task.client.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {task.client.email}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Freelancer Info */}
          {task.freelancer && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Freelancer
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
                    <p className="font-medium">{task.freelancer.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {task.freelancer.email}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href={`/admin/tasks/${task.id}`}>
                  <FileText className="h-4 w-4 mr-2" />
                  View Full Task Details
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
