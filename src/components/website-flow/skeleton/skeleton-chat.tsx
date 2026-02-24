'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Loader2 } from 'lucide-react'
import Markdown from 'react-markdown'
import { cn } from '@/lib/utils'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isPending?: boolean
}

interface SkeletonChatProps {
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
  isLoading?: boolean
  className?: string
}

export function SkeletonChat({ messages, onSendMessage, isLoading, className }: SkeletonChatProps) {
  const [input, setInput] = useState('')
  const [pendingContent, setPendingContent] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Derive: if loading is done and we have a pending message that now appears in server data, clear it
  const pendingAlreadyInServer = pendingContent
    ? messages.some((m) => m.role === 'user' && m.content === pendingContent)
    : false

  const activePending =
    pendingContent && !pendingAlreadyInServer && isLoading ? pendingContent : null

  const allMessages: ChatMessage[] = activePending
    ? [
        ...messages,
        {
          id: 'pending-optimistic',
          role: 'user' as const,
          content: activePending,
          timestamp: '',
          isPending: true,
        },
      ]
    : messages

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [allMessages.length])

  const autoResize = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }, [])

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return
    const message = input.trim()

    // Track pending message for optimistic display
    setPendingContent(message)

    onSendMessage(message)
    setInput('')

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  // Clear pending content when loading finishes
  if (!isLoading && pendingContent && pendingAlreadyInServer) {
    setPendingContent(null)
  }

  const emptyState = allMessages.length === 0 && !isLoading

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {emptyState && (
          <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-3">
            <p className="text-sm text-green-800 dark:text-green-300">
              Generating your website skeleton based on your inspirations. This may take a moment...
            </p>
          </div>
        )}
        {allMessages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'max-w-[85%] rounded-lg px-3 py-2 text-sm',
              msg.role === 'user'
                ? 'ml-auto bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-zinc-800 text-foreground',
              msg.isPending && 'opacity-70'
            )}
          >
            {msg.role === 'assistant' ? (
              <Markdown
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                  li: ({ children }) => <li className="mb-0.5">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  h3: ({ children }) => (
                    <h3 className="font-semibold text-sm mb-1 mt-2">{children}</h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="font-semibold text-sm mb-1 mt-1">{children}</h4>
                  ),
                }}
              >
                {msg.content}
              </Markdown>
            ) : (
              msg.content
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-3 h-3 animate-spin" />
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              autoResize()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder="Describe changes to your website..."
            className="flex-1 min-h-[40px] max-h-[120px] p-2 text-sm rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-1 focus:ring-green-500"
            rows={1}
            disabled={isLoading}
          />
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="bg-green-600 hover:bg-green-700 text-white self-end"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
