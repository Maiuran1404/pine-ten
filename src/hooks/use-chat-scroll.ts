/**
 * Hook for managing scroll behavior in the chat interface.
 * Uses a MutationObserver to detect content changes (typing animation,
 * new messages, images loading) and auto-scrolls to bottom.
 * Respects user scroll-up — if the user scrolls away from the bottom,
 * auto-scroll pauses until they scroll back near the bottom.
 */
'use client'

import { useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { type ChatMessage as Message } from '@/components/chat/types'

/** How close to the bottom (in px) the user must be for auto-scroll to engage */
const NEAR_BOTTOM_THRESHOLD = 80

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
  const userScrolledUpRef = useRef(false)
  const lastScrollTopRef = useRef(0)

  const getViewport = useCallback((): HTMLElement | null => {
    if (!scrollAreaRef.current) return null
    return (
      scrollAreaRef.current.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]') ||
      scrollAreaRef.current
    )
  }, [])

  const isNearBottom = useCallback((target: HTMLElement) => {
    const { scrollTop, scrollHeight, clientHeight } = target
    return scrollHeight - scrollTop - clientHeight < NEAR_BOTTOM_THRESHOLD
  }, [])

  // Scroll to bottom helper
  const scrollToBottom = useCallback(
    (smooth = false) => {
      const target = getViewport()
      if (!target) return
      if (smooth) {
        target.scrollTo({ top: target.scrollHeight, behavior: 'smooth' })
      } else {
        target.scrollTop = target.scrollHeight
      }
    },
    [getViewport]
  )

  // Track user scroll position to detect manual scroll-up
  useEffect(() => {
    const target = getViewport()
    if (!target) return

    const handleScroll = () => {
      const currentScrollTop = target.scrollTop
      const scrollingUp = currentScrollTop < lastScrollTopRef.current
      lastScrollTopRef.current = currentScrollTop

      if (scrollingUp && !isNearBottom(target)) {
        userScrolledUpRef.current = true
      } else if (isNearBottom(target)) {
        userScrolledUpRef.current = false
      }
    }

    target.addEventListener('scroll', handleScroll, { passive: true })
    return () => target.removeEventListener('scroll', handleScroll)
  }, [getViewport, isNearBottom])

  // Reset user-scrolled-up when new messages arrive (user sent or AI responded)
  useEffect(() => {
    userScrolledUpRef.current = false
  }, [messages.length])

  // Immediate scroll when messages or loading state changes
  useLayoutEffect(() => {
    if (userScrolledUpRef.current) return
    scrollToBottom()
    const frame = requestAnimationFrame(() => scrollToBottom())
    return () => cancelAnimationFrame(frame)
  }, [messages, isLoading, scrollToBottom])

  // MutationObserver — watches the scroll viewport for DOM changes
  // (typing animation adding text, images loading, etc.) and auto-scrolls
  useEffect(() => {
    const target = getViewport()
    if (!target) return

    const observer = new MutationObserver(() => {
      if (userScrolledUpRef.current) return
      // Use rAF to batch multiple rapid mutations into a single scroll
      requestAnimationFrame(() => {
        scrollToBottom()
      })
    })

    observer.observe(target, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    return () => observer.disconnect()
  }, [getViewport, scrollToBottom])

  // Final scroll when typing animation completes
  useEffect(() => {
    if (animatingMessageId === null && completedTypingIds.size > 0) {
      userScrolledUpRef.current = false
      scrollToBottom(true)
    }
  }, [animatingMessageId, completedTypingIds, scrollToBottom])

  return {
    scrollAreaRef,
    scrollToBottom,
  }
}
