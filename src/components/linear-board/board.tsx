'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
} from '@dnd-kit/core'
import { BoardColumn } from './board-column'
import { BoardCard } from './board-card'
import { BoardFiltersBar } from './board-filters'
import type { LinearBoardProps, BoardFilters, BoardTask, ColumnConfig } from './board-types'
import { HIDDEN_STATUSES } from './board-types'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Trash2, X } from 'lucide-react'

function getColumnForStatus(status: string, columns: ColumnConfig[]): ColumnConfig | undefined {
  return columns.find((col) => col.statuses.includes(status))
}

function getFirstStatusForColumn(columnId: string, columns: ColumnConfig[]): string | undefined {
  const col = columns.find((c) => c.id === columnId)
  return col?.statuses[0]
}

/**
 * Custom collision detection that prefers column droppables over sortable card items.
 * Falls back to rectIntersection if pointerWithin finds nothing.
 */
const columnFirstCollision: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args)
  if (pointerCollisions.length > 0) {
    const columnHit = pointerCollisions.find(
      (c) => c.data?.droppableContainer?.data?.current?.column
    )
    if (columnHit) return [columnHit]
    return pointerCollisions
  }
  return rectIntersection(args)
}

const SHORTCUT_KEYS = [
  { key: 'j / ↓', action: 'Next card' },
  { key: 'k / ↑', action: 'Previous card' },
  { key: 'h / ←', action: 'Previous column' },
  { key: 'l / →', action: 'Next column' },
  { key: 'Shift + ↑↓←→', action: 'Extend selection' },
  { key: 'Enter / o', action: 'Open task' },
  { key: 'Del / ⌫', action: 'Delete selected' },
  { key: 'Esc', action: 'Deselect all' },
  { key: '?', action: 'Toggle shortcuts' },
]

