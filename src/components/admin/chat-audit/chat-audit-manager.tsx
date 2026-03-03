'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { MessageSquare, FileText, CheckCircle, BarChart3 } from 'lucide-react'
import { useChatLogs, useChatLogDetail } from '@/hooks/use-queries'
import { ChatAuditList } from './chat-audit-list'
import { ChatAuditDetail } from './chat-audit-detail'
import { ChatAuditEmptyState } from './chat-audit-empty-state'

export function ChatAuditManager() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  // Build filter params
  const filters = useMemo(() => {
    const f: Record<string, string> = {}
    if (statusFilter !== 'all') f.status = statusFilter
    if (search) f.search = search
    return f
  }, [statusFilter, search])

  const { data: logsData, isLoading: isLoadingList } = useChatLogs(filters)
  const { data: detailData, isLoading: isLoadingDetail } = useChatLogDetail(selectedId)

  const logs = logsData?.logs ?? []
  const stats = logsData?.stats

  if (isLoadingList && !logsData) {
    return (
      <div className="h-[calc(100vh-8rem)] p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[calc(100%-4rem)] w-full rounded-lg" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header Bar */}
      <div className="px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Chat Audit Log</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Full visibility into every chat session, briefing stage, and deliverable
          </p>
        </div>

        {/* Stat Chips */}
        {stats && (
          <div className="flex items-center gap-2">
            <StatChip
              icon={<MessageSquare className="h-3 w-3" />}
              label="Total"
              value={stats.total}
            />
            <StatChip icon={<FileText className="h-3 w-3" />} label="Drafts" value={stats.drafts} />
            <StatChip
              icon={<CheckCircle className="h-3 w-3" />}
              label="Tasks"
              value={stats.tasks}
            />
            <StatChip
              icon={<BarChart3 className="h-3 w-3" />}
              label="Avg Msgs"
              value={stats.avgMessages}
            />
          </div>
        )}
      </div>

      {/* Master-Detail Split */}
      <ResizablePanelGroup orientation="horizontal" className="flex-1 border-t border-border/50">
        {/* Left Panel: List */}
        <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
          <ChatAuditList
            logs={logs}
            isLoading={isLoadingList}
            selectedId={selectedId}
            onSelect={setSelectedId}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            search={search}
            onSearchChange={setSearch}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel: Detail */}
        <ResizablePanel defaultSize={65} minSize={50} maxSize={75}>
          {selectedId ? (
            <ChatAuditDetail detail={detailData} isLoading={isLoadingDetail} />
          ) : (
            <ChatAuditEmptyState />
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Badge variant="outline" className="gap-1.5 px-2.5 py-1 text-xs font-normal">
      {icon}
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </Badge>
  )
}
