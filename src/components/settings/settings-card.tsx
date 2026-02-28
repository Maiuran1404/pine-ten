'use client'

import { cn } from '@/lib/utils'

export function SettingsCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-2xl border border-border/60 bg-card shadow-sm', className)}>
      {children}
    </div>
  )
}

export function SettingsCardHeader({
  icon: _Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="px-7 pt-7 pb-0">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  )
}
