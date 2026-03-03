'use client'

import { MessageSquare } from 'lucide-react'

export function ChatAuditEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">Select a conversation</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Choose a chat session from the list to view the full conversation, briefing stages, and
        deliverables.
      </p>
    </div>
  )
}
