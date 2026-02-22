'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LinearBoard, ADMIN_COLUMNS } from '@/components/linear-board'
import type { BoardTask, BoardFilters } from '@/components/linear-board'
import { calculateArtistDeadline } from '@/lib/deadline'

export function BoardContent() {
  const router = useRouter()
  const [tasks, setTasks] = useState<BoardTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState<BoardFilters>({
    search: '',
    artist: null,
    client: null,
    category: null,
    showHidden: false,
  })

  const fetchTasks = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/tasks?limit=200')
      if (response.ok) {
        const result = await response.json()
        const taskList = result.data?.tasks || result.tasks || []
        const boardTasks: BoardTask[] = taskList.map((t: Record<string, unknown>) => {
          const artistDeadline = calculateArtistDeadline(
            t.assignedAt as string | null,
            t.deadline as string | null,
            t.estimatedHours as string | null
          )
          return {
            id: t.id as string,
            title: t.title as string,
            status: t.status as string,
            clientName: (t.clientName as string) || 'Unknown',
            clientImage: (t.clientImage as string | null) ?? null,
            artistName: (t.freelancerName as string | null) ?? null,
            artistImage: (t.freelancerImage as string | null) ?? null,
            deadline: t.deadline as string | null,
            artistDeadline: artistDeadline ? artistDeadline.toISOString() : null,
            creditsUsed: (t.creditsUsed as number) || 0,
            category: (t.categoryName as string | null) ?? null,
            priority: (t.priority as number) || 1,
            urgency: (t.urgency as string) || 'STANDARD',
            assignedAt: t.assignedAt as string | null,
            createdAt: t.createdAt as string,
          }
        })
        setTasks(boardTasks)
      }
    } catch {
      toast.error('Failed to load tasks')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleDeleteTasks = async (taskIds: string[]) => {
    const idSet = new Set(taskIds)
    setTasks((prev) => prev.filter((t) => !idSet.has(t.id)))
    try {
      const response = await fetch('/api/admin/tasks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds }),
      })
      if (!response.ok) {
        toast.error('Failed to delete tasks')
        fetchTasks()
      } else {
        toast.success(taskIds.length === 1 ? 'Task deleted' : `${taskIds.length} tasks deleted`)
      }
    } catch {
      toast.error('Failed to delete tasks')
      fetchTasks()
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)))

    try {
      const response = await fetch(`/api/admin/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error?.message || 'Failed to update status')
        // Revert optimistic update
        fetchTasks()
        return
      }

      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
      fetchTasks()
    }
  }

  return (
    <LinearBoard
      tasks={tasks}
      onTaskClick={(taskId) => router.push(`/admin/tasks/${taskId}`)}
      onStatusChange={handleStatusChange}
      onDeleteTasks={handleDeleteTasks}
      columns={ADMIN_COLUMNS}
      showClient
      showArtist
      deadlineMode="client"
      filters={filters}
      onFiltersChange={setFilters}
      isLoading={isLoading}
      enableDragDrop
    />
  )
}
