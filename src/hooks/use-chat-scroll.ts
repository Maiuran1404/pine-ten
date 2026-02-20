/**
 * Hook for managing scroll behavior in the chat interface.
 * Handles auto-scrolling to bottom on new messages, during typing animation,
 * and when animation completes.
 */
'use client'

import { useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { type ChatMessage as Message } from '@/components/chat/types'

interface UseChatScrollOptions {
  messages: Message[]
  isLoading: boolean
  animatingMessageId: string | null
  completedTypingIds: Set<string>
}

export function useChatScroll({
  messages,
  isLoading,
  animatingMessageId,
  completedTypingIds,
}: UseChatScrollOptions) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom helper — stable callback that closes over the ref
  const scrollToBottom = useCallback((smooth = false) => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      const target = viewport || scrollAreaRef.current
      if (smooth) {
        target.scrollTo({ top: target.scrollHeight, behavior: 'smooth' })
      } else {
        target.scrollTop = target.scrollHeight
      }
    }
  }, [])

  useLayoutEffect(() => {
    scrollToBottom()
    const frame1 = requestAnimationFrame(() => {
      scrollToBottom()
      const frame2 = requestAnimationFrame(() => {
        scrollToBottom()
      })
      return () => cancelAnimationFrame(frame2)
    })
    return () => cancelAnimationFrame(frame1)
  }, [messages, isLoading, scrollToBottom])

  // Continuously scroll during typing animation to keep up with growing content
  useEffect(() => {
    if (!animatingMessageId) return
    const interval = setInterval(() => scrollToBottom(true), 200)
    return () => clearInterval(interval)
  }, [animatingMessageId, scrollToBottom])

  // Final scroll when typing animation completes
  useEffect(() => {
    if (animatingMessageId === null && completedTypingIds.size > 0) {
      scrollToBottom(true)
    }
  }, [animatingMessageId, completedTypingIds, scrollToBottom])

  return {
    scrollAreaRef,
    scrollToBottom,
  }
}
