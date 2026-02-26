import type { LucideIcon } from 'lucide-react'

export interface NavigationItem {
  name: string
  href: string
  icon: LucideIcon
}

export interface NavigationGroup {
  label: string
  items: NavigationItem[]
}

export interface RecentItem {
  id: string
  title: string
  href: string
  icon?: LucideIcon
  iconClassName?: string
}

export type AccentColor = 'success' | 'error' | 'info' | 'review'

export const accentColorStyles: Record<
  AccentColor,
  {
    active: string
    icon: string
  }
> = {
  success: {
    active: 'bg-ds-success/15 text-ds-success hover:bg-ds-success/20 hover:text-ds-success',
    icon: 'text-ds-success',
  },
  error: {
    active: 'bg-ds-error/15 text-ds-error hover:bg-ds-error/20 hover:text-ds-error',
    icon: 'text-ds-error',
  },
  info: {
    active: 'bg-ds-info/15 text-ds-info hover:bg-ds-info/20 hover:text-ds-info',
    icon: 'text-ds-info',
  },
  review: {
    active:
      'bg-ds-status-review/15 text-ds-status-review hover:bg-ds-status-review/20 hover:text-ds-status-review',
    icon: 'text-ds-status-review',
  },
}
