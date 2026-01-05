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
import { motion } from "framer-motion";
import {
  FolderOpen,
  Clock,
  CheckCircle,
  AlertTriangle,
  Star,
  Sparkles,
  ArrowRight,
  Palette,
  Briefcase,
  Award,
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
  const [profileStatus, setProfileStatus] = useState<string | null>(null);

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

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full px-4 bg-[#0a0a0a]">
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto space-y-6">
          <Skeleton className="w-20 h-20 rounded-2xl bg-[#1a1a1f]" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-64 mx-auto bg-[#1a1a1f]" />
            <Skeleton className="h-10 w-80 mx-auto bg-[#1a1a1f]" />
            <Skeleton className="h-5 w-56 mx-auto mt-4 bg-[#1a1a1f]" />
          </div>
          <Skeleton className="h-16 w-full max-w-md rounded-xl mt-8 bg-[#1a1a1f]" />
        </div>
      </div>
    );
  }

  // Show onboarding prompt for users who haven't completed onboarding
  if (profileStatus === "NOT_FOUND") {
    return (
      <div className="relative flex flex-col items-center justify-start min-h-full px-4 pt-24 pb-20 bg-[#0a0a0a] overflow-auto">
        {/* Curtain light from top */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[800px] pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 70% 55% at 50% 0%,
              rgba(255, 255, 255, 0.06) 0%,
              rgba(255, 255, 255, 0.04) 20%,
              rgba(255, 255, 255, 0.025) 40%,
              rgba(255, 255, 255, 0.012) 60%,
              rgba(255, 255, 255, 0.004) 80%,
              transparent 100%
            )`,
            filter: "blur(40px)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative flex flex-col items-center text-center max-w-2xl mx-auto space-y-6 z-10"
        >
          {/* Logo Icon */}
          <div className="w-20 h-20 rounded-2xl bg-[#18181b] flex items-center justify-center mb-2 border border-[#27272a]/60">
            <Sparkles className="w-10 h-10 text-white" />
          </div>

          {/* Welcome Text */}
          <div className="space-y-2">
            <h1
              className="text-3xl sm:text-4xl font-normal tracking-tight"
              style={{
                background: "linear-gradient(90deg, #9ca3af 0%, #6b7280 50%, #4b5563 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Welcome, {user?.name?.split(" ")[0]}!
            </h1>
            <h2
              className="text-2xl sm:text-3xl font-normal tracking-tight"
              style={{
                background: "linear-gradient(90deg, #e5e7eb 0%, #9ca3af 40%, #6b7280 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Let&apos;s set up your profile
            </h2>
            <p className="text-[#6b7280] text-base mt-4">
              Complete your artist profile to start receiving design tasks.
            </p>
          </div>

          {/* CTA Button */}
          <div className="w-full max-w-md mt-8">
            <Link href="/onboarding?type=freelancer">
              <div
                className="relative rounded-xl overflow-hidden border border-[#2a2a30]/50 hover:border-[#3a3a40]/80 transition-all cursor-pointer group"
                style={{
                  background: "linear-gradient(180deg, rgba(20, 20, 24, 0.8) 0%, rgba(12, 12, 15, 0.9) 100%)",
                  backdropFilter: "blur(20px)",
                  boxShadow: "0 0 30px rgba(255,255,255,0.02), inset 0 1px 0 0 rgba(255,255,255,0.04)",
                }}
              >
                <div className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                      <Palette className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-white font-medium">Complete Your Profile</p>
                      <p className="text-[#6b6b6b] text-sm">Takes about 2 minutes</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-[#6b6b6b] group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          </div>

          {/* Benefits */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <div
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#2a2a30]/60"
              style={{ background: "rgba(20, 20, 23, 0.6)", backdropFilter: "blur(8px)" }}
            >
              <Palette className="w-4 h-4 text-[#6b6b6b]" />
              <span className="text-sm text-[#6b6b6b]">Showcase skills</span>
            </div>
            <div
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#2a2a30]/60"
              style={{ background: "rgba(20, 20, 23, 0.6)", backdropFilter: "blur(8px)" }}
            >
              <Briefcase className="w-4 h-4 text-[#6b6b6b]" />
              <span className="text-sm text-[#6b6b6b]">Get matched</span>
            </div>
            <div
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#2a2a30]/60"
              style={{ background: "rgba(20, 20, 23, 0.6)", backdropFilter: "blur(8px)" }}
            >
              <Award className="w-4 h-4 text-[#6b6b6b]" />
              <span className="text-sm text-[#6b6b6b]">Earn & grow</span>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="absolute bottom-6 left-0 right-0 text-center z-10">
          <p className="text-sm text-[#4a4a4a]">
            Join our network of talented designers.
          </p>
        </div>
      </div>
    );
  }

  // Show pending review state
  if (profileStatus === "PENDING") {
    return (
      <div className="relative flex flex-col items-center justify-start min-h-full px-4 pt-24 pb-20 bg-[#0a0a0a] overflow-auto">
        {/* Curtain light from top */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[800px] pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 70% 55% at 50% 0%,
              rgba(234, 179, 8, 0.04) 0%,
              rgba(234, 179, 8, 0.02) 20%,
              rgba(234, 179, 8, 0.01) 40%,
              transparent 60%
            )`,
            filter: "blur(40px)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative flex flex-col items-center text-center max-w-2xl mx-auto space-y-6 z-10"
        >
          {/* Icon */}
          <div className="w-20 h-20 rounded-2xl bg-yellow-500/10 flex items-center justify-center mb-2 border border-yellow-500/20">
            <Clock className="w-10 h-10 text-yellow-500" />
          </div>

          {/* Text */}
          <div className="space-y-2">
            <h1
              className="text-3xl sm:text-4xl font-normal tracking-tight"
              style={{
                background: "linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Application Under Review
            </h1>
            <p className="text-[#6b7280] text-base mt-4 max-w-md">
              Your artist application is being reviewed by our team.
              You&apos;ll receive a notification once it&apos;s approved.
            </p>
          </div>

          {/* Status Card */}
          <div className="w-full max-w-md mt-8">
            <div
              className="relative rounded-xl overflow-hidden border border-yellow-500/20"
              style={{
                background: "linear-gradient(180deg, rgba(234, 179, 8, 0.05) 0%, rgba(12, 12, 15, 0.9) 100%)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div className="flex items-center gap-4 px-6 py-4">
                <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
                <div className="text-left">
                  <p className="text-white font-medium">Review in progress</p>
                  <p className="text-[#6b6b6b] text-sm">Usually takes 24-48 hours</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="mt-8 text-center">
            <p className="text-[#4a4a4a] text-sm">
              Make sure your portfolio links are accessible and showcase your best work.
            </p>
          </div>
        </motion.div>
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
