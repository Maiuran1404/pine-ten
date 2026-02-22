'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn, getDeadlineUrgency, calculateWorkingDeadline } from '@/lib/utils'
import type { BoardTask, ColumnConfig } from './board-types'
import { ALLOWED_TRANSITIONS, STATUS_DISPLAY_NAMES } from './board-types'
import { ArrowUpRight, ExternalLink, Copy, Trash2, ArrowRight } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'

interface BoardCardProps {
  task: BoardTask
  onClick: () => void
  deadlineMode: 'client' | 'artist'
  showClient?: boolean
  showArtist?: boolean
  enableDragDrop?: boolean
  isSelected?: boolean
  selectedCount?: number
  onStatusChange?: (taskId: string, newStatus: string) => void
  onDeleteTasks?: (taskIds: string[]) => void
  onDeleteSelected?: () => void
  columns: ColumnConfig[]
}

function getUrgencyColor(urgency: string): string {
  switch (urgency) {
    case 'CRITICAL':
      return 'border-l-red-500'
    case 'URGENT':
      return 'border-l-orange-500'
    default:
      return 'border-l-blue-500'
  }
}

function getDeadlineColor(urgencyLevel: string | null): string {
  switch (urgencyLevel) {
    case 'overdue':
      return 'text-red-500'
    case 'urgent':
      return 'text-orange-500'
    case 'warning':
      return 'text-yellow-600'
    case 'safe':
      return 'text-green-600'
    default:
      return 'text-muted-foreground'
  }
}

function formatInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatDeadlineShort(deadline: string | null): string {
  if (!deadline) return ''
  const date = new Date(deadline)
  const month = date.toLocaleString('en-US', { month: 'short' })
  return `${month} ${date.getDate()}`
}

export function BoardCard({
  task,
  onClick,
  deadlineMode,
  showClient = true,
  showArtist = true,
  enableDragDrop = false,
  isSelected = false,
  selectedCount = 0,
  onStatusChange,
  onDeleteTasks,
  onDeleteSelected,
  columns,
}: BoardCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !enableDragDrop,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const displayDeadline = deadlineMode === 'artist' ? task.artistDeadline : task.deadline
  const workingDeadline = calculateWorkingDeadline(task.assignedAt, task.deadline)
  const urgencyLevel = getDeadlineUrgency(
    displayDeadline,
    deadlineMode === 'client' ? workingDeadline : null
  )

  const validTransitions = ALLOWED_TRANSITIONS[task.status] ?? []
  const isMultiSelected = isSelected && selectedCount > 1
  const hasDelete = onDeleteTasks || onDeleteSelected

  const cardElement = (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(enableDragDrop ? listeners : {})}
      onClick={onClick}
      className={cn(
        'group rounded-lg border border-border bg-card p-3 cursor-pointer transition-all',
        'hover:border-foreground/20 hover:shadow-sm',
        'border-l-[3px]',
        getUrgencyColor(task.urgency),
        isDragging && 'opacity-50 shadow-lg rotate-1 z-50',
        enableDragDrop && 'touch-none',
        isSelected && 'ring-2 ring-primary'
      )}
    >
      {/* Title */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium leading-tight line-clamp-1 flex-1">{task.title}</p>
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
      </div>

      {/* People row */}
      <div className="flex items-center gap-3 mb-1.5 text-xs text-muted-foreground">
        {showClient && (
          <div className="flex items-center gap-1 min-w-0">
            <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium shrink-0">
              {formatInitials(task.clientName)}
            </div>
            <span className="truncate">{task.clientName}</span>
          </div>
        )}
        {showArtist && task.artistName && (
          <div className="flex items-center gap-1 min-w-0">
            <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-medium text-primary shrink-0">
              {formatInitials(task.artistName)}
            </div>
            <span className="truncate">{task.artistName}</span>
          </div>
        )}
      </div>

      {/* Bottom row: deadline + credits */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {displayDeadline && (
            <span className={cn('font-medium', getDeadlineColor(urgencyLevel))}>
              {formatDeadlineShort(displayDeadline)}
            </span>
          )}
          {task.category && (
            <span className="text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded text-[10px]">
              {task.category}
            </span>
          )}
        </div>
        <span className="text-muted-foreground font-medium">{task.creditsUsed}cr</span>
      </div>
    </div>
  )

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{cardElement}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={onClick}>
          <ExternalLink className="mr-2 h-4 w-4" />
          Open task
        </ContextMenuItem>

        {onStatusChange && validTransitions.length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <ArrowRight className="mr-2 h-4 w-4" />
              Move to
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-44">
              {validTransitions.map((targetStatus) => {
                const targetColumn = columns.find((col) => col.statuses.includes(targetStatus))
                return (
                  <ContextMenuItem
                    key={targetStatus}
                    onClick={() => onStatusChange(task.id, targetStatus)}
                  >
                    {targetColumn && (
                      <div
                        className="h-2 w-2 rounded-full mr-2 shrink-0"
                        style={{ backgroundColor: targetColumn.color }}
                      />
                    )}
                    {STATUS_DISPLAY_NAMES[targetStatus] ?? targetStatus}
                  </ContextMenuItem>
                )
              })}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        <ContextMenuItem
          onClick={() => {
            navigator.clipboard.writeText(task.id)
          }}
        >
          <Copy className="mr-2 h-4 w-4" />
          Copy task ID
        </ContextMenuItem>

        {hasDelete && (
          <>
            <ContextMenuSeparator />
            {isMultiSelected && onDeleteSelected ? (
              <ContextMenuItem variant="destructive" onClick={onDeleteSelected}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete {selectedCount} selected
              </ContextMenuItem>
            ) : (
              onDeleteTasks && (
                <ContextMenuItem variant="destructive" onClick={() => onDeleteTasks([task.id])}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete task
                </ContextMenuItem>
              )
            )}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
