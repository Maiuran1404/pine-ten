'use client'

import type { KeyboardEvent } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Loader2, Send, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageInputProps {
  message: string
  onMessageChange: (msg: string) => void
  onSend: () => void
  onRequestRevision: () => void
  isInReview: boolean
  isSending: boolean
  isAnalyzing: boolean
  revisionsRemaining: number
  canChat: boolean
}

export function MessageInput({
  message,
  onMessageChange,
  onSend,
  onRequestRevision,
  isInReview,
  isSending,
  isAnalyzing,
  revisionsRemaining,
  canChat,
}: MessageInputProps) {
  if (!canChat) {
    return null
  }

  const isLoading = isSending || isAnalyzing

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (message.trim() && !isLoading) {
        if (isInReview) {
          onRequestRevision()
        } else {
          onSend()
        }
      }
    }
  }

  function handleSubmit() {
    if (message.trim() && !isLoading) {
      if (isInReview) {
        onRequestRevision()
      } else {
        onSend()
      }
    }
  }

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'flex gap-2 rounded-lg border p-2',
          isInReview && 'border-ds-status-revision/30 bg-ds-status-revision/5'
        )}
      >
        <Textarea
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isInReview ? 'Describe the revisions you need...' : 'Type a message to your designer...'
          }
          className={cn(
            'min-h-[60px] resize-none border-0 shadow-none focus-visible:ring-0',
            isInReview && 'placeholder:text-ds-status-revision/70'
          )}
          disabled={isLoading}
        />
        <div className="flex flex-col justify-end gap-1">
          <Button
            onClick={handleSubmit}
            disabled={!message.trim() || isLoading}
            size="sm"
            className={cn(isInReview && 'bg-ds-status-revision hover:bg-ds-status-revision/90')}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isInReview ? (
              <>
                <RotateCcw className="h-4 w-4" />
                Send Revision Request
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send
              </>
            )}
          </Button>
        </div>
      </div>

      {isInReview && (
        <p className="text-muted-foreground text-xs">
          <span className="font-medium text-ds-status-revision">
            {revisionsRemaining} revision{revisionsRemaining !== 1 ? 's' : ''} remaining
          </span>{' '}
          -- Your message will be sent as a revision request.
        </p>
      )}
    </div>
  )
}
