'use client'

import { useRef, useEffect } from 'react'
import Image from 'next/image'
import type { TaskMessage, TaskFile } from '@/components/task-detail/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileIcon, Download, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageListProps {
  messages: TaskMessage[]
  deliverables: TaskFile[]
  taskStatus: string
}

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function isImageFile(fileType: string): boolean {
  return fileType.startsWith('image/')
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MessageList({ messages, deliverables, taskStatus }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const showDeliverables =
    deliverables.length > 0 && (taskStatus === 'IN_REVIEW' || taskStatus === 'COMPLETED')

  return (
    <ScrollArea className="max-h-[500px]">
      <div className="space-y-4 p-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground text-sm">
              No messages yet. Start a conversation with your designer.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={msg.senderImage ?? undefined} alt={msg.senderName} />
              <AvatarFallback className="text-xs">{getInitials(msg.senderName)}</AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">{msg.senderName}</span>
                <span className="text-muted-foreground text-xs">
                  {formatTimestamp(msg.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-sm whitespace-pre-wrap">{msg.content}</p>

              {msg.attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {msg.attachments.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs underline"
                    >
                      <FileIcon className="h-3 w-3" />
                      Attachment {idx + 1}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {showDeliverables && (
          <div className="mt-6 rounded-lg border-2 border-ds-success/30 bg-ds-success/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-ds-success" />
              <h4 className="text-sm font-medium text-ds-success">
                Deliverables ({deliverables.length})
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {deliverables.map((file) => (
                <a
                  key={file.id}
                  href={file.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'group relative flex flex-col items-center gap-2 rounded-lg border bg-white p-3',
                    'transition-colors hover:border-ds-success/30 hover:bg-ds-success/5'
                  )}
                >
                  {isImageFile(file.fileType) ? (
                    <div className="relative h-24 w-full overflow-hidden rounded">
                      <Image
                        src={file.fileUrl}
                        alt={file.fileName}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, 33vw"
                      />
                    </div>
                  ) : (
                    <div className="flex h-24 w-full items-center justify-center rounded bg-muted">
                      <FileIcon className="text-muted-foreground h-8 w-8" />
                    </div>
                  )}
                  <div className="w-full min-w-0">
                    <p className="truncate text-xs font-medium">{file.fileName}</p>
                    <p className="text-muted-foreground text-xs">{formatFileSize(file.fileSize)}</p>
                  </div>
                  <Download className="absolute top-2 right-2 h-4 w-4 text-ds-success opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  )
}
