'use client'

import type { TaskDetailData } from '@/components/task-detail/types'
import { MessageList } from '../conversation/message-list'
import { MessageInput } from '../conversation/message-input'
import { CreationChatAccordion } from '../conversation/creation-chat-accordion'
import { CheckCircle2 } from 'lucide-react'

interface ConversationTabProps {
  task: TaskDetailData
  message: string
  onMessageChange: (msg: string) => void
  onSendMessage: () => void
  onRequestRevision: () => void
  isSendingMessage: boolean
  isAnalyzing: boolean
  canChat: boolean
}

export function ConversationTab({
  task,
  message,
  onMessageChange,
  onSendMessage,
  onRequestRevision,
  isSendingMessage,
  isAnalyzing,
}: ConversationTabProps) {
  const deliverables = task.files.filter((f) => f.isDeliverable)
  const isInReview = task.status === 'IN_REVIEW'
  const isCompleted = task.status === 'COMPLETED'
  const canChat = ['IN_PROGRESS', 'IN_REVIEW', 'REVISION_REQUESTED'].includes(task.status)
  const revisionsRemaining = task.maxRevisions - task.revisionsUsed

  return (
    <div className="space-y-4">
      {isCompleted && (
        <div className="flex items-center gap-2 rounded-lg border border-ds-success/30 bg-ds-success/5 p-4">
          <CheckCircle2 className="h-5 w-5 text-ds-success" />
          <p className="text-sm font-medium text-ds-success">
            This task has been completed. No further messages can be sent.
          </p>
        </div>
      )}

      <MessageList messages={task.messages} deliverables={deliverables} taskStatus={task.status} />

      <MessageInput
        message={message}
        onMessageChange={onMessageChange}
        onSend={onSendMessage}
        onRequestRevision={onRequestRevision}
        isInReview={isInReview}
        isSending={isSendingMessage}
        isAnalyzing={isAnalyzing}
        revisionsRemaining={revisionsRemaining}
        canChat={canChat}
      />

      {task.chatHistory.length > 0 && <CreationChatAccordion chatHistory={task.chatHistory} />}
    </div>
  )
}
