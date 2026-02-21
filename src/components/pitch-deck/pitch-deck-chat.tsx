'use client'

import { useState, useRef, useEffect } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Loader2, Send, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { PitchDeckFormData } from '@/lib/validations/pitch-deck-schema'

interface PitchDeckChatProps {
  form: UseFormReturn<PitchDeckFormData>
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function PitchDeckChat({ form }: PitchDeckChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const userMessage: ChatMessage = { role: 'user', content: trimmed }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/pitch-decks/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          currentFormData: form.getValues(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to generate content')
      }

      const result = await response.json()
      const data = result.data

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.content,
      }
      setMessages((prev) => [...prev, assistantMessage])

      if (data.type === 'form_update' && data.formData) {
        form.reset(data.formData)
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Something went wrong: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <ScrollArea className="flex-1 min-h-0">
        <div ref={scrollRef} className="p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-16 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-base font-semibold mb-2">Describe your project</h3>
              <p className="text-sm text-muted-foreground max-w-[280px] mb-6">
                Tell me about the client and project, and I&apos;ll generate the entire pitch deck
                for you.
              </p>
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground border rounded-lg px-4 py-2.5 transition-colors cursor-pointer"
                onClick={() => {
                  setInput(
                    'Create a pitch deck for a SaaS startup called Arcline. They need a landing page redesign, brand identity, and LinkedIn content strategy. Budget around $5-7k, timeline 2-3 weeks.'
                  )
                  textareaRef.current?.focus()
                }}
              >
                &quot;Create a pitch deck for a SaaS startup...&quot;
              </button>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'text-sm leading-relaxed',
                  msg.role === 'user' ? 'bg-muted rounded-lg p-3 ml-8' : 'pr-8'
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">Crafted AI</span>
                  </div>
                )}
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating pitch deck content...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the project..."
            rows={5}
            className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-auto self-end cursor-pointer"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
