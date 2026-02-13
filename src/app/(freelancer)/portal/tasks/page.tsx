'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Coins,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  FileCheck,
  Sparkles,
  Search,
  ChevronDown,
  ListFilter,
  X,
  Eye,
  User,
  Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Task {
  id: string
  title: string
  description: string
  status: string
  createdAt: string
  deadline: string | null
  assignedAt: string | null
  creditsUsed: number
  estimatedHours: string | null
}

const statusConfig: Record<
  string,
  { color: string; bgColor: string; label: string; icon: React.ReactNode }
> = {
  ASSIGNED: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    label: 'Assigned',
    icon: <User className="h-3 w-3" />,
  },
  IN_PROGRESS: {
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
    label: 'In Progress',
    icon: <RefreshCw className="h-3 w-3" />,
  },
  PENDING_ADMIN_REVIEW: {
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    label: 'Under Review',
    icon: <Clock className="h-3 w-3" />,
  },
  IN_REVIEW: {
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200',
    label: 'Client Review',
    icon: <Eye className="h-3 w-3" />,
  },
  REVISION_REQUESTED: {
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    label: 'Revision',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  COMPLETED: {
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    label: 'Completed',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
}

const filterOptions = [
  { value: 'all', label: 'All Tasks' },
  { value: 'active', label: 'Active' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'completed', label: 'Completed' },
]

export default function FreelancerTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchTasks()
  }, [])

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [showSearch])

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks?limit=50&view=freelancer')
      if (response.ok) {
        const data = await response.json()
        setTasks(data.data?.tasks || data.tasks || [])
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredTasks = tasks
    .filter((task) => {
      if (
        filter === 'active' &&
        !['ASSIGNED', 'IN_PROGRESS', 'REVISION_REQUESTED'].includes(task.status)
      )
        return false
      if (filter === 'submitted' && !['IN_REVIEW', 'PENDING_ADMIN_REVIEW'].includes(task.status))
        return false
      if (filter === 'completed' && task.status !== 'COMPLETED') return false

      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          task.title.toLowerCase().includes(query) || task.description.toLowerCase().includes(query)
        )
      }

      return true
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  const currentFilter = filterOptions.find((f) => f.value === filter) || filterOptions[0]

  // Count tasks by category
  const activeTasks = tasks.filter((t) =>
    ['ASSIGNED', 'IN_PROGRESS', 'REVISION_REQUESTED'].includes(t.status)
  )
  const newAssignments = tasks.filter((t) => t.status === 'ASSIGNED')

  const TaskRow = ({ task }: { task: Task }) => {
    const status = statusConfig[task.status] || statusConfig.ASSIGNED
    const isRevision = task.status === 'REVISION_REQUESTED'

    return (
      <Link href={`/portal/tasks/${task.id}`}>
        <div
          className={cn(
            'flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 cursor-pointer group',
            isRevision && 'bg-red-50/50 dark:bg-red-900/5'
          )}
        >
          {/* Status dot */}
          <div
            className={cn(
              'w-2.5 h-2.5 rounded-full shrink-0',
              task.status === 'ASSIGNED'
                ? 'bg-blue-500'
                : task.status === 'IN_PROGRESS'
                  ? 'bg-purple-500'
                  : task.status === 'REVISION_REQUESTED'
                    ? 'bg-red-500 animate-pulse'
                    : task.status === 'IN_REVIEW' || task.status === 'PENDING_ADMIN_REVIEW'
                      ? 'bg-orange-500'
                      : task.status === 'COMPLETED'
                        ? 'bg-green-500'
                        : 'bg-muted-foreground'
            )}
          />

          {/* Title and Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-foreground truncate group-hover:text-foreground/80">
                {task.title}
              </h3>
              {isRevision && (
                <span className="text-xs text-red-600 font-medium shrink-0">Action needed</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{task.description}</p>
          </div>

          {/* Deadline */}
          <div className="hidden md:block text-xs text-muted-foreground w-24 text-right shrink-0">
            {task.deadline ? (
              <span className="flex items-center gap-1 justify-end">
                <Calendar className="h-3 w-3" />
                {new Date(task.deadline).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            ) : (
              formatDate(task.createdAt)
            )}
          </div>

          {/* Status */}
          <div className="shrink-0">
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
                status.bgColor,
                status.color
              )}
            >
              {status.icon}
              <span className="hidden sm:inline">{status.label}</span>
            </span>
          </div>

          {/* Credits */}
          <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground w-14 justify-end shrink-0">
            <Coins className="h-3 w-3" />
            {task.creditsUsed}
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-foreground">My Tasks</h1>
            <div className="text-sm text-muted-foreground">{activeTasks.length} active</div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-background">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Filter */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-2">
                    <ListFilter className="h-4 w-4" />
                    <span>{currentFilter.label}</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  {filterOptions.map((option) => (
                    <DropdownMenuCheckboxItem
                      key={option.value}
                      checked={filter === option.value}
                      onCheckedChange={() => setFilter(option.value)}
                    >
                      {option.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Right: Search */}
            <div className="flex items-center gap-2">
              {showSearch ? (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => {
                      if (!searchQuery) setShowSearch(false)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setSearchQuery('')
                        setShowSearch(false)
                      }
                    }}
                    className="w-64 h-9 pl-9 pr-8 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('')
                        searchInputRef.current?.focus()
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                    >
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  )}
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2"
                  onClick={() => setShowSearch(true)}
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Search</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-4">
        {/* New Assignment Banners */}
        {newAssignments.length > 0 && (
          <div className="space-y-2 mb-4">
            {newAssignments.map((task) => (
              <Link key={task.id} href={`/portal/tasks/${task.id}`}>
                <div className="flex items-center gap-4 p-3 rounded-lg border-2 border-emerald-500/50 bg-emerald-50 dark:bg-emerald-900/20 hover:border-emerald-500 transition-colors cursor-pointer">
                  <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      New:{' '}
                    </span>
                    <span className="text-sm text-foreground">{task.title}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 shrink-0"
                  >
                    Start Working
                  </Button>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Task List */}
        {isLoading ? (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
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
        ) : filteredTasks.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FileCheck className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              {searchQuery
                ? 'No tasks found'
                : filter === 'all'
                  ? 'No tasks yet'
                  : `No ${currentFilter.label.toLowerCase()}`}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? 'Try a different search term'
                : 'New tasks will be assigned to you automatically'}
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              {filteredTasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-center mt-4 py-3 text-sm text-muted-foreground">
              Viewing {filteredTasks.length} of {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
