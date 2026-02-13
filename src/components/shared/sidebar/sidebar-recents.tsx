'use client'

import Link from 'next/link'
import { History, type LucideIcon } from 'lucide-react'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { type RecentItem } from './types'

interface SidebarRecentsProps {
  items: RecentItem[]
  title?: string
  icon?: LucideIcon
  maxItems?: number
  onItemClick?: () => void
}

/**
 * Reusable recents section for sidebar
 * Displays a list of recently accessed items
 */
export function SidebarRecents({
  items,
  title = 'Recents',
  icon: TitleIcon = History,
  maxItems = 5,
  onItemClick,
}: SidebarRecentsProps) {
  const { setOpenMobile } = useSidebar()

  if (items.length === 0) return null

  const handleLinkClick = () => {
    setOpenMobile(false)
    onItemClick?.()
  }

  const displayItems = items.slice(0, maxItems)

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center gap-1.5">
        <TitleIcon className="h-3 w-3" />
        {title}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {displayItems.map((item) => {
            const ItemIcon = item.icon || History
            return (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton asChild tooltip={item.title} size="sm">
                  <Link href={item.href} onClick={handleLinkClick}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center">
                      <span
                        className={`w-2 h-2 rounded-full ${item.iconClassName || 'bg-muted-foreground/40'}`}
                      />
                    </span>
                    <span className="truncate">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
