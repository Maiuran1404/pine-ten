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
  TrendingUp,
  Coins,
  Target,
  DollarSign,
} from "lucide-react";

interface FreelancerStats {
  activeTasks: number;
  completedTasks: number;
  pendingReview: number;
  rating: number;
  totalEarnings: number;
  monthlyEarnings: number;
  monthlyTasks: number;
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
        fetch("/api/tasks?limit=5&view=freelancer"),
        fetch("/api/freelancer/profile"),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        const taskList = data.data?.tasks || data.tasks || [];
        // Show ASSIGNED and IN_PROGRESS tasks (not just IN_PROGRESS)
        setActiveTasks(taskList.filter((t: { status: string }) => 
          ["ASSIGNED", "IN_PROGRESS", "REVISION_REQUESTED"].includes(t.status)
        ));
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
      <div className="flex flex-col items-center justify-center min-h-full px-4 bg-background">
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto space-y-6">
          <Skeleton className="w-20 h-20 rounded-2xl bg-muted" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-64 mx-auto bg-muted" />
            <Skeleton className="h-10 w-80 mx-auto bg-muted" />
            <Skeleton className="h-5 w-56 mx-auto mt-4 bg-muted" />
          </div>
          <Skeleton className="h-16 w-full max-w-md rounded-xl mt-8 bg-muted" />
        </div>
      </div>
    );
  }

  // Show onboarding prompt for users who haven't completed onboarding
  if (profileStatus === "NOT_FOUND") {
    return (
      <div className="relative flex flex-col items-center justify-start min-h-full px-4 pt-24 pb-20 bg-background overflow-auto">
        {/* Curtain light from top */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[800px] pointer-events-none dark:opacity-100 opacity-50"
          style={{
            background: `radial-gradient(ellipse 70% 55% at 50% 0%,
              rgba(13, 148, 136, 0.08) 0%,
              rgba(13, 148, 136, 0.04) 20%,
              rgba(13, 148, 136, 0.02) 40%,
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
          {/* Logo Icon */}
          <div className="w-20 h-20 rounded-2xl bg-card flex items-center justify-center mb-2 border border-border">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>

          {/* Welcome Text */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-normal tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Welcome, {user?.name?.split(" ")[0]}!
            </h1>
            <h2 className="text-2xl sm:text-3xl font-normal tracking-tight text-foreground">
              Let&apos;s set up your profile
            </h2>
            <p className="text-muted-foreground text-base mt-4">
              Complete your artist profile to start receiving design tasks.
            </p>
          </div>

          {/* CTA Button */}
          <div className="w-full max-w-md mt-8">
            <Link href="/onboarding?type=freelancer">
              <div className="relative rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-all cursor-pointer group bg-card">
                <div className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Palette className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-foreground font-medium">Complete Your Profile</p>
                      <p className="text-muted-foreground text-sm">Takes about 2 minutes</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          </div>

          {/* Benefits */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-border bg-card">
              <Palette className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Showcase skills</span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-border bg-card">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Get matched</span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-border bg-card">
              <Award className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Earn & grow</span>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="absolute bottom-6 left-0 right-0 text-center z-10">
          <p className="text-sm text-muted-foreground">
            Join our network of talented designers.
          </p>
        </div>
      </div>
    );
  }

  // Show pending review state
  if (profileStatus === "PENDING") {
    return (
      <div className="relative flex flex-col items-center justify-start min-h-full px-4 pt-24 pb-20 bg-background overflow-auto">
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
            <p className="text-muted-foreground text-base mt-4 max-w-md">
              Your artist application is being reviewed by our team.
              You&apos;ll receive a notification once it&apos;s approved.
            </p>
          </div>

          {/* Status Card */}
          <div className="w-full max-w-md mt-8">
            <div className="relative rounded-xl overflow-hidden border border-yellow-500/20 bg-yellow-500/5">
              <div className="flex items-center gap-4 px-6 py-4">
                <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
                <div className="text-left">
                  <p className="text-foreground font-medium">Review in progress</p>
                  <p className="text-muted-foreground text-sm">Usually takes 24-48 hours</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="mt-8 text-center">
            <p className="text-muted-foreground text-sm">
              Make sure your portfolio links are accessible and showcase your best work.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Calculate progress towards monthly goal (example: 50 credits)
  const monthlyGoal = 50;
  const progressPercent = stats ? Math.min((stats.monthlyEarnings / monthlyGoal) * 100, 100) : 0;

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Welcome back, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-0.5 sm:mt-1">
          Here&apos;s an overview of your work
        </p>
      </div>

      {/* Earnings Hero Section */}
      <Card className="overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <TrendingUp className="h-4 w-4" />
            <span>This Month</span>
          </div>

          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-3 mb-6">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-bold">{stats?.monthlyEarnings || 0}</span>
                    <span className="text-muted-foreground text-sm">credits</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Earned this month</p>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-bold">{stats?.monthlyTasks || 0}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Tasks completed</p>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-bold">{stats?.rating?.toFixed(1) || "—"}</span>
                    {stats?.rating && <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Average rating</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    Monthly goal
                  </span>
                  <span className="font-medium">{Math.round(progressPercent)}% of {monthlyGoal} credits</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* New Task Assignment Banners */}
      {activeTasks.filter((t) => t.status === "ASSIGNED").length > 0 && (
        <div className="space-y-3">
          {activeTasks.filter((t) => t.status === "ASSIGNED").map((task) => (
            <Link key={task.id} href={`/portal/tasks/${task.id}`}>
              <Card className="border-2 border-emerald-500/50 bg-emerald-50 dark:bg-emerald-900/20 hover:border-emerald-500 transition-colors cursor-pointer">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">New task assigned to you</span>
                    </div>
                    <p className="text-sm text-foreground font-medium mt-0.5 truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                  </div>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
                    View Task
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalEarnings || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
        <Card className="border-dashed hover:border-primary/50 transition-colors cursor-pointer">
          <Link href="/portal/tasks">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                <CheckCircle className="h-6 w-6 text-primary-foreground" />
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

        <Card className="border-dashed hover:border-primary/50 transition-colors cursor-pointer">
          <Link href="/portal/payouts">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <DollarSign className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Payouts</CardTitle>
                <CardDescription>
                  View your earnings and request payouts
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
              <p className="text-muted-foreground">
                No active tasks. New tasks will be assigned to you automatically.
              </p>
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