export function LinearBoard({
  tasks,
  onTaskClick,
  onStatusChange,
  onDeleteTasks,
  columns,
  showClient = true,
  showArtist = true,
  deadlineMode,
  filters: externalFilters,
  onFiltersChange: externalOnFiltersChange,
  isLoading = false,
  enableDragDrop = false,
}: LinearBoardProps) {
  const [internalFilters, setInternalFilters] = useState<BoardFilters>({
    search: '',
    artist: null,
    client: null,
    category: null,
    showHidden: false,
  })

  const filters = externalFilters ?? internalFilters
  const onFiltersChange = externalOnFiltersChange ?? setInternalFilters

  const [activeTask, setActiveTask] = useState<BoardTask | null>(null)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [cursorTaskId, setCursorTaskId] = useState<string | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (!filters.showHidden && HIDDEN_STATUSES.includes(task.status)) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (
          !task.title.toLowerCase().includes(q) &&
          !task.clientName.toLowerCase().includes(q) &&
          !task.artistName?.toLowerCase().includes(q)
        ) {
          return false
        }
      }
      return true
    })
  }, [tasks, filters])

  // Group tasks by column
  const tasksByColumn = useMemo(() => {
    const map = new Map<string, BoardTask[]>()
    for (const col of columns) {
      map.set(col.id, [])
    }
    for (const task of filteredTasks) {
      const col = getColumnForStatus(task.status, columns)
      if (col) {
        map.get(col.id)!.push(task)
      }
    }
    return map
  }, [filteredTasks, columns])

  const clearSelection = useCallback(() => {
    setSelectedTaskIds(new Set())
    setCursorTaskId(null)
  }, [])

  const handleDeleteSelected = useCallback(() => {
    if (onDeleteTasks && selectedTaskIds.size > 0) {
      onDeleteTasks([...selectedTaskIds])
      clearSelection()
    }
  }, [onDeleteTasks, selectedTaskIds, clearSelection])

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return
      }

      const isShift = e.shiftKey

      switch (e.key) {
        case '?': {
          e.preventDefault()
          setShowShortcuts((prev) => !prev)
          return
        }
        case 'Escape': {
          e.preventDefault()
          if (showShortcuts) {
            setShowShortcuts(false)
          } else {
            clearSelection()
          }
          return
        }
        case 'j':
        case 'ArrowDown': {
          e.preventDefault()
          navigateVertical(1, isShift)
          return
        }
        case 'k':
        case 'ArrowUp': {
          e.preventDefault()
          navigateVertical(-1, isShift)
          return
        }
        case 'h':
        case 'ArrowLeft': {
          e.preventDefault()
          navigateHorizontal(-1, isShift)
          return
        }
        case 'l':
        case 'ArrowRight': {
          e.preventDefault()
          navigateHorizontal(1, isShift)
          return
        }
        case 'Enter':
        case 'o': {
          if (cursorTaskId) {
            e.preventDefault()
            onTaskClick(cursorTaskId)
          }
          return
        }
        case 'Delete':
        case 'Backspace': {
          if (selectedTaskIds.size > 0 && onDeleteTasks) {
            e.preventDefault()
            handleDeleteSelected()
          }
          return
        }
      }
    }

    function selectFirst(): string | null {
      for (const col of columns) {
        const colTasks = tasksByColumn.get(col.id) ?? []
        if (colTasks.length > 0) {
          const id = colTasks[0].id
          setCursorTaskId(id)
          setSelectedTaskIds(new Set([id]))
          return id
        }
      }
      return null
    }

    function moveCursor(newId: string, extendSelection: boolean) {
      setCursorTaskId(newId)
      if (extendSelection) {
        setSelectedTaskIds((prev) => {
          const next = new Set(prev)
          next.add(newId)
          return next
        })
      } else {
        setSelectedTaskIds(new Set([newId]))
      }
    }

    function navigateVertical(direction: number, extendSelection: boolean) {
      if (!cursorTaskId) {
        selectFirst()
        return
      }

      for (const col of columns) {
        const colTasks = tasksByColumn.get(col.id) ?? []
        const idx = colTasks.findIndex((t) => t.id === cursorTaskId)
        if (idx !== -1) {
          const nextIdx = Math.max(0, Math.min(colTasks.length - 1, idx + direction))
          moveCursor(colTasks[nextIdx].id, extendSelection)
          return
        }
      }
    }

    function navigateHorizontal(direction: number, extendSelection: boolean) {
      if (!cursorTaskId) {
        selectFirst()
        return
      }

      let currentColIdx = -1
      let currentTaskIdx = 0
      for (let i = 0; i < columns.length; i++) {
        const colTasks = tasksByColumn.get(columns[i].id) ?? []
        const idx = colTasks.findIndex((t) => t.id === cursorTaskId)
        if (idx !== -1) {
          currentColIdx = i
          currentTaskIdx = idx
          break
        }
      }

      if (currentColIdx === -1) return

      let nextColIdx = currentColIdx + direction
      while (nextColIdx >= 0 && nextColIdx < columns.length) {
        const colTasks = tasksByColumn.get(columns[nextColIdx].id) ?? []
        if (colTasks.length > 0) {
          const taskIdx = Math.min(currentTaskIdx, colTasks.length - 1)
          moveCursor(colTasks[taskIdx].id, extendSelection)
          return
        }
        nextColIdx += direction
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [
    cursorTaskId,
    selectedTaskIds,
    columns,
    tasksByColumn,
    onTaskClick,
    onDeleteTasks,
    showShortcuts,
    clearSelection,
    handleDeleteSelected,
  ])

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = tasks.find((t) => t.id === event.active.id)
      setActiveTask(task ?? null)
    },
    [tasks]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTask(null)
      const { active, over } = event
      if (!over || !onStatusChange) return

      const taskId = active.id as string

      let targetColumnId: string | undefined
      if (over.data.current?.column) {
        targetColumnId = over.data.current.column.id
      } else {
        const overTask = filteredTasks.find((t) => t.id === over.id)
        if (overTask) {
          targetColumnId = getColumnForStatus(overTask.status, columns)?.id
        }
      }

      if (!targetColumnId) return
      const newStatus = getFirstStatusForColumn(targetColumnId, columns)
      if (!newStatus) return

      const task = tasks.find((t) => t.id === taskId)
      if (task && !columns.find((c) => c.id === targetColumnId)?.statuses.includes(task.status)) {
        onStatusChange(taskId, newStatus)
      }
    },
    [onStatusChange, columns, tasks, filteredTasks]
  )

  const selectedCount = selectedTaskIds.size

  if (isLoading) {
    return (
      <div className="flex gap-4 p-2 overflow-x-auto h-full">
        {columns.map((col) => (
          <div key={col.id} className="w-[280px] min-w-[280px] space-y-2">
            <Skeleton className="h-8 w-full" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden min-w-0 relative">
      <div className="px-2 pb-3 flex items-center justify-between">
        <BoardFiltersBar filters={filters} onFiltersChange={onFiltersChange} />
        <button
          type="button"
          onClick={() => setShowShortcuts((prev) => !prev)}
          className={cn(
            'ml-2 shrink-0 text-xs text-muted-foreground hover:text-foreground',
            'border border-border rounded px-1.5 py-0.5 transition-colors',
            showShortcuts && 'bg-muted text-foreground'
          )}
          title="Keyboard shortcuts"
        >
          ?
        </button>
      </div>

      {showShortcuts && (
        <div className="absolute top-12 right-2 z-50 bg-popover border border-border rounded-lg shadow-lg p-3 w-56">
          <p className="text-xs font-medium mb-2">Keyboard shortcuts</p>
          <div className="space-y-1">
            {SHORTCUT_KEYS.map(({ key, action }) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{action}</span>
                <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">{key}</kbd>
              </div>
            ))}
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={columnFirstCollision}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 px-2 flex-1 overflow-x-auto min-h-0">
          {columns.map((column) => (
            <BoardColumn
              key={column.id}
              column={column}
              tasks={tasksByColumn.get(column.id) ?? []}
              onTaskClick={onTaskClick}
              deadlineMode={deadlineMode}
              showClient={showClient}
              showArtist={showArtist}
              enableDragDrop={enableDragDrop}
              onStatusChange={onStatusChange}
              onDeleteTasks={onDeleteTasks}
              onDeleteSelected={handleDeleteSelected}
              columns={columns}
              selectedTaskIds={selectedTaskIds}
              selectedCount={selectedCount}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="w-[272px]">
              <BoardCard
                task={activeTask}
                onClick={() => {}}
                deadlineMode={deadlineMode}
                showClient={showClient}
                showArtist={showArtist}
                columns={columns}
                selectedCount={0}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Multi-selection action bar */}
      {selectedCount > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-popover border border-border rounded-lg shadow-lg px-4 py-2.5">
          <span className="text-sm font-medium">{selectedCount} selected</span>
          {onDeleteTasks && (
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 text-sm text-destructive hover:text-destructive/80 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={clearSelection}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Clear selection"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
