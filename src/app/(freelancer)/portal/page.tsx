import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { PortalDashboardContent } from './portal-dashboard-content'

function PortalDashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-48 mt-1" />
      </div>

      {/* Earnings Hero Section */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="grid gap-6 sm:grid-cols-3 mb-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card">
            <div className="p-6 pb-2 flex flex-row items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4" />
            </div>
            <div className="p-6 pt-0">
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-dashed bg-card p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Active Tasks */}
      <div className="rounded-lg border bg-card">
        <div className="p-6 flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-20" />
        </div>
        <div className="px-6 pb-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function FreelancerDashboardPage() {
  return (
    <Suspense fallback={<PortalDashboardSkeleton />}>
      <PortalDashboardContent />
    </Suspense>
  )
}
