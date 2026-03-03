'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AdminChatMessage } from '@/types/admin-chat-logs'

interface TabConversationProps {
  messages: AdminChatMessage[]
}

export function TabConversation({ messages }: TabConversationProps) {
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No messages in this conversation.
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        {messages.map((message, idx) => (
          <div
            key={message.id || idx}
            className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-lg px-3 py-2',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted border border-border/50'
              )}
            >
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {message.attachments.map((att, i) => (
                    <a
                      key={i}
                      href={att.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded',
                        message.role === 'user'
                          ? 'bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30'
                          : 'bg-background hover:bg-accent'
                      )}
                    >
                      <Paperclip className="h-2.5 w-2.5" />
                      {att.fileName}
                    </a>
                  ))}
                </div>
              )}

              <p
                className={cn(
                  'text-[10px] mt-1',
                  message.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'
                )}
              >
                {new Date(message.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
