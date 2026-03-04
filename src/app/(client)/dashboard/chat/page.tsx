'use client'

import React, { useState, useEffect, useRef, useCallback, startTransition } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ChatInterface } from '@/components/chat/chat-interface'
import { getDrafts, generateDraftId, type ChatDraft } from '@/lib/chat-drafts'
import { Button } from '@/components/ui/button'
import { Sparkles, User, AlertTriangle, RefreshCw } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import Link from 'next/link'

// =============================================================================
// ERROR BOUNDARY — catches render errors in the chat interface
// =============================================================================

interface ChatErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class ChatErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ChatErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ChatErrorBoundaryState {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Something went wrong</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              The chat encountered an unexpected error. Your draft has been saved.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try Again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

export default function ChatPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initializedRef = useRef(false)
  const { data: session } = useSession()

  // Get current URL params
  const draftParam = searchParams.get('draft')
  const messageParam = searchParams.get('message')
  const paymentParam = searchParams.get('payment')

  // If no params at all, redirect to dashboard
  // This prevents showing an empty chat page
  useEffect(() => {
    if (!draftParam && !messageParam && !paymentParam) {
      router.replace('/dashboard')
    }
  }, [draftParam, messageParam, paymentParam, router])

  // Initialize drafts directly (only runs once on mount due to lazy initializer)
  const [_drafts, setDrafts] = useState<ChatDraft[]>(() => {
    if (typeof window === 'undefined') return []
    return getDrafts()
  })

  // Initialize state based on URL - always generate a draftId to avoid regenerating on every render
  const [currentDraftId, setCurrentDraftId] = useState<string>(() => {
    if (draftParam) return draftParam
    // Check for pending task state from payment return - restore draft ID
    if (typeof window !== 'undefined' && paymentParam === 'success') {
      try {
        const savedState = sessionStorage.getItem('pending_task_state')
        if (savedState) {
          const { draftId } = JSON.parse(savedState)
          if (draftId) return draftId
        }
      } catch {
        // Ignore parsing errors
      }
    }
    // Always generate a stable ID upfront
    return generateDraftId()
  })

  // Always use seamless transition (full-width) layout when there are params
  const hasUrlParams = !!draftParam || !!messageParam || !!paymentParam
  const [initialMessage, setInitialMessage] = useState<string | null>(() => messageParam)

  // Handle initial mount and URL changes
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      if (messageParam && !initialMessage) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setInitialMessage(messageParam)
      }
      return
    }

    if (draftParam) {
      startTransition(() => {
        setCurrentDraftId(draftParam)
      })
    } else if (messageParam && messageParam !== initialMessage) {
      // Update initial message but keep the existing draft ID from useState initializer.
      // Generating a new ID here causes a race with draft-loading in useDraftPersistence.
      startTransition(() => {
        setInitialMessage(messageParam)
      })
    }
  }, [draftParam, messageParam, hasUrlParams, initialMessage])

  const draftUpdateTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const handleDraftUpdate = useCallback(() => {
    clearTimeout(draftUpdateTimer.current)
    draftUpdateTimer.current = setTimeout(() => setDrafts(getDrafts()), 500)
  }, [])

  // Warn before leaving if user has an active chat session
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    if (hasUrlParams) {
      window.addEventListener('beforeunload', handleBeforeUnload)
    }
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUrlParams])

  // Don't render anything if we're about to redirect
  if (!draftParam && !messageParam && !paymentParam) {
    return null
  }

  return (
    <div className="h-full flex flex-col min-h-0 relative overflow-hidden">
      {/* Soft gradient crafted-green/mint background at top */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(180deg,
            color-mix(in srgb, var(--crafted-mint) 40%, transparent) 0%,
            color-mix(in srgb, var(--crafted-mint) 20%, transparent) 15%,
            transparent 30%
          )`,
        }}
      />
      {/* Dark mode overlay */}
      <div
        className="absolute inset-0 pointer-events-none dark:opacity-100 opacity-0 transition-opacity"
        style={{
          background: `linear-gradient(180deg,
            color-mix(in srgb, var(--crafted-forest) 15%, transparent) 0%,
            rgba(10, 10, 10, 0.5) 15%,
            rgba(10, 10, 10, 1) 30%
          )`,
        }}
      />

      {/* Top bar */}
      <div className="relative z-20 shrink-0 flex items-center justify-end px-6 py-4">
        {/* Right side - actions */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard/credits">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 rounded-xl border-border bg-white/80 dark:bg-card/80 backdrop-blur-sm hover:bg-white dark:hover:bg-card gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Upgrade
            </Button>
          </Link>
          {/* User avatar */}
          <div className="w-10 h-10 rounded-full border border-border bg-white dark:bg-card overflow-hidden flex items-center justify-center">
            {session?.user?.image ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={session.user.image}
                alt={session.user.name || 'User'}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {/* Chat content */}
      <div className="relative z-10 flex-1 flex flex-col min-h-0">
        <ChatErrorBoundary>
          <ChatInterface
            draftId={currentDraftId}
            onDraftUpdate={handleDraftUpdate}
            initialMessage={initialMessage}
            seamlessTransition={true}
            showRightPanel={true}
            onChatStart={() => {}}
          />
        </ChatErrorBoundary>
      </div>
    </div>
  )
}
