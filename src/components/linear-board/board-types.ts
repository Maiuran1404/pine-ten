export interface BoardTask {
  id: string
  title: string
  status: string
  clientName: string
  clientImage: string | null
  artistName: string | null
  artistImage: string | null
  deadline: string | null
  artistDeadline: string | null
  creditsUsed: number
  category: string | null
  priority: number
  urgency: string
  assignedAt: string | null
  createdAt: string
}

export interface ColumnConfig {
  id: string
  title: string
  statuses: string[]
  color: string
}

export interface BoardFilters {
  search: string
  artist: string | null
  client: string | null
  category: string | null
  showHidden: boolean
}

export interface LinearBoardProps {
  tasks: BoardTask[]
  onTaskClick: (taskId: string) => void
  onStatusChange?: (taskId: string, newStatus: string) => void
  onDeleteTasks?: (taskIds: string[]) => void
  columns: ColumnConfig[]
  showClient?: boolean
  showArtist?: boolean
  deadlineMode: 'client' | 'artist'
  filters?: BoardFilters
  onFiltersChange?: (filters: BoardFilters) => void
  isLoading?: boolean
  enableDragDrop?: boolean
}

export const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: 'backlog',
    title: 'Backlog',
    statuses: ['PENDING', 'OFFERED'],
    color: 'var(--muted-foreground)',
  },
  { id: 'todo', title: 'Todo', statuses: ['ASSIGNED'], color: 'var(--ds-status-assigned)' },
  {
    id: 'in-progress',
    title: 'In Progress',
    statuses: ['IN_PROGRESS'],
    color: 'var(--ds-status-in-progress)',
  },
  {
    id: 'review',
    title: 'Review',
    statuses: ['IN_REVIEW', 'PENDING_ADMIN_REVIEW'],
    color: 'var(--ds-status-review)',
  },
  {
    id: 'revision',
    title: 'Revision',
    statuses: ['REVISION_REQUESTED'],
    color: 'var(--ds-status-revision)',
  },
  { id: 'done', title: 'Done', statuses: ['COMPLETED'], color: 'var(--ds-status-completed)' },
]

export const HIDDEN_STATUSES = ['CANCELLED', 'UNASSIGNABLE']

export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['ASSIGNED', 'IN_PROGRESS'],
  OFFERED: ['ASSIGNED', 'PENDING'],
  ASSIGNED: ['IN_PROGRESS', 'PENDING'],
  IN_PROGRESS: ['IN_REVIEW', 'PENDING_ADMIN_REVIEW', 'ASSIGNED'],
  IN_REVIEW: ['COMPLETED', 'REVISION_REQUESTED', 'IN_PROGRESS'],
  PENDING_ADMIN_REVIEW: ['COMPLETED', 'REVISION_REQUESTED', 'IN_PROGRESS'],
  REVISION_REQUESTED: ['IN_PROGRESS', 'ASSIGNED'],
  COMPLETED: ['IN_PROGRESS'],
  CANCELLED: ['PENDING'],
}

export const STATUS_DISPLAY_NAMES: Record<string, string> = {
  PENDING: 'Backlog',
  OFFERED: 'Offered',
  ASSIGNED: 'Todo',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  PENDING_ADMIN_REVIEW: 'Admin Review',
  REVISION_REQUESTED: 'Revision',
  COMPLETED: 'Done',
  CANCELLED: 'Cancelled',
}

export const ADMIN_COLUMNS = DEFAULT_COLUMNS

export const ARTIST_COLUMNS: ColumnConfig[] = [
  { id: 'todo', title: 'Todo', statuses: ['ASSIGNED'], color: 'var(--ds-status-assigned)' },
  {
    id: 'in-progress',
    title: 'In Progress',
    statuses: ['IN_PROGRESS'],
    color: 'var(--ds-status-in-progress)',
  },
  {
    id: 'review',
    title: 'Review',
    statuses: ['IN_REVIEW', 'PENDING_ADMIN_REVIEW'],
    color: 'var(--ds-status-review)',
  },
  {
    id: 'revision',
    title: 'Revision',
    statuses: ['REVISION_REQUESTED'],
    color: 'var(--ds-status-revision)',
  },
  { id: 'done', title: 'Done', statuses: ['COMPLETED'], color: 'var(--ds-status-completed)' },
]
