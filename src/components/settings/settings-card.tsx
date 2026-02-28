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
    <div className={cn('rounded-xl border border-border bg-card shadow-sm', className)}>
      {children}
    </div>
  )
}

export function SettingsCardHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="p-5 border-b border-border">
      <div className="flex items-center gap-3">
        <div className="h-7 w-7 rounded-lg bg-crafted-green/10 dark:bg-crafted-green/20 flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-crafted-forest dark:text-crafted-sage" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <p className="text-xs text-muted-foreground mt-1 ml-10">{description}</p>
    </div>
  )
}
