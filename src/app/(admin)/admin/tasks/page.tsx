import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { TasksContent } from './tasks-content'

function TasksPageSkeleton() {
  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <Skeleton className="h-7 w-28" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-4 space-y-4 sm:space-y-6">
        {/* Stats */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-11 w-11 rounded-xl" />
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Skeleton className="h-10 w-80" />

        {/* Search */}
        <Skeleton className="h-10 w-64" />

        {/* Filter Tabs */}
        <Skeleton className="h-10 w-96" />

        {/* Table Card */}
        <div className="rounded-lg border bg-card">
          <div className="p-6 space-y-1.5">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="px-6 pb-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AllTasksPage() {
  return (
    <Suspense fallback={<TasksPageSkeleton />}>
      <TasksContent />
    </Suspense>
  )
}
