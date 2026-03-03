'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatAuditListItem } from './chat-audit-list-item'
import type { ChatLogListItem } from '@/types/admin-chat-logs'

interface ChatAuditListProps {
  logs: ChatLogListItem[]
  isLoading: boolean
  selectedId: string | null
  onSelect: (id: string) => void
  statusFilter: string
  onStatusFilterChange: (status: string) => void
  search: string
  onSearchChange: (search: string) => void
}

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'video', label: 'Video' },
  { value: 'website', label: 'Website' },
  { value: 'content', label: 'Content' },
  { value: 'design', label: 'Design' },
  { value: 'brand', label: 'Brand' },
]

export function ChatAuditList({
  logs,
  isLoading,
  selectedId,
  onSelect,
  statusFilter,
  onStatusFilterChange,
  search,
  onSearchChange,
}: ChatAuditListProps) {
  const [categoryFilter, setCategoryFilter] = useState('')

  const filteredLogs = useMemo(() => {
    if (!categoryFilter) return logs
    return logs.filter((log) => log.deliverableCategory === categoryFilter)
  }, [logs, categoryFilter])

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search users, titles..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Status Tabs */}
      <div className="px-3 pt-2 pb-1 border-b border-border/50">
        <Tabs value={statusFilter} onValueChange={onStatusFilterChange}>
          <TabsList className="h-7 w-full">
            <TabsTrigger value="all" className="text-xs h-6 flex-1">
              All
            </TabsTrigger>
            <TabsTrigger value="draft" className="text-xs h-6 flex-1">
              Drafts
            </TabsTrigger>
            <TabsTrigger value="task" className="text-xs h-6 flex-1">
              Tasks
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Category Chips */}
      <div className="px-3 py-2 border-b border-border/50 flex flex-wrap gap-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategoryFilter(cat.value)}
            className={cn(
              'text-[10px] px-2 py-0.5 rounded-full border transition-colors',
              categoryFilter === cat.value
                ? 'bg-crafted-green/10 border-crafted-green/30 text-crafted-green'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-3 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <Skeleton className="h-3 w-32 ml-9" />
              </div>
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No conversations found</p>
            {(search || statusFilter !== 'all' || categoryFilter) && (
              <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting your filters</p>
            )}
          </div>
        ) : (
          <div>
            <div className="px-3 py-1.5 border-b border-border/50">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {filteredLogs.length} conversation{filteredLogs.length !== 1 ? 's' : ''}
              </span>
            </div>
            {filteredLogs.map((log) => (
              <ChatAuditListItem
                key={log.id}
                log={log}
                isSelected={selectedId === log.id}
                onClick={() => onSelect(log.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
