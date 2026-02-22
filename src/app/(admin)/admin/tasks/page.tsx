'use client'

import { Suspense, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Columns3, List } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TasksContent } from './tasks-content'
import { BoardContent } from './board-content'

type ViewMode = 'board' | 'table'

const STORAGE_KEY = 'admin-tasks-view'

function TasksPageSkeleton() {
  return (
    <div className="min-h-full bg-background">
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <Skeleton className="h-7 w-28" />
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-4 space-y-4 sm:space-y-6">
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    </div>
  )
}

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-muted/50">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange('board')}
        className={cn(
          'h-7 px-2.5 gap-1.5 text-xs',
          view === 'board' && 'bg-background shadow-sm text-foreground'
        )}
      >
        <Columns3 className="h-3.5 w-3.5" />
        Board
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange('table')}
        className={cn(
          'h-7 px-2.5 gap-1.5 text-xs',
          view === 'table' && 'bg-background shadow-sm text-foreground'
        )}
      >
        <List className="h-3.5 w-3.5" />
        Table
      </Button>
    </div>
  )
}

export default function AllTasksPage() {
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'board'
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'board' || saved === 'table' ? saved : 'board'
  })

  const handleViewChange = (newView: ViewMode) => {
    setView(newView)
    localStorage.setItem(STORAGE_KEY, newView)
  }

  if (view === 'board') {
    return (
      <div className="h-[calc(100vh-10rem)] flex flex-col min-w-0">
        <div className="flex items-center justify-between pb-3 -mt-2 shrink-0">
          <h1 className="text-xl font-semibold text-foreground">Tasks</h1>
          <ViewToggle view={view} onChange={handleViewChange} />
        </div>
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
          <Suspense fallback={<TasksPageSkeleton />}>
            <BoardContent />
          </Suspense>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between pb-4 -mt-2">
        <h1 className="text-xl font-semibold text-foreground">Tasks</h1>
        <ViewToggle view={view} onChange={handleViewChange} />
      </div>
      <Suspense fallback={<TasksPageSkeleton />}>
        <TasksContent />
      </Suspense>
    </div>
  )
}
