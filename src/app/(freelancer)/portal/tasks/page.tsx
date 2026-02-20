import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { FreelancerTasksContent } from './freelancer-tasks-content'

function FreelancerTasksSkeleton() {
  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-background">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-b-0"
            >
              <Skeleton className="w-2.5 h-2.5 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function FreelancerTasksPage() {
  return (
    <Suspense fallback={<FreelancerTasksSkeleton />}>
      <FreelancerTasksContent />
    </Suspense>
  )
}
