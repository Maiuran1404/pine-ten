'use client'

import { ReactNode } from 'react'
import { LucideIcon, FileQuestion, FolderOpen, Search, AlertCircle, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'secondary' | 'outline' | 'ghost'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  children?: ReactNode
  className?: string
  size?: 'sm' | 'default' | 'lg'
}

const sizeClasses = {
  sm: {
    container: 'py-6',
    icon: 'h-8 w-8',
    iconWrapper: 'p-2',
    title: 'text-sm font-medium',
    description: 'text-xs',
    button: 'h-8 text-xs',
  },
  default: {
    container: 'py-12',
    icon: 'h-10 w-10',
    iconWrapper: 'p-3',
    title: 'text-base font-semibold',
    description: 'text-sm',
    button: 'h-9',
  },
  lg: {
    container: 'py-16',
    icon: 'h-12 w-12',
    iconWrapper: 'p-4',
    title: 'text-lg font-semibold',
    description: 'text-base',
    button: 'h-10',
  },
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  children,
  className,
  size = 'default',
}: EmptyStateProps) {
  const sizes = sizeClasses[size]

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizes.container,
        className
      )}
    >
      <div className={cn('rounded-full bg-muted/50 mb-4', sizes.iconWrapper)}>
        <Icon className={cn('text-muted-foreground', sizes.icon)} />
      </div>
      <h3 className={cn('text-foreground', sizes.title)}>{title}</h3>
      {description && (
        <p className={cn('text-muted-foreground mt-1 max-w-sm', sizes.description)}>
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-2 mt-4">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'default'}
              className={sizes.button}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant="ghost" className={sizes.button}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

// Preset empty states for common scenarios
export function NoTasksFound({ onCreateTask }: { onCreateTask?: () => void }) {
  return (
    <EmptyState
      icon={FolderOpen}
      title="No tasks yet"
      description="Create your first task to get started with your design project."
      action={onCreateTask ? { label: 'Create Task', onClick: onCreateTask } : undefined}
    />
  )
}

export function NoSearchResults({ query, onClear }: { query?: string; onClear?: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={
        query
          ? `No results found for "${query}". Try a different search term.`
          : 'No results match your current filters.'
      }
      action={onClear ? { label: 'Clear Search', onClick: onClear, variant: 'outline' } : undefined}
    />
  )
}

export function NoDataAvailable({ message }: { message?: string }) {
  return (
    <EmptyState
      icon={FileQuestion}
      title="No data available"
      description={message || "There's no data to display at the moment."}
    />
  )
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string
  message?: string
  onRetry?: () => void
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      title={title}
      description={message || 'An error occurred while loading the data. Please try again.'}
      action={onRetry ? { label: 'Try Again', onClick: onRetry, variant: 'outline' } : undefined}
    />
  )
}

export function NoNotifications() {
  return (
    <EmptyState
      icon={Inbox}
      title="No notifications"
      description="You're all caught up! Check back later for updates."
      size="sm"
    />
  )
}

export function NoMessagesYet({ onSendMessage }: { onSendMessage?: () => void }) {
  return (
    <EmptyState
      icon={Inbox}
      title="No messages yet"
      description="Start a conversation by sending the first message."
      action={onSendMessage ? { label: 'Send Message', onClick: onSendMessage } : undefined}
    />
  )
}
