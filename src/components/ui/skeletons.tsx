"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Image with skeleton loading - shows skeleton until image loads
export function ImageWithSkeleton({
  src,
  alt,
  className,
  skeletonClassName,
  aspectRatio,
  loading,
}: {
  src: string;
  alt: string;
  className?: string;
  skeletonClassName?: string;
  aspectRatio?: string;
  loading?: "lazy" | "eager";
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={cn("relative overflow-hidden", className)} style={{ aspectRatio }}>
      <AnimatePresence>
        {!isLoaded && !hasError && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <Skeleton className={cn("w-full h-full", skeletonClassName)} />
          </motion.div>
        )}
      </AnimatePresence>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={loading}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
      />
    </div>
  );
}

// Scrolling column skeleton for onboarding brand references
export function BrandReferenceColumnSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      className="relative flex-shrink-0 rounded-2xl overflow-hidden"
      style={{
        width: "140px",
        height: "420px",
        background: "rgba(15, 15, 15, 0.4)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* Top fade gradient */}
      <div
        className="absolute top-0 left-0 right-0 h-24 z-10 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgba(10, 10, 10, 1) 0%, rgba(10, 10, 10, 0.7) 50%, transparent 100%)",
        }}
      />
      {/* Bottom fade gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24 z-10 pointer-events-none"
        style={{
          background: "linear-gradient(0deg, rgba(10, 10, 10, 1) 0%, rgba(10, 10, 10, 0.7) 50%, transparent 100%)",
        }}
      />
      {/* Scrolling skeleton cards */}
      <motion.div
        className="flex flex-col gap-3 p-2"
        animate={{
          y: index % 2 === 0 ? [0, -600] : [-600, 0],
        }}
        transition={{
          y: {
            duration: 20 + index * 5,
            repeat: Infinity,
            ease: "linear",
          },
        }}
      >
        {[...Array(6)].map((_, i) => (
          <Skeleton
            key={i}
            className="flex-shrink-0 rounded-xl bg-white/5"
            style={{ width: "100%", height: "200px" }}
          />
        ))}
      </motion.div>
    </div>
  );
}

// Grid of scrolling columns skeleton for onboarding
export function BrandReferenceGridSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex gap-4 justify-center">
      {[...Array(columns)].map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <BrandReferenceColumnSkeleton index={index} />
        </motion.div>
      ))}
    </div>
  );
}

// Masonry grid skeleton for dashboard explore section
export function MasonryGridSkeleton({
  count = 15,
  columns = 5,
  showHeader = true,
}: {
  count?: number;
  columns?: number;
  showHeader?: boolean;
}) {
  // Generate varied heights for masonry effect
  const heights = [150, 180, 200, 220, 170, 190, 160, 210, 185, 175, 195, 165, 205, 155, 225];

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-5 w-40" />
          <div className="flex-1 h-px bg-border ml-2" />
          <Skeleton className="h-4 w-16" />
        </div>
      )}
      <div
        className="gap-3 space-y-3"
        style={{
          columns: columns,
          columnGap: "12px",
        }}
      >
        {[...Array(count)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
            className="break-inside-avoid mb-3"
          >
            <Skeleton
              className="w-full rounded-xl bg-white/5 dark:bg-white/5"
              style={{ height: `${heights[i % heights.length]}px` }}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Card skeleton for dashboard cards
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-6 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

// Stats card skeleton for admin dashboard
export function StatsCardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

// Task card skeleton
export function TaskCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-4 space-y-3", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

// Task list skeleton
export function TaskListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <TaskCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Table row skeleton
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

// Table skeleton
export function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Profile card skeleton
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}

// Message skeleton for chat
export function MessageSkeleton({ isOwn = false }: { isOwn?: boolean }) {
  return (
    <div className={cn("flex gap-3", isOwn && "flex-row-reverse")}>
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      <div className={cn("space-y-2", isOwn && "items-end")}>
        <Skeleton className="h-4 w-24" />
        <Skeleton className={cn("h-16 rounded-lg", isOwn ? "w-48" : "w-64")} />
      </div>
    </div>
  );
}

// Chat skeleton
export function ChatSkeleton({ messageCount = 4 }: { messageCount?: number }) {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: messageCount }).map((_, i) => (
        <MessageSkeleton key={i} isOwn={i % 2 === 1} />
      ))}
    </div>
  );
}

// Sidebar skeleton
export function SidebarSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-5 w-32" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

// Form skeleton
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

// Page header skeleton
export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96" />
    </div>
  );
}

// Dashboard skeleton (combines multiple elements)
export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />
      <StatsCardSkeleton />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <TaskListSkeleton count={3} />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="rounded-lg border bg-card p-4">
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
