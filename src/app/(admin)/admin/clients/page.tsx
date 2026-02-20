import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { ClientsContent } from './clients-content'

function ClientsPageSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div>
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-5 w-72 mt-1" />
      </div>

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

      {/* Search */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-64" />
      </div>

      {/* Table Card */}
      <div className="rounded-lg border bg-card">
        <div className="p-6 space-y-1.5">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="px-6 pb-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ClientsPage() {
  return (
    <Suspense fallback={<ClientsPageSkeleton />}>
      <ClientsContent />
    </Suspense>
  )
}
