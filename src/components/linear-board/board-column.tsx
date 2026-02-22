'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { cn } from '@/lib/utils'
import { BoardCard } from './board-card'
import type { BoardTask, ColumnConfig } from './board-types'
import { ScrollArea } from '@/components/ui/scroll-area'

interface BoardColumnProps {
  column: ColumnConfig
  tasks: BoardTask[]
  onTaskClick: (taskId: string) => void
  deadlineMode: 'client' | 'artist'
  showClient?: boolean
  showArtist?: boolean
  enableDragDrop?: boolean
  onStatusChange?: (taskId: string, newStatus: string) => void
  onDeleteTasks?: (taskIds: string[]) => void
  onDeleteSelected?: () => void
  columns: ColumnConfig[]
  selectedTaskIds?: Set<string>
  selectedCount?: number
}

export function BoardColumn({
  column,
  tasks,
  onTaskClick,
  deadlineMode,
  showClient,
  showArtist,
  enableDragDrop,
  onStatusChange,
  onDeleteTasks,
  onDeleteSelected,
  columns,
  selectedTaskIds,
  selectedCount = 0,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { column },
  })

  return (
    <div className="flex flex-col w-[280px] min-w-[280px] h-full shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 px-2 py-2 mb-2">
        <div
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: column.color }}
        />
        <span className="text-sm font-medium text-foreground tracking-tight">{column.title}</span>
        <span className="text-xs text-muted-foreground ml-auto tabular-nums">{tasks.length}</span>
      </div>

      {/* Card list */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-0 rounded-lg transition-colors',
          isOver && enableDragDrop && 'bg-primary/5 ring-1 ring-primary/20'
        )}
      >
        <ScrollArea className="h-full">
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 p-1">
              {tasks.map((task) => (
                <BoardCard
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task.id)}
                  deadlineMode={deadlineMode}
                  showClient={showClient}
                  showArtist={showArtist}
                  enableDragDrop={enableDragDrop}
                  isSelected={selectedTaskIds?.has(task.id) ?? false}
                  selectedCount={selectedCount}
                  onStatusChange={onStatusChange}
                  onDeleteTasks={onDeleteTasks}
                  onDeleteSelected={onDeleteSelected}
                  columns={columns}
                />
              ))}
              {tasks.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-xs text-muted-foreground/50">No tasks</p>
                </div>
              )}
            </div>
          </SortableContext>
        </ScrollArea>
      </div>
    </div>
  )
}
