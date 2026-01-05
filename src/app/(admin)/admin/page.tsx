"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  Users,
  UserCheck,
  FolderOpen,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Tags,
  Image,
  ArrowRight,
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

const QUICK_ACTIONS = [
  {
    id: "tasks",
    href: "/admin/tasks",
    icon: FolderOpen,
    title: "All Tasks",
    description: "View and manage all tasks",
    gridClass: "col-span-1 md:col-span-3",
  },
  {
    id: "freelancers",
    href: "/admin/freelancers",
    icon: UserCheck,
    title: "Freelancers",
    description: "Manage freelancer approvals",
    gridClass: "col-span-1 md:col-span-3",
  },
  {
    id: "categories",
    href: "/admin/categories",
    icon: Tags,
    title: "Categories",
    description: "Edit task categories",
    gridClass: "col-span-1 md:col-span-3",
  },
  {
    id: "styles",
    href: "/admin/styles",
    icon: Image,
    title: "Style Library",
    description: "Manage style references",
    gridClass: "col-span-1 md:col-span-3",
  },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setIsLoading(true);
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
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; color: string }> = {
      PENDING: { variant: "secondary", label: "Pending", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
      ASSIGNED: { variant: "outline", label: "Assigned", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
      IN_PROGRESS: { variant: "default", label: "In Progress", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
      IN_REVIEW: { variant: "outline", label: "In Review", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
      REVISION_REQUESTED: { variant: "destructive", label: "Revision", color: "bg-red-500/20 text-red-400 border-red-500/30" },
      COMPLETED: { variant: "secondary", label: "Completed", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
    };
    const config = variants[status] || { variant: "secondary" as const, label: status, color: "bg-gray-500/20 text-gray-400 border-gray-500/30" };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const statsConfig = [
    { key: "totalClients", label: "Clients", icon: Users, color: "text-blue-400", bgColor: "bg-blue-500/20" },
    { key: "totalFreelancers", label: "Freelancers", icon: UserCheck, color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
    { key: "pendingApprovals", label: "Pending", icon: AlertTriangle, color: "text-yellow-400", bgColor: "bg-yellow-500/20", highlight: true },
    { key: "activeTasks", label: "Active", icon: Clock, color: "text-purple-400", bgColor: "bg-purple-500/20" },
    { key: "completedTasks", label: "Completed", icon: CheckCircle, color: "text-green-400", bgColor: "bg-green-500/20" },
    { key: "totalRevenue", label: "Revenue", icon: DollarSign, color: "text-rose-400", bgColor: "bg-rose-500/20", isCurrency: true },
  ];

  return (
    <div className="relative flex flex-col min-h-full px-4 sm:px-6 lg:px-8 pt-24 pb-20 bg-[#0a0a0a] overflow-auto">
      {/* Curtain light from top - subtle ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[800px] pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 55% at 50% 0%,
            rgba(244, 63, 94, 0.08) 0%,
            rgba(244, 63, 94, 0.04) 20%,
            rgba(244, 63, 94, 0.02) 40%,
            rgba(244, 63, 94, 0.01) 60%,
            transparent 100%
          )`,
          animation: "curtainPulse 14s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          filter: "blur(40px)",
        }}
      />
      <style jsx>{`
        @keyframes curtainPulse {
          0%,
          100% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 space-y-8"
      >
        {/* Header */}
        <div className="space-y-2">
          <h1
            className="text-3xl sm:text-4xl font-normal tracking-tight"
            style={{
              background: "linear-gradient(90deg, #f43f5e 0%, #fb7185 50%, #fda4af 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Admin Dashboard
          </h1>
          <p className="text-[#6b7280] text-base">
            Overview of platform activity and management
          </p>
        </div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
        >
          {statsConfig.map((stat, index) => {
            const Icon = stat.icon;
            const value = stats?.[stat.key as keyof AdminStats] || 0;
            const displayValue = stat.isCurrency ? `$${value.toLocaleString()}` : value;
            const shouldHighlight = stat.highlight && value > 0;

            return (
              <motion.div
                key={stat.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + index * 0.05 }}
                className={`relative rounded-xl overflow-hidden border transition-all ${
                  shouldHighlight
                    ? "border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.15)]"
                    : "border-[#2a2a30]/50 hover:border-[#3a3a40]/80"
                }`}
                style={{
                  background: "linear-gradient(180deg, rgba(20, 20, 24, 0.8) 0%, rgba(12, 12, 15, 0.9) 100%)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-[#6b6b6b] uppercase tracking-wider">
                      {stat.label}
                    </span>
                    <div className={`p-1.5 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
                    </div>
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16 bg-[#1a1a1f]" />
                  ) : (
                    <div className={`text-2xl font-bold ${stat.color}`}>
                      {displayValue}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-4"
        >
          <h2 className="text-lg font-medium text-white/90">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-12 gap-3">
            {QUICK_ACTIONS.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.id}
                  href={action.href}
                  className={`group relative rounded-xl overflow-hidden border border-[#2a2a30]/50 hover:border-rose-500/30 transition-all cursor-pointer h-[120px] ${action.gridClass}`}
                  style={{
                    background: "linear-gradient(180deg, rgba(20, 20, 24, 0.6) 0%, rgba(12, 12, 15, 0.8) 100%)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.25 + index * 0.05 }}
                    className="p-4 h-full flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-lg bg-rose-500/10 group-hover:bg-rose-500/20 transition-colors">
                        <Icon className="h-5 w-5 text-rose-400" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-[#4a4a4a] group-hover:text-rose-400 group-hover:translate-x-1 transition-all" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-xs text-[#6b6b6b] mt-0.5">
                        {action.description}
                      </p>
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </motion.div>

        {/* Recent Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-white/90">Recent Tasks</h2>
            <Link
              href="/admin/tasks"
              className="text-sm text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1"
            >
              View All
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div
            className="rounded-xl overflow-hidden border border-[#2a2a30]/50"
            style={{
              background: "linear-gradient(180deg, rgba(20, 20, 24, 0.8) 0%, rgba(12, 12, 15, 0.9) 100%)",
              backdropFilter: "blur(20px)",
            }}
          >
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48 bg-[#1a1a1f]" />
                      <Skeleton className="h-3 w-32 bg-[#1a1a1f]" />
                    </div>
                    <Skeleton className="h-6 w-20 bg-[#1a1a1f]" />
                  </div>
                ))}
              </div>
            ) : recentTasks.length === 0 ? (
              <div className="p-8 text-center">
                <FolderOpen className="h-12 w-12 mx-auto text-[#4a4a4a] mb-3" />
                <p className="text-[#6b6b6b]">No tasks yet</p>
              </div>
            ) : (
              <div className="divide-y divide-[#2a2a30]/50">
                {recentTasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.35 + index * 0.03 }}
                  >
                    <Link
                      href={`/admin/tasks/${task.id}`}
                      className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors group"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <p className="font-medium text-white/90 group-hover:text-white transition-colors truncate pr-4">
                          {task.title}
                        </p>
                        <p className="text-sm text-[#6b6b6b]">
                          <span className="text-[#8b8b8b]">{task.clientName}</span>
                          {task.freelancerName && (
                            <>
                              <span className="mx-2 text-[#4a4a4a]">→</span>
                              <span className="text-[#8b8b8b]">{task.freelancerName}</span>
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusBadge(task.status)}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center pt-8"
        >
          <p className="text-sm text-[#4a4a4a]">
            Super Admin Panel - Full platform control
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
