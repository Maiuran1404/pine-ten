'use client'

import type { ChatHistoryMessage } from '@/components/task-detail/types'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Sparkles, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CreationChatAccordionProps {
  chatHistory: ChatHistoryMessage[]
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function CreationChatAccordion({ chatHistory }: CreationChatAccordionProps) {
  if (chatHistory.length === 0) {
    return null
  }

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="creation-chat">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-ds-status-review" />
            <span className="text-sm font-medium">Creation Chat</span>
            <Badge variant="secondary" className="text-xs">
              {chatHistory.length}
            </Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3 pt-2">
            {chatHistory.map((msg, idx) => {
              const isUser = msg.role === 'user'

              return (
                <div
                  key={idx}
                  className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}
                >
                  {!isUser && (
                    <div className="bg-muted flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                      <Sparkles className="h-3 w-3 text-ds-status-review" />
                    </div>
                  )}

                  <div
                    className={cn(
                      'max-w-[80%] rounded-lg px-3 py-2',
                      isUser ? 'bg-crafted-green text-white' : 'bg-muted text-foreground'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {msg.attachments.map((att, attIdx) => (
                          <a
                            key={attIdx}
                            href={att.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              'block text-xs underline',
                              isUser ? 'text-crafted-mint' : 'text-muted-foreground'
                            )}
                          >
                            {att.fileName}
                          </a>
                        ))}
                      </div>
                    )}
                    <p
                      className={cn(
                        'mt-1 text-xs',
                        isUser ? 'text-crafted-sage' : 'text-muted-foreground'
                      )}
                    >
                      {formatTimestamp(msg.timestamp)}
                    </p>
                  </div>

                  {isUser && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-crafted-green/10">
                      <User className="h-3 w-3 text-crafted-green" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
