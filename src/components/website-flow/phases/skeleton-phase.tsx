'use client'

import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { SkeletonChat } from '../skeleton/skeleton-chat'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface SkeletonPhaseProps {
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
  isLoading?: boolean
  onAdvance: () => void
  isAdvancing: boolean
  canAdvance: boolean
}

export function SkeletonPhase({
  messages,
  onSendMessage,
  isLoading,
  onAdvance,
  isAdvancing,
  canAdvance,
}: SkeletonPhaseProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-3">
        <h2 className="text-xl font-semibold text-foreground">Design Your Website</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Chat with our AI to shape your website section by section
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <SkeletonChat messages={messages} onSendMessage={onSendMessage} isLoading={isLoading} />
      </div>

      {canAdvance && (
        <div className="px-6 pb-6 pt-3 border-t border-border">
          <Button
            onClick={onAdvance}
            disabled={isAdvancing}
            className="w-full bg-green-600 hover:bg-green-700 text-white h-11"
          >
            Review & Approve
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  )
}
