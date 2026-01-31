"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";
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
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  Clock,
  Star,
  CheckCircle2,
  ExternalLink,
  Calendar,
  MapPin,
  DollarSign,
  Briefcase,
  Check,
  X,
  MessageCircle,
} from "lucide-react";
import { LoadingSpinner } from "@/components/shared/loading";

interface FreelancerDetails {
  id: string;
  userId: string;
  status: string;
  skills: string[];
  specializations: string[];
  portfolioUrls: string[];
  bio: string | null;
  timezone: string | null;
  hourlyRate: string | null;
  rating: string | null;
  completedTasks: number;
  whatsappNumber: string | null;
  availability: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    createdAt: string;
  };
  taskCounts: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    inReview: number;
  };
  recentTasks: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
    completedAt: string | null;
  }>;
}

export default function FreelancerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [freelancer, setFreelancer] = useState<FreelancerDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchFreelancer();
  }, [id]);

  const fetchFreelancer = async () => {
    try {
      const response = await fetch(`/api/admin/freelancers/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Artist not found");
          router.push("/admin/freelancers");
          return;
        }
        throw new Error("Failed to fetch artist");
      }
      const data = await response.json();
      setFreelancer(data.data?.freelancer);
    } catch (error) {
      console.error("Failed to fetch artist:", error);
      toast.error("Failed to load artist details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!freelancer) return;
    setIsProcessing(true);
    try {
      const response = await fetch("/api/admin/freelancers/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freelancerId: freelancer.id }),
      });

      if (!response.ok) throw new Error("Failed to approve");

      toast.success("Artist approved successfully!");
      setFreelancer((prev) =>
        prev ? { ...prev, status: "APPROVED" } : prev
      );
    } catch {
      toast.error("Failed to approve artist");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!freelancer) return;
    setIsProcessing(true);
    try {
      const response = await fetch("/api/admin/freelancers/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freelancerId: freelancer.id }),
      });

      if (!response.ok) throw new Error("Failed to reject");

      toast.success("Artist rejected");
      setFreelancer((prev) =>
        prev ? { ...prev, status: "REJECTED" } : prev
      );
    } catch {
      toast.error("Failed to reject artist");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      PENDING: { variant: "secondary", label: "Pending Review" },
      APPROVED: { variant: "default", label: "Approved" },
      REJECTED: { variant: "destructive", label: "Rejected" },
      NOT_ONBOARDED: { variant: "outline", label: "Not Onboarded" },
    };
    const { variant, label } = config[status] || { variant: "secondary", label: status };
    return <Badge variant={variant} className="text-sm">{label}</Badge>;
  };

  const getTaskStatusBadge = (status: string) => {
    const config: Record<string, string> = {
      PENDING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      ASSIGNED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      IN_PROGRESS: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      IN_REVIEW: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      COMPLETED: "bg-green-500/20 text-green-400 border-green-500/30",
      REVISION_REQUESTED: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    const color = config[status] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
    const label = status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
        {label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-0">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!freelancer) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Artist not found</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 p-4 sm:p-0"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/freelancers")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {freelancer.user.name}
            </h1>
            <p className="text-muted-foreground">{freelancer.user.email}</p>
          </div>
        </div>

        {freelancer.status === "PENDING" && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={handleApprove}
              disabled={isProcessing}
              className="flex-1 sm:flex-none"
            >
              {isProcessing ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isProcessing}
              className="flex-1 sm:flex-none"
            >
              <X className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Profile Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={freelancer.user.image || undefined} alt={freelancer.user.name} />
                  <AvatarFallback className="text-2xl">
                    {freelancer.user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-semibold">{freelancer.user.name}</h2>
                <div className="mt-2">
                  {getStatusBadge(freelancer.status)}
                </div>
                <div className="flex items-center gap-1 mt-3 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Joined {formatDate(freelancer.user.createdAt)}</span>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{freelancer.user.email}</span>
                </div>

                {freelancer.whatsappNumber && (
                  <div className="flex items-center gap-3 text-sm">
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    <span>{freelancer.whatsappNumber}</span>
                  </div>
                )}

                {freelancer.timezone && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{freelancer.timezone}</span>
                  </div>
                )}

                {freelancer.hourlyRate && (
                  <div className="flex items-center gap-3 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>${parseFloat(freelancer.hourlyRate).toFixed(2)}/hour</span>
                  </div>
                )}

                <div className="flex items-center gap-3 text-sm">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{freelancer.availability ? "Available" : "Not Available"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    {freelancer.completedTasks}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Completed</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                    <Star className="h-5 w-5 text-yellow-500" />
                    {freelancer.rating ? parseFloat(freelancer.rating).toFixed(1) : "—"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Rating</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-blue-500">
                    {freelancer.taskCounts.inProgress}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">In Progress</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-purple-500">
                    {freelancer.taskCounts.inReview}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">In Review</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bio */}
          {freelancer.bio && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {freelancer.bio}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Skills & Specializations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Skills & Expertise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {freelancer.skills && freelancer.skills.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {freelancer.skills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {freelancer.specializations && freelancer.specializations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Specializations</h4>
                  <div className="flex flex-wrap gap-2">
                    {freelancer.specializations.map((spec) => (
                      <Badge key={spec} variant="outline">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {(!freelancer.skills || freelancer.skills.length === 0) &&
               (!freelancer.specializations || freelancer.specializations.length === 0) && (
                <p className="text-sm text-muted-foreground">No skills or specializations listed</p>
              )}
            </CardContent>
          </Card>

          {/* Portfolio */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Portfolio</CardTitle>
              <CardDescription>
                {freelancer.portfolioUrls?.length || 0} portfolio link{freelancer.portfolioUrls?.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {freelancer.portfolioUrls && freelancer.portfolioUrls.length > 0 ? (
                <div className="space-y-2">
                  {freelancer.portfolioUrls.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                    >
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm truncate flex-1">{url}</span>
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No portfolio links provided</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Tasks</CardTitle>
              <CardDescription>
                {freelancer.taskCounts.total} total task{freelancer.taskCounts.total !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {freelancer.recentTasks && freelancer.recentTasks.length > 0 ? (
                <div className="space-y-3">
                  {freelancer.recentTasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/admin/tasks/${task.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate group-hover:text-foreground">
                          {task.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(task.createdAt)}
                          {task.completedAt && ` • Completed ${formatDate(task.completedAt)}`}
                        </p>
                      </div>
                      <div className="ml-3">
                        {getTaskStatusBadge(task.status)}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tasks yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
