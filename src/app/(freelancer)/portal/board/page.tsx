import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { ArtistBoardContent } from './artist-board-content'

function BoardSkeleton() {
  return (
    <div className="flex gap-4 p-4 overflow-x-auto h-full">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="w-[280px] min-w-[280px] space-y-2">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 2 }).map((_, j) => (
            <Skeleton key={j} className="h-20 w-full" />
          ))}
        </div>
      ))}
    </div>
  )
}

export default function ArtistBoardPage() {
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="border-b border-border shrink-0">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-foreground">Board</h1>
        </div>
      </div>
      <div className="flex-1 min-h-0 py-4 px-4">
        <Suspense fallback={<BoardSkeleton />}>
          <ArtistBoardContent />
        </Suspense>
      </div>
    </div>
  )
}
