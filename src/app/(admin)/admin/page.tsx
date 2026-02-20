import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { AdminDashboardContent } from './admin-dashboard-content'

function AdminDashboardSkeleton() {
  return (
    <div className="relative flex flex-col min-h-full overflow-auto">
      <div className="relative z-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 px-4 sm:px-0">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-5 w-80" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 px-4 sm:px-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-7 rounded-lg" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-32 mx-4 sm:mx-0" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 px-4 sm:px-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card h-[100px] sm:h-[120px] p-4"
              >
                <Skeleton className="h-9 w-9 rounded-lg mb-4" />
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-4 sm:px-0">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="rounded-xl border border-border bg-card mx-4 sm:mx-0 p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<AdminDashboardSkeleton />}>
      <AdminDashboardContent />
    </Suspense>
  )
}
